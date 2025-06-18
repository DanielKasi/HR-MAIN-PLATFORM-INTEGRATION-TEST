from django.db import models, transaction as db_transaction
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

from users.models import CustomUser, Profile

class WorkflowCategory(models.Model):
    code = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=255)

    def __str__(self):
        return self.label


class WorkflowAction(models.Model):
    category = models.ForeignKey(WorkflowCategory, on_delete=models.CASCADE)
    code = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=255)

    def __str__(self):
        return self.label


class InstitutionApprovalStep(models.Model):
    Institution = models.ForeignKey("institution.Institution", on_delete=models.CASCADE)
    step_name = models.CharField(max_length=255)
    action = models.ForeignKey(WorkflowAction, on_delete=models.CASCADE)
    level = models.PositiveIntegerField(help_text="Lower number = first to approve")

    class Meta:
        unique_together = ("Institution", "action", "level")
        ordering = ["level"]

    def __str__(self):
        return f"{self.Institution} - {self.action} (Level {self.level})"

class InstitutionApprovalStepApprovorRole(models.Model):
    step = models.ForeignKey(InstitutionApprovalStep, on_delete=models.CASCADE, related_name="roles")
    approver_role = models.ForeignKey("users.Role", on_delete=models.CASCADE)

    class Meta:
        unique_together = ("step", "approver_role")

    def __str__(self):
        return f"{self.step} - {self.approver_role}"


class InstitutionApprovalStepApprovorUser(models.Model):
    step = models.ForeignKey(InstitutionApprovalStep, on_delete=models.CASCADE, related_name="approver")
    approver_user = models.ForeignKey("users.Profile", on_delete=models.CASCADE)

    class Meta:
        unique_together = ("step", "approver_user")

    def __str__(self):
        return f"{self.step} - {self.approver_user}"


class ApprovalTask(models.Model):
    STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("rejected", "Rejected"),
        ("terminated", "Terminated"),
    ]

    step = models.ForeignKey(InstitutionApprovalStep, on_delete=models.CASCADE)

    # Link to any model needing approval: Product, PurchaseOrder, etc.
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="not_started"
    )
    comment = models.TextField(blank=True, null=True)
    approved_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="approved_tasks",
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ("step", "content_type", "object_id")

    def __str__(self):
        return f"{self.step} - {self.content_object} [{self.status}]"

    def mark_completed(self, user:CustomUser):
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            if self.status != "pending":
                raise ValueError("Task must be in pending state to be completed")
            try:
                profile:Profile = user.profile
            except CustomUser.DoesNotExist:
                raise ValueError(f"No Profile associated to user {user!r}")

            self.status = "completed"
            self.approved_by = profile
            self.save(update_fields=["status", "updated_at", "comment", "approved_by"])

            related_tasks = ApprovalTask.objects.filter(
                content_type=self.content_type,
                object_id=self.object_id,
            ).select_related("step")

            current_level = self.step.level
            next_task = related_tasks.filter(step__level=current_level + 1).first()

            if next_task:
                next_task.status = "pending"
                next_task.save(update_fields=["status"])

                # Notify next approvers via WebSocket
                from workflows.notifications import notify_task_update
                notify_task_update(next_task)
            else:
                self.content_object.finish_workflow()

            # Notify task completion
            from workflows.notifications import notify_task_completion
            notify_task_completion(self)

    def mark_rejected(self, user:CustomUser):
        with db_transaction.atomic():
            if self.status != "pending":
                raise ValueError("Task must be in pending state to be rejected")
            try:
                profile:Profile = user.profile
            except CustomUser.DoesNotExist:
                raise ValueError(f"No Profile associated to user {user!r}")

            self.status = "rejected"
            self.approved_by = profile
            self.save(update_fields=["status", "updated_at", "comment", "approved_by"])

            # Terminate other tasks
            terminated_tasks = ApprovalTask.objects.filter(
                content_type=self.content_type,
                object_id=self.object_id
            ).exclude(id=self.id).filter(status__in=["not_started", "pending"])

            terminated_tasks.update(status="terminated")

            # Notify task rejection
            from workflows.notifications import notify_task_rejection
            notify_task_rejection(self)

            # Notify terminated tasks
            from workflows.notifications import notify_task_update
            for task in terminated_tasks:
                notify_task_update(task)

            self.content_object.finish_workflow()
