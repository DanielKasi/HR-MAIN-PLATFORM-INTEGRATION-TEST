from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("EXPORT", "Export"),
        ("DOWNLOAD", "Download"),
    ]

    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="Content type of the object associated with this action, if applicable."
    )
    object_id = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="ID of the object associated with this action, if applicable."
    )
    content_object = GenericForeignKey("content_type", "object_id")

    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(
        'users.CustomUser', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="User who performed the action."
    )
    institution = models.ForeignKey(
        'institution.Institution', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Institution associated with this audit log."
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    changes = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Details of changes made (for updates)."
    )
    description = models.TextField(
        blank=True, 
        help_text="Human-readable description of the action."
    )
    ip_address = models.GenericIPAddressField(
        null=True, 
        blank=True, 
        help_text="IP address of the user performing the action."
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=['institution', 'timestamp']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.action} on {self.content_type.model if self.content_type else 'N/A'} (ID: {self.object_id or 'N/A'}) by {self.user or 'Anonymous'} at {self.timestamp}"