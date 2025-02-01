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
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(username='admin', email='admin@example.com', password='admin_password')

# 通常ユーザーの作成
if not User.objects.filter(username='user').exists():
    User.objects.create_user(username='user', email='user@example.com', password='user_password')
EOF

python manage.py collectstatic --no-input --clear

# サーバー起動
if [ "$DEBUG" = "1" ]; then
    exec python manage.py runserver 0.0.0.0:8000
else
    exec gunicorn myproject.wsgi:application --bind 0.0.0.0:8000
fi

