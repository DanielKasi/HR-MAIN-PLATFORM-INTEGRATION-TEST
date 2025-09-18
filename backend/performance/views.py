from django.db import transaction
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes, OpenApiExample

from settings.models import MeetingIntegration
from utilities.pagination import CustomPageNumberPagination
from utilities.sortable_api import SortableAPIMixin
from .models import Period, Objectives, EmployeeObjectives, KeyResult, Feedback360, EmployeeBonusPoint, QuestionTemplate, BonusPointSettings, Meeting, Institution
from .serializers import (
    PeriodSerializer, ObjectivesSerializer, EmployeeObjectivesSerializer,
    KeyResultSerializer, Feedback360Serializer, EmployeeBonusPointSerializer,
    QuestionTemplateSerializer, BonusPointSettingsSerializer, MeetingSerializer
)
from django.db.models import Q, Avg, Count, Sum
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from google_auth_oauthlib.flow import InstalledAppFlow
import os

class PeriodListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['name', 'start_date', 'end_date', 'is_closed']
    default_ordering = ['start_date']

    @extend_schema(
        request=PeriodSerializer,
        responses={
            201: OpenApiResponse(response=PeriodSerializer, description="Period created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = PeriodSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save(institution=request.user.profile.institution)
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by name"},
            {"name": "start_date", "type": "date", "description": "Filter by start date"},
            {"name": "is_closed", "type": "bool", "description": "Filter by closed status"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'name,-start_date')"},
        ],
        responses={
            200: OpenApiResponse(response=PeriodSerializer(many=True), description="List of periods."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        periods = Period.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        start_date = request.query_params.get("start_date", None)
        is_closed = request.query_params.get("is_closed", None)

        if search_query:
            periods = periods.filter(Q(name__icontains=search_query))
        if start_date:
            periods = periods.filter(start_date=start_date)
        if is_closed is not None:
            periods = periods.filter(is_closed=is_closed.lower() == 'true')

        try:
            periods = self.apply_sorting(periods, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(periods, request)
        serializer = PeriodSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class PeriodDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=PeriodSerializer, description="Period details."),
            404: OpenApiResponse(description="Period not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        period = get_object_or_404(Period, pk=pk)
        serializer = PeriodSerializer(period)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Period marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Period not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        period = get_object_or_404(Period, pk=pk)
        period.approval_status = 'under_deletion'
        period.save(update_fields=['approval_status'])
        period.confirm_delete()
        return Response({"message": "Period submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=PeriodSerializer,
        responses={
            200: OpenApiResponse(response=PeriodSerializer, description="Period updated successfully."),
            404: OpenApiResponse(description="Period not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        period = get_object_or_404(Period, pk=pk)
        period.approval_status = 'under_update'
        serializer = PeriodSerializer(period, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            period.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ObjectivesListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['name', 'duration', 'self_employee_progress_update']
    default_ordering = ['name']

    @extend_schema(
        request=ObjectivesSerializer,
        responses={
            201: OpenApiResponse(response=ObjectivesSerializer, description="Objective created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = ObjectivesSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save(institution=request.user.profile.institution)
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by name or description"},
            {"name": "duration_unit", "type": "str", "description": "Filter by duration unit (days, months, years)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'name,-duration')"},
        ],
        responses={
            200: OpenApiResponse(response=ObjectivesSerializer(many=True), description="List of objectives."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        objectives = Objectives.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        duration_unit = request.query_params.get("duration_unit", None)

        if search_query:
            objectives = objectives.filter(Q(name__icontains=search_query) | Q(description__icontains=search_query))
        if duration_unit:
            objectives = objectives.filter(duration_unit=duration_unit)

        try:
            objectives = self.apply_sorting(objectives, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(objectives, request)
        serializer = ObjectivesSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class ObjectivesDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=ObjectivesSerializer, description="Objective details."),
            404: OpenApiResponse(description="Objective not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        objective = get_object_or_404(Objectives, pk=pk, institution=request.user.profile.institution)
        serializer = ObjectivesSerializer(objective)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Objective marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Objective not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        objective = get_object_or_404(Objectives, pk=pk, institution=request.user.profile.institution)
        objective.approval_status = 'under_deletion'
        objective.save(update_fields=['approval_status'])
        objective.confirm_delete()
        return Response({"message": "Objective submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=ObjectivesSerializer,
        responses={
            200: OpenApiResponse(response=ObjectivesSerializer, description="Objective updated successfully."),
            404: OpenApiResponse(description="Objective not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        objective = get_object_or_404(Objectives, pk=pk, institution=request.user.profile.institution)
        objective.approval_status = 'under_update'
        serializer = ObjectivesSerializer(objective, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            objective.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeObjectivesListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['start_date', 'end_date', 'status']
    default_ordering = ['start_date']

    @extend_schema(
        request=EmployeeObjectivesSerializer,
        responses={
            201: OpenApiResponse(response=EmployeeObjectivesSerializer, description="Employee objective created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = EmployeeObjectivesSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by employee name or objective name"},
            {"name": "status", "type": "str", "description": "Filter by status (not_started, on_track, closed, at_risk, behind)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'start_date,-status')"},
        ],
        responses={
            200: OpenApiResponse(response=EmployeeObjectivesSerializer(many=True), description="List of employee objectives."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        objectives = EmployeeObjectives.objects.filter(employee__payroll_branch__institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        status_filter = request.query_params.get("status", None)
        employee_id = request.query_params.get("employee_id", None)

        if search_query:
            objectives = objectives.filter(
                Q(employee__user__username__icontains=search_query) |
                Q(objective__name__icontains=search_query)
            )
        if status_filter:
            objectives = objectives.filter(status=status_filter)
        if employee_id:
            objectives = objectives.filter(employee_id=employee_id)

        try:
            objectives = self.apply_sorting(objectives, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(objectives, request)
        serializer = EmployeeObjectivesSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class EmployeeObjectivesDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=EmployeeObjectivesSerializer, description="Employee objective details."),
            404: OpenApiResponse(description="Employee objective not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        objective = get_object_or_404(EmployeeObjectives, pk=pk, employee__payroll_branch__institution=request.user.profile.institution)
        serializer = EmployeeObjectivesSerializer(objective)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Employee objective marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Employee objective not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        objective = get_object_or_404(EmployeeObjectives, pk=pk, employee__payroll_branch__institution=request.user.profile.institution)
        objective.approval_status = 'under_deletion'
        objective.save(update_fields=['approval_status'])
        objective.confirm_delete()
        return Response({"message": "Employee objective submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=EmployeeObjectivesSerializer,
        responses={
            200: OpenApiResponse(response=EmployeeObjectivesSerializer, description="Employee objective updated successfully."),
            404: OpenApiResponse(description="Employee objective not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        objective = get_object_or_404(EmployeeObjectives, pk=pk, employee__payroll_branch__institution=request.user.profile.institution)
        objective.approval_status = 'under_update'
        serializer = EmployeeObjectivesSerializer(objective, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            objective.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class KeyResultListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['title', 'target_value', 'progress_type']
    default_ordering = ['title']

    @extend_schema(
        request=KeyResultSerializer,
        responses={
            201: OpenApiResponse(response=KeyResultSerializer, description="Key result created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = KeyResultSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save(institution=request.user.profile.institution)
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by title or description"},
            {"name": "progress_type", "type": "str", "description": "Filter by progress type (percentage, number)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'title,-target_value')"},
        ],
        responses={
            200: OpenApiResponse(response=KeyResultSerializer(many=True), description="List of key results."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        key_results = KeyResult.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        progress_type = request.query_params.get("progress_type", None)

        if search_query:
            key_results = key_results.filter(Q(title__icontains=search_query) | Q(description__icontains=search_query))
        if progress_type:
            key_results = key_results.filter(progress_type=progress_type)

        try:
            key_results = self.apply_sorting(key_results, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(key_results, request)
        serializer = KeyResultSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class KeyResultDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=KeyResultSerializer, description="Key result details."),
            404: OpenApiResponse(description="Key result not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        key_result = get_object_or_404(KeyResult, pk=pk, institution=request.user.profile.institution)
        serializer = KeyResultSerializer(key_result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Key result marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Key result not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        key_result = get_object_or_404(KeyResult, pk=pk, institution=request.user.profile.institution)
        key_result.approval_status = 'under_deletion'
        key_result.save(update_fields=['approval_status'])
        key_result.confirm_delete()
        return Response({"message": "Key result submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=KeyResultSerializer,
        responses={
            200: OpenApiResponse(response=KeyResultSerializer, description="Key result updated successfully."),
            404: OpenApiResponse(description="Key result not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        key_result = get_object_or_404(KeyResult, pk=pk, institution=request.user.profile.institution)
        key_result.approval_status = 'under_update'
        serializer = KeyResultSerializer(key_result, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            key_result.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class Feedback360ListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['submission_date', 'rating']
    default_ordering = ['submission_date']

    @extend_schema(
        request=Feedback360Serializer,
        responses={
            201: OpenApiResponse(response=Feedback360Serializer, description="Feedback created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = Feedback360Serializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by reviewee or reviewer name"},
            {"name": "rating", "type": "int", "description": "Filter by rating (1-5)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'submission_date,-rating')"},
        ],
        responses={
            200: OpenApiResponse(response=Feedback360Serializer(many=True), description="List of feedback."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        feedback = Feedback360.objects.filter(period__institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        rating = request.query_params.get("rating", None)

        if search_query:
            feedback = feedback.filter(
                Q(reviewee__user__username__icontains=search_query) |
                Q(reviewer__user__username__icontains=search_query)
            )
        if rating:
            feedback = feedback.filter(rating=rating)

        try:
            feedback = self.apply_sorting(feedback, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(feedback, request)
        serializer = Feedback360Serializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class Feedback360DetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=Feedback360Serializer, description="Feedback details."),
            404: OpenApiResponse(description="Feedback not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        feedback = get_object_or_404(Feedback360, pk=pk, period__institution=request.user.profile.institution)
        serializer = Feedback360Serializer(feedback)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Feedback marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Feedback not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        feedback = get_object_or_404(Feedback360, pk=pk, period__institution=request.user.profile.institution)
        feedback.approval_status = 'under_deletion'
        feedback.save(update_fields=['approval_status'])
        feedback.confirm_delete()
        return Response({"message": "Feedback submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=Feedback360Serializer,
        responses={
            200: OpenApiResponse(response=Feedback360Serializer, description="Feedback updated successfully."),
            404: OpenApiResponse(description="Feedback not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        feedback = get_object_or_404(Feedback360, pk=pk, period__institution=request.user.profile.institution)
        feedback.approval_status = 'under_update'
        serializer = Feedback360Serializer(feedback, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            feedback.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeBonusPointListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['points', 'date', 'redeemed', 'bonus_point_setting__points']
    default_ordering = ['date']

    @extend_schema(
        request=EmployeeBonusPointSerializer,
        responses={
            201: OpenApiResponse(response=EmployeeBonusPointSerializer, description="Bonus point created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = EmployeeBonusPointSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            # Ensure bonus_point_setting belongs to the user's institution
            bonus_point_setting_id = request.data.get('bonus_point_setting_id')
            if bonus_point_setting_id:
                get_object_or_404(
                    BonusPointSettings,
                    pk=bonus_point_setting_id,
                    institution=request.user.profile.institution
                )
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by employee name or reason"},
            {"name": "redeemed", "type": "bool", "description": "Filter by redeemed status"},
            {"name": "bonus_point_setting_id", "type": "int", "description": "Filter by bonus point setting ID"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'points,-date,bonus_point_setting__points')"},
        ],
        responses={
            200: OpenApiResponse(response=EmployeeBonusPointSerializer(many=True), description="List of bonus points."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        bonus_points = EmployeeBonusPoint.objects.filter(period__institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        redeemed = request.query_params.get("redeemed", None)
        bonus_point_setting_id = request.query_params.get("bonus_point_setting_id", None)

        if search_query:
            bonus_points = bonus_points.filter(
                Q(employee__user__username__icontains=search_query) |
                Q(reason__icontains=search_query)
            )
        if redeemed is not None:
            bonus_points = bonus_points.filter(redeemed=redeemed.lower() == 'true')
        if bonus_point_setting_id:
            bonus_points = bonus_points.filter(bonus_point_setting_id=bonus_point_setting_id)

        try:
            bonus_points = self.apply_sorting(bonus_points, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(bonus_points, request)
        serializer = EmployeeBonusPointSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class EmployeeBonusPointDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=EmployeeBonusPointSerializer, description="Bonus point details."),
            404: OpenApiResponse(description="Bonus point not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        bonus_point = get_object_or_404(EmployeeBonusPoint, pk=pk, period__institution=request.user.profile.institution)
        serializer = EmployeeBonusPointSerializer(bonus_point)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Bonus point marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Bonus point not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        bonus_point = get_object_or_404(EmployeeBonusPoint, pk=pk, period__institution=request.user.profile.institution)
        bonus_point.approval_status = 'under_deletion'
        bonus_point.save(update_fields=['approval_status'])
        bonus_point.confirm_delete()
        return Response({"message": "Bonus point submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=EmployeeBonusPointSerializer,
        responses={
            200: OpenApiResponse(response=EmployeeBonusPointSerializer, description="Bonus point updated successfully."),
            404: OpenApiResponse(description="Bonus point not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        bonus_point = get_object_or_404(EmployeeBonusPoint, pk=pk, period__institution=request.user.profile.institution)
        bonus_point.approval_status = 'under_update'
        serializer = EmployeeBonusPointSerializer(bonus_point, data=request.data, partial=True)
        if serializer.is_valid():
            # Ensure bonus_point_setting belongs to the user's institution
            bonus_point_setting_id = request.data.get('bonus_point_setting_id')
            if bonus_point_setting_id:
                get_object_or_404(
                    BonusPointSettings,
                    pk=bonus_point_setting_id,
                    institution=request.user.profile.institution
                )
            serializer.save()
            bonus_point.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class QuestionTemplateListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['name', 'category']
    default_ordering = ['name']

    @extend_schema(
        request=QuestionTemplateSerializer,
        responses={
            201: OpenApiResponse(response=QuestionTemplateSerializer, description="Question template created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = QuestionTemplateSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save(institution=request.user.profile.institution)
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by name or description"},
            {"name": "category", "type": "str", "description": "Filter by category (interview, performance_review, 360_feedback, general)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'name,-category')"},
        ],
        responses={
            200: OpenApiResponse(response=QuestionTemplateSerializer(many=True), description="List of question templates."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        templates = QuestionTemplate.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        category = request.query_params.get("category", None)

        if search_query:
            templates = templates.filter(Q(name__icontains=search_query) | Q(description__icontains=search_query))
        if category:
            templates = templates.filter(category=category)

        try:
            templates = self.apply_sorting(templates, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(templates, request)
        serializer = QuestionTemplateSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class QuestionTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=QuestionTemplateSerializer, description="Question template details."),
            404: OpenApiResponse(description="Question template not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        template = get_object_or_404(QuestionTemplate, pk=pk, institution=request.user.profile.institution)
        serializer = QuestionTemplateSerializer(template)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Question template marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Question template not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        template = get_object_or_404(QuestionTemplate, pk=pk, institution=request.user.profile.institution)
        template.approval_status = 'under_deletion'
        template.save(update_fields=['approval_status'])
        template.confirm_delete()
        return Response({"message": "Question template submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=QuestionTemplateSerializer,
        responses={
            200: OpenApiResponse(response=QuestionTemplateSerializer, description="Question template updated successfully."),
            404: OpenApiResponse(description="Question template not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        template = get_object_or_404(QuestionTemplate, pk=pk, institution=request.user.profile.institution)
        template.approval_status = 'under_update'
        serializer = QuestionTemplateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            template.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BonusPointSettingsListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['points', 'applicable_for', 'bonus_for', 'condition_field', 'condition_operator']
    default_ordering = ['points']

    @extend_schema(
        request=BonusPointSettingsSerializer,
        responses={
            201: OpenApiResponse(response=BonusPointSettingsSerializer, description="Bonus point settings created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = BonusPointSettingsSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save(institution=request.user.profile.institution)
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by content object or condition field"},
            {"name": "applicable_for", "type": "str", "description": "Filter by applicable for (managers, members)"},
            {"name": "condition_field", "type": "str", "description": "Filter by condition field"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'points,-applicable_for')"},
        ],
        responses={
            200: OpenApiResponse(response=BonusPointSettingsSerializer(many=True), description="List of bonus point settings."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        settings = BonusPointSettings.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        applicable_for = request.query_params.get("applicable_for", None)
        condition_field = request.query_params.get("condition_field", None)

        if search_query:
            settings = settings.filter(
                Q(content_object__str__icontains=search_query) |
                Q(condition_field__icontains=search_query)
            )
        if applicable_for:
            settings = settings.filter(applicable_for=applicable_for)
        if condition_field:
            settings = settings.filter(condition_field=condition_field)

        try:
            settings = self.apply_sorting(settings, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(settings, request)
        serializer = BonusPointSettingsSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class BonusPointSettingsDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=BonusPointSettingsSerializer, description="Bonus point settings details."),
            404: OpenApiResponse(description="Bonus point settings not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        settings = get_object_or_404(BonusPointSettings, pk=pk, institution=request.user.profile.institution)
        serializer = BonusPointSettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Bonus point settings marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Bonus point settings not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        settings = get_object_or_404(BonusPointSettings, pk=pk, institution=request.user.profile.institution)
        settings.approval_status = 'under_deletion'
        settings.save(update_fields=['approval_status'])
        settings.confirm_delete()
        return Response({"message": "Bonus point settings submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=BonusPointSettingsSerializer,
        responses={
            200: OpenApiResponse(response=BonusPointSettingsSerializer, description="Bonus point settings updated successfully."),
            404: OpenApiResponse(description="Bonus point settings not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        settings = get_object_or_404(BonusPointSettings, pk=pk, institution=request.user.profile.institution)
        settings.approval_status = 'under_update'
        serializer = BonusPointSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            settings.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 
    
class MeetingListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['title', 'start_time', 'end_time', 'mode']
    default_ordering = ['start_time']

    @extend_schema(
        request=MeetingSerializer,
        responses={
            201: OpenApiResponse(response=MeetingSerializer, description="Meeting created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = MeetingSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save(
                institution=request.user.profile.institution
                # organizer=request.user.profile
            )
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by title or description"},
            {"name": "mode", "type": "str", "description": "Filter by mode (physical, online, hybrid)"},
            {"name": "start_time", "type": "datetime", "description": "Filter by start time"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'title,-start_time')"},
        ],
        responses={
            200: OpenApiResponse(response=MeetingSerializer(many=True), description="List of meetings."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        meetings = Meeting.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        mode = request.query_params.get("mode", None)
        start_time = request.query_params.get("start_time", None)

        if search_query:
            meetings = meetings.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        if mode:
            meetings = meetings.filter(mode=mode)
        if start_time:
            meetings = meetings.filter(start_time__gte=start_time)

        try:
            meetings = self.apply_sorting(meetings, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(meetings, request)
        serializer = MeetingSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class MeetingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=MeetingSerializer, description="Meeting details."),
            404: OpenApiResponse(description="Meeting not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        meeting = get_object_or_404(Meeting, pk=pk, institution=request.user.profile.institution)
        serializer = MeetingSerializer(meeting)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Meeting marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Meeting not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        meeting = get_object_or_404(Meeting, pk=pk, institution=request.user.profile.institution)
        meeting.approval_status = 'under_deletion'
        meeting.save(update_fields=['approval_status'])
        meeting.confirm_delete()
        return Response({"message": "Meeting submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=MeetingSerializer,
        responses={
            200: OpenApiResponse(response=MeetingSerializer, description="Meeting updated successfully."),
            404: OpenApiResponse(description="Meeting not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        meeting = get_object_or_404(Meeting, pk=pk, institution=request.user.profile.institution)
        meeting.approval_status = 'under_update'
        serializer = MeetingSerializer(meeting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            meeting.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def initiate_oauth(request):
    flow = InstalledAppFlow.from_client_config(
        {
            'web': {
                'client_id': os.getenv('GOOGLE_CLIENT_ID'),
                'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
                'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                'token_uri': 'https://oauth2.googleapis.com/token',
                'redirect_uris': [request.build_absolute_uri(reverse('oauth2callback'))],
            }
        },
        scopes=['https://www.googleapis.com/auth/calendar'],
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline', include_granted_scopes='true'
    )
    request.session['oauth_state'] = state
    return redirect(authorization_url)

def oauth2callback(request):
    state = request.session.get('oauth_state')
    flow = InstalledAppFlow.from_client_config(
        {
            'web': {
                'client_id': os.getenv('GOOGLE_CLIENT_ID'),
                'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
                'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                'token_uri': 'https://oauth2.googleapis.com/token',
                'redirect_uris': [request.build_absolute_uri(reverse('oauth2callback'))],
            }
        },
        scopes=['https://www.googleapis.com/auth/calendar'],
        state=state,
    )
    flow.fetch_token(authorization_response=request.build_absolute_uri())
    credentials = flow.credentials
    integration, _ = MeetingIntegration.objects.get_or_create(
        institution=request.user.profile.institution,
        platform='google_meet',
    )
    integration.oauth_token = credentials.token
    integration.oauth_refresh_token = credentials.refresh_token
    integration.save()
    return redirect('meeting_list')   

class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Analytics for all performance models.",
                response=OpenApiTypes.OBJECT,
                examples=[
                    OpenApiExample(
                        "Analytics Response",
                        value={
                            "periods": {
                                "total": 5,
                                "closed": 2,
                                "open": 3,
                            },
                            "objectives": {
                                "total": 10,
                                "average_duration_days": 30.5,
                            },
                            "employee_objectives": {
                                "total": 20,
                                "status_distribution": {"not_started": 5, "on_track": 10, "closed": 5},
                            },
                            "key_results": {
                                "total": 15,
                                "average_target_value": 80.0,
                            },
                            "feedback_360": {
                                "total": 25,
                                "average_rating": 3.5,
                            },
                            "employee_bonus_points": {
                                "total": 30,
                                "total_points": 1500,
                                "redeemed": 10,
                            },
                            "question_templates": {
                                "total": 8,
                                "category_distribution": {"general": 4, "performance_review": 2},
                            },
                            "bonus_point_settings": {
                                "total": 12,
                                "average_points": 50,
                            },
                            "meetings": {
                                "total": 40,
                                "mode_distribution": {"online": 20, "hybrid": 10, "physical": 10},
                            },
                        }
                    )
                ]
            ),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        # Periods Analytics
        periods = Period.objects.filter(institution=institution)
        periods_analytics = {
            "total": periods.count(),
            "closed": periods.filter(is_closed=True).count(),
            "open": periods.filter(is_closed=False).count(),
        }

        # Objectives Analytics
        objectives = Objectives.objects.filter(institution=institution)
        objectives_analytics = {
            "total": objectives.count(),
            "average_duration_days": int(objectives.aggregate(avg=Avg('duration'))['avg']) if objectives.exists() else 0,
        }

        # EmployeeObjectives Analytics
        employee_objectives = EmployeeObjectives.objects.filter(employee__payroll_branch__institution=institution)
        employee_objectives_analytics = {
            "total": employee_objectives.count(),
            "status_distribution": employee_objectives.values('status').annotate(count=Count('status')),
        }

        # KeyResults Analytics
        key_results = KeyResult.objects.filter(institution=institution)
        key_results_analytics = {
            "total": key_results.count(),
            "average_target_value": key_results.aggregate(avg=Avg('target_value'))['avg'] or 0,
        }

        # Feedback360 Analytics
        feedback = Feedback360.objects.filter(period__institution=institution)
        feedback_analytics = {
            "total": feedback.count(),
            "average_rating": feedback.aggregate(avg=Avg('rating'))['avg'] or 0,
        }

        # EmployeeBonusPoints Analytics
        bonus_points = EmployeeBonusPoint.objects.filter(period__institution=institution)
        bonus_points_analytics = {
            "total": bonus_points.count(),
            "total_points": bonus_points.aggregate(sum=Sum('points'))['sum'] or 0,
            "redeemed": bonus_points.filter(redeemed=True).count(),
        }

        # QuestionTemplates Analytics
        question_templates = QuestionTemplate.objects.filter(institution=institution)
        question_templates_analytics = {
            "total": question_templates.count(),
            "category_distribution": question_templates.values('category').annotate(count=Count('category')),
        }

        # BonusPointSettings Analytics
        bonus_point_settings = BonusPointSettings.objects.filter(institution=institution)
        bonus_point_settings_analytics = {
            "total": bonus_point_settings.count(),
            "average_points": bonus_point_settings.aggregate(avg=Avg('points'))['avg'] or 0,
        }

        # Meetings Analytics
        meetings = Meeting.objects.filter(institution=institution)
        meetings_analytics = {
            "total": meetings.count(),
            "mode_distribution": meetings.values('mode').annotate(count=Count('mode')),
        }

        analytics = {
            "periods": periods_analytics,
            "objectives": objectives_analytics,
            "employee_objectives": employee_objectives_analytics,
            "key_results": key_results_analytics,
            "feedback_360": feedback_analytics,
            "employee_bonus_points": bonus_points_analytics,
            "question_templates": question_templates_analytics,
            "bonus_point_settings": bonus_point_settings_analytics,
            "meetings": meetings_analytics,
        }

        return Response(analytics, status=status.HTTP_200_OK) 