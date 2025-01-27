# Generated by Django 5.1.4 on 2025-01-16 07:24

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='History',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.CharField(max_length=255)),
                ('audio_name', models.CharField(max_length=255)),
                ('transcription', models.TextField()),
                ('extracted_content', models.JSONField()),
                ('audio_filename', models.CharField(default='', max_length=255)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
