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
from django.db.models import Q
from .models import User, Friend

# User = get_user_model()

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
def user_list_api(request):
	print("user_list_api")
	if request.method != 'GET':
		return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)
	try:
		user_list = User.objects.all()
		user_data = {}
		for user in user_list:
			if user.id == request.user.id:
				continue
			user_data[str(user.id)] = {
				'username': user.username,
				'email': user.email,
				'avatar': user.get_avatar_url(),
				'password': user.password
			}
		return JsonResponse({
		    'status': 'success',
		    'user_list': user_data
		})
	except Exception as e:
		print(f"Error occurred: {str(e)}")  # エラーの詳細を出力
		return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@csrf_exempt
@login_required
def friend_list_api(request):
    print("friend_list_api")
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)

    try:
        user_list = User.objects.all()
        friend_db = Friend.objects.filter(Q(user_id=request.user.id) | Q(friend_id=request.user.id))
        print(str(friend_db))
        friend_list = {}
        for friend in friend_db:
            user = user_list.get(id=friend.friend_id)
            print(user.id, user.username, friend.status)
            if user.id == request.user.id:
                continue
			# TODO error handling
            friend_list[str(user.id)] = {
                'username': user.username,
                'email': user.email,
				'avatar': user.get_avatar_url(),
				'status': friend.status,
            }
        friend_requests = Friend.objects.filter(friend_id=request.user.id, status='pending')
        print(friend_requests)
        friend_request_list = {}
        for friend_request in friend_requests:
            user = user_list.get(id=friend_request.user_id)
            print(user.id)
            friend_request_list[str(user.id)] = {
                'username': user.username,
                'email': user.email,
				'avatar': user.get_avatar_url(),
				'status': friend_request.status,
            }
        print(friend_request_list)

        return JsonResponse({
            'status': 'success',
            'friend_list': friend_list,
			'friend_request_list': friend_request_list,
        })
    except Exception as e:
        print(f"Error occurred: {str(e)}")  # エラーの詳細を出力
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@csrf_exempt
@login_required
def add_friend_api(request):
    print("add_friend_api")
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)
	
    try:
        friend_id = request.POST.get('friend_id')
        print("user_id")
        print(request.user.id)
        print("friend_id")
        print(friend_id)
        friend_info = User.objects.get(id=friend_id)
        if (Friend.objects.filter(user_id=request.user.id, friend_id=friend_id).exists()): 
            print("Friend request already sent")
            return JsonResponse({'status': 'error', 'message': 'Friend request already sent'}, status=400)
        Friend.objects.create(user_id=request.user.id, friend_id=friend_id, status='pending')
        print("Friend request sent")
        return JsonResponse({'status': 'success', 'message': 'Friend request sent'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
# request: user_id
def accept_friend_api(request):
    if request.method != 'POST':
        print("Invalid request method")
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)

    try:
        friend_id = request.POST.get('friend_id')
        print("friend_id", friend_id)
        friend_request = Friend.objects.get(user_id=friend_id, friend_id=request.user.id)
        friend_request.status = 'accepted'
        friend_request.save()
        print("Friend request accepted")
        return JsonResponse({'status': 'success', 'message': 'Friend request sent'})
    except ObjectDoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

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