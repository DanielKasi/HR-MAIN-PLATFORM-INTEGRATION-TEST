from django.shortcuts import render

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .serializers import EmployeeSerializer
from .models import Employee
from institution.utils import generate_compliant_password
from utilities.helpers import (
    build_password_link,
    create_and_institution_otp,
    send_password_link_to_user,
    create_and_institution_token,
)

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

    @extend_schema(
        request=EmployeeSerializer,
        responses={201: EmployeeSerializer, 400: "Bad Request"},
        description="Create a new employee.",
        summary="Create Employee",
        tags=["Employee Management"],
    )
    def post(self, request):
        """Create a new employee for a specific institution."""
        # Generate random password for the user
        random_password = generate_compliant_password()

        # Make data mutable and add password to user data
        mutable_data = request.data.copy()
        user_data = mutable_data.get("user", {})
        user_data["password"] = random_password
        mutable_data["user"] = user_data

        serializer = EmployeeSerializer(data=mutable_data)
        if serializer.is_valid():
            employee = serializer.save()

            # Set password verification status
            employee.user.is_password_verified = False
            employee.user.save()

            # Create token and send password link
            token = create_and_institution_token(
                user=employee.user, purpose="registration", expiry_minutes=15
            )
            password_link = build_password_link(request=request, token=token)
            send_password_link_to_user(user=employee.user, link=password_link)

            return Response(
                EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED
            )

        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class EmployeeUpdateAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=EmployeeSerializer,
        responses={200: EmployeeSerializer, 400: "Bad Request", 404: "Not Found"},
        description="Update an existing employee.",
        summary="Update Employee",
        tags=["Employee Management"],
    )
    def patch(self, request, institution_id, employee_id):
        """Update an existing employee."""
        try:
            employee = Employee.objects.get(id=employee_id, department__institution_id=institution_id)
            serializer = EmployeeSerializer(employee, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

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
