from django.db import models
from .utils.history import create_asset_history
from django.db import transaction


class BaseModel(models.Model):
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AssetCategory(BaseModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="asset_categories",
    )
    category_name = models.CharField(max_length=100)
    category_description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.category_name


class Asset(BaseModel):
    ASSET_ALLOCATION_CHOICES = [
        ("available", "Available"),
        ("allocated", "Allocated"),
        ("maintenance", "Under Maintenance"),
        ("decommissioned", "Decommissioned"),
    ]
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="assets",
    )
    asset_name = models.CharField(max_length=100, blank=False)
    batch_number = models.CharField(max_length=50, blank=True)
    serial_number = models.CharField(max_length=50, blank=False, unique=True)
    category = models.ForeignKey(
        AssetCategory,
        on_delete=models.CASCADE,
        related_name="assets",
    )
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=ASSET_ALLOCATION_CHOICES,
        default="available",
    )

    created_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="created_assets",
    )

    current_holder = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="currently_held_assets",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["institution", "serial_number", "batch_number"],
                name="unique_asset_serial_batch",
            )
        ]

    def __str__(self):
        return f"{self.asset_name} ({self.batch_number}) - {self.status}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new and not self.batch_number:
            batch_code = f"BA.N-{self.category.category_name[:3].upper()}-{self.serial_number[:5].upper()}"
            self.batch_number = batch_code
            super().save(update_fields=["batch_number"])

            create_asset_history(
                asset=self,
                event_type="created",
                performed_by=self.created_by,
                affected_user=None,
                notes=f"Asset {self.asset_name} created with batch number {self.batch_number}.",
            )


class AssetRequest(BaseModel):

    ASSET_REQUEST_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="requests",
    )
    requester = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="asset_requests",
    )

    request_reference_code = models.CharField(max_length=100, unique=True)

    asset_request_status = models.CharField(
        max_length=20,
        choices=ASSET_REQUEST_STATUS_CHOICES,
        default="pending",
    )

    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Request for {self.asset.asset_name} by {self.requester.user.fullname}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            request_code = f"ASSET-REQ-{self.asset.id:05d}-{self.requester.id:05d}"
            self.request_reference_code = request_code
            super().save(update_fields=["request_reference_code"])

    @transaction.atomic
    def approve(self):

        if self.asset_request_status != "pending":
            raise ValueError("Only pending requests can be approved.")

        self.asset_request_status = "approved"
        self.save()

        AssetAllocation.objects.create(
            asset=self.asset,
            allocated_to=self.requester,
            responding_to_request=self,
            allocated_by=None,
        )

    def finish_workflow(self):
        from workflows.models import ApprovalTask
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(self.__class__)

        tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=self.pk
        )

        if tasks.exists() and tasks.filter(status="rejected").exists():
            self.asset_request_status = "cancelled"
            self.save()
            return

        if (
            tasks.exists()
            and not tasks.filter(
                status__in=["not_started", "pending", "rejected"]
            ).exists()
        ):
            self.approve()

        elif not tasks.exists():
            self.approve()

        else:
            raise Exception(
                "Cannot finish workflow: Some tasks are not completed or rejected."
            )


class AssetAllocation(BaseModel):

    ASSET_ALLOCATION_STATUS_CHOICES = [
        ("cancelled", "Cancelled"),
        ("allocated", "Allocated"),
        ("pending", "Pending"),
        ("rejected", "Rejected"),
    ]

    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="allocations",
    )
    allocated_to = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="asset_allocations",
    )

    responding_to_request = models.ForeignKey(
        AssetRequest,
        on_delete=models.CASCADE,
        related_name="allocations",
        null=True,
        blank=True,
    )

    allocated_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="asset_allocations_made",
        blank=True,
        null=True,
    )

    allocation_status = models.CharField(
        max_length=20,
        choices=ASSET_ALLOCATION_STATUS_CHOICES,
        default="pending",
    )

    alloc_code = models.CharField(max_length=100, unique=True, blank=True)

    def __str__(self):
        return f"Allocation of {self.asset.asset_name} to {self.allocated_to.user.fullname}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            alloc_code = f"ALLOC-{self.asset.id:05d}-{self.allocated_to.id:05d}"
            self.alloc_code = alloc_code
            super().save(update_fields=["alloc_code"])

        if self.pk and self.allocation_status == "allocated":
            create_asset_history(
                asset=self.asset,
                event_type="allocated",
                performed_by=self.allocated_by,
                affected_user=self.allocated_to,
                notes=f"Asset {self.asset.asset_name} allocated to {self.allocated_to.user.fullname}.",
            )

            self.asset.status = "allocated"

            self.asset.current_holder = self.allocated_to
            self.asset.save(update_fields=["status", "current_holder"])

    @transaction.atomic
    def approve(self):
        if self.allocation_status != "pending":
            raise ValueError("Only pending allocations can be approved.")

        self.allocation_status = "allocated"
        self.save()

        self.asset.status = "allocated"
        self.asset.current_holder = self.allocated_to
        self.asset.save(update_fields=["status", "current_holder"])

    def finish_workflow(self):
        from workflows.models import ApprovalTask
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(self.__class__)

        tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=self.pk
        )

        if tasks.exists() and tasks.filter(status="rejected").exists():
            self.allocation_status = "cancelled"
            self.save()
            return
        if (
            tasks.exists()
            and not tasks.filter(
                status__in=["not_started", "pending", "rejected"]
            ).exists()
        ):
            self.approve()
            return
        elif not tasks.exists():
            self.approve()
            return
        else:
            raise Exception(
                "Cannot finish workflow: Some tasks are not completed or rejected."
            )


class AssetReturn(BaseModel):
    ASSET_CONDITION_CHOICES = [
        ("good", "Good"),
        ("damaged", "Damaged"),
        ("lost", "Lost"),
    ]

    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name="returns",
    )

    allocation = models.ForeignKey(
        AssetAllocation,
        on_delete=models.CASCADE,
        related_name="returns",
    )

    condition = models.CharField(max_length=20, choices=ASSET_CONDITION_CHOICES)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Return of {self.asset.asset_name} by {self.allocation.allocated_to.user.fullname}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            create_asset_history(
                asset=self.asset,
                event_type="returned",
                performed_by=self.allocation.allocated_by,
                affected_user=self.allocation.allocated_to,
                notes=f"Asset {self.asset.asset_name} returned by {self.allocation.allocated_to.user.fullname} in {self.condition}.",
            )

            if self.condition == "good":
                self.asset.status = "available"
            elif self.condition == "damaged":
                self.asset.status = "maintenance"
            elif self.condition == "lost":
                self.asset.status = "decommissioned"

            self.asset.current_holder = None
            self.asset.save(update_fields=["status", "current_holder"])


class AssetHistory(BaseModel):
    EVENT_TYPE_CHOICES = [
        ("allocated", "Allocated"),
        ("returned", "Returned"),
        ("maintenance", "Maintenance"),
        ("decommissioned", "Decommissioned"),
        ("created", "Created"),
        ("reassigned", "Reassigned"),
    ]

    asset = models.ForeignKey(
        Asset, on_delete=models.CASCADE, related_name="asset_histories"
    )

    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)

    performed_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        related_name="asset_events",
    )

    affected_user = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="asset_event_history",
    )

    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.asset.asset_name} - {self.event_type}"
