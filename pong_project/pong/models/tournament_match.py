from django.db import models
import uuid
from .tournament import Tournament
from .game import Game

class TournamentMatch(models.Model):
    ROUND_CHOICES = [
        ('semifinal', '準決勝'),
        ('final', '決勝'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    game = models.OneToOneField(Game, on_delete=models.SET_NULL, null=True, blank=True)
    round = models.CharField(max_length=10, choices=ROUND_CHOICES)
    match_number = models.IntegerField()  # 同一ラウンド内での試合番号
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.get_round_display()} Match {self.match_number} - Tournament {self.tournament.id}" 