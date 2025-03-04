from django.db import models
import uuid
from .user import User

class UserStatus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='status')
    is_online = models.BooleanField(default=False)
    last_active = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {'Online' if self.is_online else 'Offline'}" 