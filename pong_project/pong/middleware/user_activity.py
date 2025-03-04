from datetime import datetime
from django.utils import timezone
from pong.models import UserStatus

class UserActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # リクエスト処理前
        if request.user.is_authenticated:
            # ユーザーがログインしている場合、最終アクティブ時間を更新
            user_status, created = UserStatus.objects.get_or_create(user=request.user)
            user_status.last_active = timezone.now()
            user_status.save()
            
        response = self.get_response(request)
        return response 