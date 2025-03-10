from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/pong/matchmaking/$', consumers.MatchmakingConsumer.as_asgi()),
    re_path(r'ws/pong/game/$', consumers.GameConsumer.as_asgi()),
] 