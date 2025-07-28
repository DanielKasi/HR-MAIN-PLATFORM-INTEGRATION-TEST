from django.db import models
from django.utils.text import slugify
from institution.models import Institution

class DocumentType(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, editable=False)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-generate code from name
        if not self.code:
            self.code = slugify(self.name).replace('-', '_')
            # Ensure code uniqueness
            base_code = self.code
            counter = 1
            while DocumentType.objects.filter(code=self.code).exclude(pk=self.pk).exists():
                self.code = f"{base_code}_{counter}"
                counter += 1
        super().save(*args, **kwargs)
