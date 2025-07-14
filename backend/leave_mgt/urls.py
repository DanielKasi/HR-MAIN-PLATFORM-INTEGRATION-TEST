from django.urls import path
from . import views

urlpatterns = [
    # Leave Types
    path('<int:institution_id>/leave-types/', views.LeaveTypeListCreateAPIView.as_view(), name='leave-types-list-create'),
    path('leave-types/<int:pk>/', views.LeaveTypeDetailAPIView.as_view(), name='leave-type-detail'),
    
    # Leave Balances
    path('<int:institution_id>/leave-balances/', views.LeaveBalanceListCreateAPIView.as_view(), name='leave-balances-list-create'),
    path('leave-balances/<int:pk>/', views.LeaveBalanceDetailAPIView.as_view(), name='leave-balance-detail'),
    
    # Leave Applications
    path('<int:institution_id>/leave-applications/', views.LeaveApplicationListCreateAPIView.as_view(), name='leave-applications-list-create'),
    path('leave-applications/<int:pk>/', views.LeaveApplicationDetailAPIView.as_view(), name='leave-application-detail'),
    path('leave-applications/<int:pk>/approval/', views.LeaveApplicationApprovalAPIView.as_view(), name='leave-application-approval'),
    
    # Leave Policies
    path('<int:institution_id>/leave-policies/', views.LeavePolicyListCreateAPIView.as_view(), name='leave-policies-list-create'),
    path('leave-policies/<int:pk>/', views.LeavePolicyDetailAPIView.as_view(), name='leave-policy-detail'),
    
    # Utility endpoints
    path('<int:institution_id>/initialize-balances/', views.initialize_yearly_balances, name='initialize-yearly-balances'),
    path('<int:institution_id>/carry-forward-leaves/', views.carry_forward_leaves, name='carry-forward-leaves'),
    path('employee/<int:employee_id>/summary/', views.employee_leave_summary, name='employee-leave-summary'),
]