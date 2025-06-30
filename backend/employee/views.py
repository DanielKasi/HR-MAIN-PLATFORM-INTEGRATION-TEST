from django.shortcuts import render

from institution.serializers import UserBranchSerializer
from institution.models import Branch, UserBranch
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .serializers import EmployeeAttendanceSerializer, EmployeeSerializer, EmployeeTypeSerializer, WorkTypeSerializer
from .models import Employee, EmployeeAttendance, EmployeeType, WorkType
from .serializers import EmployeeAttendanceSerializer, EmployeeSerializer, EmployeeTypeSerializer, WorkTypeSerializer
from .models import Employee, EmployeeAttendance, EmployeeType, WorkType
from rest_framework.parsers import MultiPartParser, FormParser
from institution.utils import generate_compliant_password
from employee.service import EmployeeBranchService
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse
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

@extend_schema(tags=["Employee branch"])
class EmployeeBranchManagementAPIView(APIView):
    """Simple view for managing employee-branch relationships"""
    
    parser_classes = [JSONParser]
    @extend_schema(
    tags=["Employee branch"],
    request=UserBranchSerializer,
    responses={
        200: UserBranchSerializer(many=True),
    },
    summary="Attach Employee to Branches",
    description="Attaches an employee to one or more branches. One branch must be marked as default."
)
    
    def post(self, request):

        try:
            # Get data from request
            employee_id = request.data.get('employee_id')
            branches_data = request.data.get('branches', [])
            
            print(f"DEBUG: employee_id = {employee_id}")
            print(f"DEBUG: branches_data = {branches_data}")
            print(f"DEBUG: request.data = {request.data}")
            
            # Basic validation
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
            
            # Get employee
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
                    {'error': 'Employee must have a user account'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process branches
            processed_branches = []
            for branch_data in branches_data:
                branch_id = branch_data.get('branch_id')
                if not branch_id:
                    return Response(
                        {'error': f'branch_id is required for branch at index {i}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    branch = Branch.objects.get(id=branch_id)
                    processed_branches.append({
                        'branch': branch,
                        'is_default': branch_data.get('is_default', False)
                    })
                except Branch.DoesNotExist:
                    return Response(
                        {'error': f'Branch with id {branch_id} not found'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Attach branches
            result = self._attach_branches(employee, processed_branches, request.user)
            
            return Response({
                'message': 'Employee attached to branches successfully',
                'data': result
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            print(f"DEBUG: Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _attach_branches(self, employee, branches_data, created_by):
        """Attach employee to branches"""
        print(f"DEBUG: Attaching {len(branches_data)} branches")
        
        # Validate default branches
        default_count = sum(1 for bd in branches_data if bd.get('is_default', False))
        if default_count > 1:
            raise ValueError("Only one branch can be set as default")
        
        # If no default specified, make first one default
        if default_count == 0 and branches_data:
            branches_data[0]['is_default'] = True
            print("DEBUG: Set first branch as default")
        
        user_branches = []
        
        with transaction.atomic():
            # Clear existing defaults if setting new default
            if any(bd.get('is_default', False) for bd in branches_data):
                UserBranch.objects.filter(
                    user=employee.user, 
                    is_default=True
                ).update(is_default=False)
            
            # Create/update UserBranch records
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
            
            # Update employee payroll branch
            default_branch = next(
                (bd['branch'] for bd in branches_data if bd.get('is_default')), 
                None
            )
            if default_branch:
                employee.payroll_branch = default_branch
                employee.save(update_fields=['payroll_branch'])
        
        # Return summary
        return self._get_branch_summary(employee)
    
    def _get_branch_summary(self, employee):
        """Get employee branch summary"""
        if not employee.user:
            return {
                'branches': [], 
                'default_branch': None, 
                'payroll_branch': None
            }
        
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
                'location': getattr(ub.branch, 'branch_location', ''),
                'is_default': ub.is_default,
                'attached_date': ub.created_at.isoformat() if ub.created_at else None
            }
            branches.append(branch_info)
            
            if ub.is_default:
                default_branch = branch_info
        
        payroll_branch = None
        if employee.payroll_branch:
            payroll_branch = {
                'id': employee.payroll_branch.id,
                'name': employee.payroll_branch.branch_name,
                'location': getattr(employee.payroll_branch, 'branch_location', ''),
            }
        
        return {
            'branches': branches,
            'default_branch': default_branch,
            'payroll_branch': payroll_branch
        }
    
    @extend_schema(
    tags=["Employee branch"],
    responses={
        200: OpenApiResponse(description="User branches retrieved successfully"),
        500: OpenApiResponse(description="Unexpected error")
    },
    summary="List all Employee-Branch Relationships",
    description="Retrieves a list of all employee-branch relationships in the system."
)

    def get(self, request):
        """Get all employee-branch relationships"""
        try:
            user_branches = UserBranch.objects.all().select_related('user', 'branch')
            
            data = []
            for ub in user_branches:
                data.append({
                    'id': ub.id,
                    'user_id': ub.user.id if ub.user else None,
                    'user_email': ub.user.email if ub.user else None,
                    'branch_id': ub.branch.id,
                    'branch_name': ub.branch.branch_name,
                    'is_default': ub.is_default,
                    'created_at': ub.created_at.isoformat() if ub.created_at else None
                })
            
            return Response({
                'message': 'User branches retrieved successfully',
                'data': data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Error in GET: {str(e)}")
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@extend_schema(tags=["Employee branch"])
class EmployeeBranchDetailAPIView(APIView):
    """Manage individual employee-branch relationships"""
    
    parser_classes = [JSONParser]
    @extend_schema(
    tags=["Employee branch"],
    responses={
        200: UserBranchSerializer,
        404: OpenApiResponse(description="Employee not found"),
        500: OpenApiResponse(description="Unexpected error")
    },
    summary="Get employee's branches",
    description="Returns all branches assigned to an employee, including the default and payroll branches."
)
    
    def get(self, request, employee_id):
        """Get branches for specific employee"""
        try:
            employee = get_object_or_404(Employee, id=employee_id)
            
            if not employee.user:
                return Response({
                    'message': 'Employee branches retrieved successfully',
                    'data': {
                        'branches': [], 
                        'default_branch': None, 
                        'payroll_branch': None
                    }
                }, status=status.HTTP_200_OK)
            
            user_branches = UserBranch.objects.filter(
                user=employee.user
            ).select_related('branch').order_by('-is_default', 'branch__branch_name')
            
            branches = []
            default_branch = None
            
            for ub in user_branches:
                branch_info = {
                    'id': ub.branch.id,
                    'name': ub.branch.branch_name,
                    'location': getattr(ub.branch, 'branch_location', ''),
                    'is_default': ub.is_default,
                    'attached_date': ub.created_at.isoformat() if ub.created_at else None
                }
                branches.append(branch_info)
                
                if ub.is_default:
                    default_branch = branch_info
            
            payroll_branch = None
            if employee.payroll_branch:
                payroll_branch = {
                    'id': employee.payroll_branch.id,
                    'name': employee.payroll_branch.branch_name,
                    'location': getattr(employee.payroll_branch, 'branch_location', ''),
                }
            
            return Response({
                'message': 'Employee branches retrieved successfully',
                'data': {
                    'branches': branches,
                    'default_branch': default_branch,
                    'payroll_branch': payroll_branch
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Error in GET detail: {str(e)}")
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @extend_schema(
    tags=["Employee branch"],
    request=UserBranchSerializer,
    responses={
        200: OpenApiResponse(description="Default branch updated successfully"),
        400: OpenApiResponse(description="Validation error"),
        404: OpenApiResponse(description="Employee or branch not found"),
        500: OpenApiResponse(description="Unexpected error")
    },
    summary="Set default branch for employee",
    description="Sets the default and payroll branch for a specific employee, provided they are already attached to it."
)    
    
    def patch(self, request, employee_id):
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
                
                # Update employee payroll branch
                employee.payroll_branch = branch
                employee.save(update_fields=['payroll_branch'])
            
            # Get updated summary
            summary = self._get_branch_summary(employee)
            
            return Response({
                'message': 'Default branch updated successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Error in PATCH: {str(e)}")
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_branch_summary(self, employee):
        """Get employee branch summary"""
        if not employee.user:
            return {
                'branches': [], 
                'default_branch': None, 
                'payroll_branch': None
            }
        
        user_branches = UserBranch.objects.filter(
            user=employee.user
        ).select_related('branch').order_by('-is_default', 'branch__branch_name')
        
        branches = []
        default_branch = None
        
        for ub in user_branches:
            branch_info = {
                'id': ub.branch.id,
                'name': ub.branch.branch_name,
                'location': getattr(ub.branch, 'branch_location', ''),
                'is_default': ub.is_default,
                'attached_date': ub.created_at.isoformat() if ub.created_at else None
            }
            branches.append(branch_info)
            
            if ub.is_default:
                default_branch = branch_info
        
        payroll_branch = None
        if employee.payroll_branch:
            payroll_branch = {
                'id': employee.payroll_branch.id,
                'name': employee.payroll_branch.branch_name,
                'location': getattr(employee.payroll_branch, 'branch_location', ''),
            }
        
        return {
            'branches': branches,
            'default_branch': default_branch,
            'payroll_branch': payroll_branch
        }
    
@extend_schema(tags=["Employee Attendance"])
class EmployeeAttendanceListCreateAPIView(APIView):
    @extend_schema(
        responses=EmployeeAttendanceSerializer(many=True),
        description="Retrieve all attendance records"
    )
    def get(self, request):
        date = request.query_params.get('date')
        if date:
            records = EmployeeAttendance.objects.filter(date=date)
        else:
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

