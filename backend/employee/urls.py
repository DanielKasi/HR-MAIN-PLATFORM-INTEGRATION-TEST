from django.urls import path
from .views import (
    EmployeeAttendanceDetailAPIView,
    EmployeeAttendanceListCreateAPIView,
    EmployeeBranchDetailAPIView,
    EmployeeBranchManagementAPIView,
    EmployeeListAPIView,
    EmployeeDetailAPIView,
    EmployeeCreateAPIView,
    EmployeeTypeDetailAPIView,
    EmployeeTypeListCreateAPIView,
    EmployeeUpdateAPIView,
    EmployeeDeleteAPIView,
    WorkTypeDetailAPIView,
    WorkTypeListCreateAPIView,
    EmployeeTemplateDownloadAPIView,
    ContractListCreateView,
    ContractDetailView,
    ContractDownloadView,
    ContractTemplateUploadView
)

urlpatterns = [
    path(
        "<int:institution_id>/employee/",
        EmployeeListAPIView.as_view(),
        name="employee-list",
    ),
    path("<int:employee_id>/", EmployeeDetailAPIView.as_view(), name="employee-detail"),
    path("create/", EmployeeCreateAPIView.as_view(), name="create-employee"),
    path(
        "<int:employee_id>/update/",
        EmployeeUpdateAPIView.as_view(),
        name="update-employee",
    ),
    path("template/", EmployeeTemplateDownloadAPIView.as_view(), name='employee-template'),
    path(
        "<int:employee_id>/delete/",
        EmployeeDeleteAPIView.as_view(),
        name="delete-employee",
    ),
    path(
        "<int:employee_id>/branches/",
        EmployeeBranchDetailAPIView.as_view(),
        name="employee-branches",
    ),
    path(
        "branches/attach/",
        EmployeeBranchManagementAPIView.as_view(),
        name="attach-employee-branches",
    ),
    path(
        "<int:employee_id>/attendance/",
        EmployeeAttendanceListCreateAPIView.as_view(),
        name="employee-attendance-list",
    ),
    path(
        "attendance/",
        EmployeeAttendanceListCreateAPIView.as_view(),
        name="attendance-list-create",
    ),
    path(
        "attendance/<int:pk>/",
        EmployeeAttendanceDetailAPIView.as_view(),
        name="attendance-detail",
    ),
    path(
        "employee-types/",
        EmployeeTypeListCreateAPIView.as_view(),
        name="employee-type-list-create",
    ),
    path(
        "employee-types/<int:pk>/",
        EmployeeTypeDetailAPIView.as_view(),
        name="employee-type-detail",
    ),
    path(
        "work-types/", WorkTypeListCreateAPIView.as_view(), name="work-type-list-create"
    ),
    path(
        "work-types/<int:pk>/", WorkTypeDetailAPIView.as_view(), name="work-type-detail"
    ),
    path('institutions/<int:institution_id>/contracts/', ContractListCreateView.as_view(), name='contract-list-create'),
    path('contracts/<int:id>/', ContractDetailView.as_view(), name='contract-detail'),
    path('contracts/<int:id>/download/', ContractDownloadView.as_view(), name='contract-download'),
    path('contracts/template/', ContractTemplateUploadView.as_view(), name='contract-template-upload'),
]
