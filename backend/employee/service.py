from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from leave_mgt.models import LeaveApplication
from institution.models import Department
from recruitment.models import JobPosition
from .models import EmployeeAttendance, EmployeeType, UserBranch, Branch, WorkType
from employee.models import Employee
import logging
from datetime import timedelta

# from payroll.utils import get_employee_attendance_status_for_date

logger = logging.getLogger(__name__)


class EmployeeBranchService:
    """Service class to handle employee-branch operations"""

    @staticmethod
    def attach_employee_to_branch(employee, branch, is_default=False, created_by=None):
        """Attach an employee to a branch"""
        try:
            if not employee.user:
                raise ValueError("Employee must have a user to be attached to a branch")

            logger.info(f"Attaching employee {employee.id} to branch {branch.id}")

            # Clear other default branches if this is being set as default
            if is_default:
                UserBranch.objects.filter(user=employee.user, is_default=True).update(
                    is_default=False
                )

            user_branch, created = UserBranch.objects.get_or_create(
                user=employee.user,
                branch=branch,
                defaults={"is_default": is_default, "created_by": created_by},
            )

            if not created and is_default:
                user_branch.is_default = True
                user_branch.save()

            logger.info(
                f"UserBranch {'created' if created else 'updated'}: {user_branch.id}"
            )
            return user_branch

        except Exception as e:
            logger.error(f"Error attaching employee to branch: {str(e)}")
            raise

    @staticmethod
    def attach_employee_to_multiple_branches(employee, branches_data, created_by=None):
        """Attach an employee to multiple branches at once"""
        try:
            logger.info(
                f"Attaching employee {employee.id} to {len(branches_data)} branches"
            )

            user_branches = []
            default_count = sum(
                1 for bd in branches_data if bd.get("is_default", False)
            )

            if default_count > 1:
                raise ValueError("Only one branch can be set as default")

            # If no default is specified, make the first branch default
            if default_count == 0 and branches_data:
                branches_data[0]["is_default"] = True
                logger.info("Set first branch as default")

            with transaction.atomic():
                # Clear all existing defaults first if we have a new default
                if any(bd.get("is_default", False) for bd in branches_data):
                    cleared_count = UserBranch.objects.filter(
                        user=employee.user, is_default=True
                    ).update(is_default=False)
                    logger.info(f"Cleared {cleared_count} existing default branches")

                for branch_data in branches_data:
                    user_branch = EmployeeBranchService.attach_employee_to_branch(
                        employee=employee,
                        branch=branch_data["branch"],
                        is_default=branch_data.get("is_default", False),
                        created_by=created_by,
                    )
                    if user_branch:
                        user_branches.append(user_branch)

            logger.info(f"Successfully attached {len(user_branches)} branches")
            return user_branches

        except Exception as e:
            logger.error(f"Error attaching employee to multiple branches: {str(e)}")
            raise

    @staticmethod
    def get_employee_branch_summary(employee):
        """Get a summary of employee's branch attachments"""
        try:
            logger.info(f"Getting branch summary for employee {employee.id}")

            if not employee.user:
                logger.warning(f"Employee {employee.id} has no user")
                return {"branches": [], "default_branch": None, "payroll_branch": None}

            user_branches = (
                UserBranch.objects.filter(user=employee.user)
                .select_related("branch")
                .order_by("-is_default", "branch__branch_name")
            )

            logger.info(f"Found {user_branches.count()} user branches")

            branches = []
            default_branch = None

            for ub in user_branches:
                # Convert datetime to ISO string for JSON serialization
                attached_date = None
                if hasattr(ub, "created_at") and ub.created_at:
                    attached_date = ub.created_at.isoformat()

                branch_info = {
                    "id": ub.branch.id,
                    "name": ub.branch.branch_name,
                    "location": ub.branch.branch_location,
                    "is_default": ub.is_default,
                    "attached_date": attached_date,
                }
                branches.append(branch_info)

                if ub.is_default:
                    default_branch = branch_info

            # Handle payroll branch safely
            payroll_branch = None
            if hasattr(employee, "payroll_branch") and employee.payroll_branch:
                payroll_branch = {
                    "id": employee.payroll_branch.id,
                    "name": employee.payroll_branch.branch_name,
                }
                # Only add location if it exists
                if hasattr(employee.payroll_branch, "branch_location"):
                    payroll_branch["location"] = employee.payroll_branch.branch_location

            summary = {
                "branches": branches,
                "default_branch": default_branch,
                "payroll_branch": payroll_branch,
            }

            logger.info(f"Branch summary created with {len(branches)} branches")
            return summary

        except Exception as e:
            logger.error(f"Error getting employee branch summary: {str(e)}")
            raise

    @staticmethod
    def set_default_branch(employee, branch):
        """Set a specific branch as default for an employee"""
        try:
            logger.info(
                f"Setting branch {branch.id} as default for employee {employee.id}"
            )

            if not employee.user:
                raise ValueError("Employee must have a user to set default branch")

            # Check if employee is attached to this branch
            user_branch = UserBranch.objects.filter(
                user=employee.user, branch=branch
            ).first()

            if not user_branch:
                raise ValueError("Employee is not attached to this branch")

            with transaction.atomic():
                # Clear existing default branches
                UserBranch.objects.filter(user=employee.user, is_default=True).update(
                    is_default=False
                )

                # Set new default branch
                user_branch.is_default = True
                user_branch.save()

            logger.info(f"Successfully set branch {branch.id} as default")
            return user_branch

        except Exception as e:
            logger.error(f"Error setting default branch: {str(e)}")
            raise

    @staticmethod
    def remove_employee_from_branch(employee, branch):
        """Remove an employee from a branch"""
        try:
            logger.info(f"Removing employee {employee.id} from branch {branch.id}")

            if not employee.user:
                raise ValueError("Employee must have a user")

            user_branches = UserBranch.objects.filter(user=employee.user, branch=branch)

            if not user_branches.exists():
                raise ValueError("Employee is not attached to this branch")

            was_default = user_branches.first().is_default
            deleted_count = user_branches.delete()[0]

            # If we removed the default branch, set another branch as default if available
            if was_default:
                remaining_branches = UserBranch.objects.filter(
                    user=employee.user
                ).first()
                if remaining_branches:
                    remaining_branches.is_default = True
                    remaining_branches.save()
                    logger.info(
                        f"Set branch {remaining_branches.branch.id} as new default"
                    )

            logger.info(f"Removed {deleted_count} user-branch relationships")
            return deleted_count > 0

        except Exception as e:
            logger.error(f"Error removing employee from branch: {str(e)}")
            raise


def is_non_working_day(date, employee, institution):
    """
    Determine if a date is a non-working day for the employee's branch or institution.
    Checks branch working days first, then institution working days, then holidays.
    """
    try:
        # Assume branch has a working_days field (e.g., list of integers 0-6 for Monday-Sunday)
        branch = employee.payroll_branch
        if branch and hasattr(branch, "working_days"):
            # Example: working_days = [0, 1, 2, 3, 4] for Monday-Friday
            if date.weekday() not in branch.working_days:
                return True

        # Fall back to institution working days
        elif hasattr(institution, "working_days"):
            if date.weekday() not in institution.working_days:
                return True

        # Check for holidays (assuming a Holiday model exists)
        from institution.models import Holiday

        if Holiday.objects.filter(institution=institution, date=date).exists():
            return True

        return False

    except Exception:
        # Default to assuming it's a working day if data is missing
        return False


def get_employee_attendance_status_for_date(
    employee_id, date, attendance_cache=None, institution=None
):
    """
    Determine the attendance or leave status for an employee on a specific date.
    Returns a status code compatible with the Excel report (e.g., 'P-on-T', 'A-L', 'N-W-D').
    """
    if attendance_cache is None:
        attendance_cache = {}

    cache_key = f"{employee_id}_{date}"
    if cache_key in attendance_cache:
        return attendance_cache[cache_key]

    try:
        # Get the employee
        employee = Employee.objects.get(id=employee_id)

        # Check for approved leave first
        leave = (
            LeaveApplication.objects.filter(
                employee_id=employee_id,
                start_date__lte=date,
                end_date__gte=date,
                status="approved",
            )
            .select_related("leave_type")
            .first()
        )

        if leave:
            leave_type_map = {
                "annual": "A-L",
                "sick": "S-L",
                "maternity": "M-L",
                "paternity": "P-L",
                "compassionate": "C-L",
                "study": "Sty-L",
                "unpaid": "UN-P-L",
            }
            status = leave_type_map.get(leave.leave_type.name.lower(), "ERR")
            attendance_cache[cache_key] = status
            return status

        # Check attendance record
        attendance = EmployeeAttendance.objects.filter(
            employee_id=employee_id, date=date
        ).first()

        if not attendance:
            # Check if it's a non-working day
            if institution and is_non_working_day(date, employee, institution):
                status = "N-W-D"
            else:
                status = "absent"
            attendance_cache[cache_key] = status
            return status

        # Map attendance status to Excel status
        status_map = {
            "on_time": "P-on-T",
            "late": "P-past-T",
            "early_checkout": "P-past-T",
            "late_and_early": "P-past-T",
            "overtime": "P-on-T",
            "absent": "absent",
            "pending": "ERR",
        }
        status = status_map.get(attendance.attendance_status, "ERR")
        attendance_cache[cache_key] = status
        return status

    except Exception as e:
        print(f"Error in get_employee_attendance_status_for_date: {str(e)}")  # Debug
        attendance_cache[cache_key] = "ERR"
        return "ERR"


def build_attendance_report_data(start_date, end_date, context, institution):
    employee_qs = Employee.objects.filter(
        is_active=True, payroll_branch__institution=institution
    ).select_related("user")

    if context.get("target_employees"):
        employee_qs = employee_qs.filter(id__in=context["target_employees"])
    elif context.get("target_departments"):
        employee_qs = employee_qs.filter(department__in=context["target_departments"])
    elif context.get("target_job_positions"):
        employee_qs = employee_qs.filter(position__in=context["target_job_positions"])

    employees = employee_qs.order_by("user__fullname")
    if not employees.exists():
        raise ValueError("No employees found for the provided filters.")

    num_days = (end_date - start_date).days + 1
    date_list = [start_date + timedelta(days=i) for i in range(num_days)]

    report_data = []
    attendance_cache = {}  # Cache to reduce database queries

    for employee in employees:
        summary = {
            "present": 0,
            "absent": 0,
            "late": 0,
            "leave": 0,
            "total_working_days": 0,
        }
        daily_statuses = {}

        for current_date in date_list:
            try:
                status = get_employee_attendance_status_for_date(
                    employee.id, current_date, attendance_cache, institution
                )
            except Exception as e:
                print(
                    f"Error for Employee {employee.id}, Date {current_date}: {str(e)}"
                )  # Debug
                status = "ERR"

            # Tally summary counts
            if status == "P-on-T":
                summary["present"] += 1
                summary["total_working_days"] += 1
            elif status == "P-past-T":
                summary["late"] += 1
                summary["total_working_days"] += 1
            elif status == "absent":
                summary["absent"] += 1
                summary["total_working_days"] += 1
            elif status in ["A-L", "S-L", "M-L", "P-L", "C-L", "Sty-L", "UN-P-L"]:
                summary["leave"] += 1
                summary["total_working_days"] += 1

            daily_statuses[str(current_date)] = status

        report_data.append(
            {
                "employee": {
                    "id": employee.id,
                    "full_name": employee.user.fullname if employee.user else "N/A",
                    "department": (
                        employee.department.name if employee.department else None
                    ),
                    "position": employee.position.name if employee.position else None,
                },
                "summary": summary,
                "daily_statuses": daily_statuses,
            }
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "employees": report_data,
    }


def create_owner_employee(institution):
    default_dept, dept_created = Department.objects.get_or_create(
        institution=institution,
        name="Human Resources Department",
        defaults={"description": "This is the default department for the institution."},
    )

    default_position, pos_created = JobPosition.objects.get_or_create(
        name="HR Manager",
        department=default_dept,
        defaults={
            "description": "This is the default position for the institution owner.",
            "salary_min": Decimal("0.00"),
            "is_active": True,
        },
    )

    owner = institution.institution_owner

    if not Employee.objects.filter(user=owner, department=default_dept).exists():
        # Create Employee instance
        employee = Employee.objects.create(
            user=owner,
            position=default_position,
            department=default_dept,
            email=owner.email,
            gender=owner.gender if owner.gender else "other",
            date_of_joining=timezone.now().date(),
            work_type=WorkType.objects.first(),
            employee_type=EmployeeType.objects.first(),
            salary=(
                default_position.salary_min
                if hasattr(default_position, "salary_min")
                else Decimal("0.00")
            ),
            is_active=True,
        )

        employee.sync_leave_balances()
        employee.sync_employee_working_days()

        return employee
    else:
        return Employee.objects.get(user=owner, department=default_dept)
