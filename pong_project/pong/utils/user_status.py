from datetime import timedelta
from django.utils import timezone
from pong.models import UserStatus

def update_inactive_users(inactive_minutes=15):
    """一定時間アクティブでないユーザーをオフラインに設定"""
    threshold_time = timezone.now() - timedelta(minutes=inactive_minutes)
    updated_count = UserStatus.objects.filter(
        last_active__lt=threshold_time,
        is_online=True
    ).update(is_online=False)
    
    return updated_count 