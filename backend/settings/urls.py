from django.urls import path
from .views import (
    SystemConfigurationListCreateAPIView,
    SystemConfigurationRetrieveUpdateDeleteAPIView
)

urlpatterns = [
    path(
        'system-configurations/',
        SystemConfigurationListCreateAPIView.as_view(),
        name='system-configuration-list-create'
    ),
    path(
        'system-configurations/<int:pk>/',
        SystemConfigurationRetrieveUpdateDeleteAPIView.as_view(),
        name='system-configuration-retrieve-update-delete'
    ),
]