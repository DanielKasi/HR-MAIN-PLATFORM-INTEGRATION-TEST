from django.db import models
from approval.models import BaseApprovableModel
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from institution.models import Department
from recruitment.models import JobPosition
from employee.models import Employee
from django.contrib.contenttypes.models import ContentType

class Announcement(BaseApprovableModel):
    title = models.CharField(max_length=255)
    content = models.TextField()
    requires_acknowledgment = models.BooleanField(default=True)
    target_employees = models.ManyToManyField(Employee, blank=True, related_name='targeted_announcements')
    target_departments = models.ManyToManyField(Department, blank=True, related_name='targeted_announcements')
    target_job_positions = models.ManyToManyField(JobPosition, blank=True, related_name='targeted_announcements')
    announcement_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, blank=True, null=True, related_name='announcements')

    def get_target_employees(self):
        employees = set(self.target_employees.all())
        employees.update(Employee.objects.filter(department__in=self.target_departments.all()))
        employees.update(Employee.objects.filter(job_position__in=self.target_job_positions.all()))
        return employees
    
    def get_institution(self):
        self.target_employees.get_institution()

class Acknowledgment(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField()

    class Meta:
        unique_together = ('employee', 'announcement')        