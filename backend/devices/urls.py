from django.urls import path
from .views import DeviceDetailView, DeviceListCreateView, DeviceEmployeeAttachmentListCreateView, DeviceEmployeeAttachmentDetailView

urlpatterns = [
    path('', DeviceListCreateView.as_view(), name='device-list-create'),
    path('<int:pk>/', DeviceDetailView.as_view(), name='device-detail'),
    path('employee-attachments/', DeviceEmployeeAttachmentListCreateView.as_view(), name='employee-attachment-list'),
    path('employee-attachments/<int:pk>/', DeviceEmployeeAttachmentDetailView.as_view(), name='employee-attachment-detail'),
]
