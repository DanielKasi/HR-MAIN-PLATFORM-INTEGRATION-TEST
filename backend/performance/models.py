from django.db import models
from institution.models import Institution

class PerformancePolicy(models.Model):
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
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-effective_date']
        
    def __str__(self):
        return f"{self.title}" "{self.version}"    
    