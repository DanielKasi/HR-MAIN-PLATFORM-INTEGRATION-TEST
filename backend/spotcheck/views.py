from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from spotcheck import models as SpotCheckModels
from spotcheck import serializers as SpotCheckSerializers
from spotcheck.utilities import send_spotcheck_email
from utilities.pagination import CustomPageNumberPagination
from django.utils import timezone
from django.db import transaction


class InstitutionSpotCheckSettingCreateView(APIView):
    @extend_schema(
        request=SpotCheckSerializers.InstitutionSpotCheckSettingSerializer,
        responses={
            201: SpotCheckSerializers.InstitutionSpotCheckSettingSerializer,
            400: "Bad Request",
        },
        summary="Create Institution Setting",
        description="Create a new institution setting.",
        tags=["Institution Setting Management"],
    )
    @transaction.atomic()
    def post(self, request):
        """Create a institution setting."""

        serializer = SpotCheckSerializers.InstitutionSpotCheckSettingSerializer(
            data=request.data
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InstitutionSpotCheckSettingDetailView(APIView):

    @extend_schema(
        request=SpotCheckModels.InstitutionSpotCheckSetting,
        responses={
            200: SpotCheckSerializers.InstitutionSpotCheckSettingSerializer,
            404: "institution Setting not found",
        },
        description="Retrieve details of a specific institution setting.",
        summary="institution Setting Detail",
        tags=["Institution Setting Management"],
    )
    def get(self, request, institution_id):
        """Retrieve details of a specific institution setting."""
        try:
            setting = SpotCheckModels.InstitutionSpotCheckSetting.objects.get(
                id=institution_id, deleted_at=None
            )
            serializer = SpotCheckSerializers.InstitutionSpotCheckSettingSerializer(
                setting
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SpotCheckModels.InstitutionSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Institution setting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class InstitutionSpotCheckSettingUpdateView(APIView):
    @extend_schema(
        request=SpotCheckSerializers.InstitutionSpotCheckSettingSerializer,
        responses={
            200: SpotCheckSerializers.InstitutionSpotCheckSettingSerializer,
            404: "Institution Setting not found",
            400: "Bad Request",
        },
        summary="Update Institution Setting",
        description="Update details of a specific institution setting.",
        tags=["Institution Setting Management"],
    )
    @transaction.atomic()
    def patch(self, request, institution_id):
        """Update details of a specific institution setting."""
        try:
            setting = SpotCheckModels.InstitutionSpotCheckSetting.objects.get(
                id=institution_id, deleted_at=None
            )
        except SpotCheckModels.InstitutionSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Institution setting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        setting.approval_status = "under_update"

        serializer = SpotCheckSerializers.InstitutionSpotCheckSettingSerializer(
            instance=setting, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            setting.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BranchSpotCheckSettingCreateView(APIView):

    @extend_schema(
        request=SpotCheckSerializers.BranchSpotCheckSettingSerializer,
        responses={
            201: SpotCheckSerializers.BranchSpotCheckSettingSerializer,
            400: "Bad Request",
        },
        summary="Create Branch Setting",
        description="Create a new branch setting.",
        tags=["Branch Setting Management"],
    )
    @transaction.atomic()
    def post(self, request):
        """Create a brnach setting."""

        serializer = SpotCheckSerializers.BranchSpotCheckSettingSerializer(
            data=request.data
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BranchSpotCheckSettingDetailView(APIView):

    @extend_schema(
        request=SpotCheckModels.BranchSpotCheckSetting,
        responses={
            200: SpotCheckSerializers.BranchSpotCheckSettingSerializer,
            404: "Branch Setting not found",
        },
        description="Retrieve details of a specific branch setting.",
        summary="Branch Setting Detail",
        tags=["Branch Setting Management"],
    )
    def get(self, request, branch_id):
        """Retrieve details of a specific branch setting."""
        try:
            setting = SpotCheckModels.BranchSpotCheckSetting.objects.get(
                id=branch_id, deleted_at=None
            )
            serializer = SpotCheckSerializers.BranchSpotCheckSettingSerializer(setting)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SpotCheckModels.BranchSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Branch setting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class BranchSpotCheckSettingUpdateView(APIView):
    @extend_schema(
        request=SpotCheckSerializers.BranchSpotCheckSettingSerializer,
        responses={
            200: SpotCheckSerializers.BranchSpotCheckSettingSerializer,
            404: "Branch Setting not found",
            400: "Bad Request",
        },
        summary="Update Branch Setting",
        description="Update details of a specific branch setting.",
        tags=["Branch Setting Management"],
    )
    @transaction.atomic()
    def patch(self, request, branch_id):
        """Update details of a specific branch setting."""
        try:
            setting = SpotCheckModels.BranchSpotCheckSetting.objects.get(
                id=branch_id, deleted_at=None
            )
        except SpotCheckModels.BranchSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Branch setting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        setting.approval_status = "under_update"

        serializer = SpotCheckSerializers.BranchSpotCheckSettingSerializer(
            instance=setting, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            setting.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeSpotCheckSettingCreateView(APIView):

    @extend_schema(
        request=SpotCheckSerializers.EmployeeSpotCheckSettingSerializer,
        responses={
            201: SpotCheckSerializers.EmployeeSpotCheckSettingSerializer,
            400: "Bad Request",
        },
        summary="Create Employee Setting",
        description="Create a new employee setting.",
        tags=["Employee Setting Management"],
    )
    @transaction.atomic()
    def post(self, request):
        """Create a employee setting."""

        serializer = SpotCheckSerializers.EmployeeSpotCheckSettingSerializer(
            data=request.data
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeSpotCheckSettingDetailView(APIView):

    @extend_schema(
        request=SpotCheckModels.EmployeeSpotCheckSetting,
        responses={
            200: SpotCheckSerializers.EmployeeSpotCheckSettingSerializer,
            404: "Employee Spot check Setting not found",
        },
        description="Retrieve details of a specific employee spot check setting.",
        summary="Employee spot check Setting Detail",
        tags=["Employee spot check Setting Management"],
    )
    def get(self, request, employee_id):
        """Retrieve details of a specific emplpyee spot check setting."""
        try:
            setting = SpotCheckModels.EmployeeSpotCheckSetting.objects.get(
                id=employee_id, deleted_at=None
            )
            serializer = SpotCheckSerializers.EmployeeSpotCheckSettingSerializer(
                setting
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SpotCheckModels.EmployeeSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Employee spot check setting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class EmployeeSpotCheckSettingUpdateView(APIView):
    @extend_schema(
        request=SpotCheckSerializers.EmployeeSpotCheckSettingSerializer,
        responses={
            200: SpotCheckSerializers.EmployeeSpotCheckSettingSerializer,
            404: "Employee Spot check Setting not found",
            400: "Bad Request",
        },
        summary="Update Employee Spot check Setting",
        description="Update details of a specific employee spot check setting.",
        tags=["Employee spot check Setting Management"],
    )
    @transaction.atomic()
    def patch(self, request, employee_id):
        """Update details of a specific employee spot check setting."""
        try:
            setting = SpotCheckModels.EmployeeSpotCheckSetting.objects.get(
                id=employee_id, deleted_at=None
            )
        except SpotCheckModels.EmployeeSpotCheckSetting.DoesNotExist:
            return Response(
                {"detail": "Employee spot check setting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        setting.approval_status = "under_update"

        serializer = SpotCheckSerializers.EmployeeSpotCheckSettingSerializer(
            instance=setting, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            setting.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeStopCheckListView(APIView):
    @extend_schema(
        request=SpotCheckModels.EmployeeSpotCheck,
        responses={
            200: SpotCheckSerializers.EmployeeSpotCheckSerializer,
            404: "Employee Spot check not found",
        },
        description="Retrieve details of a specific employee spot check.",
        summary="Employee spot check Detail",
        tags=["Employee spot check Management"],
    )
    def get(self, request):
        """Retrieve details of spot check."""
        try:
            employee_id = request.query_params.get("employee_id", None)
            spotchecks = SpotCheckModels.EmployeeSpotCheck.objects.filter(
                employee__position__department__institution=request.user.profile.institution
            )
            if employee_id:
                spotchecks = spotchecks.filter(employee_id=employee.id)
            paginator = CustomPageNumberPagination()
            paginated_qs = paginator.paginate_queryset(spotchecks, request)
            serializer = SpotCheckSerializers.EmployeeSpotCheckSerializer(
                paginated_qs, many=True
            )
            return paginator.get_paginated_response(serializer.data)
        except SpotCheckModels.EmployeeSpotCheck.DoesNotExist:
            return Response(
                {"detail": "Employee spot check not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class EmployeeSpotCheckCreateView(APIView):
    @extend_schema(
        request=SpotCheckSerializers.EmployeeSpotCheckSerializer,
        responses={
            201: SpotCheckSerializers.EmployeeSpotCheckSerializer,
            400: "Bad Request",
        },
        summary="Create Employee Spot check",
        description="Create a new employee spot check.",
        tags=["Employee spot check Management"],
    )
    def post(self, request):
        """Create a employee spot checkplease share the sale reports record."""
        spotcheck_status, _ = SpotCheckModels.SpotCheckStatus.objects.get_or_create(
            status_name="SENT"
        )
        spotcheck_time = timezone.now()

        request_data = request.data.copy()
        request_data["status"] = spotcheck_status.pk
        request_data["spotcheck_time"] = spotcheck_time
        request_data["initiated_by"] = "user"
        print("Request data:", request_data)
        serializer = SpotCheckSerializers.EmployeeSpotCheckSerializer(data=request_data)
        if serializer.is_valid():
            spotcheck = serializer.save()
            if send_spotcheck_email(spotcheck):
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                spotcheck.delete()
                return Response(
                    {
                        "detail": "Spotcheck creation failed because email could not be sent."
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeSpotCheckDetailView(APIView):

    @extend_schema(
        request=SpotCheckModels.EmployeeSpotCheck,
        responses={
            200: SpotCheckSerializers.EmployeeSpotCheckSerializer,
            404: "Employee Spot check not found",
        },
        description="Retrieve details of a specific employee spot check.",
        summary="Employee spot check Detail",
        tags=["Employee spot check Management"],
    )
    def get(self, request, spotcheck_id):
        """Retrieve details of a specific emplpyee spot check setting."""
        try:
            setting = SpotCheckModels.EmployeeSpotCheck.objects.get(
                id=spotcheck_id, deleted_at=None
            )
            serializer = SpotCheckSerializers.EmployeeSpotCheckSerializer(setting)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SpotCheckModels.EmployeeSpotCheck.DoesNotExist:
            return Response(
                {"detail": "Employee spot check not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class EmployeeSpotCheckUpdateView(APIView):

    @extend_schema(
        request=SpotCheckSerializers.EmployeeSpotCheckSerializer,
        responses={
            200: SpotCheckSerializers.EmployeeSpotCheckSerializer,
            404: "Employee Spot check not found",
            400: "Bad Request",
        },
        summary="Update Employee Spot check",
        description="Update details of a specific employee spot check.",
        tags=["Employee spot check Management"],
    )
    def patch(self, request, spotcheck_id):
        """Update details of a specific employee spot check."""
        try:
            setting = SpotCheckModels.EmployeeSpotCheck.objects.get(
                id=spotcheck_id, deleted_at=None
            )
        except SpotCheckModels.EmployeeSpotCheck.DoesNotExist:
            return Response(
                {"detail": "Employee spot check not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SpotCheckSerializers.EmployeeSpotCheckSerializer(
            instance=setting, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeSpotCheckInView(APIView):

    @extend_schema(
        request=SpotCheckSerializers.EmployeeSpotCheckSerializer,
        responses={
            200: SpotCheckSerializers.EmployeeSpotCheckSerializer,
            404: "Employee Spot check not found",
            400: "Bad Request",
        },
        summary="Employee Respond to Spot check",
        description="Record Spot check record when an employee responds to a spot check prompt.",
        tags=["Employee spot check Management"],
    )
    def patch(self, request, spotcheck_id):
        """Record Spot check record when an employee responds to a spot check prompt."""
        try:
            setting = SpotCheckModels.EmployeeSpotCheck.objects.get(
                id=spotcheck_id, deleted_at=None
            )
        except SpotCheckModels.EmployeeSpotCheck.DoesNotExist:
            return Response(
                {"detail": "Employee spot check not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SpotCheckSerializers.EmployeeSpotCheckSerializer(
            instance=setting, data=request.data, partial=True
        )
        if serializer.is_valid():
            spotcheck = serializer.save()

            valid_status, _ = SpotCheckModels.SpotCheckStatus.objects.get_or_create(
                "VALID", "VALID"
            )
            invalid_status, _ = SpotCheckModels.SpotCheckStatus.objects.get_or_create(
                "INVALID", "INVALID"
            )

            # confirm that employee is within allowed range
            if spotcheck.check_if_location_is_valid():
                spotcheck.status = valid_status
            else:
                spotcheck.status = invalid_status
                spotcheck.issue_penalty()

            spotcheck.save()

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
