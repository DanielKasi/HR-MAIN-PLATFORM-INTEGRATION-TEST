from django.db import models
from utilities.utility_base_model import SoftDeletableTimeStampedModel, TimeStampedModel

# spotcheck settings
class InstitutionSPotCheckSetting(SoftDeletableTimeStampedModel):
    institution = models.OneToOneField(
        "institution.Institution",
        on_delete=models.PROTECT,
    )
    lower_threshold = models.IntegerField(default=0)
    upper_threshold = models.IntegerField(default=3)
    expires_after_minutes = models.IntegerField(default=60)
    late_starts_after_minutes = models.IntegerField(default=10)

    
    def __str__(self):
        return f"{self.institution.name} SpotCheck Settings"


class BranchSpotCheckSetting(SoftDeletableTimeStampedModel):
    branch = models.OneToOneField(
        "institution.Branch",
        on_delete=models.PROTECT,
    )
    lower_threshold = models.IntegerField(default=0)
    upper_threshold = models.IntegerField(default=3)
    expires_after_minutes = models.IntegerField(default=60)
    late_starts_after_minutes = models.IntegerField(default=10)

    
    def __str__(self):
        return f"{self.branch.name} SpotCheck Settings"
    

class EmployeeSpotCheckSetting(SoftDeletableTimeStampedModel):
    employee = models.OneToOneField(
        "employee.Employee",
        on_delete=models.PROTECT,
    )
    lower_threshold = models.IntegerField(default=0)
    upper_threshold = models.IntegerField(default=3)
    expires_after_minutes = models.IntegerField(default=60)
    late_starts_after_minutes = models.IntegerField(default=10)

    
    def __str__(self):
        return f"{self.employee.user.fullname} SpotCheck Settings"

class SpotCheckStatus(TimeStampedModel):
    status_name = models.CharField(max_length=255)
    status_code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.status_name
    

class EmployeeSpotCheck(TimeStampedModel):
    employee = models.ForeignKey(
        "employee.Employee",
        on_delete=models.PROTECT,
        related_name="spot_checks",
    )
    spotcheck_time = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)
    status = models.ForeignKey(
        SpotCheckStatus,
        on_delete=models.PROTECT,
        related_name="employee_spot_checks",
    )
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    initiated_by = models.CharField(choices=[("system", "System"), ("user", "User")], max_length=20, default="system")

    def __str__(self):
        return f"SpotCheck for {self.employee.user.fullname} at {self.spotcheck_time}"

    def check_if_location_is_valid(self):
        pass
