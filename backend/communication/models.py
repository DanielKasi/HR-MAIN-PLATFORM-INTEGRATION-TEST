from django.db import models
from approval.models import BaseApprovableModel
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from institution.models import Department, Institution
from recruitment.models import JobPosition
from employee.models import Employee
from django.contrib.contenttypes.models import ContentType

class Notification(models.Model):
    user_id = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    model_name = models.CharField(max_length=255, blank=True, null=True)
    object_id = models.CharField(max_length=255, blank=True, null=True)
    requires_acknowledgment = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for User {self.user_id}: {self.message[:20]}..."


class Announcement(BaseApprovableModel):
    title = models.CharField(max_length=255)
    content = models.TextField()
    requires_acknowledgment = models.BooleanField(default=True)
    target_employees = models.ManyToManyField(Employee, blank=True, through='EmployeeAnnouncementAcknowledgment', related_name='targeted_announcements')
    target_departments = models.ManyToManyField(Department, blank=True, related_name='targeted_announcements')
    target_job_positions = models.ManyToManyField(JobPosition, blank=True, related_name='targeted_announcements')
    announcement_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, blank=True, null=True, related_name='announcements')

    def __str__(self):
        return self.title

    def get_target_employees(self):
        employees = set(self.target_employees.all())
        if self.target_departments.exists():
            employees.update(Employee.objects.filter(department__in=self.target_departments.all()))
        if self.target_job_positions.exists():
            employees.update(Employee.objects.filter(position__in=self.target_job_positions.all()))
        return employees
    
    def get_institution(self):
        for employee in self.target_employees.all():
            if employee.department and employee.department.institution:
                return employee.department.institution
        
        for department in self.target_departments.all():
            if department.institution:
                return department.institution
        
        for job_position in self.target_job_positions.all():
            if job_position.department and job_position.department.institution:
                return job_position.department.institution

    def save(self, *args, skip_notifications=False, **kwargs):
        print(f"Saving announcement {self.pk or 'new'}, is_new={self.pk is None}, skip_notifications={skip_notifications}")
        is_new = self.pk is None
        super().save(*args, **kwargs)  # Call the parent save method

        if skip_notifications:
            print(f"Skipping notifications for announcement {self.pk}")
            return

        # Only send notifications if approved (optional, adjust based on your workflow)
        if not self.is_active:
            print(f"Announcement {self.pk} is not active, skipping notifications")
            return

        target_employees = self.get_target_employees()
        message = f"New announcement: {self.title}" if is_new else f"Updated announcement: {self.title}"
        print(f"Notification message: {message}")

        for employee in target_employees:
            from .views import add_notification
            if employee.user:
                print(f"Preparing notification for employee {employee.id} (user {employee.user.id})")
                try:
                    add_notification(
                        user_id=employee.user,
                        message=message,
                        model_name="Announcement",
                        object_id=str(self.pk),
                        requires_acknowledgment=self.requires_acknowledgment
                    )
                    print(f"Successfully sent notification to employee {employee.id} (user {employee.user.id})")
                except Exception as e:
                    print(f"Failed to send notification to employee {employee.id} (user {employee.user.id}): {str(e)}")
            else:
                print(f"Employee {employee.id} has no linked user, skipping notification")

class EmployeeAnnouncementAcknowledgment(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('employee', 'announcement')      

