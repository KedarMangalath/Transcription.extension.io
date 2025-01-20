# emr_app/urls.py
from django.urls import path
from .views import RegisterView, process_audio, get_user_history, dashboard

urlpatterns = [
    # Remove 'api/' prefix from these URLs
    path('register/', RegisterView.as_view(), name='register'),
    path('process-audio/', process_audio, name='process_audio'),
    path('get-history/', get_user_history, name='get_history'),
    path('dashboard/', dashboard, name='dashboard'),
]