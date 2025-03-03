from django.db import models
import uuid
from .game import Game
from .user import User

class GamePlayers(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    nickname = models.CharField(max_length=255, null=True, blank=True)
    score = models.IntegerField(default=0)
    player_number = models.IntegerField()

    def __str__(self):
        return f"Player {self.player_number} in Game {self.game.id}"