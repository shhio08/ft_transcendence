#!/bin/bash
cd app/code
# マイグレーション実行
python manage.py makemigrations --no-input
python manage.py migrate --no-input

# 初期ユーザー作成
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()

# スーパーユーザーの作成
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser(username='$DJANGO_SUPERUSER_USERNAME', email='$DJANGO_SUPERUSER_EMAIL', password='$DJANGO_SUPERUSER_PASSWORD')

# 通常ユーザーの作成
if not User.objects.filter(username='$DJANGO_USER_USERNAME').exists():
    User.objects.create_user(username='$DJANGO_USER_USERNAME', email='$DJANGO_USER_EMAIL', password='$DJANGO_USER_PASSWORD')
EOF

python manage.py collectstatic --no-input --clear

# ユーザーステータス更新のバックグラウンドプロセスを起動
(
  while true; do
    echo "Updating user status..."
    python manage.py update_user_status
    sleep 300  # 5分待機
  done
) &

# サーバー起動
if [ "$DEBUG" = "1" ]; then
    exec daphne -b 0.0.0.0 -p 8000 pong_project.asgi:application
else
    exec daphne -b 0.0.0.0 -p 8000 pong_project.asgi:application
fi

