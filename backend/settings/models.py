from django.db import models
from approval.models import BaseApprovableModel
from institution.models import Institution
from slugify import slugify
from django.utils import timezone
from encrypted_model_fields.fields import EncryptedCharField, EncryptedTextField
from utilities.utility_base_model import SoftDeletableTimeStampedModel


class SystemConfiguration(SoftDeletableTimeStampedModel):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=50)
    content = models.JSONField(default=list, null=True, blank=True)

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
                SystemConfiguration.objects.filter(code=self.code)
                .exclude(pk=self.pk)
                .exists()
            ):
                self.code = f"{base_code}_{counter}"
                counter += 1
        super().save(*args, **kwargs)


class SystemDay(models.Model):
    day_code = models.CharField(max_length=10, unique=True)
    day_name = models.CharField(max_length=50)
    level = models.IntegerField(default=0)

    def __str__(self):
        return self.day_name
    
class MeetingIntegration(BaseApprovableModel):
    PLATFORM_CHOICES = [
        ('zoom', 'Zoom'),
        ('google_meet', 'Google Meet'),
        ('microsoft_teams', 'Microsoft Teams'),
    ]
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='meeting_integrations')
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES)
    api_key = EncryptedCharField(max_length=255, blank=True, null=True)
    api_secret = EncryptedCharField(max_length=255, blank=True, null=True)
    oauth_token = EncryptedTextField(blank=True, null=True)
    oauth_refresh_token = EncryptedTextField(blank=True, null=True)
    tenant_id = EncryptedCharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.platform} for {self.institution}"   
    
    def get_institution(self):
        return self.institution 
