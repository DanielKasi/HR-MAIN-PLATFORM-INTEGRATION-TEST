from django.db import models
from communication.views import add_notification
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import uuid
from django.db import transaction
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.db.models import Q



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

    def str(self):
        return f"Approval Document for {self.content_type}"

    def clean(self):
        super().clean()
        if self.pk:  
            current_actions = set(self.actions.values_list('id', flat=True))
            
            for doc in ApprovalDocument.objects.filter(
                institution=self.institution,
                content_type=self.content_type
            ).exclude(pk=self.pk):
                doc_actions = set(doc.actions.values_list('id', flat=True))
                if current_actions == doc_actions:
                    raise ValidationError(
                        {"error":"An approval document with the same content type and actions already exists."}
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

        

class ApprovalDocumentLevel(SoftDeletableTimeStampedModel):
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

    def get_approver_users(self) -> set:
        """Get all unique users who are approvers for this level (direct users + via roles)"""
        from users.models import CustomUser, Profile, Role  # Import as needed
        
        users = set()
        
        for group in self.approvers.all():
            # Direct users in group
            for profile in group.users.all():
                if profile.user and profile.user.is_active:
                    users.add(profile.user)
            
            # Users via roles in group
            for role in group.roles.all():
                for user_role in role.user_roles.all():  
                    if user_role.user and user_role.user.is_active:
                        users.add(user_role.user)
        
        return users   

    def get_overriders(self) -> set: 
        users = set()
        for group in self.overriders.all():
            for profile in group.users.all():
                if profile.user and profile.user.is_active:
                    users.add(profile.user)

            for role in group.roles.all():        
                for user_role in role.user_roles.all():  
                    if user_role.user and user_role.user.is_active:
                        users.add(user_role.user)
        return users                

@receiver(pre_save, sender=ApprovalDocumentLevel)
def set_approval_level(sender, instance, **kwargs):
    if not instance.pk and not instance.level:  # Only for new instances
        max_level = ApprovalDocumentLevel.objects.filter(
            approval_document=instance.approval_document
        ).aggregate(models.Max('level'))['level__max'] or 0
        instance.level = max_level + 1

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
        ('overridden', 'Overridden'),
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

    def _check_user_is_approver(self, user):
        """Check if user is authorized as an approver for this level"""
        profile = user.profile
        user_roles = user.roles.all()
        approver_groups = self.level.approvers.filter(
            Q(users=profile) | Q(roles__in=user_roles)
        ).distinct()
        
        if not approver_groups.exists():
            raise ValidationError({
                "error": "User is not authorized to approve/reject tasks at this level"
            })
        
        return True

    def _check_user_is_overrider(self, user):
        """Check if user is authorized as an overrider for this level"""
        profile = user.profile
        user_roles = user.roles.all()
        overrider_groups = self.level.overriders.filter(
            Q(users=profile) | Q(roles__in=user_roles)
        ).distinct()
        
        if not overrider_groups.exists():
            raise ValidationError({
                "error": "User is not authorized to override tasks at this level"
            })
        
        return True

    def mark_completed(self, user, comment: str = None):
        """Mark task as approved - only approvers can do this"""
        with transaction.atomic():
            if self.status != 'pending':
                raise ValidationError({
                    "error": "Task must be in pending state to be completed"
                })

            # Check if user is authorized to approve at this level
            self._check_user_is_approver(user)

            self.status = 'approved'
            self.approved_by = user
            if comment:
                self.comment = comment
            self.save(update_fields=["status", "updated_at", "comment", "approved_by"])

            current_level = self.level.level
            next_task = self.approval.tasks.filter(level__level=current_level + 1).first()

            # Get model_name and object_id for content_object
            content_object = self.approval.content_object
            model_name = ContentType.objects.get_for_model(content_object).model if content_object else None
            object_id = str(content_object.id) if content_object else None

            if next_task:
                next_task.status = 'pending'
                next_task.save(update_fields=["status", "updated_at"])
                # Notify next approvers 
                object_desc = str(content_object) if content_object else "an object"
                message = f"A new approval task is pending for you: Approve {object_desc} at level {next_task.level.level}."
                for approver_user in next_task.level.get_approver_users():
                    add_notification(
                        user_id=approver_user.id,
                        message=message,
                        model_name=model_name,
                        object_id=object_id
                    )
            else:
                self.approval.status = 'completed'
                self.approval.save()
                if content_object:
                    content_object.finish_workflow(self.approval)
                # Notify approval completion
                if hasattr(self.approval.content_object, 'created_by') and self.approval.content_object.created_by:
                    add_notification(
                        user_id=self.approval.content_object.created_by.id,
                        message=f"Your {self.approval.content_object._meta.verbose_name} has been approved.",
                        model_name=model_name,
                        object_id=object_id
                    )

    def mark_rejected(self, user, comment: str = None):
        """Mark task as rejected - only approvers can do this"""
        with transaction.atomic():
            if self.status != 'pending':
                raise ValidationError({
                    "error": "Task must be in pending state to be rejected"
                })

            # Check if user is authorized to reject at this level
            self._check_user_is_approver(user)

            self.status = 'rejected'
            self.approved_by = user
            if comment:
                self.comment = comment
            self.save(update_fields=["status", "updated_at", "comment", "approved_by"])

            self.approval.status = 'rejected'
            self.approval.save()

            terminated_tasks = self.approval.tasks.exclude(id=self.id).filter(
                status__in=['not_started', 'pending']
            )
            terminated_tasks.update(status='terminated')

            # Get model_name and object_id for content_object
            content_object = self.approval.content_object
            model_name = ContentType.objects.get_for_model(content_object).model if content_object else None
            object_id = str(content_object.id) if content_object else None

            if content_object:
                content_object.finish_workflow(self.approval)
            # Notify task rejection and terminated tasks
            object_desc = str(content_object) if content_object else "an object"
            if hasattr(self.approval.content_object, 'created_by') and self.approval.content_object.created_by:
                add_notification(
                    user_id=self.approval.content_object.created_by.id,
                    message=f"Your approval request for {object_desc} has been rejected at level {self.level.level}.",
                    model_name=model_name,
                    object_id=object_id
                )

    def mark_overridden(self, user, comment: str = None):
        """Mark task as overridden - only overriders can do this"""
        with transaction.atomic():
            if self.status != 'pending':
                raise ValidationError({
                    "error": "Task must be in pending state to be overridden"
                })

            # Check if user is authorized to override at this level
            self._check_user_is_overrider(user)

            # Mark this task as overridden
            self.status = 'overridden'
            self.approved_by = user
            if comment:
                self.comment = comment
            self.save(update_fields=["status", "updated_at", "comment", "approved_by"])

            # Mark the entire approval process as completed
            self.approval.status = 'completed'
            self.approval.save()

            # Terminate all other tasks (not_started or pending)
            other_tasks = self.approval.tasks.exclude(id=self.id).filter(
                status__in=['not_started', 'pending']
            )
            other_tasks.update(status='terminated')

            # Get model_name and object_id for content_object
            content_object = self.approval.content_object
            model_name = ContentType.objects.get_for_model(content_object).model if content_object else None
            object_id = str(content_object.id) if content_object else None

            if content_object:
                content_object.finish_workflow(self.approval)
            # Notify approval completion due to override
            object_desc = str(content_object) if content_object else "an object"
            if hasattr(self.approval.content_object, 'created_by') and self.approval.content_object.created_by:
                add_notification(
                    user_id=self.approval.content_object.created_by.id,
                    message=f"Your approval request for {object_desc} has been overridden and completed at level {self.level.level}.",
                    model_name=model_name,
                    object_id=object_id
                )

    def can_user_approve_or_reject(self, user):
        """Check if user can approve or reject this task"""
        try:
            self._check_user_is_approver(user)
            return True
        except ValidationError:
            return False

    def can_user_override(self, user):
        """Check if user can override this task"""
        try:
            self._check_user_is_overrider(user)
            return True
        except ValidationError:
            return False

    def get_user_permissions(self, user):
        """Get user's permissions for this task"""
        institution = self.approval.document.institution
        is_institution_owner = (
            hasattr(user, 'profile') and 
            institution.institution_owner.filter(id=user.profile.id).exists()
        )
        
        return {
            'can_approve_or_reject': self.can_user_approve_or_reject(user),
            'can_override': self.can_user_override(user),
            'can_act': self.status == 'pending',
            'is_institution_owner': is_institution_owner
        }

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

        # Proceed with approval creation
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
            # Notify first task
            first_task = approval.tasks.filter(status='pending').first()
            if first_task:
                object_desc = str(self) if self else "an object"
                message = f"A new approval task is pending for you: Approve {object_desc} at level {first_task.level.level}."
                # Get model_name and object_id for the content object
                model_name = content_type.model
                object_id = str(self.pk)
                for approver_user in first_task.level.get_approver_users():
                    add_notification(
                        user_id=approver_user.id,
                        message=message,
                        model_name=model_name,
                        object_id=object_id
                    )

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
