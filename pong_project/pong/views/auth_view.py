from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
import json

User = get_user_model()

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
            token, created = Token.objects.get_or_create(user=user)
            
            return JsonResponse({
                'status': 'success',
                'message': 'User created successfully',
                'token': token.key
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
