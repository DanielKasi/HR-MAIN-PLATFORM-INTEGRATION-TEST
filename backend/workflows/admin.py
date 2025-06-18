from django.contrib import admin
from .models import WorkflowCategory, WorkflowAction, InstitutionApprovalStep, ApprovalTask


@admin.register(WorkflowCategory)
class WorkflowCategoryAdmin(admin.ModelAdmin):
    list_display = ("code", "label")
    search_fields = ("code", "label")


@admin.register(WorkflowAction)
class WorkflowActionAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "category")
    list_filter = ("category",)
    search_fields = ("code", "label")


@admin.register(InstitutionApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    list_display = ("Institution", "action", "level")
    list_filter = ("Institution", "action")
    search_fields = ("Institution__name", "action__label")
    ordering = ("Institution", "action", "level")


@admin.register(ApprovalTask)
class ApprovalTaskAdmin(admin.ModelAdmin):
    list_display = ("step", "content_object", "status", "updated_at")
    list_filter = ("status", "step__action", "step__Institution")
    search_fields = ("content_object__id",)
    readonly_fields = ("updated_at",)
