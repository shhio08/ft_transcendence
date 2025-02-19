from django.urls import path
from . import views

urlpatterns = [
    path('api/login/', views.login_api, name='login_api'),  # ログインAPIのパスを追加
    path('api/user-count/', views.user_count, name='user_count'),  # ユーザー数取得APIのパスを追加
    path('api/logout/', views.logout_api, name='logout_api'),  # ログアウトAPIのパスを追加
    path('api/signup/', views.signup_api, name='signup_api'),  # サインアップAPIのパスを追加
	path('api/user-info/', views.user_info_api, name='user_info_api'),  # ユーザー情報取得APIのパスを追加
	path('api/update-user-info/', views.update_user_info_api, name='update_user_info_api'),  # ユーザー情報更新APIのパスを追加
    path('api/user-list/', views.user_list_api, name='user_list_api'),  # ユーザー一覧取得APIのパスを追加
    path('api/friend-list/', views.friend_list_api, name='friend_list_api'),  # ユーザー一覧取得APIのパスを追加
    path('api/accept-friend/', views.accept_friend_api, name='friend_request_api'),  # フレンドリクエストAPIのパスを追加
    path('api/add-friend/', views.add_friend_api, name='add_friend_api'),  # フレンド追加APIのパスを追加
    path('api/reject-friend/', views.reject_friend_api, name='reject_friend_api'),  # フレンドリクエスト拒否APIのパスを追加
]
