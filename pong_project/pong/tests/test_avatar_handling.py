from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.conf import settings
import os
import tempfile
import shutil
from django.core.files.uploadedfile import SimpleUploadedFile
import json

User = get_user_model()

class AvatarHandlingTestCase(TestCase):
    def setUp(self):
        """テスト前の設定"""
        # テスト用クライアント
        self.client = Client()
        
        # APIエンドポイント
        self.signup_url = '/pong/api/signup/'
        self.update_user_info_url = '/pong/api/update-user-info/'
        self.user_info_url = '/pong/api/user-info/'
        
        # テスト用の画像ファイルディレクトリ
        self.test_images_dir = os.path.join(settings.STATIC_ROOT, 'pong/images')
        os.makedirs(self.test_images_dir, exist_ok=True)
        
        # デフォルトアバター画像のパス
        self.default_avatar_path = os.path.join(self.test_images_dir, 'avatar-default.jpg')
        
        # テスト用のデフォルトアバター画像を作成
        with open(self.default_avatar_path, 'wb') as f:
            f.write(b'testdefaultavatar')
    
    def tearDown(self):
        """テスト後のクリーンアップ"""
        # テスト用に作成したデフォルトアバター画像を削除
        if os.path.exists(self.default_avatar_path):
            os.remove(self.default_avatar_path)
    
    def test_default_avatar_on_signup(self):
        """サインアップ時のデフォルトアバター設定をテスト"""
        # アバターなしでサインアップ
        response = self.client.post(
            self.signup_url,
            {
                'username': 'avataruser',
                'email': 'avataruser@example.com',
                'password': 'testpassword123'
            }
        )
        
        # 成功レスポンスを確認
        self.assertEqual(response.status_code, 200)
        
        # ユーザーが作成されていることを確認
        user = User.objects.get(username='avataruser')
        
        # アバターが設定されていることを確認
        self.assertTrue(user.avatar)
        self.assertTrue(os.path.exists(user.avatar.path))
        
        # ユーザーのアバターディレクトリを記録（後でクリーンアップするため）
        avatar_dir = os.path.dirname(user.avatar.path)
        
        # クリーンアップ - ユーザーのアバターディレクトリを削除
        if os.path.exists(avatar_dir):
            shutil.rmtree(avatar_dir)
    
    def test_avatar_update(self):
        """アバター更新処理をテスト"""
        # テスト用ユーザーを作成
        user = User.objects.create_user(
            username='updateuser',
            email='updateuser@example.com',
            password='testpassword123'
        )
        
        # 初期アバター設定
        initial_avatar = SimpleUploadedFile(
            "initial_avatar.jpg",
            b"initialcontent",
            content_type="image/jpeg"
        )
        user.avatar.save('avatar.jpg', initial_avatar, save=True)
        initial_path = user.avatar.path
        avatar_dir = os.path.dirname(initial_path)
        
        # ログイン
        self.client.login(username='updateuser', password='testpassword123')
        
        # 新しいアバターでアップデート
        updated_avatar = SimpleUploadedFile(
            "updated_avatar.png",
            b"updatedcontent",
            content_type="image/png"
        )
        
        response = self.client.post(
            self.update_user_info_url,
            {
                'username': 'updateuser',
                'avatar': updated_avatar
            }
        )
        
        # 成功レスポンスを確認
        self.assertEqual(response.status_code, 200)
        
        # ユーザーを再取得
        user.refresh_from_db()
        
        # アバターが更新されていることを確認
        self.assertTrue(user.avatar)
        self.assertTrue(os.path.exists(user.avatar.path))
        
        # ユーザー情報APIでアバターURLが正しく返されることを確認
        response = self.client.get(self.user_info_url)
        data = json.loads(response.content)
        self.assertTrue('avatar' in data['user'])
        self.assertTrue(data['user']['avatar'])  # アバターURLが非空であること
        
        # クリーンアップ - ユーザーのアバターディレクトリを削除
        if os.path.exists(avatar_dir):
            shutil.rmtree(avatar_dir) 