# Generated by Django 3.2.25 on 2025-03-03 13:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0006_merge_0002_friend_0005_gameplayers'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='backup_codes',
            field=models.JSONField(blank=True, default=list, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='totp_secret',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='two_factor_enabled',
            field=models.BooleanField(default=False),
        ),
    ]
