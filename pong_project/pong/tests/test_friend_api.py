from django.test import TestCase, Client
from django.contrib.auth import get_user_model

User = get_user_model()

class FriendAPITestCase(TestCase):
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
        
        self.user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpassword123'
        )
        
        # APIエンドポイント
        self.friend_list_url = '/pong/api/friend-list/'
        self.user_list_url = '/pong/api/user-list/'
        self.add_friend_url = '/pong/api/add-friend/'
        self.accept_friend_url = '/pong/api/accept-friend/'
        self.reject_friend_url = '/pong/api/reject-friend/'
    
    def test_friend_management(self):
        """フレンド管理機能をテスト"""
        # ログイン
        self.client.login(username='testuser1', password='testpassword123')
        
        # ユーザーリスト取得
        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, 200)
        
        # フレンド追加
        response = self.client.post(
            self.add_friend_url,
            {'friend_id': self.user2.id}
        )
        self.assertEqual(response.status_code, 200)
        
        # フレンドリスト取得
        response = self.client.get(self.friend_list_url)
        self.assertEqual(response.status_code, 200)
        
        # ユーザー2でログイン
        self.client.logout()
        self.client.login(username='testuser2', password='testpassword123')
        
        # フレンド承認
        response = self.client.post(
            self.accept_friend_url,
            {'friend_id': self.user1.id}
        )
        self.assertEqual(response.status_code, 200)
        
        # 別のフレンドリクエストをテスト（ユーザー3を作成）
        user3 = User.objects.create_user(
            username='testuser3',
            email='test3@example.com',
            password='testpassword123'
        )
        
        # フレンド追加（ユーザー3 -> ユーザー2）
        self.client.logout()
        self.client.login(username='testuser3', password='testpassword123')
        response = self.client.post(
            self.add_friend_url,
            {'friend_id': self.user2.id}
        )
        self.assertEqual(response.status_code, 200)
        
        # フレンド拒否（ユーザー2がユーザー3のリクエストを拒否）
        self.client.logout()
        self.client.login(username='testuser2', password='testpassword123')
        response = self.client.post(
            self.reject_friend_url,
            {'friend_id': user3.id}
        )
        self.assertEqual(response.status_code, 200) 