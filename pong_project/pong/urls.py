from django.urls import path
from .views import login_api, logout_api, signup_api, user_info_api, update_user_info_api, user_count
from .views import create_game, get_game, create_player, get_players, update_player_score, update_game_winner, get_result, get_user_game_history
from .views import update_player_score, update_game_winner, get_result
from .views import user_list_api, friend_list_api, accept_friend_api, add_friend_api, reject_friend_api
from .views import verify_2fa_api, setup_2fa_api, confirm_2fa_api, disable_2fa_api
from .views import oauth_42_callback
from .views import create_game_options, get_game_options
from .views import pending_requests_api
from .views import create_tournament, get_tournament, setup_final_match

urlpatterns = [
    path('api/login/', login_api, name='login_api'),  # ログインAPIのパスを追加
    path('api/verify-2fa/', verify_2fa_api, name='verify_2fa_api'),
    path('api/setup-2fa/', setup_2fa_api, name='setup_2fa_api'),
    path('api/confirm-2fa/', confirm_2fa_api, name='confirm_2fa_api'),
    path('api/disable-2fa/', disable_2fa_api, name='disable_2fa_api'),
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
    path('api/user-game-history/', get_user_game_history, name='get_user_game_history'),
    path('api/user-list/', user_list_api, name='user_list_api'),  # ユーザー一覧取得APIのパスを追加
    path('api/friend-list/', friend_list_api, name='friend_list_api'),  # ユーザー一覧取得APIのパスを追加
    path('api/accept-friend/', accept_friend_api, name='friend_request_api'),  # フレンドリクエストAPIのパスを追加
    path('api/add-friend/', add_friend_api, name='add_friend_api'),  # フレンド追加APIのパスを追加
    path('api/reject-friend/', reject_friend_api, name='reject_friend_api'),  # フレンドリクエスト拒否APIのパスを追加
    path('api/oauth/42/callback/', oauth_42_callback, name='oauth_42_callback'),
    path('api/create-game-options/', create_game_options, name='create_game_options'),
    path('api/get-game-options/', get_game_options, name='get_game_options'),
    path('api/pending-requests/', pending_requests_api, name='pending-requests'),
    path('api/create-tournament/', create_tournament, name='create_tournament'),
    path('api/get-tournament/', get_tournament, name='get_tournament'),
    path('api/setup-final-match/', setup_final_match, name='setup_final_match'),
]
