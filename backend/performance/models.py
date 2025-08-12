from django.db import models
from institution.models import Institution
from django.utils import timezone

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
    
    def delete(self, *args, **kwargs):
        """Soft-deletes the record by setting the deleted_at timestamp"""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deleted_at", "is_active"])


class PerformancePolicy(BaseModel):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    document = models.FileField(upload_to="performance/policies/")
    version = models.CharField(max_length=20, default='1.0')
    effective_date = models.DateField()
    review_data = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    
    class Meta:
        ordering = ['-effective_date']
        
    def __str__(self):
        return f"{self.title}" "{self.version}"    
    