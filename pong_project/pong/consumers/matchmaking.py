import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
import uuid

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
    
    async def handle_match_request(self, data):
        """マッチングリクエストを処理"""
        # 現在のユーザー情報を保存
        player_id = str(uuid.uuid4())
        self.waiting_players[player_id] = {
            'channel_name': self.channel_name,
            'username': data.get('username', 'Unknown Player'),
            'avatar': data.get('avatar', None)
        }
        
        # 2人以上のプレイヤーが待機中の場合、マッチング
        if len(self.waiting_players) >= 2:
            # 先頭2人を取得しマッチング
            players = list(self.waiting_players.items())[:2]
            player1_id, player1_data = players[0]
            player2_id, player2_data = players[1]
            
            # マッチングした2人をマッチング待ちリストから削除
            del self.waiting_players[player1_id]
            del self.waiting_players[player2_id]
            
            # 一意のゲームルームIDを生成
            game_room_id = f"game_{uuid.uuid4()}"
            
            # 両プレイヤーにマッチング成功を通知
            await self.channel_layer.send(
                player1_data['channel_name'],
                {
                    'type': 'match_found',
                    'game_room': game_room_id,
                    'opponent': {
                        'username': player2_data['username'],
                        'avatar': player2_data['avatar']
                    }
                }
            )
            
            await self.channel_layer.send(
                player2_data['channel_name'],
                {
                    'type': 'match_found',
                    'game_room': game_room_id,
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
            'game_room': event['game_room'],
            'opponent': event['opponent']
        })) 