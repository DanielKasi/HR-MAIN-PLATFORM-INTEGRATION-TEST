from django.urls import path
from .views import AcknowledgeView, AnnouncementDetailView, AnnouncementListCreateView, EmployeeAnnouncementAcknowledgmentListView, NotificationListView, NotificationMarkReadView, GetAllNotifications

urlpatterns = [
    # path('notifications/sse/', sse_notifications, name='sse_notifications'),
    path('notifications/sse/', NotificationListView.as_view(), name='notifications'),
    path('notifications/read/', NotificationMarkReadView.as_view(), name='mark_notification_read'),
    path('all-notifications/', GetAllNotifications.as_view(), name='all-notifications'),
    path('announcements/', AnnouncementListCreateView.as_view(), name='announcement-list-create'),
    path('announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail'),
    path('acknowledgments/', EmployeeAnnouncementAcknowledgmentListView.as_view(), name='employee-announcement-acknowledgment-list'),
    path('acknowledge/', AcknowledgeView.as_view(), name='acknowledge'),
]
