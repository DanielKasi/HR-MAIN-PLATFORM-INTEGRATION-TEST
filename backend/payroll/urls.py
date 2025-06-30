from django.urls import path
from .views import *

urlpatterns = [
    path('<int:institution_id>/employee-allowances/', EmployeeAllowanceAPIView.as_view(), name='employee-allowance-list-create'),
    path('employee-allowances/<int:pk>/', EmployeeAllowanceDetailAPIView.as_view()),

    path('<int:institution_id>/payroll-periods/', PayrollPeriodAPIView.as_view(), name='payroll-period-list-create'),
    path('employee-deductions/<int:pk>/', EmployeeDeductionDetailAPIView.as_view()),

    path('<int:institution_id>/allowance-types/', AllowanceTypeAPIView.as_view(), name='allowance-type-list-create'),
  
    path('<int:institution_id>/deduction-types/', DeductionTypeAPIView.as_view(), name='deduction-type-list-create'),


    path('<int:institution_id>/payroll-periods/', PayrollPeriodAPIView.as_view(), name='payroll-period-list-create'),
    path('payroll-periods/<int:pk>/', PayrollPeriodDetailAPIView.as_view()),

    path('<int:institution_id>/payslips/', PayslipAPIView.as_view(), name='payslip-list-create'),
    path('payslips/<int:pk>/', PayslipDetailAPIView.as_view()),

    path('payslips/<int:payslip_id>/items/', PayslipItemAPIView.as_view(), name='payslipitem-list'),
]
