import json
import math
import asyncio
import random
import time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from collections import defaultdict
from channels.db import database_sync_to_async

class GameConsumer(AsyncWebsocketConsumer):
    # ゲームごとのプレイヤー管理を改善
    game_players = {}  # {game_room: {channel_name: player_number}}
    # ゲーム状態の追跡
    game_states = {}  # {game_room: {'ended': False, 'ball': {...}, 'paddles': {...}, 'score': {...}}}
    game_tasks = {}  # ゲームごとのタスク管理

    async def connect(self):
        self.game_room = None
        self.player_number = None
        print("New WebSocket connection established")
        await self.accept()

    async def disconnect(self, close_code):
        if self.game_room:
            print(f"⚠️ Player {self.player_number} disconnecting from game {self.game_room}")
            
            # もしゲームがまだ終了していない場合は中断と見なす
            if self.game_room in self.game_states and not self.game_states[self.game_room]['ended']:
                print(f"🚨 Game interrupted by disconnect: Player {self.player_number} from {self.game_room}")
                
                # ゲーム状態を終了に設定
                self.game_states[self.game_room]['ended'] = True
                
                # 残っているプレイヤーに通知
                await self.channel_layer.group_send(
                    self.game_room,
                    {
                        'type': 'game_message',
                        'event': 'game_interrupted',
                        'player_number': self.player_number,
                        'reason': 'disconnect'
                    }
                )
                
                # ゲームタスクをキャンセル
                if self.game_room in self.game_tasks and self.game_tasks[self.game_room]:
                    print(f"🚨 Cancelling game loop due to disconnect")
                    self.game_tasks[self.game_room].cancel()
                    del self.game_tasks[self.game_room]
            
            if self.game_room in self.game_players:
                if self.channel_name in self.game_players[self.game_room]:
                    del self.game_players[self.game_room][self.channel_name]
                
                if not self.game_players[self.game_room]:
                    # 部屋からプレイヤーがいなくなった場合
                    print(f"⚠️ No players left in game {self.game_room}, cleaning up")
                    if self.game_room in self.game_tasks and self.game_tasks[self.game_room]:
                        print(f"Cancelling game loop for {self.game_room}")
                        self.game_tasks[self.game_room].cancel()
                        del self.game_tasks[self.game_room]
                    
                    # ゲーム状態の削除
                    if self.game_room in self.game_states:
                        del self.game_states[self.game_room]
                    
                    del self.game_players[self.game_room]
            
            await self.channel_layer.group_discard(
                self.game_room,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            # ログレベルを最小限に: パドル移動のログは出力しない
            if data['type'] != 'paddle_move':
                print(f"Received data: {data}")
            
            # ゲーム中断の処理を特別扱い
            if data['type'] == 'game_interrupted':
                print(f"🚨 Game {self.game_room} interrupted by player {self.player_number}: {data.get('reason', 'unknown')}")
                
                # ゲーム状態を終了状態に設定
                if self.game_room in self.game_states:
                    self.game_states[self.game_room]['ended'] = True
                
                # ゲームタスクをキャンセル
                if self.game_room in self.game_tasks and self.game_tasks[self.game_room]:
                    print(f"🚨 Cancelling game loop for interrupted game {self.game_room}")
                    self.game_tasks[self.game_room].cancel()
                    del self.game_tasks[self.game_room]
                
                # 中断メッセージを全プレイヤーに送信
                await self.channel_layer.group_send(
                    self.game_room,
                    {
                        'type': 'game_message',
                        'event': 'game_interrupted',
                        'player_number': self.player_number,
                        'reason': data.get('reason', 'unknown')
                    }
                )
                return
            
            elif data['type'] == 'join_game':
                self.game_room = data['game_id']
                self.player_number = data['player_number']
                
                # ゲームルームがなければ初期化
                if self.game_room not in self.game_players:
                    print(f"Creating new game room: {self.game_room}")
                    self.game_players[self.game_room] = {}
                    # ゲーム状態も初期化
                    self.game_states[self.game_room] = {
                        'ended': False,
                        'ball': {
                            'x': 0,
                            'y': 1,
                            'z': 0,
                            'velocity': {
                                'x': 0.2,
                                'y': 0,
                                'z': 0.3,
                            }
                        },
                        'paddles': {
                            1: {'x': 0},  # プレイヤー1のパドル位置
                            2: {'x': 0}   # プレイヤー2のパドル位置
                        },
                        'score': {
                            'player1': 0,
                            'player2': 0
                        },
                        'game_started': False,
                        'last_update': time.time()
                    }
                
                # プレイヤーをゲームに追加
                self.game_players[self.game_room][self.channel_name] = self.player_number
                
                print(f"👤 Player {self.player_number} joining game {self.game_room}")
                print(f"Current players in game: {self.game_players[self.game_room]}")
                
                await self.channel_layer.group_add(
                    self.game_room,
                    self.channel_name
                )
                
                # 参加通知を送信
                await self.channel_layer.group_send(
                    self.game_room,
                    {
                        'type': 'game_message',
                        'event': 'player_joined',
                        'game_id': self.game_room,
                        'player_number': self.player_number
                    }
                )
                
                # プレイヤーが2人集まったらゲームを開始
                if len(self.game_players[self.game_room]) == 2 and self.game_room not in self.game_tasks:
                    print(f"🎮 Two players joined game {self.game_room}, starting game in 3 seconds")
                    
                    # 3秒待機してからゲーム開始
                    await asyncio.sleep(3)
                    
                    if self.game_room in self.game_states:  # 切断されていないか確認
                        print(f"🎮 Starting game {self.game_room}")
                        self.game_states[self.game_room]['game_started'] = True
                        self.game_states[self.game_room]['last_update'] = time.time()
                        
                        # ゲーム開始メッセージを送信
                        await self.channel_layer.group_send(
                            self.game_room,
                            {
                                'type': 'game_message',
                                'event': 'game_start'
                            }
                        )
                        
                        # ゲームループタスクを開始
                        print(f"Starting game loop for {self.game_room}")
                        self.game_tasks[self.game_room] = asyncio.create_task(self.game_loop(self.game_room))
                
            elif data['type'] == 'paddle_move':
                if not self.game_room or self.player_number is None:
                    return
                
                # パドル位置を更新
                if self.game_room in self.game_states:
                    self.game_states[self.game_room]['paddles'][self.player_number]['x'] = data['position']
                
                # 他のプレイヤーにパドル移動を通知
                await self.channel_layer.group_send(
                    self.game_room,
                    {
                        'type': 'game_message',
                        'event': 'paddle_move',
                        'position': data['position'],
                        'player_number': self.player_number
                    }
                )
                
        except Exception as e:
            print(f"Error in receive: {e}")

    async def game_loop(self, game_room):
        """ゲームループ - ボールの位置を更新し、状態を送信する"""
        print(f"Game loop started for {game_room}")
        
        try:
            while game_room in self.game_states and not self.game_states[game_room]['ended']:
                # ゲームが開始されていなければスキップ
                if not self.game_states[game_room]['game_started']:
                    await asyncio.sleep(0.1)
                    continue
                
                # ゲーム状態を更新
                self.update_game_state(game_room)
                
                # 更新されたゲーム状態を送信
                await self.send_game_state(game_room)
                
                # 約60FPSで実行 (16.6ms)
                await asyncio.sleep(1/60)
        
        except asyncio.CancelledError:
            print(f"⚠️ Game loop for {game_room} was cancelled")
        except Exception as e:
            print(f"Error in game loop: {e}")
        
        print(f"Game loop ended for {game_room}")

    def update_game_state(self, game_room):
        """ゲーム状態を更新する (非同期ではないメソッド)"""
        if game_room not in self.game_states:
            return
        
        game_state = self.game_states[game_room]
        
        # ゲームが終了していたり、開始していなければスキップ
        if game_state['ended'] or not game_state['game_started']:
            return
        
        # 前回の更新からの経過時間を計算
        current_time = time.time()
        dt = current_time - game_state['last_update']
        game_state['last_update'] = current_time
        
        # ボールとパドルの参照を取得
        ball = game_state['ball']
        paddles = game_state['paddles']
        
        # ボールの位置を更新
        ball['x'] += ball['velocity']['x']
        ball['z'] += ball['velocity']['z']
        
        # 左右の壁との衝突判定
        if ball['x'] <= -15 or ball['x'] >= 15:
            ball['velocity']['x'] *= -1
        
        # パドル1との衝突判定
        if (ball['z'] >= 18 and ball['z'] <= 20 and 
            ball['x'] >= paddles[1]['x'] - 2.5 and 
            ball['x'] <= paddles[1]['x'] + 2.5):
            ball['velocity']['z'] *= -1
            # バウンド角度にランダム性を加える
            ball['velocity']['x'] = (ball['x'] - paddles[1]['x']) / 5 + (random.random() * 0.1 - 0.05)
        
        # パドル2との衝突判定
        if (ball['z'] <= -18 and ball['z'] >= -20 and 
            ball['x'] >= paddles[2]['x'] - 2.5 and 
            ball['x'] <= paddles[2]['x'] + 2.5):
            ball['velocity']['z'] *= -1
            # バウンド角度にランダム性を加える
            ball['velocity']['x'] = (ball['x'] - paddles[2]['x']) / 5 + (random.random() * 0.1 - 0.05)
        
        # ゴール判定
        if ball['z'] > 20:
            # プレイヤー2の得点
            game_state['score']['player2'] += 1
            print(f"⚽ Player 2 scored! Score: {game_state['score']['player1']}-{game_state['score']['player2']}")
            
            # 勝者チェック
            self.check_for_winner(game_room)
            
            if not game_state['ended']:
                self.reset_ball(game_room)
                
        elif ball['z'] < -20:
            # プレイヤー1の得点
            game_state['score']['player1'] += 1
            print(f"⚽ Player 1 scored! Score: {game_state['score']['player1']}-{game_state['score']['player2']}")
            
            # 勝者チェック
            self.check_for_winner(game_room)
            
            if not game_state['ended']:
                self.reset_ball(game_room)

    def reset_ball(self, game_room):
        """ボールをリセットする"""
        if game_room not in self.game_states:
            return
            
        game_state = self.game_states[game_room]
        
        # ボールを中央に戻す
        game_state['ball']['x'] = 0
        game_state['ball']['y'] = 1
        game_state['ball']['z'] = 0
        
        # 速度を再設定
        direction = 1 if random.random() > 0.5 else -1
        game_state['ball']['velocity'] = {
            'x': random.random() * 0.2 - 0.1,
            'y': 0,
            'z': direction * 0.3
        }
        
        # ゲームを一時停止
        game_state['game_started'] = False
        
        # 1秒後に再開するタスクを作成
        asyncio.create_task(self.resume_game_after_delay(game_room, 1))

    async def resume_game_after_delay(self, game_room, delay):
        """遅延後にゲームを再開する"""
        await asyncio.sleep(delay)
        if game_room in self.game_states and not self.game_states[game_room]['ended']:
            print(f"Resuming game {game_room} after goal")
            self.game_states[game_room]['game_started'] = True

    def check_for_winner(self, game_room):
        """勝者をチェックする"""
        if game_room not in self.game_states:
            return
            
        game_state = self.game_states[game_room]
        
        # 3点先取で勝利
        winning_score = 3
        winner = None
        
        if game_state['score']['player1'] >= winning_score:
            winner = 1
        elif game_state['score']['player2'] >= winning_score:
            winner = 2
            
        if winner:
            print(f"🏆 Player {winner} wins game {game_room}!")
            game_state['ended'] = True
            
            # ゲーム終了を全プレイヤーに通知するタスクを作成
            asyncio.create_task(self.send_game_end(game_room, winner))

    async def send_game_end(self, game_room, winner):
        """ゲーム終了メッセージを送信し、スコアをデータベースに保存"""
        
        # 現在のスコア情報を取得
        current_score = self.game_states[game_room]['score']
        
        # ゲームIDを取得（game_room形式: "game_{game_id}"）
        game_id = game_room.replace('game_', '')
        
        # データベースにスコアと勝者を保存
        await self.update_game_score_and_winner(game_id, current_score, winner)
        
        # WebSocketで結果を通知
        await self.channel_layer.group_send(
            game_room,
            {
                'type': 'game_message',
                'event': 'game_end',
                'winner': winner,
                'score': current_score
            }
        )
        
        # ゲームループタスクをキャンセル
        if game_room in self.game_tasks:
            self.game_tasks[game_room].cancel()
            del self.game_tasks[game_room]

    @database_sync_to_async
    def update_game_score_and_winner(self, game_id, score, winner):
        """ゲームスコアと勝者をデータベースに保存"""
        try:
            from pong.models import Game, GamePlayers
            
            # ゲームを取得
            game = Game.objects.get(id=game_id)
            
            # プレイヤー情報を更新
            players = GamePlayers.objects.filter(game=game)
            winner_player = None
            
            for player in players:
                if player.player_number == 1:
                    player.score = score['player1']
                elif player.player_number == 2:
                    player.score = score['player2']
                
                # 勝者を記録
                if winner and player.player_number == winner:
                    winner_player = player
                
                player.save()
            
            # 勝者を設定
            if winner_player:
                game.winner = winner_player.user
                game.save()
                print(f"Game {game_id}: Winner saved: player{winner} (user: {game.winner})")
            
            return True
        except Exception as e:
            print(f"Error updating game score and winner: {e}")
            return False

    async def send_game_state(self, game_room):
        """現在のゲーム状態を全プレイヤーに送信する"""
        if game_room not in self.game_states:
            return
            
        game_state = self.game_states[game_room]
        
        # ゲーム状態を送信
        await self.channel_layer.group_send(
            game_room,
            {
                'type': 'game_message',
                'event': 'game_state_update',
                'ball': game_state['ball'],
                'score': game_state['score']
            }
        )

    async def game_message(self, event):
        # イベントをクライアントに送信
        message = {
            'type': 'game_message',
            'event': event.get('event'),
            'player_number': event.get('player_number'),
            'position': event.get('position'),
            'score': event.get('score'),
            'winner': event.get('winner'),
            'ball': event.get('ball'),
            'reason': event.get('reason')
        }
        
        # 必要な項目だけ含めるようにフィルタリング
        filtered_message = {k: v for k, v in message.items() if v is not None}
        
        # 重要なメッセージのみログに出力（ゲーム状態更新とパドル移動は出力しない）
        event_type = event.get('event')
        if event_type and event_type not in ['game_state_update', 'paddle_move']:
            print(f"📤 Sending to client: {filtered_message}")
        
        # メッセージを送信
        await self.send(text_data=json.dumps(filtered_message)) 