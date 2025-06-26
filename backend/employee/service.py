from django.db import transaction
from .models import UserBranch, Branch
from employee.models import Employee  # Adjust import based on your app structure

class EmployeeBranchService:
    """Service class to handle employee-branch operations"""
    
    @staticmethod
    def attach_employee_to_branch(employee, branch, is_default=False, created_by=None):
        """Attach an employee to a branch"""
        if not employee.user:
            raise ValueError("Employee must have a user to be attached to a branch")
        
        user_branch, created = UserBranch.objects.get_or_create(
            user=employee.user,
            branch=branch,
            defaults={
                'is_default': is_default,
                'created_by': created_by
            }
        )
        
        if not created and is_default:
            user_branch.is_default = True
            user_branch.save()
        
        return user_branch
    
    @staticmethod
    def attach_employee_to_multiple_branches(employee, branches_data, created_by=None):
        """Attach an employee to multiple branches at once"""
        user_branches = []
        default_count = sum(1 for bd in branches_data if bd.get('is_default', False))
        
        if default_count > 1:
            raise ValueError("Only one branch can be set as default")
        
        if default_count == 0 and branches_data:
            branches_data[0]['is_default'] = True
        
        with transaction.atomic():
            for branch_data in branches_data:
                user_branch = EmployeeBranchService.attach_employee_to_branch(
                    employee=employee,
                    branch=branch_data['branch'],
                    is_default=branch_data.get('is_default', False),
                    created_by=created_by
                )
                if user_branch:
                    user_branches.append(user_branch)
        
        return user_branches
    
    @staticmethod
    def get_employee_branch_summary(employee):
        """Get a summary of employee's branch attachments"""
        if not employee.user:
            return {'branches': [], 'default_branch': None, 'payroll_branch': None}
        
        user_branches = UserBranch.objects.filter(user=employee.user).select_related('branch')
        
        branches = []
        default_branch = None
        
        for ub in user_branches:
            branch_info = {
                'id': ub.branch.id,
                'name': ub.branch.branch_name,
                'location': ub.branch.branch_location,
                'is_default': ub.is_default,
                'attached_date': ub.created_at
            }
            branches.append(branch_info)
            
            if ub.is_default:
                default_branch = branch_info
        
        return {
            'branches': branches,
            'default_branch': default_branch,
            'payroll_branch': {
                'id': employee.payroll_branch.id if employee.payroll_branch else None,
                'name': employee.payroll_branch.branch_name if employee.payroll_branch else None,
                'location': employee.payroll_branch.branch_location if employee.payroll_branch else None,
            } if employee.payroll_branch else None
        }