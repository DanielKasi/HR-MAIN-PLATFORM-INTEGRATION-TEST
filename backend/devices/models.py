from django.db import models
from approval.models import BaseApprovableModel
from utilities.utility_base_model import SoftDeletableTimeStampedModel

class DeviceStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    MAINTENANCE = "maintenance", "Maintenance"
    FAULTY = "faulty", "Faulty"

class Device(BaseApprovableModel):
    institution = models.ForeignKey(
        'institution.Institution', on_delete=models.CASCADE, related_name='devices'
    )
    branch = models.ForeignKey(
        'institution.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='devices'
    )
    name = models.CharField(null=True, blank=True, max_length=255)
    serial_number = models.CharField(max_length=100, unique=True)
    description = models.TextField(max_length=255, blank=True)
    attached_employees = models.ManyToManyField('employee.Employee', through='DeviceEmployeeAttachment', related_name='devices', null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=DeviceStatus.choices, default=DeviceStatus.ACTIVE
    )
    last_connection_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Device"
        verbose_name_plural = "Devices"
        ordering = ['serial_number']
        indexes = [
            models.Index(fields=['serial_number']),
            models.Index(fields=['status'])
        ]

    def __str__(self):
        return f"Device - {self.serial_number} for {self.institution.institution_name}"
    
    def get_institution(self):
        return self.institution
    
class DeviceEmployeeAttachment(SoftDeletableTimeStampedModel):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='device_employee_attachments', null=True, blank=True)
    employee = models.ForeignKey('employee.Employee', on_delete=models.CASCADE, related_name='device_employee_attachments')
    is_synced = models.BooleanField(default=False)  
    is_admin = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.employee.name} on {self.device.serial_number}"
    
    