from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
import json
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required


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

		user = authenticate(request, username=username, password=password)
		if user is not None:
			login(request, user)
			response = JsonResponse({'status': 'success', 'message': 'Logged in successfully'})
			response.set_cookie('loggedIn', 'true')
			return response
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
		logout(request)
		response = JsonResponse({'status': 'success', 'message': 'Logged out successfully'})
		response.delete_cookie('loggedIn')
		return response
	return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@login_required
def home_view(request):
	return render(request, 'pong/home.html')
