"""
ASGI config for pong_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django

# 最初に環境変数を設定
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pong_project.settings')

# 次にDjangoを初期化（これが重要！）
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import pong.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            pong.routing.websocket_urlpatterns
        )
    ),
})
