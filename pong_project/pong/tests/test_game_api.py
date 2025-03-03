from django.test import TestCase, Client
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class GameAPITestCase(TestCase):
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
        self.get_game_url = '/pong/api/get-game/'
        self.create_player_url = '/pong/api/create-player/'
        self.get_players_url = '/pong/api/get-players/'
        self.update_game_winner_url = '/pong/api/update-game-winner/'
        self.update_player_score_url = '/pong/api/update-player-score/'
    
    def test_game_management(self):
        """ゲーム管理機能をテスト"""
        # ログイン
        self.client.login(username='testuser1', password='testpassword123')
        
        # ゲーム作成
        response = self.client.post(
            self.create_game_url,
            json.dumps({'mode': 'classic'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        game_id = data['id']
        
        # プレイヤー作成
        response = self.client.post(
            self.create_player_url,
            json.dumps({
                'game_id': game_id,
                'player_number': 1,
                'nickname': 'Player 1'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        player_id = data['id']
        
        # ゲーム情報取得
        response = self.client.get(f'{self.get_game_url}?game_id={game_id}')
        self.assertEqual(response.status_code, 200)
        
        # プレイヤー情報取得
        response = self.client.get(f'{self.get_players_url}?game_id={game_id}')
        self.assertEqual(response.status_code, 200)
        
        # スコア更新
        response = self.client.post(
            f'{self.update_player_score_url}?player_id={player_id}&score=5',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        # ゲーム勝者設定
        response = self.client.post(
            f'{self.update_game_winner_url}?game_id={game_id}&winner_id={player_id}',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200) 