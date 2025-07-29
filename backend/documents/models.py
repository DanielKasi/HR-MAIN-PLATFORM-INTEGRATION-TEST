from django.db import models
from django.utils.text import slugify
from institution.models import Institution
from django_ckeditor_5.fields import CKEditor5Field

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

class DocumentTemplate(models.Model):
    document_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    template_type = models.CharField(max_length=50, choices=[
        ('pdf', 'PDF'),
        ('word', 'Word Document'),
        ('text', 'Text'),      
    ])
    file = models.FileField(upload_to='document_templates/', null=True, blank=True)
    content = models.TextField(
        blank=True,
        null=True,
        help_text="Extracted or user-provided content for the template."
    )
    placeholders = models.JSONField(
        default=list,
        help_text="List of placeholders used in the template, e.g. ['{{employee_name}}', '{{date}}']",
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    document_template = models.ForeignKey(DocumentTemplate, on_delete=models.PROTECT)
    placeholder_values = models.JSONField(
        default=dict,
        help_text="Values for the placeholders defined in the template, e.g. {'employee_name': 'John Doe', 'date': '2023-10-01'}"
    )        
    status = models.CharField(
        max_length=20,
        choices=[
            ('penging', 'Pending'),
            ('in_review', 'In Review'),
            ('reviewed', 'Reviewed'),
        ]
    )

    def __str__(self):
        return f"Document for {self.document_template.name} - Status: {self.status}"