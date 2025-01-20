from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken import views
from emr_app.views import process_audio, get_user_history, dashboard, RegisterView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Include the app URLs
    path('', include('emr_app.urls')),  # This will include all the URLs from emr_app.urls
    path('api-token-auth/', views.obtain_auth_token, name='api_token_auth'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)