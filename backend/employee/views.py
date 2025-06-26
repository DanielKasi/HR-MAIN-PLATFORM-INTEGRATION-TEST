from django.shortcuts import render

from institution.models import Branch, UserBranch
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .serializers import EmployeeAttendanceSerializer, EmployeeSerializer, EmployeeTypeSerializer, WorkTypeSerializer
from .models import Employee, EmployeeAttendance, EmployeeType, WorkType
from rest_framework.parsers import MultiPartParser, FormParser
from institution.utils import generate_compliant_password
from employee.service import EmployeeBranchService
from drf_spectacular.utils import extend_schema, OpenApiExample
from drf_spectacular.types import OpenApiTypes
import logging
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.renderers import JSONRenderer

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
        

logger = logging.getLogger(__name__)


class EmployeeBranchManagementAPIView(APIView):
    """New view for managing employee-branch relationships"""
    
    # Add these to ensure proper content type handling
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    renderer_classes = [JSONRenderer]
    
    @extend_schema(
        request={
            'type': 'object',
            'properties': {
                'employee_id': {
                    'type': 'integer',
                    'description': 'ID of the employee to attach to branches'
                },
                'branches': {
                    'type': 'array',
                    'description': 'List of branches to attach the employee to',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'branch_id': {
                                'type': 'integer',
                                'description': 'ID of the branch'
                            },
                            'is_default': {
                                'type': 'boolean',
                                'description': 'Whether this branch should be the default branch',
                                'default': False
                            }
                        },
                        'required': ['branch_id']
                    }
                }
            },
            'required': ['employee_id', 'branches']
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'branches': {'type': 'array'},
                            'default_branch': {'type': 'object'},
                            'payroll_branch': {'type': 'object'}
                        }
                    }
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            },
            404: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            }
        },
        examples=[
            OpenApiExample(
                'Attach employee to multiple branches',
                summary='Example request to attach employee to branches',
                description='Attach employee ID 1 to branches 2 and 3, with branch 2 as default',
                value={
                    'employee_id': 1,
                    'branches': [
                        {'branch_id': 2, 'is_default': True},
                        {'branch_id': 3, 'is_default': False}
                    ]
                }
            )
        ],
        description="Attach an employee to one or multiple branches. Only one branch can be set as default.",
        summary="Attach employee to branches",
        tags=["Employee Management"],
    )
    def post(self, request):
        """Attach employee to multiple branches"""
        try:
            employee_id = request.data.get('employee_id')
            branches_data = request.data.get('branches', [])
            
            # Debug logging
            print(f"DEBUG: employee_id = {employee_id}")
            print(f"DEBUG: branches_data = {branches_data}")
            
            # Validate required fields
            if not employee_id:
                return Response(
                    {'error': 'employee_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not branches_data:
                return Response(
                    {'error': 'branches list cannot be empty'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get employee or return 404
            try:
                employee = Employee.objects.get(id=employee_id)
                print(f"DEBUG: Found employee = {employee}")
            except Employee.DoesNotExist:
                return Response(
                    {'error': f'Employee with id {employee_id} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if employee has a user
            if not employee.user:
                return Response(
                    {'error': 'Employee must have a user account to be attached to branches'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate and prepare branch data
            processed_branches = []
            for i, branch_data in enumerate(branches_data):
                print(f"DEBUG: Processing branch_data[{i}] = {branch_data}")
                
                if 'branch_id' not in branch_data:
                    return Response(
                        {'error': f'branch_id is required for branch at index {i}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    branch = Branch.objects.get(id=branch_data['branch_id'])
                    print(f"DEBUG: Found branch = {branch}")
                except Branch.DoesNotExist:
                    return Response(
                        {'error': f'Branch with id {branch_data["branch_id"]} not found'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                processed_branches.append({
                    'branch': branch,
                    'is_default': branch_data.get('is_default', False)
                })
            
            print(f"DEBUG: processed_branches = {processed_branches}")
            
            # Use service layer if available, otherwise use inline logic
            try:
                # Try to use service layer first
                from .services import EmployeeBranchService  # Make sure import is correct
                user_branches = EmployeeBranchService.attach_employee_to_multiple_branches(
                    employee=employee,
                    branches_data=processed_branches,
                    created_by=request.user
                )
                summary = EmployeeBranchService.get_employee_branch_summary(employee)
                print("DEBUG: Used service layer successfully")
            except (ImportError, NameError, AttributeError) as service_error:
                print(f"DEBUG: Service layer not available: {service_error}")
                # Fall back to inline logic if service doesn't exist
                user_branches = self._attach_employee_to_branches_inline(
                    employee, processed_branches, request.user
                )
                summary = self._get_employee_branch_summary_inline(employee)
                print("DEBUG: Used inline logic successfully")
            
            return Response({
                'message': 'Employee attached to branches successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            print(f"DEBUG: ValueError: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"DEBUG: Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _attach_employee_to_branches_inline(self, employee, branches_data, created_by):
        """Inline method to attach employee to branches"""
        print(f"DEBUG: _attach_employee_to_branches_inline called with {len(branches_data)} branches")
        
        user_branches = []
        default_count = sum(1 for bd in branches_data if bd.get('is_default', False))
        
        print(f"DEBUG: default_count = {default_count}")
        
        # Validate default branch logic
        if default_count > 1:
            raise ValueError("Only one branch can be set as default")
        
        # If no default is specified, make the first branch default
        if default_count == 0 and branches_data:
            branches_data[0]['is_default'] = True
            print("DEBUG: Set first branch as default")
        
        try:
            with transaction.atomic():
                # Clear existing default branches if we're setting a new default
                if any(bd.get('is_default', False) for bd in branches_data):
                    cleared = UserBranch.objects.filter(
                        user=employee.user, 
                        is_default=True
                    ).update(is_default=False)
                    print(f"DEBUG: Cleared {cleared} existing default branches")
                
                for i, branch_data in enumerate(branches_data):
                    print(f"DEBUG: Processing branch {i}: {branch_data}")
                    
                    user_branch, created = UserBranch.objects.get_or_create(
                        user=employee.user,
                        branch=branch_data['branch'],
                        defaults={
                            'is_default': branch_data.get('is_default', False),
                            'created_by': created_by
                        }
                    )
                    
                    print(f"DEBUG: UserBranch {'created' if created else 'found'}: {user_branch.id}")
                    
                    # Update existing record if needed
                    if not created:
                        user_branch.is_default = branch_data.get('is_default', False)
                        user_branch.save()
                        print(f"DEBUG: Updated existing UserBranch {user_branch.id}")
                    
                    user_branches.append(user_branch)
                
                # Update employee's payroll_branch to the default branch
                default_branch = next((bd['branch'] for bd in branches_data if bd.get('is_default')), None)
                if default_branch:
                    employee.payroll_branch = default_branch
                    employee.save(update_fields=['payroll_branch'])
                    print(f"DEBUG: Updated employee payroll_branch to {default_branch}")
        
        except Exception as e:
            print(f"DEBUG: Error in transaction: {str(e)}")
            raise
        
        print(f"DEBUG: Successfully created/updated {len(user_branches)} UserBranch records")
        return user_branches
    
    def _get_employee_branch_summary_inline(self, employee):
        """Inline method to get employee branch summary"""
        print(f"DEBUG: _get_employee_branch_summary_inline called for employee {employee.id}")
        
        if not employee.user:
            print("DEBUG: Employee has no user")
            return {'branches': [], 'default_branch': None, 'payroll_branch': None}
        
        user_branches = UserBranch.objects.filter(
            user=employee.user
        ).select_related('branch').order_by('-is_default', 'branch__branch_name')
        
        print(f"DEBUG: Found {user_branches.count()} user branches")
        
        branches = []
        default_branch = None
        
        for i, ub in enumerate(user_branches):
            print(f"DEBUG: Processing UserBranch {i}: {ub.id}, default={ub.is_default}")
            
            branch_info = {
                'id': ub.branch.id,
                'name': ub.branch.branch_name,
                'location': getattr(ub.branch, 'branch_location', ''),  # Safe access
                'is_default': ub.is_default,
                'attached_date': ub.created_at.isoformat() if ub.created_at else None
            }
            branches.append(branch_info)
            
            if ub.is_default:
                default_branch = branch_info
                print(f"DEBUG: Found default branch: {default_branch}")
        
        # Handle payroll branch safely
        payroll_branch = None
        if employee.payroll_branch:
            payroll_branch = {
                'id': employee.payroll_branch.id,
                'name': employee.payroll_branch.branch_name,
                'location': getattr(employee.payroll_branch, 'branch_location', ''),
            }
            print(f"DEBUG: Payroll branch: {payroll_branch}")
        
        summary = {
            'branches': branches,
            'default_branch': default_branch,
            'payroll_branch': payroll_branch
        }
        
        print(f"DEBUG: Final summary: {summary}")
        return summary


class EmployeeBranchDetailAPIView(APIView):
    """Manage individual employee-branch relationships"""
    
    # Add these to ensure proper content type handling
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    renderer_classes = [JSONRenderer]
    
    @extend_schema(
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'branches': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'id': {'type': 'integer'},
                                        'name': {'type': 'string'},
                                        'location': {'type': 'string'},
                                        'is_default': {'type': 'boolean'},
                                        'attached_date': {'type': 'string', 'format': 'date-time'}
                                    }
                                }
                            },
                            'default_branch': {'type': 'object'},
                            'payroll_branch': {'type': 'object'}
                        }
                    }
                }
            },
            404: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            }
        },
        description="Get all branches for a specific employee with their relationships",
        summary="Get employee branches",
        tags=["Employee Management"],
    )
    def get(self, request, employee_id):
        """Get all branches for a specific employee"""
        try:
            employee = get_object_or_404(Employee, id=employee_id)
            
            # Use service layer if available, otherwise use inline method
            try:
                summary = EmployeeBranchService.get_employee_branch_summary(employee)
            except NameError:
                summary = self._get_employee_branch_summary_inline(employee)
            
            return Response({
                'message': 'Employee branches retrieved successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'An unexpected error occurred'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @extend_schema(
        request={
            'type': 'object',
            'properties': {
                'branch_id': {
                    'type': 'integer',
                    'description': 'ID of the branch to set as default'
                }
            },
            'required': ['branch_id']
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'data': {'type': 'object'}
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            },
            404: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            }
        },
        examples=[
            OpenApiExample(
                'Set default branch',
                summary='Example request to set default branch',
                description='Set branch ID 5 as the default branch for the employee',
                value={'branch_id': 5}
            )
        ],
        description="Set a specific branch as default for an employee. The employee must already be attached to this branch.",
        summary="Set employee default branch",
        tags=["Employee Management"],
    )
    def patch(self, request, employee_id):
        """Set default branch for employee"""
        try:
            employee = get_object_or_404(Employee, id=employee_id)
            branch_id = request.data.get('branch_id')
            
            if not branch_id:
                return Response(
                    {'error': 'branch_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            branch = get_object_or_404(Branch, id=branch_id)
            
            # Check if employee is attached to this branch
            user_branch = UserBranch.objects.filter(
                user=employee.user, 
                branch=branch
            ).first()
            
            if not user_branch:
                return Response(
                    {'error': 'Employee is not attached to this branch'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Clear existing default branches
                UserBranch.objects.filter(
                    user=employee.user, 
                    is_default=True
                ).update(is_default=False)
                
                # Set new default branch
                user_branch.is_default = True
                user_branch.save()
            
            summary = self._get_employee_branch_summary_inline(employee)
            
            return Response({
                'message': 'Default branch updated successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'An unexpected error occurred'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_employee_branch_summary_inline(self, employee):
        """Inline method to get employee branch summary"""
        if not employee.user:
            return {'branches': [], 'default_branch': None, 'payroll_branch': None}
        
        user_branches = UserBranch.objects.filter(
            user=employee.user
        ).select_related('branch').order_by('-is_default', 'branch__branch_name')
        
        branches = []
        default_branch = None
        
        for ub in user_branches:
            branch_info = {
                'id': ub.branch.id,
                'name': ub.branch.branch_name,
                'location': ub.branch.branch_location,
                'is_default': ub.is_default,
                'attached_date': ub.created_at.isoformat() if ub.created_at else None
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
    
@extend_schema(tags=["Employee Attendance"])
class EmployeeAttendanceListCreateAPIView(APIView):
    @extend_schema(
        responses=EmployeeAttendanceSerializer(many=True),
        description="Retrieve all attendance records"
    )
    def get(self, request):
        records = EmployeeAttendance.objects.all()
        serializer = EmployeeAttendanceSerializer(records, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeAttendanceSerializer,
        responses=EmployeeAttendanceSerializer,
        description="Create a new attendance record"
    )
    def post(self, request):
        serializer = EmployeeAttendanceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@extend_schema(tags=["Employee Attendance"])
class EmployeeAttendanceDetailAPIView(APIView):
    def get_object(self, pk):
        return get_object_or_404(EmployeeAttendance, pk=pk)

    @extend_schema(
        responses=EmployeeAttendanceSerializer,
        description="Retrieve an attendance record by ID"
    )
    def get(self, request, pk):
        record = self.get_object(pk)
        serializer = EmployeeAttendanceSerializer(record)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeAttendanceSerializer,
        responses=EmployeeAttendanceSerializer,
        description="Update an attendance record by ID"
    )
    def patch(self, request, pk):
        record = self.get_object(pk)
        serializer = EmployeeAttendanceSerializer(record, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete an attendance record by ID",
        responses={204: None}
    )
    def delete(self, request, pk):
        record = self.get_object(pk)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)        
    
@extend_schema(tags=["Employee Type"])
class EmployeeTypeListCreateAPIView(APIView):
    @extend_schema(
        responses=EmployeeTypeSerializer(many=True),
        description="Get list of all employee types"
    )
    def get(self, request):
        data = EmployeeType.objects.all()
        serializer = EmployeeTypeSerializer(data, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeTypeSerializer,
        responses=EmployeeTypeSerializer,
        description="Create a new employee type"
    )
    def post(self, request):
        serializer = EmployeeTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Employee Type"])
class EmployeeTypeDetailAPIView(APIView):
    def get_object(self, pk):
        return get_object_or_404(EmployeeType, pk=pk)

    @extend_schema(
        responses=EmployeeTypeSerializer,
        description="Get an employee type by ID"
    )
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = EmployeeTypeSerializer(obj)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeTypeSerializer,
        responses=EmployeeTypeSerializer,
        description="Update an employee type"
    )
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = EmployeeTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete an employee type",
        responses={204: None}
    )
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@extend_schema(tags=["Work Type"])
class WorkTypeListCreateAPIView(APIView):
    @extend_schema(
        responses=WorkTypeSerializer(many=True),
        description="Get list of all work types"
    )
    def get(self, request):
        data = WorkType.objects.all()
        serializer = WorkTypeSerializer(data, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=WorkTypeSerializer,
        responses=WorkTypeSerializer,
        description="Create a new work type"
    )
    def post(self, request):
        serializer = WorkTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Work Type"])
class WorkTypeDetailAPIView(APIView):
    def get_object(self, pk):
        return get_object_or_404(WorkType, pk=pk)

    @extend_schema(
        responses=WorkTypeSerializer,
        description="Get a work type by ID"
    )
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = WorkTypeSerializer(obj)
        return Response(serializer.data)

    @extend_schema(
        request=WorkTypeSerializer,
        responses=WorkTypeSerializer,
        description="Update a work type"
    )
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = WorkTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete a work type",
        responses={204: None}
    )
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

