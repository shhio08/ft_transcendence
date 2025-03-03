from django.test import TestCase, Client
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class AccessControlTestCase(TestCase):
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
        self.user_info_url = '/pong/api/user-info/'
        self.friend_list_url = '/pong/api/friend-list/'
    
    def test_api_access_control(self):
        """認証なしでの保護されたAPIアクセスをテスト"""
        # 未認証状態でゲーム作成を試みる
        response = self.client.post(
            self.create_game_url,
            json.dumps({'mode': 'classic'}),
            content_type='application/json'
        )
        # 認証エラーを期待（401、403、または302）
        self.assertIn(response.status_code, [401, 403, 302])
        
        # 未認証状態でユーザー情報取得を試みる
        response = self.client.get(self.user_info_url)
        self.assertIn(response.status_code, [401, 403, 302])
        
        # 未認証状態でフレンドリスト取得を試みる
        response = self.client.get(self.friend_list_url)
        self.assertIn(response.status_code, [401, 403, 302]) 