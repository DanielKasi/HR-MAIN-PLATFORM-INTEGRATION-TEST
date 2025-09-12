from django.urls import path
from .views import sse_notifications, MarkNotificationRead, GetAllNotifications

urlpatterns = [
    path('notifications/sse/', sse_notifications, name='sse_notifications'),
    path('notifications/read/', MarkNotificationRead.as_view(), name='mark_notification_read'),
    path('all-notifications/', GetAllNotifications.as_view(), name='all-notifications'),
    
]