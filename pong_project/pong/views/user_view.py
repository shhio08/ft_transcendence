from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
User = get_user_model()

@login_required
def user_info_api(request):
    user = request.user
    avatar_url = None
    if user.avatar:
        host = request.get_host()
        if ':' not in host:
            host += ':8080'
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

def user_count(request):
	if request.method == 'GET':
		count = User.objects.count()
		return JsonResponse({'user_count': count})
	return JsonResponse({'error': 'Invalid request method'}, status=405)