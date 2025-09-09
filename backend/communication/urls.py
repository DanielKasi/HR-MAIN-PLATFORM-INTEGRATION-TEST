from django.urls import path
from .views import sse_notifications

urlpatterns = [
    path('notifications/sse/', sse_notifications, name='sse_notifications'),
    
]