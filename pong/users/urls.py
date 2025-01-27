from django.urls import path
from . import views

urlpatterns = [
    path('', views.users_root, name='users-root'),
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('home/', views.home, name='home'),
    path('logout/', views.logout_view, name='logout'),
    # 他のビューを追加する場合はここに記述
] 