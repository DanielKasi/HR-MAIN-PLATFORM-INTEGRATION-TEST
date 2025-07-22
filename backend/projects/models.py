from django.db import models


class BaseModel(models.Model):
    created_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated_by",
    )

    class Meta:
        abstract = True


class Project(BaseModel):
    PROJECT_STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("planning", "Planning"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("on_hold", "On Hold"),
    ]

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="projects",
        null=True,
        blank=True,
    )

    project_name = models.CharField(max_length=255, blank=False)

    leaders = models.ManyToManyField("users.Profile", related_name="led_projects")
    members = models.ManyToManyField("users.Profile", related_name="project_members")

    description = models.TextField(blank=True)

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=PROJECT_STATUS_CHOICES,
        default="not_started",
    )

    def __str__(self):
        return f"Project: {self.project_name} under ({self.institution})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Projects"
        verbose_name = "Project"
        unique_together = ("institution", "project_name")


class ProjectDocument(BaseModel):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document = models.FileField(upload_to="project_documents/")

    def __str__(self):
        return f"Document for Project: {self.project.project_name} ({self.project.institution})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Project Documents"
        verbose_name = "Project Document"
        indexes = [
            models.Index(fields=["project"]),
        ]
        unique_together = ("project", "document")


class Task(BaseModel):
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
    
    leaders = models.ManyToManyField(
        "users.Profile",
        related_name="led_tasks",
        blank=True,
    )

    assigned_to = models.ManyToManyField(
        "users.Profile",
        related_name="assigned_tasks",
        blank=True,
    )

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(
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

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("project", "task_name")
        verbose_name_plural = "Project Tasks"
        verbose_name = "Project Task"


class TaskDocument(BaseModel):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document = models.FileField(upload_to="task_documents/")

    def __str__(self):
        return f"Document for Task: {self.task.task_name} in Project: {self.task.project.project_name} ({self.task.project.institution})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Task Documents"
        verbose_name = "Task Document"
        indexes = [
            models.Index(fields=["task"]),
        ]
        unique_together = ("task", "document")


class TaskTimeSheet(BaseModel):
    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name="timesheet",
    )

    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Timesheet for Task: {self.task.task_name} by {self.user.user.email} in Project: {self.task.project.project_name} ({self.task.project.institution})"

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
