from django.db import models
import uuid

class History(models.Model):
    user_id = models.CharField(max_length=255)
    audio_name = models.CharField(max_length=255)
    transcription = models.TextField()
    extracted_content = models.JSONField()
    audio_filename = models.CharField(max_length=255, default="")
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.audio_name