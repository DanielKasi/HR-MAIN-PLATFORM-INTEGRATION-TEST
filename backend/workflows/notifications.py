from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

def notify_task_update(task):
    """Send WebSocket notification about task update"""
    channel_layer = get_channel_layer()

    # Get all users who should be notified (approvers and users with approver roles)
    approver_users = set()

    # Add users with approver roles
    for role in task.step.roles.all():
        for user_role in role.approver_role.user_roles.all():
            approver_users.add(user_role.user.id)

    # Add explicit approvers
    for approver in task.step.approver.all():
        approver_users.add(approver.approver_user.user.id)

    # Import here to avoid circular import
    from workflows.serializers import ApprovalTaskSerializer

    # Serialize task data
    serializer = ApprovalTaskSerializer(task)
    task_data = serializer.data

    # Send notification to each user
    for user_id in approver_users:
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}_notifications",
            {
                "type": "notification_message",
                "message": f"You have a new task to approve: {task.step.step_name}",
                "task": task_data
            }
        )

        # Also send updated tasks list
        send_updated_tasks_to_user(user_id)

def notify_task_completion(task):
    """Notify about task completion"""
    channel_layer = get_channel_layer()

    # Notify the task creator/owner if applicable
    if hasattr(task.content_object, 'created_by') and task.content_object.created_by:
        user_id = task.content_object.created_by.id
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}_notifications",
            {
                "type": "notification_message",
                "message": f"Your {task.step.action.label} was approved by {task.approved_by.user.fullname}"
            }
        )

def notify_task_rejection(task):
    """Notify about task rejection"""
    channel_layer = get_channel_layer()

    # Notify the task creator/owner if applicable
    if hasattr(task.content_object, 'created_by') and task.content_object.created_by:
        user_id = task.content_object.created_by.id
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}_notifications",
            {
                "type": "notification_message",
                "message": f"Your {task.step.action.label} was rejected by {task.approved_by.user.fullname}"
            }
        )

def send_updated_tasks_to_user(user_id):
    """Send updated tasks list to a specific user"""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        user_roles = user.user_roles.values_list("role_id", flat=True)

        # Import here to avoid circular import
        from django.db.models import Q
        from workflows.models import ApprovalTask
        from workflows.serializers import ApprovalTaskSerializer

        tasks = ApprovalTask.objects.filter(
            Q(step__roles__approver_role__id__in=user_roles) |
            Q(step__approver__approver_user__user__id=user.id)
        ).distinct()

        serializer = ApprovalTaskSerializer(tasks, many=True)
        tasks_data = serializer.data

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}_notifications",
            {
                "type": "tasks_update",
                "tasks": tasks_data
            }
        )
    except User.DoesNotExist:
        pass

def notify_workflow_participants(task, status_change, user):
    """Notify all participants in a workflow about status changes"""
    channel_layer = get_channel_layer()

    # Import here to avoid circular import
    from django.db.models import Q
    from workflows.models import ApprovalTask

    # Get all tasks related to this workflow
    related_tasks = ApprovalTask.objects.filter(
        content_type=task.content_type,
        object_id=task.object_id
    )

    # Collect all users involved in this workflow
    involved_users = set()
    for related_task in related_tasks:
        # Add users with approver roles
        for role in related_task.step.roles.all():
            for user_role in role.approver_role.user_roles.all():
                involved_users.add(user_role.user.id)

        # Add explicit approvers
        for approver in related_task.step.approver.all():
            involved_users.add(approver.approver_user.user.id)

    # Send notification to all involved users
    for user_id in involved_users:
        if user_id != user.id:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}_notifications",
                {
                    "type": "notification_message",
                    "message": f"Task '{task.step.step_name}' has been {status_change} by {user.fullname}"
                }
            )

            # Also send updated tasks list
            send_updated_tasks_to_user(user_id)
