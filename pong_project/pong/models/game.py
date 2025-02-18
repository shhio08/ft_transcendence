from django.db import models
import uuid

class Game(models.Model):
    MODE_CHOICES = [
        ('local', 'Local'),
        ('online', 'Online'),
        ('tournament', 'Tournament'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament_id = models.UUIDField(null=True, blank=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES)
    winner_id = models.UUIDField(null=True, blank=True)
    played_at = models.DateTimeField()

    def __str__(self):
        return f"Game {self.id} - {self.mode}"
