import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from ..models import Game, GamePlayers
import uuid
from django.utils import timezone

User = get_user_model()

class MatchmakingConsumer(AsyncWebsocketConsumer):
    waiting_players = {}  # 待機中のプレイヤーを保持するクラス変数
    
    async def connect(self):
        """WebSocket接続が確立されたときの処理"""
        await self.accept()
    
    async def disconnect(self, close_code):
        """WebSocket接続が切断されたときの処理"""
        # プレイヤーが待機リストにいる場合は削除
        for player_id, data in list(self.waiting_players.items()):
            if data.get('channel_name') == self.channel_name:
                del self.waiting_players[player_id]
                break
    
    async def receive(self, text_data):
        """WebSocketからメッセージを受信したときの処理"""
        data = json.loads(text_data)
        
        if data.get('type') == 'match_request':
            await self.handle_match_request(data)
        elif data.get('type') == 'cancel_matching':
            await self.handle_cancel_matching()
    
    @database_sync_to_async
    def create_game_and_players(self, player1_data, player2_data):
        """ゲームとプレイヤーデータを作成"""
        # ゲームの作成
        game = Game.objects.create(
            mode='remote',
            played_at=timezone.now()
        )
        
        # プレイヤー1の作成（ユーザーIDを設定）
        player1 = GamePlayers.objects.create(
            game=game,
            player_number=1,
            nickname=player1_data['username'],
            user_id=player1_data.get('user_id')  # ユーザーIDを追加
        )
        
        # プレイヤー2の作成（ユーザーIDを設定）
        player2 = GamePlayers.objects.create(
            game=game,
            player_number=2,
            nickname=player2_data['username'],
            user_id=player2_data.get('user_id')  # ユーザーIDを追加
        )
        
        print(f"Created player 1: {player1.nickname} (user_id: {player1_data.get('user_id')})")
        print(f"Created player 2: {player2.nickname} (user_id: {player2_data.get('user_id')})")
        
        return {
            'game_id': str(game.id),
            'player1_id': str(player1.id),
            'player2_id': str(player2.id)
        }
    
    async def handle_match_request(self, data):
        """マッチングリクエストを処理"""
        player_id = str(uuid.uuid4())
        
        # ユーザーIDをデータに含める
        self.waiting_players[player_id] = {
            'channel_name': self.channel_name,
            'username': data.get('username', 'Unknown Player'),
            'avatar': data.get('avatar', None),
            'user_id': self.scope['user'].id if self.scope['user'].is_authenticated else None  # ユーザーIDを追加
        }
        
        if len(self.waiting_players) >= 2:
            players = list(self.waiting_players.items())[:2]
            player1_id, player1_data = players[0]
            player2_id, player2_data = players[1]
            
            # 待機リストから削除
            del self.waiting_players[player1_id]
            del self.waiting_players[player2_id]
            
            # ゲームとプレイヤーデータを作成
            game_data = await self.create_game_and_players(player1_data, player2_data)
            game_room_id = f"game_{game_data['game_id']}"
            
            print(f"Created game: {game_data}")
            
            # プレイヤー1に通知
            await self.channel_layer.send(
                player1_data['channel_name'],
                {
                    'type': 'match_found',
                    'game_id': game_data['game_id'],
                    'game_room': game_room_id,
                    'player_number': 1,
                    'opponent': {
                        'username': player2_data['username'],
                        'avatar': player2_data['avatar']
                    }
                }
            )
            
            # プレイヤー2に通知
            await self.channel_layer.send(
                player2_data['channel_name'],
                {
                    'type': 'match_found',
                    'game_id': game_data['game_id'],
                    'game_room': game_room_id,
                    'player_number': 2,
                    'opponent': {
                        'username': player1_data['username'],
                        'avatar': player1_data['avatar']
                    }
                }
            )
        else:
            # マッチング待ちを通知
            await self.send(json.dumps({
                'type': 'match_status',
                'message': 'Waiting for opponent...'
            }))
    
    async def handle_cancel_matching(self):
        """マッチングのキャンセル処理"""
        # このユーザーを待機リストから削除
        for player_id, data in list(self.waiting_players.items()):
            if data.get('channel_name') == self.channel_name:
                del self.waiting_players[player_id]
                break
        
        # キャンセルを確認
        await self.send(json.dumps({
            'type': 'match_status',
            'message': 'Matching cancelled'
        }))
    
    async def match_found(self, event):
        """マッチングが見つかったときの処理"""
        # クライアントにマッチング結果を送信
        await self.send(json.dumps({
            'type': 'match_found',
            'game_id': event['game_id'],
            'game_room': event['game_room'],
            'player_number': event['player_number'],
            'opponent': event['opponent']
        })) 