from datetime import datetime, time
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
