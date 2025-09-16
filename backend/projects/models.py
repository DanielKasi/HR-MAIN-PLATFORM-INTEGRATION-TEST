from django.db import models, transaction
from django.utils import timezone
from django.db.models import UniqueConstraint, Q
from approval.models import Approval, BaseApprovableModel
from employee.models import Employee

class BaseModel(models.Model):
    created_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created_by",
    )
    updated_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated_by",
    )

    class Meta:
        abstract = True
    

class Project(BaseModel, BaseApprovableModel):
    PROJECT_STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("planning", "Planning"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("on_hold", "On Hold"),
        ("cancelled", "Cancelled"),
    ]

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="projects",
        null=True,
        blank=True,
    )

    project_name = models.CharField(max_length=255, blank=False)

    managers = models.ManyToManyField(Employee, related_name="led_projects")
    assignees = models.ManyToManyField(Employee, related_name="project_members")
    completion_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    project_status = models.CharField(
        max_length=20,
        choices=PROJECT_STATUS_CHOICES,
        default="not_started",
    )

    def __str__(self):
        return f"Project: {self.project_name} under ({self.institution})"

    def get_institution(self):
        return self.institution      

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Projects"
        verbose_name = "Project"
        constraints = [
            UniqueConstraint(
                fields=["institution", "project_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_project_name_per_institution"
            )
        ]


class ProjectDocument(BaseModel, BaseApprovableModel):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document = models.FileField(upload_to="project_documents/")

    def __str__(self):
        return f"Document for Project: {self.project.project_name} ({self.project.institution})"

    def get_institution(self):
        return self.project.institution      

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Project Documents"
        verbose_name = "Project Document"
        indexes = [
            models.Index(fields=["project"]),
        ]


class Task(BaseModel, BaseApprovableModel):
    TASK_STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("on_hold", "On Hold"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tasks",
        blank=False,
    )

    task_name = models.CharField(max_length=255, blank=False)
    description = models.TextField(blank=True)

    managers = models.ManyToManyField(
        Employee,
        related_name="led_tasks",
        blank=True,
    )

    assignees = models.ManyToManyField(
        Employee,
        related_name="assigned_tasks",
        blank=True,
    )

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)

    task_status = models.CharField(
        max_length=20,
        choices=TASK_STATUS_CHOICES,
        default="not_started",
    )

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default="medium",
    )

    def __str__(self):
        return f"Task: {self.task_name} in Project: {self.project.project_name} ({self.project.institution})"

    def get_institution(self):
        return self.project.institution      

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Project Tasks"
        verbose_name = "Project Task"
        constraints = [
            UniqueConstraint(
                fields=["project", "task_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_task_name_per_project"
            )
        ]

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.is_active = True
                    self.deleted_at = None

                    if not hasattr(self, "timesheet"):
                        TaskTimeSheet.objects.create(
                            task=self,
                            created_by=self.created_by
                            )
                elif approval.action.name == "update":
                    if hasattr(self, "timesheet"):
                        timesheet = self.timesheet
                        if self.task_status == "in_progress" and timesheet.start_time is None:
                            timesheet.start_time = timezone.now()   
                            timesheet.save()
                        elif self.task_status == "completed" and timesheet.end_time is None:
                            timesheet.end_time = timezone.now()
                            self.completion_date = timezone.now().date()
                            self.save(update_fields=["completion_date"])
                            timesheet.save()     
                    
                            
                elif approval.action.name == "delete":
                    self.is_active = False
                    self.deleted_at = timezone.now()
                    self.save()

            elif approval.status == "rejected":
                if approval.action.name == "create":
                    self.approval_status = "active"
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
                    "is_active",
                    "deleted_at",
                ]
            )        


class TaskDocument(BaseModel, BaseApprovableModel):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document = models.FileField(upload_to="task_documents/")

    def __str__(self):
        return f"Document for Task: {self.task.task_name} in Project: {self.task.project.project_name} ({self.task.project.institution})"

    def get_institution(self):
        return self.task.project.institution      

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Task Documents"
        verbose_name = "Task Document"
        indexes = [
            models.Index(fields=["task"]),
        ]


class TaskTimeSheet(BaseModel, BaseApprovableModel):
    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name="timesheet",
    )

    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)

    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Timesheet for Task: {self.task.task_name} by {self.created_by.user.email if self.created_by else 'Unknown'} in Project: {self.task.project.project_name} ({self.task.project.institution})"
    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Time Sheets"
        verbose_name = "Time Sheet"

    @property
    def timespent(self):
        return (
            self.end_time - self.start_time
            if self.end_time and self.start_time
            else None
        )

    def get_institution(self):
        return self.task.project.institution      
