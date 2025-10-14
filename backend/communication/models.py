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
        print(f"Fetching target employees for announcement: {self.title} (ID: {self.id})")
        employees = set(self.target_employees.all())
        print(f"Direct target employees: {list(employees)}")
        
        if self.target_departments.exists():
            dept_employees = Employee.objects.filter(department__in=self.target_departments.all())
            print(f"Employees from departments: {list(dept_employees)}")
            employees.update(dept_employees)
        
        if self.target_job_positions.exists():
            job_employees = Employee.objects.filter(position__in=self.target_job_positions.all())
            print(f"Employees from job positions: {list(job_employees)}")
            employees.update(job_employees)
        
        print(f"Total target employees: {list(employees)}")
        return employees
    
    def get_institution(self):
        print(f"Determining institution for announcement: {self.title} (ID: {self.id})")
        for employee in self.target_employees.all():
            if employee.department and employee.department.institution:
                print(f"Institution found via employee {employee.id}: {employee.department.institution}")
                return employee.department.institution
        
        for department in self.target_departments.all():
            if department.institution:
                print(f"Institution found via department {department.id}: {department.institution}")
                return department.institution
        
        for job_position in self.target_job_positions.all():
            if job_position.department and job_position.department.institution:
                print(f"Institution found via job position {job_position.id}: {job_position.department.institution}")
                return job_position.department.institution
        
        print("No institution found for announcement")
        return None

    def save(self, *args, skip_notifications=False, **kwargs):
        from communication.views import add_notification
        print(f"Saving announcement: {self.title} (ID: {self.id}, is_new: {self.pk is None})")
        is_new = self.pk is None
        super().save(*args, **kwargs)  # Save the announcement

        if skip_notifications:
            print("Skipping notifications as per skip_notifications=True")
            return

        if not self.is_active:
            print("Announcement is not active, skipping notifications")
            return

        message = f"New announcement: {self.title}" if is_new else f"Updated announcement: {self.title}"
        target_employees = self.get_target_employees()

        if not target_employees:
            print("No target employees found for announcement, skipping notifications")
            return

        print(f"Creating notifications for {len(target_employees)} target employees")
        for employee in target_employees:
            if not employee.user:
                print(f"⚠️ Employee {employee.id} ({employee.name}) has no linked user, skipping notification")
                continue
            
            if not employee.user.email:
                print(f"⚠️ Employee {employee.id} ({employee.name}) user has no email, skipping notification")
                continue

            try:
                # Only check for existing notifications for new announcements
                if is_new:
                    existing_notification = Notification.objects.filter(
                        user_id=employee.user.id,
                        model_name="Announcement",
                        object_id=str(self.pk),
                        is_read=False
                    ).exists()
                    if existing_notification:
                        print(f"⚠️ Notification already exists for user {employee.user.id} (employee {employee.id}), skipping")
                        continue

                add_notification(
                    user_id=employee.user.id,
                    message=message,
                    model_name="Announcement",
                    object_id=str(self.pk),
                    requires_acknowledgment=self.requires_acknowledgment
                )
                print(f"✅ Notification created for user {employee.user.id} (employee {employee.id})")
            except Exception as e:
                print(f"❌ Failed to create notification for employee {employee.id} (user {employee.user.id}): {str(e)}")



class EmployeeAnnouncementAcknowledgment(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    

    class Meta:
        unique_together = ('employee', 'announcement')      

