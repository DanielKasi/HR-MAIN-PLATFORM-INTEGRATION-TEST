from django.db import models
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import uuid
from django.db import transaction
from rest_framework.exceptions import ValidationError
from django.utils import timezone



class Action(SoftDeletableTimeStampedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, editable=False)
    description = models.TextField(blank=True, null=True)
    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"ACTION-{uuid.uuid4().hex[:8].upper()}"
            super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']    

class ApproverGroup(SoftDeletableTimeStampedModel):
    institution = models.ForeignKey('institution.Institution', on_delete=models.CASCADE)   
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    roles = models.ManyToManyField('users.Role', through='ApproverGroupRole', blank=True)
    users = models.ManyToManyField('users.Profile', through='ApproverGroupUser', blank=True)
    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)


    def __str__(self):
        return f"{self.name} - {self.institution.institution_name}"

    class Meta:
        unique_together = ['institution', 'name']     

class ApproverGroupRole(SoftDeletableTimeStampedModel):
    approver_group = models.ForeignKey(ApproverGroup, on_delete=models.CASCADE)
    role = models.ForeignKey('users.Role', on_delete=models.CASCADE)
    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    def __str__(self):
        return f"{self.approver_group.name} - {self.role.name}"

class ApproverGroupUser(SoftDeletableTimeStampedModel):
    approver_group = models.ForeignKey(ApproverGroup, on_delete=models.CASCADE)
    user = models.ForeignKey('users.Profile', on_delete=models.CASCADE)
    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    def __str__(self):
        return f"{self.approver_group.name} - {self.user.user.fullname}"

class ApprovalDocument(SoftDeletableTimeStampedModel):  
    institution = models.ForeignKey('institution.Institution', on_delete=models.CASCADE)
    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    description = models.TextField(blank=True, null=True)
    actions = models.ManyToManyField('Action', related_name='approval_documents', blank=True)

    def __str__(self):
        return f"Approval Document for {self.content_type}"

class ApprovalDocumentLevel(models.Model):
    level = models.PositiveIntegerField(null=True, blank=True)
    approval_document = models.ForeignKey(ApprovalDocument, on_delete=models.CASCADE, related_name='levels')
    description = models.TextField(blank=True)
    approvers = models.ManyToManyField(ApproverGroup, through='ApprovalDocumentLevelApprovers', related_name='approver_levels')
    overriders = models.ManyToManyField(ApproverGroup, through='ApprovalDocumentLevelOverriders', related_name='overrider_levels')
    public_uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Level {self.level} - {self.approval_document}"

    class Meta:
        unique_together = ('approval_document', 'level')
        ordering = ['level']

class ApprovalDocumentLevelApprovers(models.Model):
    approval_document_level = models.ForeignKey(ApprovalDocumentLevel, on_delete=models.CASCADE)
    approver_group = models.ForeignKey(ApproverGroup, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('approval_document_level', 'approver_group')
        verbose_name = "Approval Document Level Approver"
        verbose_name_plural = "Approval Document Level Approvers"

class ApprovalDocumentLevelOverriders(models.Model):
    approval_document_level = models.ForeignKey(ApprovalDocumentLevel, on_delete=models.CASCADE)
    approver_group = models.ForeignKey(ApproverGroup, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('approval_document_level', 'approver_group')
        verbose_name = "Approval Document Level Overrider"
        verbose_name_plural = "Approval Document Level Overriders"

class Approval(models.Model):
    STATUS_CHOICES = [
        ('ongoing', 'Ongoing'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ongoing')
    document = models.ForeignKey(ApprovalDocument, on_delete=models.CASCADE)
    action = models.ForeignKey(Action, on_delete=models.CASCADE)  
    object_id = models.PositiveIntegerField()
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    content_object = GenericForeignKey('content_type', 'object_id')

    def __str__(self):
        return f"Approval {self.public_id} - {self.status}"

class ApprovalTask(SoftDeletableTimeStampedModel):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('pending', 'Pending'),
        ('rejected', 'Rejected'),
        ('approved', 'Approved'),
        ('terminated', 'Terminated'),
    ]

    approval = models.ForeignKey(Approval, on_delete=models.CASCADE, related_name='tasks')
    level = models.ForeignKey(ApprovalDocumentLevel, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    comment = models.TextField(blank=True, null=True)
    approved_by = models.ForeignKey('users.CustomUser', null=True, blank=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Task for Level {self.level.level} - {self.status}"

    class Meta:
        unique_together = ('approval', 'level')
        ordering = ['level__level']

    def mark_completed(self, user, comment: str = None):
        with transaction.atomic():
            if self.status != 'pending':
                raise ValidationError({"error": "Task must be in pending state to be completed"})

            self.status = 'approved'
            self.approved_by = user
            if comment:
                self.comment = comment
            self.save(update_fields=["status", "updated_at", "comment", "approved_by"])

            current_level = self.level.level
            next_task = self.approval.tasks.filter(level__level=current_level + 1).first()

            if next_task:
                next_task.status = 'pending'
                next_task.save(update_fields=["status", "updated_at"])
                # Notify next approvers 
            else:
                self.approval.status = 'completed'
                self.approval.save()
                if self.approval.content_object:
                    self.approval.content_object.finish_workflow(self.approval)
                # Notify approval completion

    def mark_rejected(self, user, comment: str = None):
        with transaction.atomic():
            if self.status != 'pending':
                raise ValidationError({"error": "Task must be in pending state to be rejected"})

            self.status = 'rejected'
            self.approved_by = user
            if comment:
                self.comment = comment
            self.save(update_fields=["status", "updated_at", "comment", "approved_by"])

            self.approval.status = 'rejected'
            self.approval.save()

            terminated_tasks = self.approval.tasks.exclude(id=self.id).filter(status__in=['not_started', 'pending'])
            terminated_tasks.update(status='terminated')

            if self.approval.content_object:
                self.approval.content_object.finish_workflow(self.approval)
            # Notify task rejection and terminated tasks

class BaseApprovableModel(SoftDeletableTimeStampedModel):
    STATUS_CHOICES = [
        ('under_creation', 'Under Creation'),
        ('under_update', 'Under Update'),
        ('under_deletion', 'Under Deletion'),
        ('active', 'Active')
    ]

    approval_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='under_creation')

    class Meta:
        abstract = True

    def get_institution(self):
        raise ValidationError({"error": "Institution not found for this object"})

    def _trigger_approval(self, action_name: str):
        action = Action.objects.get(name=action_name)
        content_type = ContentType.objects.get_for_model(self.__class__)
        institution = self.get_institution()

        if not institution:
            raise ValidationError({"error": "No institution for this object"})

        document = ApprovalDocument.objects.filter(
            institution=institution,
            content_type=content_type,
            actions=action
        ).first()

        if not document:
            # Auto-complete the action
            if action_name in ['create', 'update']:
                self.approval_status = 'active'
                self.is_active = True  
                self.deleted_at = None
            elif action_name == 'delete':
                self.is_active = False  
                self.deleted_at = timezone.now()
            self.save(update_fields=['approval_status', 'is_active', 'deleted_at'])
            
            # Simulate finish_workflow for subclass hooks (dummy approval not saved)
            dummy_approval = Approval(
                status='completed',
                action=action,
                document=None,  # Optional
                content_type=content_type,
                object_id=self.pk
            )  # Not calling .save()
            self.finish_workflow(dummy_approval)
            return  

        # Proceed with approval creation (existing code remains)
        with transaction.atomic():
            self.is_active = False  # Set is_active=False until approved
            self.save(update_fields=['is_active'])
            approval = Approval.objects.create(
                status='ongoing',
                document=document,
                action=action,
                content_type=content_type,
                object_id=self.pk
            )

            levels = document.levels.order_by('level')
            for i, lvl in enumerate(levels):
                task_status = 'pending' if i == 0 else 'not_started'
                ApprovalTask.objects.create(
                    approval=approval,
                    level=lvl,
                    status=task_status
                )
            # Notify first task (optional)

    def confirm_create(self):
        if self.approval_status != 'under_creation':
            raise ValidationError({"error": "Object must be under_creation to confirm create"})
        self._trigger_approval('create')

    def confirm_update(self):
        if self.approval_status != 'under_update':
            raise ValidationError({"error": "Object must be under_update to confirm update"})
        self._trigger_approval('update')

    def confirm_delete(self):
        if self.approval_status != 'under_deletion':
            raise ValidationError({"error": "Object must be under_deletion to confirm delete"})
        self._trigger_approval('delete')

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == 'completed':
                if approval.action.name in ['create', 'update']:
                    self.approval_status = 'active'
                    self.is_active = True  # Set is_active=True for approved create/update
                    self.deleted_at = None
                elif approval.action.name == 'delete':
                    self.approval_status = 'under_deletion'
                    self.is_active = False  # Soft delete
                    self.deleted_at = timezone.now()
            elif approval.status == 'rejected':
                if approval.action.name == 'create':
                    self.is_active = False
                    self.deleted_at = timezone.now()  # Soft delete on rejected create
                elif approval.action.name in ['update', 'delete']:
                    self.approval_status = 'active'
                    self.is_active = True  # Revert to active
                    self.deleted_at = None
            self.save(update_fields=['approval_status', 'is_active', 'deleted_at'])

    
