from django.urls import path

from workflows.views import (
    ApproveTaskAPIView,
    ApproveTaskDetailAPIView,
    InstitutionApprovalStepReorderAPIView,
    WorkflowActionAPIView,
    InstitutionApprovalStepAPIView,
)

urlpatterns = [
    path("task/", ApproveTaskAPIView.as_view(), name="task"),
    path("task/<int:task_id>/status/", ApproveTaskDetailAPIView.as_view(), name="update-task-status"),
    path(
        "Institution-approval-step/<int:Institution_id>/",
        InstitutionApprovalStepAPIView.as_view(),
        name="Institution-approval-step",
    ),
    path(
        'Institution-approval-step/<int:Institution_id>/reorder/',
        InstitutionApprovalStepReorderAPIView.as_view(),
        name='Institution-approval-step-reorder'
    ),
    path("workflow-action/", WorkflowActionAPIView.as_view(), name="workflow-action"),
]
