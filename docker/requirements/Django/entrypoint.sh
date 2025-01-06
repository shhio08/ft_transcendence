#!/bin/bash
cd app/code
# マイグレーション実行
python manage.py makemigrations --no-input
python manage.py migrate --no-input

python manage.py collectstatic --no-input --clear

# サーバー起動
if [ "$DEBUG" = "1" ]; then
    exec python manage.py runserver 0.0.0.0:8000
else
    exec gunicorn myproject.wsgi:application --bind 0.0.0.0:8000
fi

