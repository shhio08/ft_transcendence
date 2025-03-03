from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from pong.models import User, Friend
from django.views.decorators.http import require_http_methods

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
def reject_friend_api(request):
    if request.method != 'POST':
        print("Invalid request method")
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)

    try:
        friend_id = request.POST.get('friend_id')
        print("reject_friend_api")
        print("friend_id", friend_id)
        friend_request = Friend.objects.get(user_id=friend_id, friend_id=request.user.id)
        friend_request.status = 'rejected'
        friend_request.save()
        print("Friend request rejected")
        return JsonResponse({'status': 'success', 'message': 'Friend request rejected'})
    except ObjectDoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
