from datetime import timedelta
from django.utils import timezone
from celery import shared_task
from approval.models import ApprovalTask
from communication.views import add_notification  


@shared_task
def send_overdue_approval_reminders():
    """
    Celery task to send reminders for approval tasks
    that are pending and overdue (> 3 days).
    """
    current_time = timezone.now()
    reminder_threshold = timedelta(days=3)

    pending_tasks = ApprovalTask.objects.filter(
        status='pending',
        updated_at__lt=current_time - reminder_threshold
    )

    for task in pending_tasks:
        object_desc = str(task.approval.content_object) if task.approval.content_object else "an object"
        message = (
            f"Reminder: You have a pending approval task for "
            f"{object_desc} at level {task.level.level} that needs attention."
        )

        for approver_user in task.level.get_approver_users():
            add_notification(
                user_id=approver_user.id,
                message=message,
            )
