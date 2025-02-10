from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.middleware.csrf import get_token
import json
from django.contrib.auth.decorators import login_required
from rest_framework.authtoken.models import Token
import base64
from django.core.files.base import ContentFile
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()

# Create your views here.
def index(request):
	return render(request, 'pong/index.html')

def health_check(request):
	return JsonResponse({'status': 'healthy'})

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
			token, created = Token.objects.get_or_create(user=user)
			return JsonResponse({'status': 'success', 'message': 'Logged in successfully', 'token': token.key})
		else:
			return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=401)
	return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

def user_count(request):
	if request.method == 'GET':
		count = User.objects.count()
		return JsonResponse({'user_count': count})
	return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def logout_api(request):
	if request.method == 'POST':
		token_key = request.headers.get('Authorization').split(' ')[1]
		Token.objects.filter(key=token_key).delete()
		logout(request)
		return JsonResponse({'status': 'success', 'message': 'Logged out successfully'})
	return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def signup_api(request):
	print("signup_api")
	if request.method == 'POST':
		username = request.POST.get('username')
		email = request.POST.get('email')
		password = request.POST.get('password')
		avatar = request.FILES.get('avatar')

		if not username or not email or not password:
			return JsonResponse({'status': 'error', 'message': 'Missing fields'}, status=400)
		
		try:
			user = User.objects.create_user(username=username, email=email, password=password)
			if avatar:
				user.avatar.save(f'{username}_avatar.png', avatar, save=True)
			user.save()
			
			login(request, user)
			# トークンを生成
			token, created = Token.objects.get_or_create(user=user)
			
			return JsonResponse({
				'status': 'success',
				'message': 'User created successfully',
				'token': token.key  # トークンをレスポンスに追加
			})
		except Exception as e:
			return JsonResponse({'error': str(e)}, status=400)
	return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@login_required
def user_info_api(request):
	user = request.user
	avatar_url = None
	if user.avatar:
		host = request.get_host()
		# 手動でポート番号を追加
		if ':' not in host:
			host += ':8080'  # 必要なポート番号を指定
		avatar_url = f"http://{host}{user.avatar.url}"
	return JsonResponse({
		'status': 'success',
		'user': {
			'username': user.username,
			'avatar': avatar_url
		}
	})

@csrf_exempt
@login_required
def friend_list_api(request):
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)

    try:
        users = User.objects.all()
        if not users.exists():  # ユーザが空の時
            User.objects.create_user(username='default_user', email='default@example.com', password='defaultpassword')
            users = User.objects.all()  # ユーザを再取得

        return JsonResponse({
            'status': 'success',
            'users': {
                user.id: {
                    'username': user.username,
                    'email': user.email,
                } for user in users
            }
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def update_user_info_api(request):
	try:
		username = request.POST.get('username')
		avatar = request.FILES.get('avatar')

		user = request.user

		if username:
			user.username = username

		if avatar:
			user.avatar.save(f'{user.id}_avatar.png', avatar, save=True)

		user.save()

		return JsonResponse({'status': 'success', 'message': 'User info updated successfully'})
	except ObjectDoesNotExist:
		return JsonResponse({'status': 'error', 'message': 'User not found'}, status=404)
	except Exception as e:
		return JsonResponse({'status': 'error', 'message': str(e)}, status=400)