from django.urls import path
from .views import AcknowledgeView, AcknowledgmentListView, AnnouncementDetailView, AnnouncementListCreateView, sse_notifications, MarkNotificationRead, GetAllNotifications

urlpatterns = [
    path('notifications/sse/', sse_notifications, name='sse_notifications'),
    path('notifications/read/', MarkNotificationRead.as_view(), name='mark_notification_read'),
    path('all-notifications/', GetAllNotifications.as_view(), name='all-notifications'),
    path('announcements/', AnnouncementListCreateView.as_view(), name='announcement-list-create'),
    path('announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail'),
    path('acknowledgments/', AcknowledgmentListView.as_view(), name='acknowledgment-list'),
    path('acknowledge/', AcknowledgeView.as_view(), name='acknowledge'),
]
