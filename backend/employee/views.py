from django.shortcuts import render

from institution.models import Branch, UserBranch
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .serializers import EmployeeAttendanceSerializer, EmployeeSerializer
from .models import Employee, EmployeeAttendance
from rest_framework.parsers import MultiPartParser, FormParser
from institution.utils import generate_compliant_password
from employee.service import EmployeeBranchService
from drf_spectacular.utils import extend_schema, OpenApiExample
from drf_spectacular.types import OpenApiTypes
import logging
from django.db import transaction
from django.shortcuts import get_object_or_404

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
        responses={200: 'Employee attached to branches successfully'},
        description="Attach an employee to one or multiple branches",
        summary="Attach employee to branches",
        tags=["Employee Management"],
    )
    def post(self, request):
        """Attach employee to multiple branches"""
        try:
            # Debug: Log the incoming request data
            logger.info(f"POST request data: {request.data}")
            
            employee_id = request.data.get('employee_id')
            branches_data = request.data.get('branches', [])
            
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
            
            # Debug: Check if employee exists
            try:
                employee = Employee.objects.get(id=employee_id)
                logger.info(f"Found employee: {employee}")
            except Employee.DoesNotExist:
                logger.error(f"Employee with id {employee_id} not found")
                return Response(
                    {'error': 'Employee not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Debug: Check if employee has user
            if not employee.user:
                logger.error(f"Employee {employee_id} has no associated user")
                return Response(
                    {'error': 'Employee must have an associated user account'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate and prepare branch data
            processed_branches = []
            for i, branch_data in enumerate(branches_data):
                if 'branch_id' not in branch_data:
                    return Response(
                        {'error': f'branch_id is required for branch at index {i}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    branch = Branch.objects.get(id=branch_data['branch_id'])
                    logger.info(f"Found branch: {branch}")
                except Branch.DoesNotExist:
                    logger.error(f"Branch with id {branch_data['branch_id']} not found")
                    return Response(
                        {'error': f'Branch with id {branch_data["branch_id"]} not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                processed_branches.append({
                    'branch': branch,
                    'is_default': branch_data.get('is_default', False)
                })
            
            # Debug: Log processed branches
            logger.info(f"Processed branches: {processed_branches}")
            
            # Try to use service layer first
            try:
                
                logger.info("Using EmployeeBranchService")
                
                user_branches = EmployeeBranchService.attach_employee_to_multiple_branches(
                    employee=employee,
                    branches_data=processed_branches,
                    created_by=request.user
                )
                summary = EmployeeBranchService.get_employee_branch_summary(employee)
                
            except ImportError as e:
                logger.warning(f"EmployeeBranchService not available: {e}")
                logger.info("Using inline logic")
                
                # Fall back to inline logic
                user_branches = self._attach_employee_to_branches_inline(
                    employee, processed_branches, request.user
                )
                summary = self._get_employee_branch_summary_inline(employee)
            
            return Response({
                'message': 'Employee attached to branches successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            logger.error(f"ValueError: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            # Return the actual error for debugging (remove this in production)
            return Response(
                {'error': f'Debug: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _attach_employee_to_branches_inline(self, employee, branches_data, created_by):
        """Inline method to attach employee to branches"""
        try:
            logger.info(f"Starting inline attachment for employee {employee.id}")
            
            user_branches = []
            default_count = sum(1 for bd in branches_data if bd.get('is_default', False))
            
            # Validate default branch logic
            if default_count > 1:
                raise ValueError("Only one branch can be set as default")
            
            # If no default is specified, make the first branch default
            if default_count == 0 and branches_data:
                branches_data[0]['is_default'] = True
                logger.info("Set first branch as default")
            
            with transaction.atomic():
                # Clear existing default branches if we're setting a new default
                if any(bd.get('is_default', False) for bd in branches_data):
                    cleared_count = UserBranch.objects.filter(
                        user=employee.user, 
                        is_default=True
                    ).update(is_default=False)
                    logger.info(f"Cleared {cleared_count} existing default branches")
                
                for branch_data in branches_data:
                    user_branch, created = UserBranch.objects.get_or_create(
                        user=employee.user,
                        branch=branch_data['branch'],
                        defaults={
                            'is_default': branch_data.get('is_default', False),
                            'created_by': created_by
                        }
                    )
                    
                    logger.info(f"UserBranch {'created' if created else 'updated'}: {user_branch}")
                    
                    # Update existing record if needed
                    if not created:
                        user_branch.is_default = branch_data.get('is_default', False)
                        user_branch.save()
                    
                    user_branches.append(user_branch)
            
            logger.info(f"Successfully attached {len(user_branches)} branches")
            return user_branches
            
        except Exception as e:
            logger.error(f"Error in inline attachment: {str(e)}", exc_info=True)
            raise
    
    def _get_employee_branch_summary_inline(self, employee):
        """Inline method to get employee branch summary"""
        try:
            logger.info(f"Getting branch summary for employee {employee.id}")
            
            if not employee.user:
                logger.warning(f"Employee {employee.id} has no user")
                return {'branches': [], 'default_branch': None, 'payroll_branch': None}
            
            user_branches = UserBranch.objects.filter(
                user=employee.user
            ).select_related('branch').order_by('-is_default', 'branch__branch_name')
            
            logger.info(f"Found {user_branches.count()} user branches")
            
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
            
            payroll_branch = None
            if hasattr(employee, 'payroll_branch') and employee.payroll_branch:
                payroll_branch = {
                    'id': employee.payroll_branch.id,
                    'name': employee.payroll_branch.branch_name,
                }
            
            summary = {
                'branches': branches,
                'default_branch': default_branch,
                'payroll_branch': payroll_branch
            }
            
            logger.info(f"Branch summary: {summary}")
            return summary
            
        except Exception as e:
            logger.error(f"Error getting branch summary: {str(e)}", exc_info=True)
            raise


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
            logger.info(f"GET request for employee {employee_id}")
            
            try:
                employee = Employee.objects.get(id=employee_id)
            except Employee.DoesNotExist:
                return Response(
                    {'error': 'Employee not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Try service layer first
            try:
             
                summary = EmployeeBranchService.get_employee_branch_summary(employee)
            except ImportError:
                summary = self._get_employee_branch_summary_inline(employee)
            
            return Response({
                'message': 'Employee branches retrieved successfully',
                'data': summary
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in GET: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Debug: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
            logger.info(f"PATCH request for employee {employee_id}: {request.data}")
            
            try:
                employee = Employee.objects.get(id=employee_id)
            except Employee.DoesNotExist:
                return Response(
                    {'error': 'Employee not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            branch_id = request.data.get('branch_id')
            
            if not branch_id:
                return Response(
                    {'error': 'branch_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                return Response(
                    {'error': 'Branch not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
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
            logger.error(f"Error in PATCH: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Debug: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_employee_branch_summary_inline(self, employee):
        """Inline method to get employee branch summary"""
        try:
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
            
            payroll_branch = None
            if hasattr(employee, 'payroll_branch') and employee.payroll_branch:
                payroll_branch = {
                    'id': employee.payroll_branch.id,
                    'name': employee.payroll_branch.branch_name,
                }
            
            return {
                'branches': branches,
                'default_branch': default_branch,
                'payroll_branch': payroll_branch
            }
            
        except Exception as e:
            logger.error(f"Error getting branch summary: {str(e)}", exc_info=True)
            raise

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