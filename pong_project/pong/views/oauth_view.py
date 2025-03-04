import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib.auth import get_user_model, login
from rest_framework.authtoken.models import Token
import logging
import json
from datetime import datetime, timedelta
import os
import shutil
from django.core.files import File

# ロガーの設定
logger = logging.getLogger(__name__)

@csrf_exempt
def oauth_42_callback(request):
    """42 OAuthコールバック処理"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
        
    try:
        data = json.loads(request.body)
        code = data.get('code')
        
        if not code:
            return JsonResponse({'status': 'error', 'message': 'No authorization code provided'}, status=400)
            
        # アクセストークンの取得
        token_url = 'https://api.intra.42.fr/oauth/token'
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': settings.FORTY_TWO_CLIENT_ID,
            'client_secret': settings.FORTY_TWO_CLIENT_SECRET,
            'code': code,
            'redirect_uri': settings.FORTY_TWO_REDIRECT_URI
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()
        
        # トークンレスポンスのステータスだけ出力
        print(f"42 API Token Status: {'success' if 'access_token' in token_json else 'failure'}")
        
        if 'access_token' not in token_json:
            return JsonResponse({'status': 'error', 'message': 'Failed to obtain access token'}, status=400)
            
        access_token = token_json['access_token']
        
        # ユーザー情報の取得
        user_url = 'https://api.intra.42.fr/v2/me'
        headers = {'Authorization': f'Bearer {access_token}'}
        user_response = requests.get(user_url, headers=headers)
        user_data = user_response.json()
        
        # 画像データの部分だけを抽出してログ出力
        image_data = user_data.get('image', {})
        print(f"User image data: {json.dumps(image_data, indent=2)}")
        avatar_url = image_data.get('link')
        print(f"Extracted avatar URL: {avatar_url}")
        
        # 42のユーザーIDを取得
        intra_id = user_data.get('id')
        if not intra_id:
            return JsonResponse({'status': 'error', 'message': 'Could not get user information'}, status=400)
            
        # ユーザーモデルのフィールドを確認
        User = get_user_model()
        user_model_fields = [f.name for f in User._meta.get_fields()]
        print(f"User model fields: {user_model_fields}")
        
        # 42のIDをもとにユーザーを検索または作成
        try:
            # 42認証用のカスタムフィールドがあるか確認
            has_intra_field = hasattr(User(), 'intra_42_id')
            print(f"Model has intra_42_id field: {has_intra_field}")
            
            # 42認証用のカスタムフィールドがあると仮定
            user = User.objects.get(intra_42_id=intra_id)
            print(f"Found existing user: {user.username}")
        except User.DoesNotExist:
            # 新規ユーザー作成
            email = user_data.get('email', f'{user_data.get("login")}@42oauth.com')
            username = user_data.get('login', f'42user_{intra_id}')
            
            # 表示名を取得
            display_name = user_data.get('displayname') or user_data.get('login')
            
            # ランダムパスワード生成（ログインには使用しない）
            import secrets
            password = secrets.token_urlsafe(16)
            
            # ユーザー作成
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
            )
            
            # 42認証ユーザー用のIDを設定
            if hasattr(User(), 'intra_42_id'):
                user.intra_42_id = intra_id
            
            # ユーザー専用のアバターファイルを作成
            if hasattr(User(), 'avatar'):
                # デフォルトの42アバター画像のパス
                default_avatar_path = os.path.join(settings.STATIC_ROOT, 'pong/images/avatar-42.png')
                
                # 一時ファイルパス
                temp_path = f'/tmp/avatar_{user.id}.png'
                
                # デフォルトアバターをコピー
                if os.path.exists(default_avatar_path):
                    shutil.copy(default_avatar_path, temp_path)
                    
                    # ユーザーのアバターとして保存（ファイル名はupload_to関数で自動管理）
                    with open(temp_path, 'rb') as f:
                        user.avatar.save('avatar.png', File(f), save=True)
                    
                    # 一時ファイルを削除
                    os.remove(temp_path)
                    print(f"Created avatar file for user {user.id} using 42 default avatar")
                else:
                    print(f"Default avatar file not found at {default_avatar_path}")
            
            user.save()
            
            # 作成したユーザーの重要フィールドだけ出力
            user_data = {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'has_avatar_url': hasattr(user, 'avatar_url'),
                'avatar_url_value': getattr(user, 'avatar_url', None) if hasattr(user, 'avatar_url') else None
            }
            print(f"Created new user: {json.dumps(user_data, indent=2)}")
        
        # ★ ここが重要: ユーザーをDjangoのセッションにログインさせる
        login(request, user)
        print(f"User logged in as: {user.username}")
        
        # トークン認証用のトークンを生成
        token, created = Token.objects.get_or_create(user=user)
        
        # レスポンスデータを準備 - アバターはユーザーオブジェクトから直接取得
        user_data_response = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'nickname': getattr(user, 'nickname', user.username) if hasattr(user, 'nickname') else user.username,
            'avatar': user.get_avatar_url()  # ユーザーモデルのメソッドを使用
        }
        print(f"Response user data: {json.dumps(user_data_response, indent=2)}")
        
        # クッキーにJWTを設定
        from pong.views.auth_view import set_jwt_cookies
        response = JsonResponse({
            'status': 'success', 
            'message': 'Successfully authenticated with 42', 
            'token': token.key,
            'user': user_data_response
        })
        
        # JWTクッキーを設定
        response = set_jwt_cookies(response, user)
        
        # セッションクッキーが確実に送信されるように
        request.session.modified = True
        
        return response
        
    except Exception as e:
        import traceback
        print(f"OAuth error: {str(e)}")
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500) 