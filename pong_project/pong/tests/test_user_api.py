from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

class UserAPITestCase(TestCase):
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
        self.user_info_url = '/pong/api/user-info/'
        self.update_user_info_url = '/pong/api/update-user-info/'
        self.user_game_history_url = '/pong/api/user-game-history/'
    
    def test_user_profile(self):
        """ユーザープロファイル機能をテスト"""
        # ログイン
        self.client.login(username='testuser1', password='testpassword123')
        
        # ユーザー情報取得
        response = self.client.get(self.user_info_url)
        self.assertEqual(response.status_code, 200)
        
        # ユーザー情報更新
        avatar = SimpleUploadedFile(
            "updated_avatar.png",
            b"updated_file_content",
            content_type="image/png"
        )
        
        response = self.client.post(
            self.update_user_info_url,
            {
                'email': 'updated@example.com',
                'avatar': avatar
            }
        )
        self.assertEqual(response.status_code, 200)
        
        # ゲーム履歴取得
        response = self.client.get(self.user_game_history_url)
        self.assertEqual(response.status_code, 200) 