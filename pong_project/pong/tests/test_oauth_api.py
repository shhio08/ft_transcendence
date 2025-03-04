from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.conf import settings
from unittest.mock import patch, MagicMock
import json
import os
import tempfile
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

class OAuthAPITestCase(TestCase):
    def setUp(self):
        """テスト前の設定"""
        # テスト用クライアント
        self.client = Client()
        
        # テスト用の設定
        self.oauth_callback_url = '/pong/api/oauth/42/callback/'
        
        # 42認証のモックデータ
        self.mock_user_data = {
            'id': 12345,
            'login': 'test42user',
            'email': 'test42user@42.fr',
            'displayname': 'Test 42 User',
            'image': {
                'link': 'https://cdn.intra.42.fr/users/test42user.jpg'
            }
        }
        
        # アバター用のテンポラリディレクトリ
        self.temp_dir = tempfile.mkdtemp()
        self.avatar_42_path = os.path.join(self.temp_dir, 'avatar-42.png')
        
        # テスト用の42アバター画像を作成
        with open(self.avatar_42_path, 'wb') as f:
            f.write(b'test42avatar')
    
    @override_settings(STATIC_ROOT=tempfile.mkdtemp())
    @patch('requests.post')
    @patch('requests.get')
    def test_oauth_42_callback(self, mock_get, mock_post):
        """42 OAuthコールバック処理をテスト"""
        # アクセストークンのモックレスポンス
        mock_token_response = MagicMock()
        mock_token_response.json.return_value = {
            'access_token': 'fake_access_token'
        }
        mock_post.return_value = mock_token_response
        
        # ユーザーデータのモックレスポンス
        mock_user_response = MagicMock()
        mock_user_response.json.return_value = self.mock_user_data
        mock_get.return_value = mock_user_response
        
        # 42認証アバター画像をセットアップ
        os.makedirs(os.path.join(settings.STATIC_ROOT, 'pong/images'), exist_ok=True)
        avatar_path = os.path.join(settings.STATIC_ROOT, 'pong/images/avatar-42.png')
        with open(avatar_path, 'wb') as f:
            f.write(b'test42avatar')
        
        # OAuth認証リクエスト
        response = self.client.post(
            self.oauth_callback_url,
            json.dumps({'code': 'test_auth_code'}),
            content_type='application/json'
        )
        
        # 成功レスポンスを確認
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['status'], 'success')
        
        # ユーザーが作成されていることを確認
        self.assertTrue(User.objects.filter(username='test42user').exists())
        user = User.objects.get(username='test42user')
        
        # 42認証IDが設定されていることを確認
        self.assertEqual(user.intra_42_id, '12345')
        
        # アバターが設定されていることを確認
        self.assertTrue(user.avatar)
        
        # クリーンアップ
        os.remove(avatar_path)
        os.rmdir(os.path.join(settings.STATIC_ROOT, 'pong/images')) 