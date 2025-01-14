from django.urls import path
from . import views

urlpatterns = [
    path('process-audio/', views.process_audio, name='process_audio'),
    path('get-history/', views.get_user_history, name='get_history'),
    path('dashboard/', views.dashboard, name='dashboard'),  # Add this line
]