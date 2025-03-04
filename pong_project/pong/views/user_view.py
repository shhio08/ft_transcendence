from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
import os
User = get_user_model()

@login_required
def user_info_api(request):
    user = request.user
    
    if user.avatar:
        host = request.get_host()
        if ':' not in host:
            host += ':8080'
        avatar_url = f"http://{host}{user.avatar.url}"
    else:
        # アバターが設定されていない場合はデフォルト画像を使用
        # 42認証ユーザーの場合でもアバターが設定されていないケースのみここに来る
        avatar_url = "/static/pong/images/avatar-default.jpg"
        
    return JsonResponse({
        'status': 'success',
        'user': {
            'username': user.username,
            'avatar': avatar_url,
            'two_factor_enabled': user.two_factor_enabled
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
            # 既存のアバターファイルがある場合は削除
            if user.avatar:
                old_avatar_path = user.avatar.path
                if os.path.exists(old_avatar_path):
                    os.remove(old_avatar_path)
            
            # 拡張子を取得して保持
            ext = avatar.name.split('.')[-1] if '.' in avatar.name else 'png'
            user.avatar.save(f'avatar.{ext}', avatar, save=True)

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