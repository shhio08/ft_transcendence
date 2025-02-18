from django.urls import path
from .views import login_api, logout_api, signup_api, user_info_api, update_user_info_api, user_count
from .views import create_game, get_game, create_player, get_players
from .views import update_player_score, update_game_winner, get_result

urlpatterns = [
    path('api/login/', login_api, name='login_api'),  # ログインAPIのパスを追加
    path('api/user-count/', user_count, name='user_count'),  # ユーザー数取得APIのパスを追加
    path('api/logout/', logout_api, name='logout_api'),  # ログアウトAPIのパスを追加
    path('api/signup/', signup_api, name='signup_api'),  # サインアップAPIのパスを追加
	path('api/user-info/', user_info_api, name='user_info_api'),  # ユーザー情報取得APIのパスを追加
	path('api/update-user-info/', update_user_info_api, name='update_user_info_api'),  # ユーザー情報更新APIのパスを追加

    path('api/create-game/', create_game, name='create_game'),  # ゲーム作成APIのパスを追加
    path('api/get-game/', get_game, name='get_game'),  # ゲーム取得APIのパスを追加
    path('api/create-player/', create_player, name='create_player'),
    path('api/get-players/', get_players, name='get_players'),
    path('api/update-player-score/', update_player_score, name='update_player_score'),
    path('api/update-game-winner/', update_game_winner, name='update_game_winner'),
    path('api/get-result/', get_result, name='get_result'),
]
