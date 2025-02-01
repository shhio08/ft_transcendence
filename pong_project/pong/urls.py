from django.urls import path
from . import views

urlpatterns = [
    path('api/login/', views.login_api, name='login_api'),  # ログインAPIのパスを追加
    path('api/user-count/', views.user_count, name='user_count'),  # ユーザー数取得APIのパスを追加
    path('api/logout/', views.logout_api, name='logout_api'),  # ログアウトAPIのパスを追加
    path('api/signup/', views.signup_api, name='signup_api'),  # サインアップAPIのパスを追加
	path('api/user-info/', views.user_info_api, name='user_info_api'),  # ユーザー情報取得APIのパスを追加
]