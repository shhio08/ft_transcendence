from django.core.management.base import BaseCommand
from pong.utils.user_status import update_inactive_users

class Command(BaseCommand):
    help = '一定時間アクティブでないユーザーをオフラインに設定します'

    def handle(self, *args, **options):
        updated_count = update_inactive_users()
        self.stdout.write(
            self.style.SUCCESS(f'{updated_count}人のユーザーをオフラインに設定しました')
        ) 