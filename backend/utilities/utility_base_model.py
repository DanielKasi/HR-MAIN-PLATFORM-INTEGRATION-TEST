from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeletableTimeStampedModel(TimeStampedModel):
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="%(app_label)s_%(class)s_creates",  
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        "users.CustomUser",
        related_name="%(app_label)s_%(class)s_updates",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        """Soft-deletes the record by setting the deleted_at timestamp."""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deleted_at", "is_active"])
