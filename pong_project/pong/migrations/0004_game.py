# Generated by Django 3.2.25 on 2025-02-17 03:03

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0003_delete_game'),
    ]

    operations = [
        migrations.CreateModel(
            name='Game',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tournament_id', models.UUIDField(blank=True, null=True)),
                ('mode', models.CharField(choices=[('local', 'Local'), ('online', 'Online'), ('tournament', 'Tournament')], max_length=10)),
                ('winner_id', models.UUIDField(blank=True, null=True)),
                ('played_at', models.DateTimeField()),
            ],
        ),
    ]
