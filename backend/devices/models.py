from django.db import models

from institution.models import Branch
from utilities.utility_base_model import SoftDeletableTimeStampedModel


class Devicetype(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    supported = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Device Type"
        verbose_name_plural = "Device Types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Biometric(SoftDeletableTimeStampedModel):
    name = models.CharField(max_length=100)
    device_type = models.ForeignKey(
        'DeviceType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="devices",
    )
    required_id = models.CharField(max_length=100, null=True, blank=True)
    api_url = models.CharField(max_length=255, null=True, blank=True)
    api_key = models.CharField(max_length=255, null=True, blank=True)
    api_secret = models.CharField(max_length=255, blank=True, null=True)
    machine_ip_address = models.GenericIPAddressField(null=True, blank=True)
    port = models.PositiveIntegerField(null=True, blank=True)
    username = models.CharField(max_length=100, null=True, blank=True)
    password = models.CharField(max_length=100, null=True, blank=True)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )