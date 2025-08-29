from functools import partial
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from rest_framework.parsers import FormParser
from spotcheck import models as StopCheckModels
from spotcheck import serializers as StopCheckSerializers


class InstitutionStopCheckSettingCreateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def post(self, request):
        """Create a institution setting."""

        serializer = StopCheckSerializers.InstitutionSpotCheckSettingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InstitutionStopCheckSettingDetailView(APIView):

    @extend_schema(
        request=StopCheckModels.InstitutionSPotCheckSetting,
        responses={200: StopCheckSerializers.InstitutionSpotCheckSettingSerializer, 404: "institution Setting not found"},
        description="Retrieve details of a specific institution setting.",
        summary="institution Setting Detail",
        tags=["Institution Setting Management"],
    )
    def get(self, request, institution_id):
        """Retrieve details of a specific institution setting."""
        try:
            setting = StopCheckModels.InstitutionSPotCheckSetting.object.get(id=institution_id, deleted_at=None)
            serializer = StopCheckSerializers.InstitutionSpotCheckSettingSerializer(setting)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except StopCheckModels.InstitutionSPotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Institution setting not found."}, status=status.HTTP_404_NOT_FOUND
            )


class InstitutionStopCheckSettingUpdateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def patch(self, request, institution_id):
        """Update details of a specific institution setting."""
        try:
            setting = StopCheckModels.InstitutionSPotCheckSetting.object.get(id=institution_id, deleted_at=None)
        except StopCheckModels.InstitutionSPotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Institution setting not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StopCheckSerializers.InstitutionSpotCheckSettingSerializer(instance=setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class BranchStopCheckSettingCreateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def post(self, request):
        """Create a brnach setting."""

        serializer = StopCheckSerializers.BranchSpotCheckSettingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BranchStopCheckSettingDetailView(APIView):

    @extend_schema(
        request=StopCheckModels.BranchSpotCheckSetting,
        responses={200: StopCheckSerializers.BranchSpotCheckSettingSerializer, 404: "Branch Setting not found"},
        description="Retrieve details of a specific branch setting.",
        summary="Branch Setting Detail",
        tags=["Branch Setting Management"],
    )
    def get(self, request, branch_id):
        """Retrieve details of a specific branch setting."""
        try:
            setting = StopCheckModels.BranchSpotCheckSetting.object.get(id=branch_id, deleted_at=None)
            serializer = StopCheckSerializers.BranchSpotCheckSettingSerializer(setting)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except StopCheckModels.BranchSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Branch setting not found."}, status=status.HTTP_404_NOT_FOUND
            )


class BranchStopCheckSettingUpdateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def patch(self, request, branch_id):
        """Update details of a specific branch setting."""
        try:
            setting = StopCheckModels.BranchSpotCheckSetting.object.get(id=branch_id, deleted_at=None)
        except StopCheckModels.BranchSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Branch setting not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StopCheckSerializers.BranchSpotCheckSettingSerializer(instance=setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class EmployeeStopCheckSettingCreateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def post(self, request):
        """Create a employee setting."""

        serializer = StopCheckSerializers.EmployeeSpotCheckSettingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeStopCheckSettingDetailView(APIView):

    @extend_schema(
        request=StopCheckModels.EmployeeSpotCheckSetting,
        responses={200: StopCheckSerializers.EmployeeSpotCheckSettingSerializer, 404: "Employee Spot check Setting not found"},
        description="Retrieve details of a specific employee spot check setting.",
        summary="Employee spot check Setting Detail",
        tags=["Employee spot check Setting Management"],
    )
    def get(self, request, employee_id):
        """Retrieve details of a specific emplpyee spot check setting."""
        try:
            setting = StopCheckModels.EmployeeSpotCheckSetting.object.get(id=employee_id, deleted_at=None)
            serializer = StopCheckSerializers.EmployeeSpotCheckSettingSerializer(setting)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except StopCheckModels.EmployeeSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Employee spot check setting not found."}, status=status.HTTP_404_NOT_FOUND
            )


class EmployeeStopCheckSettingUpdateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def patch(self, request, employee_id):
        """Update details of a specific employee spot check setting."""
        try:
            setting = StopCheckModels.EmployeeSpotCheckSetting.object.get(id=employee_id, deleted_at=None)
        except StopCheckModels.EmployeeSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Employee spot check setting not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StopCheckSerializers.EmployeeSpotCheckSettingSerializer(instance=setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeStopCheckCreateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def post(self, request):
        """Create a employee spot check record."""

        serializer = StopCheckSerializers.EmployeeSpotCheckSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeStopCheckDetailView(APIView):

    @extend_schema(
        request=StopCheckModels.EmployeeSpotCheck,
        responses={200: StopCheckSerializers.EmployeeSpotCheckSerializer, 404: "Employee Spot check not found"},
        description="Retrieve details of a specific employee spot check.",
        summary="Employee spot check Detail",
        tags=["Employee spot check Management"],
    )
    def get(self, request, spotcheck_id):
        """Retrieve details of a specific emplpyee spot check setting."""
        try:
            setting = StopCheckModels.EmployeeSpotCheck.object.get(id=spotcheck_id, deleted_at=None)
            serializer = StopCheckSerializers.EmployeeSpotCheckSerializer(setting)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except StopCheckModels.EmployeeSpotCheck.DoesNotExist:
            return Response(
                {"detail": "Employee spot check not found."}, status=status.HTTP_404_NOT_FOUND
            )


class EmployeeStopCheckUpdateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def patch(self, request, spotcheck_id):
        """Update details of a specific employee spot check."""
        try:
            setting = StopCheckModels.EmployeeSpotCheck.object.get(id=spotcheck_id, deleted_at=None)
        except StopCheckModels.EmployeeSpotCheck.DoesNotExist:
            return Response(
                {"detail": "Employee spot check not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StopCheckSerializers.EmployeeSpotCheckSerializer(instance=setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeStopCheckInView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [FormParser]

    def patch(self, request, spotcheck_id):
        """Record Spot check record when an employee responds to a spot check prompt."""
        try:
            setting = StopCheckModels.EmployeeSpotCheck.object.get(id=spotcheck_id, deleted_at=None)
        except StopCheckModels.EmployeeSpotCheck.DoesNotExist:
            return Response(
                {"detail": "Employee spot check not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StopCheckSerializers.EmployeeSpotCheckSerializer(instance=setting, data=request.data, partial=True)
        if serializer.is_valid():
            spotcheck = serializer.save()

            valid_status, _ = StopCheckModels.SpotCheckStatus.objects.get_or_create("VALID", "VALID")
            invalid_status, _ = StopCheckModels.SpotCheckStatus.objects.get_or_create("INVALID", "INVALID")

            # confirm that employee is within allowed range
            if spotcheck.check_if_location_is_valid():
                spotcheck.status = valid_status
            else:
                spotcheck.status = invalid_status
                spotcheck.issue_penalty()

            spotcheck.save()

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
