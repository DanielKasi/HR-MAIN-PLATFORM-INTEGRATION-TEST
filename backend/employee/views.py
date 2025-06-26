from django.shortcuts import render

from institution.models import Branch, UserBranch
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .serializers import EmployeeSerializer
from .models import Employee
from rest_framework.parsers import MultiPartParser, FormParser
from institution.utils import generate_compliant_password
from employee.service import EmployeeBranchService

class EmployeeListAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=EmployeeSerializer,
        responses={200: EmployeeSerializer(many=True)},  # Fixed: added many=True
        description="Retrieve a list of employees.",
        summary="List Employees",
        tags=["Employee Management"],
    )
    def get(self, request, institution_id):
        """
        Retrieve a list of employees for a specific institution.
        """
        try:
            # Filter employees by institution_id
            employees = Employee.objects.filter(department__institution_id=institution_id)
            serializer = EmployeeSerializer(employees, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"detail": "Error retrieving employees."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )





class EmployeeDetailAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=EmployeeSerializer,
        responses={200: EmployeeSerializer, 404: "Employee not found"},
        description="Retrieve details of a specific employee.",
        summary="Employee Detail",
        tags=["Employee Management"],
    )
    def get(self, request, employee_id):
        """Retrieve details of a specific employee."""
        try:
            employee = Employee.objects.get(id=employee_id)
            serializer = EmployeeSerializer(employee)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class EmployeeCreateAPIView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=EmployeeSerializer,
        responses={201: EmployeeSerializer, 400: "Bad Request"},
        summary="Create Employee",
        tags=["Employee Management"]
    )
    def post(self, request):
        """Create a new employee with user account."""
        
        def extract_value(data, key):
            """Extract single value from QueryDict list format"""
            value = data.get(key)
            return value[0] if isinstance(value, list) and value else value
        
        # Check required fields
        if not all(k in request.data for k in ['user.fullname', 'user.email']):
            return Response({"detail": "Missing required user fields"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate password for new user
        random_password = generate_compliant_password()
        
        # Build user data
        user_data = {
            'fullname': extract_value(request.data, 'user.fullname'),
            'email': extract_value(request.data, 'user.email'),
            'password': random_password
        }
        
        # Process all other fields
        final_data = {}
        for key, value in request.data.items():
            if key not in ['user.fullname', 'user.email']:
                final_data[key] = extract_value(request.data, key)
        
        # Add user data
        final_data['user'] = user_data
        
        # Convert data types
        if 'is_active' in final_data:
            final_data['is_active'] = str(final_data['is_active']).lower() == 'true'
        
        for field in ['position', 'department', 'experience', 'children_count', 'institutionId']:
            if field in final_data:
                try:
                    final_data[field] = int(final_data[field]) if final_data[field] else 0
                except (ValueError, TypeError):
                    final_data[field] = 0
        
        # Create employee
        serializer = EmployeeSerializer(data=final_data)
        if not serializer.is_valid():
            return Response({"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        employee = serializer.save()
        
        # Setup password for new employee
        employee.user.is_password_verified = False
        employee.user.save()
        employee.setup_employee_password(request)
        
        return Response(EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED)


class EmployeeUpdateAPIView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=EmployeeSerializer,
        responses={200: EmployeeSerializer, 400: "Bad Request", 404: "Not Found"},
        description="Update an existing employee.",
        summary="Update Employee",
        tags=["Employee Management"],
    )
    def patch(self, request, employee_id):
        """Update an existing employee."""
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        
        def extract_value(data, key):
            """Extract single value from QueryDict list format"""
            value = data.get(key)
            return value[0] if isinstance(value, list) and value else value
        
        # Extract user data and build final data dict
        user_data = {}
        final_data = {}
        
        if 'user.fullname' in request.data:
            user_data['fullname'] = extract_value(request.data, 'user.fullname')
        
        if 'user.email' in request.data:
            user_data['email'] = extract_value(request.data, 'user.email')
        
        # Process all other fields except user data
        for key, value in request.data.items():
            if key not in ['user.fullname', 'user.email']:
                final_data[key] = extract_value(request.data, key)
        
        # Convert data types
        if 'is_active' in final_data:
            final_data['is_active'] = str(final_data['is_active']).lower() == 'true'
        
        for field in ['position', 'department', 'experience', 'children_count']:
            if field in final_data:
                try:
                    final_data[field] = int(final_data[field]) if final_data[field] else 0
                except (ValueError, TypeError):
                    final_data[field] = 0
        
        # Update employee data
        serializer = EmployeeSerializer(employee, data=final_data, partial=True)
        if not serializer.is_valid():
            return Response({"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        employee = serializer.save()
        
        # Handle user updates separately
        if user_data and employee.user:
            user_updated = False
            
            if 'fullname' in user_data:
                employee.user.fullname = user_data['fullname']
                user_updated = True
            
            if 'email' in user_data and user_data['email'] != employee.user.email:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                if User.objects.filter(email=user_data['email']).exclude(id=employee.user.id).exists():
                    return Response(
                        {"detail": "Email already exists for another user."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                employee.user.email = user_data['email']
                employee.user.username = user_data['email']
                user_updated = True
            
            if user_updated:
                random_password = generate_compliant_password()
                employee.user.set_password(random_password)
                employee.user.is_password_verified = False
                employee.user.save()
                employee.setup_employee_password(request)
        
        return Response(EmployeeSerializer(employee).data, status=status.HTTP_200_OK)

        
class EmployeeDeleteAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={204: "No Content", 404: "Not Found"},
        description="Delete an existing employee.",
        summary="Delete Employee",
        tags=["Employee Management"],
    )
    def delete(self, request, institution_id, employee_id):
        """Delete an existing employee."""
        try:
            employee = Employee.objects.get(id=employee_id, department__institution_id=institution_id)
            employee.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        

class EmployeeBranchManagementAPIView(APIView):
    """New view for managing employee-branch relationships"""
    
    @extend_schema(
        request={
            'type': 'object',
            'properties': {
                'employee_id': {'type': 'integer'},
                'branches': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'branch_id': {'type': 'integer'},
                            'is_default': {'type': 'boolean'}
                        }
                    }
                }
            }
        },
        responses={200: 'Employee attached to branches successfully'},
        description="Attach an employee to one or multiple branches",
        summary="Attach employee to branches",
        tags=["Employee Management"],
    )
    def post(self, request):
        """Attach employee to multiple branches"""
        try:
            employee_id = request.data.get('employee_id')
            branches_data = request.data.get('branches', [])
            
            employee = Employee.objects.get(id=employee_id)
            
            
            # Validate and prepare branch data
            processed_branches = []
            for branch_data in branches_data:
                branch = Branch.objects.get(id=branch_data['branch_id'])
                
                
                processed_branches.append({
                    'branch': branch,
                    'is_default': branch_data.get('is_default', False)
                })
            
            # Use service layer (recommended) or inline logic
            if hasattr(self, '_use_service_layer'):  
                user_branches = EmployeeBranchService.attach_employee_to_multiple_branches(
                    employee=employee,
                    branches_data=processed_branches,
                    created_by=request.user
                )
                summary = EmployeeBranchService.get_employee_branch_summary(employee)
            else:
                # Inline logic (if you don't want services.py)
                user_branches = self._attach_employee_to_branches_inline(
                    employee, processed_branches, request.user
                )
                summary = self._get_employee_branch_summary_inline(employee)
            
            return Response({
                'message': 'Employee attached to branches successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        except Branch.DoesNotExist:
            return Response({'error': 'One or more branches not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    
    # INLINE METHODS (if you don't want to use services.py)
    def _attach_employee_to_branches_inline(self, employee, branches_data, created_by):
        """Inline method to attach employee to branches"""
        user_branches = []
        default_count = sum(1 for bd in branches_data if bd.get('is_default', False))
        
        if default_count > 1:
            raise ValueError("Only one branch can be set as default")
        
        if default_count == 0 and branches_data:
            branches_data[0]['is_default'] = True
        
        with transaction.atomic():
            for branch_data in branches_data:
                user_branch, created = UserBranch.objects.get_or_create(
                    user=employee.user,
                    branch=branch_data['branch'],
                    defaults={
                        'is_default': branch_data.get('is_default', False),
                        'created_by': created_by
                    }
                )
                
                if not created and branch_data.get('is_default', False):
                    user_branch.is_default = True
                    user_branch.save()
                
                user_branches.append(user_branch)
        
        return user_branches
    
    def _get_employee_branch_summary_inline(self, employee):
        """Inline method to get employee branch summary"""
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
            } if employee.payroll_branch else None
        }

class EmployeeBranchDetailAPIView(APIView):
    """Manage individual employee-branch relationships"""
    
    @extend_schema(
        responses={200: 'Employee branches retrieved successfully'},
        description="Get all branches for a specific employee",
        summary="Get employee branches",
        tags=["Employee Management"],
    )
    def get(self, request, employee_id):
        """Get all branches for a specific employee"""
        try:
            employee = Employee.objects.get(id=employee_id)
            
            
            
            # Use service layer or inline method
            if hasattr(self, '_use_service_layer'):
                summary = EmployeeBranchService.get_employee_branch_summary(employee)
            else:
                summary = self._get_employee_branch_summary_inline(employee)
            
            return Response({
                'message': 'Employee branches retrieved successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @extend_schema(
        request={
            'type': 'object',
            'properties': {
                'branch_id': {'type': 'integer'}
            }
        },
        responses={200: 'Default branch updated successfully'},
        description="Set a specific branch as default for an employee",
        summary="Set employee default branch",
        tags=["Employee Management"],
    )
    def patch(self, request, employee_id):
        """Set default branch for employee"""
        try:
            employee = Employee.objects.get(id=employee_id)
            branch_id = request.data.get('branch_id')
            
            if not branch_id:
                return Response({'error': 'branch_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            branch = Branch.objects.get(id=branch_id)
            
            
            # Check if employee is attached to this branch
            try:
                user_branch = UserBranch.objects.get(user=employee.user, branch=branch)
                user_branch.is_default = True
                user_branch.save()  # This will trigger payroll_branch update
                
                summary = self._get_employee_branch_summary_inline(employee)
                
                return Response({
                    'message': 'Default branch updated successfully',
                    'data': summary
                }, status=status.HTTP_200_OK)
                
            except UserBranch.DoesNotExist:
                return Response({'error': 'Employee is not attached to this branch'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        except Branch.DoesNotExist:
            return Response({'error': 'Branch not found'}, status=status.HTTP_404_NOT_FOUND)
    
    
    
    def _get_employee_branch_summary_inline(self, employee):
        """Inline method to get employee branch summary"""
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
            } if employee.payroll_branch else None
        }
