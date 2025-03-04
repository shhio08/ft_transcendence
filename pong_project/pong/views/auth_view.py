from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
import json
import pyotp
import qrcode
import base64
import io
from django.conf import settings
import os
import shutil
from django.core.files import File
from pong.models import UserStatus  # 追加

User = get_user_model()

def set_jwt_cookies(response, user):
    """JWTをクッキーに設定する共通関数"""
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    response.set_cookie(
        key=settings.SIMPLE_JWT['AUTH_COOKIE'],
        value=access_token,
        expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
    )
    return response

@csrf_exempt
def login_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        user = authenticate(username=username, password=password)
        if user is not None:
            login(request, user)
            
            # ユーザーのオンライン状態を更新
            user_status, created = UserStatus.objects.get_or_create(user=user)
            user_status.is_online = True
            user_status.save()
            
            # 2FAが有効な場合はそのステータスを返す
            if user.two_factor_enabled:
                return JsonResponse({
                    'status': 'requires_2fa', 
                    'message': '2FA verification required',
                    'username': username
                })
            
            # 通常認証（2FAなし）
            token, created = Token.objects.get_or_create(user=user)
            
            # JWTトークンも生成
            response = JsonResponse({
                'status': 'success', 
                'message': 'Logged in successfully', 
                'token': token.key
            })
            
            # クッキーにJWTを設定
            response = set_jwt_cookies(response, user)
            return response
        else:
            return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=401)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def verify_2fa_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            code = data.get('code')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
        try:
            user = User.objects.get(username=username)
            
            # TOTPコードを検証
            totp = pyotp.TOTP(user.totp_secret)
            if totp.verify(code):
                login(request, user)
                token, created = Token.objects.get_or_create(user=user)
                
                # JWTトークンも生成
                response = JsonResponse({
                    'status': 'success', 
                    'message': '2FA verification successful', 
                    'token': token.key
                })
                
                # クッキーにJWTを設定
                response = set_jwt_cookies(response, user)
                return response
            else:
                return JsonResponse({'status': 'error', 'message': 'Invalid 2FA code'}, status=401)
        except User.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'User not found'}, status=404)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def logout_api(request):
    if request.method == 'POST':
        # ユーザーがログインしている場合、オンライン状態を更新
        if request.user.is_authenticated:
            try:
                user_status = UserStatus.objects.get(user=request.user)
                user_status.is_online = False
                user_status.save()
            except UserStatus.DoesNotExist:
                pass
        
        # トークン認証のログアウト処理（レガシーサポート）
        token_key = request.headers.get('Authorization', '').split(' ')[1] if request.headers.get('Authorization') else None
        if token_key:
            Token.objects.filter(key=token_key).delete()
        
        # Djangoセッションのログアウト処理
        logout(request)
        
        # クッキーからJWTを削除するレスポンスを作成
        response = JsonResponse({'status': 'success', 'message': 'Logged out successfully'})
        
        # JWTクッキーを削除（secureパラメータを削除）
        response.delete_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE'],
            path='/',  # クッキーのパスを指定
            domain=None,  # 現在のドメインのみ
            samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
        )
        
        # リフレッシュトークンも使用している場合は、そのクッキーも削除
        if hasattr(settings.SIMPLE_JWT, 'REFRESH_TOKEN_COOKIE'):
            response.delete_cookie(
                key=settings.SIMPLE_JWT['REFRESH_TOKEN_COOKIE'],
                path='/',
                domain=None,
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
            )
        
        return response
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def setup_2fa_api(request):
    """2要素認証のセットアップ"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
        
    # ユーザー認証の確認
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)
    
    # 新しいTOTP秘密鍵を生成
    secret = pyotp.random_base32()
    
    # QRコード用のURL生成
    totp = pyotp.TOTP(secret)
    provisioning_url = totp.provisioning_uri(name=user.email, issuer_name='Pong Game')
    
    # QRコード画像の生成
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(provisioning_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_code_image = base64.b64encode(buffer.getvalue()).decode()
    
    # 秘密鍵をセッションに一時保存（確認後に保存するため）
    request.session['temp_2fa_secret'] = secret
    
    return JsonResponse({
        'status': 'success', 
        'secret': secret,
        'qr_code': qr_code_image
    })

@csrf_exempt
def confirm_2fa_api(request):
    """2要素認証の設定確認"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
        
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)
        
    try:
        data = json.loads(request.body)
        code = data.get('code')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    # セッションから一時的な秘密鍵を取得
    secret = request.session.get('temp_2fa_secret')
    if not secret:
        return JsonResponse({'status': 'error', 'message': 'No 2FA setup in progress'}, status=400)
        
    # コードを検証
    totp = pyotp.TOTP(secret)
    if totp.verify(code):
        # 2FAを有効化
        user.enable_2fa(secret)
        # セッションから一時的な秘密鍵を削除
        del request.session['temp_2fa_secret']
        
        return JsonResponse({'status': 'success', 'message': '2FA enabled successfully'})
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid verification code'}, status=400)

@csrf_exempt
def disable_2fa_api(request):
    """2要素認証の無効化"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
        
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)
        
    try:
        data = json.loads(request.body)
        code = data.get('code')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
    # コードを検証
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(code):
        # 2FAを無効化
        user.disable_2fa()
        return JsonResponse({'status': 'success', 'message': '2FA disabled successfully'})
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid verification code'}, status=400)

@csrf_exempt
def signup_api(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        avatar = request.FILES.get('avatar')

        if not username or not email or not password:
            return JsonResponse({'status': 'error', 'message': 'Missing fields'}, status=400)
        
        try:
            user = User.objects.create_user(username=username, email=email, password=password)
            
            # アバターがアップロードされた場合
            if avatar:
                user.avatar.save('avatar.png', avatar, save=True)
            # アバターがアップロードされなかった場合はデフォルト画像をコピー
            else:
                import os
                import shutil
                from django.core.files import File
                from django.conf import settings
                
                # デフォルトアバター画像のパス
                default_avatar_path = os.path.join(settings.STATIC_ROOT, 'pong/images/avatar-default.jpg')
                
                # 一時ファイルパス
                temp_path = f'/tmp/avatar_{user.id}.jpg'
                
                # デフォルトアバターをコピー
                if os.path.exists(default_avatar_path):
                    shutil.copy(default_avatar_path, temp_path)
                    
                    # ユーザーのアバターとして保存（ファイル名はupload_to関数で自動管理）
                    with open(temp_path, 'rb') as f:
                        user.avatar.save('avatar.jpg', File(f), save=True)
                    
                    # 一時ファイルを削除
                    os.remove(temp_path)
                    print(f"Created avatar file for user {user.id} using default avatar")
                else:
                    print(f"Default avatar file not found at {default_avatar_path}")
            
            user.save()
            
            # ユーザーのオンライン状態を作成
            UserStatus.objects.create(user=user, is_online=True)
            
            login(request, user)
            token, created = Token.objects.get_or_create(user=user)
            
            # JWTトークンも生成
            response = JsonResponse({
                'status': 'success',
                'message': 'User created successfully',
                'token': token.key
            })
            
            # クッキーにJWTを設定
            response = set_jwt_cookies(response, user)
            return response
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
