from django.urls import path
from .views import (
    MeetingIntegrationListCreateView,
    MeetingIntegrationDetailView,
    SystemConfigurationListCreateAPIView,
    SystemConfigurationRetrieveUpdateDeleteAPIView,
    SystemDayListVIew,
)

urlpatterns = [
    path("system-days/", SystemDayListVIew.as_view(), name="system-day-list"),
    path(
        "system-configurations/",
        SystemConfigurationListCreateAPIView.as_view(),
        name="system-configuration-list-create",
    ),
    path(
        "system-configurations/<int:pk>/",
        SystemConfigurationRetrieveUpdateDeleteAPIView.as_view(),
        name="system-configuration-retrieve-update-delete",
    ),
    path("meeting-integration/", MeetingIntegrationListCreateView.as_view(), name="meeting-integration"),
    path("meeting-integration/<int:pk>/", MeetingIntegrationDetailView.as_view())
]
