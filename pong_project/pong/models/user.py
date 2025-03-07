from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid
import os
# Create your models here.

def user_avatar_upload_path(instance, filename):
	ext = filename.split('.')[-1]
	filename = f"avatar.{ext}"
	return os.path.join(f"avatars/user_{instance.id}", filename)

class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(email, username, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=255, unique=True, default='default_username')
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to=user_avatar_upload_path, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # 2FA関連フィールド
    two_factor_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=255, blank=True, null=True)
    backup_codes = models.JSONField(default=list, blank=True, null=True)

    # 42 OAuth用のフィールドを追加
    intra_42_id = models.CharField(max_length=255, blank=True, null=True, unique=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username

    def get_avatar_url(self):
        if self.avatar:
            return self.avatar.url
        return '/static/pong/images/avatar-default.jpg'
        
    def enable_2fa(self, secret):
        """2要素認証を有効化"""
        self.totp_secret = secret
        self.two_factor_enabled = True
        self.save()
        
    def disable_2fa(self):
        """2要素認証を無効化"""
        self.totp_secret = None
        self.two_factor_enabled = False
        self.save()
