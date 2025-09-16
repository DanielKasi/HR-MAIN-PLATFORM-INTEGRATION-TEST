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
        "user.fullname",
        "user.email",
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
        "salary",
        "marital_status",
        "bank",
        "account_name",
        "bank_account_number",
        "emergency_contact_name",
        "emergency_contact_phone",
        "emergency_contact_relationship",
        "spouse_name",
        "spouse_date_of_birth",
        "spouse_phone_number",
        "child_name",
        "child_date_of_birth",
        "child_gender",
        "education_institution",
        "education_name",
        "education_year",
        "qualification",
        "work_company",
        "work_position",
        "work_duration",
        "work_reason_of_leaving",
    ]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Employees"

    ws.append(columns)

    for emp in employees:
        bank = emp.bank_accounts.first()
        kin = emp.next_of_kins.first()
        spouse = getattr(emp, 'spouse', None)
        child = emp.children.first()
        edu = emp.educations.first()
        exp = emp.work_experiences.first()

        row = [
            emp.employee_id,
            emp.user.fullname if emp.user else "",
            emp.user.email if emp.user else "",
            emp.phone_number or "",
            emp.position.name if emp.position else "",
            emp.gender or "",
            emp.department.name if emp.department else "",
            emp.date_of_birth.strftime("%Y-%m-%d") if emp.date_of_birth else "",
            emp.work_type.name if emp.work_type else "",
            emp.employee_type.name if emp.employee_type else "",
            emp.date_of_joining.strftime("%Y-%m-%d") if emp.date_of_joining else "",
            emp.address or "",
            emp.country or "",
            emp.nin or "",
            emp.nssf_no or "",
            emp.tin or "",
            emp.skills or "",
            emp.salary or "",
            emp.marital_status or "",
            bank.bank.bank_fullname if bank else "",
            bank.account_name if bank else "",
            bank.account_number if bank else "",
            kin.name if kin else "",
            kin.phone_number if kin else "",
            kin.relationship if kin else "",
            spouse.name if spouse else "",
            spouse.date_of_birth.strftime("%Y-%m-%d") if spouse and spouse.date_of_birth else "",
            spouse.phone_number if spouse else "",
            child.name if child else "",
            child.date_of_birth.strftime("%Y-%m-%d") if child and child.date_of_birth else "",
            child.gender if child else "",
            edu.institution if edu else "",
            edu.name if edu else "",
            str(edu.year) if edu else "",
            edu.qualification.name if edu and edu.qualification else "",
            exp.company if exp else "",
            exp.position if exp else "",
            exp.duration if exp else "",
            exp.reason_of_leaving if exp else "",
        ]
        ws.append(row)

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="employees.xlsx"'
    wb.save(response)
    return response
