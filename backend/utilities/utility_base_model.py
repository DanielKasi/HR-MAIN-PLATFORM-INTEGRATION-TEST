from django.db import models
from django.utils import timezone


class UtilityBaseModel(models.Model):

    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
    
    def delete(self, *args, **kwargs):
        """Soft-deletes the record by setting the deleted_at timestamp."""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deleted_at", "is_active"])