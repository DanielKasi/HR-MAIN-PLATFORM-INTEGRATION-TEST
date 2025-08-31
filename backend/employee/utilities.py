from datetime import datetime
from .models import Employee, EmployeeDay
from settings.models import SystemDay


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


def get_employee_day(employee: Employee, day: SystemDay) -> EmployeeDay:
    working_days = get_employee_working_days_obj(employee)
    try:
        return working_days.employee_days.get(day=day)
    except EmployeeDay.DoesNotExist:
        raise LookupError(
            f"No working schedule found for employee {employee.id} on {day}"
        )


def get_employee_day_working_start_time(employee: Employee, day: SystemDay) -> datetime:
    return get_employee_day(employee, day).start_time


def get_employee_day_working_end_time(employee: Employee, day: SystemDay) -> datetime:
    return get_employee_day(employee, day).end_time
