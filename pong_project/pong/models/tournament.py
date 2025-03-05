from django.db import models
import uuid
from .user import User

class Tournament(models.Model):
    STATUS_CHOICES = [
        ('pending', '準備中'),
        ('ongoing', '進行中'),
        ('finished', '終了'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tournaments')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})" 