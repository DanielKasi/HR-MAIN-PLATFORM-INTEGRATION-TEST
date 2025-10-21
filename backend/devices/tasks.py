from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Device, DeviceStatus

@shared_task
def check_inactive_devices():
    """
    Check for devices that haven't connected in the last 10 minutes
    and update their status accordingly.
    """
    threshold_time = timezone.now() - timedelta(minutes=5)
    
    inactive_devices = Device.objects.filter(
        status=DeviceStatus.ACTIVE,
        last_connection_time__lt=threshold_time,
        last_connection_time__isnull=False
    )
    
    count = inactive_devices.update(status=DeviceStatus.INACTIVE)
    
    return f"Updated {count} devices to inactive status"