from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.contrib.contenttypes.models import ContentType
from django.apps import apps
from .models import AuditLog
from django.contrib.auth import get_user_model
import json
import re
from functools import wraps

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

def humanize_model_name(model_name):
    """
    Convert model name to human-readable format (e.g., 'employeeworkingdays' -> 'Employee Working Days').
    """
    if not model_name:
        return "data"
    humanized = re.sub(r'([a-z])([A-Z])', r'\1 \2', model_name)  # Split camelCase
    return humanized.replace('_', ' ').title()

def generate_description(action, model_name=None, instance=None, changes=None, extra_info=None):
    """
    Generate a human-readable description for the audit log based on action, model, instance, and changes.
    """
    if action in ["LOGIN", "LOGOUT"]:
        user_str = str(instance) if instance else "Unknown user"
        return f"User {user_str} {action.lower()}ed"
    elif action in ["EXPORT", "DOWNLOAD"]:
        model_name = humanize_model_name(model_name)
        extra_info = extra_info or "unspecified format"
        return f"{action.title()}ed {model_name}: {extra_info}"
    
    humanized_model_name = humanize_model_name(model_name)
    instance_str = str(instance) if instance else "N/A"

    if action == "CREATE":
        return f"Created {humanized_model_name}: {instance_str}"
    elif action == "UPDATE":
        if not changes:
            return f"Updated {humanized_model_name}: {instance_str} (no significant changes)"
        change_details = ", ".join(
            f"{humanize_model_name(field)} from '{change['old']}' to '{change['new']}'"
            for field, change in changes.items()
        )
        return f"Updated {humanized_model_name}: {instance_str} ({change_details})"
    elif action == "DELETE":
        return f"Deleted {humanized_model_name}: {instance_str}"
    return f"{action.title()}d {humanized_model_name}: {instance_str}"

def get_client_ip(request):
    """
    Extract the client's IP address from the request.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def log_action(action, model_name=None, extra_info=None):
    """
    Decorator to log actions (e.g., EXPORT, DOWNLOAD) in views.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            response = view_func(request, *args, **kwargs)
            
            user = request.user if request.user.is_authenticated else None
            institution = None
            ip_address = get_client_ip(request)
            if user and hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
                institution = user.profile.institution

            content_type = None
            object_id = None
            if model_name:
                try:
                    model = apps.get_model(model_name)
                    content_type = ContentType.objects.get_for_model(model)
                except (LookupError, ContentType.DoesNotExist):
                    pass

            description = generate_description(
                action=action,
                model_name=model_name,
                extra_info=extra_info
            )

            AuditLog.objects.create(
                content_type=content_type,
                object_id=object_id,
                action=action,
                user=user,
                institution=institution,
                description=description,
                ip_address=ip_address,
            )

            return response
        return wrapper
    return decorator

# Store old instance for UPDATE tracking
_instance_tracker = {}

@receiver(pre_save)
def store_old_instance(sender, instance, **kwargs):
    """
    Store the old instance before saving to track changes for UPDATE.
    """
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
    excluded_models = ['auditlog', 'session', 'migration', 'contenttype', 'logentry']
    if sender._meta.model_name.lower() in excluded_models:
        return

    action = "CREATE" if created else "UPDATE"
    user = None
    institution = None
    ip_address = None
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
        if hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
            institution = user.profile.institution
        ip_address = get_client_ip(request)

    changes = {}
    if action == "UPDATE":
        old_instance = _instance_tracker.get(instance)
        changes = get_instance_changes(instance, old_instance)
        if not changes:
            pass

    description = generate_description(action, sender._meta.model_name, instance, changes)

    AuditLog.objects.create(
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action=action,
        user=user,
        institution=institution,
        description=description,
        changes=changes if changes else None,
        ip_address=ip_address,
    )

    if instance in _instance_tracker:
        del _instance_tracker[instance]

@receiver(post_delete)
def log_delete_action(sender, instance, **kwargs):
    """
    Automatically log DELETE actions for all models except excluded ones.
    """
    excluded_models = ['auditlog', 'session', 'migration', 'contenttype', 'logentry']
    if sender._meta.model_name.lower() in excluded_models:
        return

    user = None
    institution = None
    ip_address = None
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
        if hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
            institution = user.profile.institution
        ip_address = get_client_ip(request)

    description = generate_description("DELETE", sender._meta.model_name, instance)

    AuditLog.objects.create(
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action="DELETE",
        user=user,
        institution=institution,
        description=description,
        ip_address=ip_address,
    )

@receiver(user_logged_in)
def log_login_action(sender, user, request, **kwargs):
    """
    Log LOGIN actions when a user logs in.
    """
    institution = None
    if hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
        institution = user.profile.institution
    ip_address = get_client_ip(request)

    description = generate_description("LOGIN", instance=user)

    AuditLog.objects.create(
        action="LOGIN",
        user=user,
        institution=institution,
        description=description,
        ip_address=ip_address,
    )

@receiver(user_logged_out)
def log_logout_action(sender, user, request, **kwargs):
    """
    Log LOGOUT actions when a user logs out.
    """
    institution = None
    if hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
        institution = user.profile.institution
    ip_address = get_client_ip(request)

    description = generate_description("LOGOUT", instance=user)

    AuditLog.objects.create(
        action="LOGOUT",
        user=user,
        institution=institution,
        description=description,
        ip_address=ip_address,
    )

def log_export_download_action(action, user, model_name=None, extra_info=None, request=None):
    """
    Utility function to log EXPORT or DOWNLOAD actions.
    Call this from views handling exports or downloads if not using the decorator.
    """
    if action not in ["EXPORT", "DOWNLOAD"]:
        raise ValueError("Action must be 'EXPORT' or 'DOWNLOAD'")

    institution = None
    ip_address = None
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user if user is None else user
        if hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
            institution = user.profile.institution
        ip_address = get_client_ip(request)

    description = generate_description(action, model_name=model_name, extra_info=extra_info)

    content_type = None
    object_id = None
    if model_name:
        try:
            model = apps.get_model(model_name)
            content_type = ContentType.objects.get_for_model(model)
        except (LookupError, ContentType.DoesNotExist):
            pass

    AuditLog.objects.create(
        content_type=content_type,
        object_id=object_id,
        action=action,
        user=user,
        institution=institution,
        description=description,
        ip_address=ip_address,
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