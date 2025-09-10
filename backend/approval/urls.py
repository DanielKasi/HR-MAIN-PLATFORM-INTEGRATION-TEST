from django.urls import path
from .views import (
    ActionListAPIView, ActionDetailAPIView, ApprovableContentTypeDetailAPIView, ApprovalTaskOverrideAPIView,
    ApproverGroupListAPIView, ApproverGroupDetailAPIView,
    ApprovalDocumentListAPIView, ApprovalDocumentDetailAPIView,
    ApprovalDocumentLevelListAPIView, ApprovalDocumentLevelDetailAPIView,
    ApprovalListAPIView, ApprovalDetailAPIView,
    ApprovalTaskListAPIView, ApprovalTaskDetailAPIView,
    ApprovalTaskApproveAPIView, ApprovalTaskRejectAPIView,
    ApprovalTasksDashboardAPIView, ApprovableContentTypesListAPIView
)

app_name = 'approvals'

urlpatterns = [
    # Actions URLs
    path('actions/', ActionListAPIView.as_view(), name='action-list'),
    path('actions/<int:pk>/', ActionDetailAPIView.as_view(), name='action-detail'),
    
    # Approver Groups URLs
    path('approver-groups/', ApproverGroupListAPIView.as_view(), name='approver-group-list'),
    path('approver-groups/<int:pk>/', ApproverGroupDetailAPIView.as_view(), name='approver-group-detail'),
    
    # Approval Documents URLs
    path('approval-documents/', ApprovalDocumentListAPIView.as_view(), name='approval-document-list'),
    path('approval-documents/<int:pk>/', ApprovalDocumentDetailAPIView.as_view(), name='approval-document-detail'),
    
    # Approval Document Levels URLs
    path('approval-document-levels/', ApprovalDocumentLevelListAPIView.as_view(), name='approval-document-level-list'),
    path('approval-document-levels/<int:pk>/', ApprovalDocumentLevelDetailAPIView.as_view(), name='approval-document-level-detail'),
    
    # Approvals URLs
    path('approvals/', ApprovalListAPIView.as_view(), name='approval-list'),
    path('approvals/<int:pk>/', ApprovalDetailAPIView.as_view(), name='approval-detail'),
    
    # Approval Tasks URLs
    path('approval-tasks/', ApprovalTaskListAPIView.as_view(), name='approval-task-list'),
    path('approval-tasks/<int:pk>/', ApprovalTaskDetailAPIView.as_view(), name='approval-task-detail'),
    path('approval-tasks/<int:pk>/approve/', ApprovalTaskApproveAPIView.as_view(), name='approval-task-approve'),
    path('approval-tasks/<int:pk>/reject/', ApprovalTaskRejectAPIView.as_view(), name='approval-task-reject'),

    path('tasks-analytics/', ApprovalTasksDashboardAPIView.as_view(), name='tasks-analytics'),
    path('approvable-models/', ApprovableContentTypesListAPIView.as_view(), name='approvable-content-types-list'),
    path('approvable-models/<int:pk>/', ApprovableContentTypeDetailAPIView.as_view(), name='approvable-model-details'),
    path('override/<int:pk>/', ApprovalTaskOverrideAPIView.as_view(), name='approval-task-override'),
]
