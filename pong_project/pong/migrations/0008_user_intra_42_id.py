# Generated by Django 3.2.25 on 2025-03-04 03:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pong', '0007_auto_20250303_1324'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='intra_42_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]
