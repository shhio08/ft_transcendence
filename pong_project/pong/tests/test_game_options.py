from django.test import TestCase, Client
from django.contrib.auth import get_user_model
import json
from pong.models import Game, GameOptions

User = get_user_model()

class GameOptionsTestCase(TestCase):
    def setUp(self):
        """テスト前の設定"""
        # テスト用クライアント
        self.client = Client()
        
        # テスト用ユーザーの作成
        self.user1 = User.objects.create_user(
            username='testuser1',
            email='test1@example.com',
            password='testpassword123'
        )
        
        # APIエンドポイント
        self.create_game_url = '/pong/api/create-game/'
        self.create_game_options_url = '/pong/api/create-game-options/'
        self.get_game_options_url = '/pong/api/get-game-options/'
    
    def test_game_options_creation(self):
        """ゲームオプション作成機能をテスト"""
        # ログイン
        self.client.login(username='testuser1', password='testpassword123')
        
        # ゲーム作成
        response = self.client.post(
            self.create_game_url,
            json.dumps({'mode': 'local'}),  # ローカルモード指定
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        game_id = data['id']
        
        # ゲームオプション作成
        response = self.client.post(
            self.create_game_options_url,
            json.dumps({
                'game_id': game_id,
                'ball_count': 2,
                'ball_speed': 'fast'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        self.assertEqual(data['ball_count'], 2)
        self.assertEqual(data['ball_speed'], 'fast')
        
        # ゲームオプション取得
        response = self.client.get(f'{self.get_game_options_url}?game_id={game_id}')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['ball_count'], 2)
        self.assertEqual(data['ball_speed'], 'fast') 