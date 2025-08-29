from django.urls import path
from .views import *

urlpatterns = [
    path(
        "<int:institution_id>/employee-allowances/",
        EmployeeAllowanceAPIView.as_view(),
        name="employee-allowance-list-create",
    ),
    path("employee-allowances/<int:pk>/", EmployeeAllowanceDetailAPIView.as_view()),
    path(
        "<int:institution_id>/payroll-periods/",
        PayrollPeriodAPIView.as_view(),
        name="payroll-period-list-create",
    ),
    path(
        "<int:institution_id>/employee-deductions/",
        EmployeeDeductionAPIView.as_view(),
        name="employee-deductions-list-create",
    ),
    path("employee-deductions/<int:pk>/", EmployeeDeductionDetailAPIView.as_view()),
    path(
        "<int:institution_id>/allowance-types/",
        AllowanceTypeAPIView.as_view(),
        name="allowance-type-list-create",
    ),
    path("allowance-types/<int:pk>/", AllowanceTypeDetailAPIView.as_view()),
    path(
        "<int:institution_id>/deduction-types/",
        DeductionTypeAPIView.as_view(),
        name="deduction-type-list-create",
    ),
    path("deduction-types/<int:pk>/", DeductionTypeDetailAPIView.as_view()),
    path(
        "<int:institution_id>/payroll-periods/",
        PayrollPeriodAPIView.as_view(),
        name="payroll-period-list-create",
    ),
    path("payroll-periods/<int:pk>/", PayrollPeriodDetailAPIView.as_view()),
    path(
        "<int:institution_id>/payslips/",
        PayslipAPIView.as_view(),
        name="payslip-list-create",
    ),
    path("payslips/<int:pk>/", PayslipDetailAPIView.as_view()),
    path(
        "payslips/by-payroll/<int:payroll_id>/",
        PayslipsByPayrollAPIView.as_view(),
        name="payslips-by-payroll",
    ),
    path(
        "payslips/<int:payslip_id>/items/",
        PayslipItemAPIView.as_view(),
        name="payslipitem-list",
    ),
    path("export/", ExportEFTExcelView.as_view(), name="export2excel"),
    path(
        "employee-taxes/",
        EmployeeTaxListAPIView.as_view(),
        name="employee-tax-list-create",
    ),
    path(
        "employee-taxes/<int:pk>/",
        EmployeeTaxDetailAPIView.as_view(),
        name="employee-tax-detail",
    ),
    path(
        "payroll-periods/<int:pk>/attendance-report/",
        PayrollPeriodAttendanceReportAPIView.as_view(),
        name="payroll-period-attendance-report",
    ),
    path(
        "export-passlips-report2excel/",
        PayrollPeriodPayslipsExcelReportAPIView.as_view(),
        name="export-passlips-report-2-excel",
    ),
    path(
        "payslips/<int:payslip_id>/download/",
        DownloadPayslipPDFView.as_view(),
        name="payslip-pdf-download",
    ),
    path("penalties/", EmployeePenaltyListAPIView.as_view(), name="employee-penalty-list"),
    path("penalties/<int:pk>/", EmployeePenaltyDetailAPIView.as_view(), name="employee-penalty-detail"),


]
