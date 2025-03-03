# Generated by Django 3.2.25 on 2025-02-17 05:15

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0004_game'),
    ]

    operations = [
        migrations.CreateModel(
            name='GamePlayers',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('nickname', models.CharField(blank=True, max_length=255, null=True)),
                ('score', models.IntegerField(default=0)),
                ('player_number', models.IntegerField()),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='pong.game')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
