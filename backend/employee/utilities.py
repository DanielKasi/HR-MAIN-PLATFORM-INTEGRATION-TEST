from datetime import time
from django.contrib.auth import get_user_model
from employee.tasks import send_email_task
from .models import Employee, EmployeeCompanyEmail
from settings.models import SystemDay
import openpyxl
from django.http import HttpResponse
import re
from django.core.exceptions import ValidationError
import string
import requests
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
from django.db import transaction

# from msgraph import GraphClientService
from azure.identity import ClientSecretCredential
from typing import Dict
from urllib.parse import urlencode
import secrets
import json
from django.conf import settings


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
            "employee fullname",
            "personal email",
            "company email",
            "phone number",
            "job position",
            "gender",
            "department",
            "date of birth",
            "work type",
            "employee type",
            "date of joining",
            "address",
            "country",
            "national id",
            "social security number",
            "tax id",
            "skills",
            "salary",
            "marital status",
            "bank name",
            "bank account name",
            "bank account number",
            "emergency contact name",
            "emergency contact phone",
            "emergency contact relationship",
            "spouse name",
            "spouse date of birth",
            "spouse phone number",
            "child name",
            "child date of birth",
            "child gender",
            "education institution",
            "education program",
            "education year",
            "qualification",
            "previous company",
            "previous position",
            "previous work duration",
            "reason for leaving",
    ]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Employees"

    ws.append(columns)

    for emp in employees:
        bank = emp.bank_accounts.first()
        kin = emp.next_of_kins.first()
        spouse = getattr(emp, "spouse", None)
        child = emp.children.first()
        edu = emp.educations.first()
        exp = emp.work_experiences.first()

        row = [
            emp.employee_id,
            emp.user.fullname if emp.user else "",
            emp.user.email if emp.user else "",
            emp.company_emails.email if emp.company_emails else "",
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
            (
                spouse.date_of_birth.strftime("%Y-%m-%d")
                if spouse and spouse.date_of_birth
                else ""
            ),
            spouse.phone_number if spouse else "",
            child.name if child else "",
            (
                child.date_of_birth.strftime("%Y-%m-%d")
                if child and child.date_of_birth
                else ""
            ),
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


class Config:
    """cPanel API configuration"""

    def __init__(self, host: str, username: str, token: str, port: str = "2083"):
        self.host = host
        self.username = username
        self.token = token
        self.port = port

    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> "Config":
        return cls(
            host=data["host"],
            username=data["username"],
            token=data["token"],
            port=data.get("port", "2083"),
        )


class EmailAccount:
    """Created email account information"""

    def __init__(self, email: str, password: str, domain: str, created: str):
        self.email = email
        self.password = password
        self.domain = domain
        self.created = created

    def to_dict(self) -> Dict[str, str]:
        return {
            "email": self.email,
            "password": self.password,
            "domain": self.domain,
            "created": self.created,
        }


class CPanelClient:
    """Handles cPanel API interactions"""

    def __init__(self, config: Config):
        self.config = config
        self.session = requests.Session()
        self.session.timeout = 30
        self.session.headers.update(
            {"Authorization": f"cpanel {self.config.username}:{self.config.token}"}
        )

    def _make_api_request(
        self, module: str, function: str, params: Dict[str, str]
    ) -> Dict:
        """Make a request to the cPanel API using API tokens"""
        base_url = (
            f"https://{self.config.host}:{self.config.port}/execute/{module}/{function}"
        )
        url = f"{base_url}?{urlencode(params)}" if params else base_url
        response = self.session.get(url)
        response.raise_for_status()
        result = response.json()
        if result.get("status") != 1:
            errors = result.get("errors", ["Unknown error"])
            raise ValidationError(f"cPanel API error: {errors[0]}")
        return result.get("data", {})

    def create_email_account(self, email: str, password: str, quota: int) -> None:
        """Create a new email account with specified quota"""
        parts = email.split("@")
        if len(parts) != 2:
            raise ValidationError(f"Invalid email format: {email}")

        username, domain = parts
        params = {
            "email": username,
            "password": password,
            "domain": domain,
            "quota": str(quota),
        }

        result = self._make_api_request("Email", "add_pop", params)

    def reset_email_password(self, email: str, password: str) -> None:
        """Reset an email account password"""
        parts = email.split("@")
        if len(parts) != 2:
            raise ValidationError(f"Invalid email format: {email}")

        username, domain = parts
        params = {"email": username, "domain": domain, "password": password}

        try:
            self._make_api_request("Email", "passwd_pop", params)
        except ValidationError as e:
            raise ValidationError(f"Failed to reset password for {email}: {e}")


def generate_email(employee):
    """
    Generate the company email based on the institution's email config.
    """
    if not employee.user or not employee.user.fullname:
        raise ValueError("User fullname is required to generate email.")

    try:
        config = employee.get_institution().email_config
    except AttributeError:
        raise ValueError("No email config set for institution.")

    fullname = employee.user.fullname.strip().lower()
    parts = re.split(r"\s+", fullname)
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    initials = "".join([p[0] for p in parts if p])
    sanitized_fullname = re.sub(r"\s+", "", fullname)

    email_local = config.format_template.format(
        first_name=first_name.replace(" ", ""),
        last_name=last_name.replace(" ", ""),
        initials=initials,
        fullname=sanitized_fullname,
    ).lower()

    return f"{email_local}@{config.domain}"


def generate_random_password(length=12):
    """
    Generate a random secure password.
    """
    charset = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(charset) for _ in range(length))


@transaction.atomic()
def create_company_email(employee, password=None):
    """
    Create email account via provider's API and return EmployeeCompanyEmail instance.
    """
    config = employee.get_institution().email_config
    password = password or generate_random_password()
    email = generate_email(employee)

    print(f">>>>>>>>>>>>>>>>>>>>> Checking environment >>>>>>>>>>>>>>>>>>>>>>> {settings.ENVIRONMENT}")
    if settings.ENVIRONMENT == "production":
        if config.provider == "cpanel":
            _create_cpanel_email(employee, config, password, config.quota, email)
        elif config.provider == "google_workspace":
            _create_google_email(employee, config, password)
        else:
            raise ValidationError(f"Unsupported provider: {config.provider}")

    # Create EmployeeCompanyEmail instance
    email_account = EmployeeCompanyEmail.objects.create(
        employee=employee, email=email, provider=config.provider, status="pending"
    )

    send_email_task.delay(
        employee_id=employee.id,
        email=email,
        password=password,
        config_id=config.id,
        is_welcome_email=False,
    )

    send_email_task.delay(
        employee_id=employee.id,
        email=email,
        password=None,
        config_id=config.id,
        is_welcome_email=True,
    )

    return email_account


def reset_email_password(employee, new_password=None):
    """
    Reset the email account password.
    """
    config = employee.get_institution().email_config
    new_password = new_password or generate_random_password()

    if config.provider == "cpanel":
        _reset_cpanel_email_password(employee, config, new_password)
    elif config.provider == "google_workspace":
        _reset_google_email_password(employee, config, new_password)
    # elif config.provider == 'microsoft_365':
    #     _reset_microsoft_email_password(employee, config, new_password)
    else:
        raise ValidationError(f"Unsupported provider: {config.provider}")

    # TODO: Send new_password to employee


def delete_company_email(employee):
    """
    Delete email account via provider's API.
    """
    config = employee.get_institution().email_config

    if config.provider == "cpanel":
        _delete_cpanel_email(employee, config)
    elif config.provider == "google_workspace":
        _delete_google_email(employee, config)
    # elif config.provider == 'microsoft_365':
    #     _delete_microsoft_email(employee, config)
    else:
        raise ValidationError(f"Unsupported provider: {config.provider}")


def _create_cpanel_email(employee, config, password, quota, email):
    """
    Create cPanel email account using CPanelClient.
    """
    if not all([config.api_url, config.api_username, config.api_token]):
        raise ValidationError("cPanel requires api_url, api_username, and api_token.")

    from urllib.parse import urlparse

    parsed_url = urlparse(config.api_url)
    host = parsed_url.hostname
    port = str(parsed_url.port) if parsed_url.port else "2083"

    cpanel_config = Config(
        host=host, username=config.api_username, token=config.api_token, port=port
    )
    client = CPanelClient(cpanel_config)
    client.create_email_account(email, password, quota)


def _reset_cpanel_email_password(employee, config, new_password):
    """
    Reset cPanel email account password using CPanelClient.
    """
    if not all([config.api_url, config.api_username, config.api_token]):
        raise ValidationError("cPanel requires api_url, api_username, and api_token.")

    host = config.api_url.replace("https://", "").rstrip("/")
    cpanel_config = Config(
        host=host, username=config.api_username, token=config.api_token, port="2083"
    )
    client = CPanelClient(cpanel_config)
    client.reset_email_password(employee.email, new_password)


def _delete_cpanel_email(employee, config):
    """
    Delete cPanel email account using CPanelClient.
    """
    if not all([config.api_url, config.api_username, config.api_token]):
        raise ValidationError("cPanel requires api_url, api_username, and api_token.")

    host = config.api_url.replace("https://", "").rstrip("/")
    cpanel_config = Config(
        host=host, username=config.api_username, token=config.api_token, port="2083"
    )
    client = CPanelClient(cpanel_config)
    client.delete_email_account(employee.email)


def _create_google_email(employee, config, password):
    """
    Create Google Workspace user account.
    """
    if not config.api_token:
        raise ValidationError(
            "Google Workspace requires api_token (service account JSON)."
        )

    try:
        service_account_data = json.loads(config.api_token)
        credentials = Credentials.from_service_account_info(
            service_account_data,
            scopes=["https://www.googleapis.com/auth/admin.directory.user"],
        )
        credentials = credentials.with_subject(f"admin@{config.domain}")
        service = build("admin", "directory_v1", credentials=credentials)

        parts = re.split(r"\s+", employee.user.fullname.strip())
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        user = {
            "primaryEmail": employee.email,
            "name": {"givenName": first_name, "familyName": last_name},
            "password": password,
            "changePasswordAtNextLogin": True,
        }
        service.users().insert(body=user).execute()
    except Exception as e:
        raise ValidationError(f"Google Workspace error: {str(e)}")


def _reset_google_email_password(employee, config, new_password):
    """
    Reset Google Workspace user password.
    """
    if not config.api_token:
        raise ValidationError(
            "Google Workspace requires api_token (service account JSON)."
        )

    try:
        service_account_data = json.loads(config.api_token)
        credentials = Credentials.from_service_account_info(
            service_account_data,
            scopes=["https://www.googleapis.com/auth/admin.directory.user"],
        )
        credentials = credentials.with_subject(f"admin@{config.domain}")
        service = build("admin", "directory_v1", credentials=credentials)

        user_update = {"password": new_password, "changePasswordAtNextLogin": True}
        service.users().update(userKey=employee.email, body=user_update).execute()
    except Exception as e:
        raise ValidationError(f"Google Workspace password reset error: {str(e)}")


def _delete_google_email(employee, config):
    """
    Delete Google Workspace user account.
    """
    if not config.api_token:
        raise ValidationError(
            "Google Workspace requires api_token (service account JSON)."
        )

    try:
        service_account_data = json.loads(config.api_token)
        credentials = Credentials.from_service_account_info(
            service_account_data,
            scopes=["https://www.googleapis.com/auth/admin.directory.user"],
        )
        credentials = credentials.with_subject(f"admin@{config.domain}")
        service = build("admin", "directory_v1", credentials=credentials)
        service.users().delete(userKey=employee.email).execute()
    except Exception as e:
        raise ValidationError(f"Google Workspace deletion error: {str(e)}")


# def _create_microsoft_email(employee, config, password):
#     """
#     Create Microsoft 365 user account.
#     """
#     if not all([config.api_client_id, config.api_client_secret, config.api_token]):
#         raise ValidationError("Microsoft 365 requires api_client_id, api_client_secret, and api_token (tenant_id).")

#     try:
#         credential = ClientSecretCredential(
#             tenant_id=config.api_token,
#             client_id=config.api_client_id,
#             client_secret=config.api_client_secret
#         )
#         graph_client = GraphClient(credential=credential)

#         parts = re.split(r'\s+', employee.user.fullname.strip())
#         first_name = parts[0] if parts else ''
#         last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''

#         user = {
#             'accountEnabled': True,
#             'displayName': employee.user.fullname,
#             'mailNickname': employee.email.split('@')[0],
#             'userPrincipalName': employee.email,
#             'givenName': first_name,
#             'surname': last_name,
#             'passwordProfile': {
#                 'password': password,
#                 'forceChangePasswordNextSignIn': True
#             }
#         }
#         graph_client.users().post(user)
#     except Exception as e:
#         raise ValidationError(f"Microsoft 365 error: {str(e)}")

# def _reset_microsoft_email_password(employee, config, new_password):
#     """
#     Reset Microsoft 365 user password.
#     """
#     if not all([config.api_client_id, config.api_client_secret, config.api_token]):
#         raise ValidationError("Microsoft 365 requires api_client_id, api_client_secret, and api_token (tenant_id).")

#     try:
#         credential = ClientSecretCredential(
#             tenant_id=config.api_token,
#             client_id=config.api_client_id,
#             client_secret=config.api_client_secret
#         )
#         graph_client = GraphClient(credential=credential)

#         user_update = {
#             'passwordProfile': {
#                 'password': new_password,
#                 'forceChangePasswordNextSignIn': True
#             }
#         }
#         graph_client.users.by_user_id(employee.email).patch(user_update)
#     except Exception as e:
#         raise ValidationError(f"Microsoft 365 password reset error: {str(e)}")

# def _delete_microsoft_email(employee, config):
#     """
#     Delete Microsoft 365 user account.
#     """
#     if not all([config.api_client_id, config.api_client_secret, config.api_token]):
#         raise ValidationError("Microsoft 365 requires api_client_id, api_client_secret, and api_token (tenant_id).")

#     try:
#         credential = ClientSecretCredential(
#             tenant_id=config.api_token,
#             client_id=config.api_client_id,
#             client_secret=config.api_client_secret
#         )
#         graph_client = GraphClient(credential=credential)
#         graph_client.users.by_user_id(employee.email).delete()
#     except Exception as e:
#         raise ValidationError(f"Microsoft 365 deletion error: {str(e)}")
