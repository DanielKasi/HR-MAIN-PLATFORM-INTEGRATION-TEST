from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from django.apps import apps
from .models import AuditLog
from django.contrib.auth import get_user_model
import json

User = get_user_model()

# Store instance state before saving to track changes
def get_instance_changes(instance, old_instance=None):
    """
    Compare old and new instance to detect changes for UPDATE actions.
    Returns a dictionary of changed fields.
    """
    changes = {}
    if old_instance:
        for field in instance._meta.fields:
            field_name = field.name
            old_value = getattr(old_instance, field_name, None)
            new_value = getattr(instance, field_name, None)
            if old_value != new_value:
                changes[field_name] = {
                    "old": str(old_value),
                    "new": str(new_value),
                }
    return changes

# Store old instance for UPDATE tracking
_instance_tracker = {}

@receiver(pre_save)
def store_old_instance(sender, instance, **kwargs):
    """
    Store the old instance before saving to track changes for UPDATE.
    """
    # Exclude specific models from auditing
    excluded_models = ['auditlog', 'session', 'migration', 'contenttype', 'logentry']
    if sender._meta.model_name.lower() in excluded_models:
        return
    if instance.pk:
        try:
            _instance_tracker[instance] = sender.objects.get(pk=instance.pk)
        except sender.DoesNotExist:
            _instance_tracker[instance] = None

@receiver(post_save)
def log_save_action(sender, instance, created, **kwargs):
    """
    Automatically log CREATE and UPDATE actions for all models except excluded ones.
    """
    # Exclude specific models from auditing
    excluded_models = ['auditlog', 'session', 'migration', 'contenttype', 'logentry']
    if sender._meta.model_name.lower() in excluded_models:
        return

    action = "CREATE" if created else "UPDATE"
    user = None
    institution = None
    request = get_current_request()  # From middleware
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
        # Get institution from user profile
        if hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
            institution = user.profile.institution

    changes = {}
    description = f"{action.title()}d {sender._meta.model_name}: {str(instance)}"

    if action == "UPDATE":
        old_instance = _instance_tracker.get(instance)
        changes = get_instance_changes(instance, old_instance)
        if not changes:
            return  # Skip logging if no changes detected

    AuditLog.objects.create(
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action=action,
        user=user,
        institution=institution,
        description=description,
        changes=changes if changes else None,
    )

    # Clean up tracker
    if instance in _instance_tracker:
        del _instance_tracker[instance]

@receiver(post_delete)
def log_delete_action(sender, instance, **kwargs):
    """
    Automatically log DELETE actions for all models except excluded ones.
    """
    # Exclude specific models from auditing
    excluded_models = ['auditlog', 'session', 'migration', 'contenttype', 'logentry']
    if sender._meta.model_name.lower() in excluded_models:
        return

    user = None
    institution = None
    request = get_current_request()  # From middleware
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
        # Get institution from user profile
        if hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
            institution = user.profile.institution

    AuditLog.objects.create(
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action="DELETE",
        user=user,
        institution=institution,
        description=f"Deleted {sender._meta.model_name}: {str(instance)}",
    )

# Middleware to pass request context
from threading import local

_request_local = local()

def get_current_request():
    return getattr(_request_local, 'request', None)

class RequestMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _request_local.request = request
        response = self.get_response(request)
        return response