from django.db import models
from utilities.utility_base_model import TimeStampedModel
from payroll.models import EmployeePenalty
from datetime import timedelta
from approval.models import BaseApprovableModel
from django.utils import timezone

# spotcheck settings
class InstitutionSpotCheckSetting(BaseApprovableModel):
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

    def get_institution(self):
        return self.institution       


class BranchSpotCheckSetting(BaseApprovableModel):
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

    def get_institution(self):
        return self.branch.institution       
    

class EmployeeSpotCheckSetting(BaseApprovableModel):
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

    def get_institution(self):
        return self.employee.department.institution       

class SpotCheckStatus(TimeStampedModel):
    status_name = models.CharField(max_length=255)
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
        return self.employee._is_location_valid(self.latitude, self.longitude)

    def issue_penalty(self):    
        employee = self.employee
        setting = EmployeeSpotCheckSetting.objects.filter(employee=employee).first()
        if not setting:
            branch = employee.payroll_branch  
            setting = BranchSpotCheckSetting.objects.filter(branch=branch).first()
        if not setting:
            institution = branch.institution if branch else employee.department.institution
            setting = InstitutionSpotCheckSetting.objects.filter(institution=institution).first()

        if not setting:
            return    

        expiry_time = self.spotcheck_time + timedelta(minutes=setting.expires_after_minutes)
        late_time = self.spotcheck_time + timedelta(minutes=setting.late_starts_after_minutes)

        now = timezone.now()  

        if self.responded_at:
            if self.responded_at <= expiry_time:
                EmployeePenalty.create_from_spotcheck(self, 'late_spotcheck_response')

        else:   
            if now > expiry_time:
                EmployeePenalty.create_from_spotcheck(self, 'no_response_spotcheck')
        
        self.save()     
