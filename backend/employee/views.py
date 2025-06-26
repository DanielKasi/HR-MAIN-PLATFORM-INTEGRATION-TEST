from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .serializers import EmployeeSerializer
from .models import Employee
from rest_framework.parsers import MultiPartParser, FormParser
from institution.utils import generate_compliant_password

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
