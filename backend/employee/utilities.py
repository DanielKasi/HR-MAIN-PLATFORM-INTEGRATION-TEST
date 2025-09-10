from datetime import datetime, time
from .models import Employee, EmployeeDay
from settings.models import SystemDay
import openpyxl
from django.http import HttpResponse


def get_employee_working_days_obj(employee: Employee):
    if hasattr(employee, "custom_working_days"):
        return employee.custom_working_days
    if employee.payroll_branch and hasattr(employee.payroll_branch, "working_days"):
        return employee.payroll_branch.working_days
    if employee.department.institution and hasattr(
        employee.department.institution, "working_days"
    ):
        return employee.department.institution.working_days
    raise LookupError(f"No working days found for employee {employee.id}")


def get_employee_working_days(employee: Employee):
    return get_employee_working_days_obj(employee).days.all()


def get_employee_day(employee: Employee, day: SystemDay):
    working_days = get_employee_working_days_obj(employee)
    return working_days.days.get(day_code=day.day_code)


def get_employee_day_working_start_time(employee: Employee, day: SystemDay) -> time:
    work_day = get_employee_day(employee, day)
    if hasattr(work_day, "start_time"):
        return work_day.start_time
    else:
        if employee.payroll_branch:
            return employee.payroll_branch.branch_opening_time

    raise LookupError(f"Failed to get start time for employee {employee.id}")


def get_employee_day_working_end_time(employee: Employee, day: SystemDay) -> time:
    work_day = get_employee_day(employee, day)
    if hasattr(work_day, "end_time"):
        return work_day.end_time
    else:
        if employee.payroll_branch:
            return employee.payroll_branch.branch_closing_time

    raise LookupError(f"Failed to get end time for employee {employee.id}")


def generate_employee_excel(employees):
    columns = [
        "employee_id",
        "fullname",
        "email",
        "phone_number",
        "position",
        "gender",
        "department",
        "date_of_birth",
        "work_type",
        "employee_type",
        "date_of_joining",
        "address",
        "country",
        "nin",
        "nssf_no",
        "tin",
        "skills",
        "marital_status",
    ]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Employees"

    ws.append(columns)

    for emp in employees:
        ws.append(
            [
                emp.employee_id,
                emp.user.fullname if emp.user else "",
                emp.user.email if emp.user else "",
                emp.phone_number,
                emp.position.name,
                emp.gender,
                emp.department.name if emp.department else "",
                emp.date_of_birth.strftime("%Y-%m-%d") if emp.date_of_birth else "",
                emp.work_type.name if emp.work_type else "",
                emp.employee_type.name if emp.employee_type else "",
                emp.date_of_joining.strftime("%Y-%m-%d") if emp.date_of_joining else "",
                emp.address,
                emp.country,
                emp.nin,
                emp.nssf_no,
                emp.tin,
                emp.skills,
                emp.marital_status,
            ]
        )

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="employees.xlsx"'
    wb.save(response)
    return response
