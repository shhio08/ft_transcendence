from django.db import models
import uuid
from .game import Game

class GameOptions(models.Model):
    BALL_COUNT_CHOICES = [
        (1, '1個'),
        (2, '2個'),
    ]
    
    BALL_SPEED_CHOICES = [
        ('slow', '遅い'),
        ('normal', '普通'),
        ('fast', '速い'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name='options')
    ball_count = models.IntegerField(choices=BALL_COUNT_CHOICES, default=1)
    ball_speed = models.CharField(max_length=10, choices=BALL_SPEED_CHOICES, default='normal')
    
    def __str__(self):
        return f"Options for Game {self.game.id}" 