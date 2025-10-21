from celery import shared_task
from django.utils import timezone
from .models import JobPositionAdvert

@shared_task
def expire_job_adverts():
    """
    Celery task to update all job adverts that have reached their expiry date.
    Sets job_position_advert_status to 'expired' and is_active to False.
    """
    expired_adverts = JobPositionAdvert.objects.filter(
        job_position_advert_status__in=['pending_approval', 'active'],
        expiry_date__lte=timezone.now(),
        is_active=True
    )
    
    updated_count = expired_adverts.update(
        job_position_advert_status='expired',
        is_active=False
    )
    
    return f"Updated {updated_count} job adverts to expired status"