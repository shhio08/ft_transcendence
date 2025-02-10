from django.urls import path
from .views import login_api, logout_api, signup_api, user_info_api, update_user_info_api, user_count

urlpatterns = [
    path('api/login/', login_api, name='login_api'),  # ログインAPIのパスを追加
    path('api/user-count/', user_count, name='user_count'),  # ユーザー数取得APIのパスを追加
    path('api/logout/', logout_api, name='logout_api'),  # ログアウトAPIのパスを追加
    path('api/signup/', signup_api, name='signup_api'),  # サインアップAPIのパスを追加
	path('api/user-info/', user_info_api, name='user_info_api'),  # ユーザー情報取得APIのパスを追加
	path('api/update-user-info/', update_user_info_api, name='update_user_info_api'),  # ユーザー情報更新APIのパスを追加
]
