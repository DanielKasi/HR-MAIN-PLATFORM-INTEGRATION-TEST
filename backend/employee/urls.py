
from django.urls import path
from .views import (
    EmployeeListAPIView,
    EmployeeDetailAPIView,
    EmployeeCreateAPIView,
    EmployeeUpdateAPIView,
    EmployeeDeleteAPIView,
)

urlpatterns = [
    path("<int:institution_id>/employee/", EmployeeListAPIView.as_view(), name="employee-list"),
    path("<int:employee_id>/", EmployeeDetailAPIView.as_view(), name="employee-detail"),
    path("create/", EmployeeCreateAPIView.as_view(), name="create-employee"),
    path("<int:employee_id>/update/", EmployeeUpdateAPIView.as_view(), name="update-employee"),
    path("<int:employee_id>/delete/", EmployeeDeleteAPIView.as_view(), name="delete-employee"),
]
