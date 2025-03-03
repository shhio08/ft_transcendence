from django.test import TestCase, Client
from django.contrib.auth import get_user_model
import json
import pyotp
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

class AuthAPITestCase(TestCase):
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
        self.login_url = '/pong/api/login/'
        self.verify_2fa_url = '/pong/api/verify-2fa/'
        self.logout_url = '/pong/api/logout/'
        self.setup_2fa_url = '/pong/api/setup-2fa/'
        self.confirm_2fa_url = '/pong/api/confirm-2fa/'
        self.disable_2fa_url = '/pong/api/disable-2fa/'
        self.signup_url = '/pong/api/signup/'
    
    def test_auth_flow(self):
        """認証の一連のフローをテスト"""
        # ログイン
        response = self.client.post(
            self.login_url,
            json.dumps({'username': 'testuser1', 'password': 'testpassword123'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['status'], 'success')
        self.assertTrue('token' in data)
        
        # ログアウト
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['status'], 'success')
    
    def test_2fa_flow(self):
        """2要素認証の一連のフローをテスト"""
        # まずログイン
        self.client.login(username='testuser1', password='testpassword123')
        
        # 2FA設定
        response = self.client.post(self.setup_2fa_url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['status'], 'success')
        self.assertTrue('secret' in data)
        secret = data['secret']
        
        # 2FA確認
        totp = pyotp.TOTP(secret)
        code = totp.now()
        response = self.client.post(
            self.confirm_2fa_url,
            json.dumps({'code': code}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        # 2FA無効化
        code = pyotp.TOTP(secret).now()
        response = self.client.post(
            self.disable_2fa_url,
            json.dumps({'code': code}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
    
    def test_signup(self):
        """サインアップをテスト"""
        avatar = SimpleUploadedFile(
            "test_avatar.png",
            b"file_content",
            content_type="image/png"
        )
        
        response = self.client.post(
            self.signup_url,
            {
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'newuserpassword123',
                'avatar': avatar
            }
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['status'], 'success') 