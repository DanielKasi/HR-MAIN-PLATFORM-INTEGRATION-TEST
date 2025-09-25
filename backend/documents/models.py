from django.db import models, transaction
from django.utils.text import slugify
from institution.models import Institution
from django_ckeditor_5.fields import CKEditor5Field
from markdownx.models import MarkdownxField
from ckeditor_uploader.fields import RichTextUploadingField
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from approval.models import Approval, BaseApprovableModel
from django.utils import timezone

class DocumentType(BaseApprovableModel):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, editable=False)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-generate code from name
        if not self.code:
            self.code = slugify(self.name).replace("-", "_")
            # Ensure code uniqueness
            base_code = self.code
            counter = 1
            while (
                DocumentType.objects.filter(code=self.code).exclude(pk=self.pk).exists()
            ):
                self.code = f"{base_code}_{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def get_institution(self):
        return self.institution     

class DocumentTemplate(BaseApprovableModel):
    document_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, blank=True, null=True)
    name = models.CharField(max_length=255)
    template_type = models.CharField(max_length=50, choices=[
        ('pdf', 'PDF'),
        ('word', 'Word Document'),
        ('text', 'Text'),      
    ])
    file = models.FileField(upload_to='document_templates/', null=True, blank=True)
    content = RichTextUploadingField(
        blank=True,
        null=True,
        help_text="Rich text content for the template with formatting and placeholders (e.g., {{caregiver_name}}, {{date}}).",
        config_name='default'  # Reference the CKEditor config
    )
    placeholders = models.JSONField(
        default=list,
        help_text="List of placeholders used in the template, e.g. ['{{employee_name}}', '{{date}}']",
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.name

    def get_institution(self):
        return self.document_type.institution     


class Document(BaseApprovableModel):
    document_template = models.ForeignKey(DocumentTemplate, on_delete=models.CASCADE)
    placeholder_values = models.JSONField(
        default=dict,
        help_text="Values for the placeholders defined in the template, e.g. {'employee_name': 'John Doe', 'date': '2023-10-01'}",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("in_review", "In Review"),
            ("reviewed", "Reviewed"),
        ],
    )

    def __str__(self):
        return f"Document for {self.document_template.name} - Status: {self.status}"

    def get_institution(self):
        return self.document_template.document_type.institution 

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.status = "reviewed"
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None
                elif approval.action.name == "update":
                    self.status = "reviewed"
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None

                elif approval.action.name == "delete":
                    self.status = "pending"
                    self.approval_status = "under_deletion"
                    self.is_active = False
                    self.deleted_at = timezone.now()
                    self.delete()
                    return
            elif approval.status == "rejected":
                if approval.action.name == "create":
                    self.status = "pending"
                    self.approval_status = "rejected"
                    self.is_active = False
                    self.deleted_at = None
                elif approval.action.name == "update":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None

                elif approval.action.name == "delete":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None
            self.save(
                update_fields=[
                    "approval_status",
                    "status",
                    "is_active",
                    "deleted_at"
                ]
            )        
