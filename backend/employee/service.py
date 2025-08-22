from django.db import transaction
from .models import UserBranch, Branch
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
                # status = get_employee_attendance_status_for_date(
                #     employee.id, current_date
                # )
                status = []
            except Exception:
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
