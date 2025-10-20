from datetime import timedelta
from utilities.pagination import CustomPageNumberPagination
from recruitment.models import JobAdvertApplication
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.db import transaction
from django.db.utils import IntegrityError
from django.db.models import Max
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter, OpenApiTypes
from .models import (
    HandoverReport,
    Offboarding,
    OnBoarding,
    TerminationStage,
    TerminationType,
)
from .serializers import (
    HandoverReportSerializer,
    OffboardingSerializer,
    OnBoardingSerializer,
    TerminationStageSerializer,
    TerminationTypeSerializer,
)
from institution.models import Institution
from django.db.models import Q, Count
from django.db import transaction
from utilities.sortable_api import SortableAPIMixin
from django.shortcuts import get_object_or_404
# from django.contrib.auth.decorators import permission_required
from django.utils.decorators import method_decorator
from django.utils import timezone


class OnBoardingListAPI(APIView, SortableAPIMixin):
    parser_classes = [MultiPartParser, FormParser]
    allowed_ordering_fields = [
        "application",
        "created_at",
        "attended",
        "is_active",
        "remarks",
        "status",
    ]
    default_ordering = ["application"]

    @extend_schema(
        request=OnBoardingSerializer,
        responses={201: OnBoardingSerializer},
        summary="Create Onboarding Record",
        tags=["Onboarding"],
    )
    # @method_decorator(permission_required('can_create_onboarding_records', raise_exception=True))
    @transaction.atomic()
    def post(self, request):
        serializer = OnBoardingSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: OnBoardingSerializer(many=True)},
        summary="List Onboarding Records by Institution",
        tags=["Onboarding"],
    )
    # @method_decorator(permission_required('can_view_onboarding_records', raise_exception=True))
    def get(self, request, institution_id):
        search_query = request.query_params.get("search", None)
        status = request.query_params.get("status", None)
        onboardings = OnBoarding.objects.filter(
            application__job_position_advert__job_position__department__institution_id=institution_id,
            deleted_at__isnull=True,
        ).order_by("-created_at")

        if search_query:
            onboardings = onboardings.filter(
                Q(application__applicant_name__icontains=search_query)
                | Q(application__applicant_email__icontains=search_query)
                | Q(
                    application__job_position_advert__job_position__name__icontains=search_query
                )
            )

        if status:
            onboardings = onboardings.filter(status=status)

        try:
            onboardings = self.apply_sorting(onboardings, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(onboardings, request)
        serializer = OnBoardingSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class OnBoardingDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        responses={200: OnBoardingSerializer},
        summary="Get Onboarding Record",
        tags=["Onboarding"],
    )
    # @method_decorator(permission_required('can_view_onboarding_records', raise_exception=True))
    def get(self, request, onboarding_id):
        try:
            onboarding = OnBoarding.objects.get(id=onboarding_id)
            serializer = OnBoardingSerializer(onboarding)
            return Response(serializer.data)
        except OnBoarding.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=OnBoardingSerializer,
        responses={200: OnBoardingSerializer},
        summary="Update Onboarding Record",
        tags=["Onboarding"],
    )
    # @method_decorator(permission_required('can_edit_onboarding_records', raise_exception=True))
    @transaction.atomic()
    def patch(self, request, onboarding_id):
        try:
            onboarding = OnBoarding.objects.get(id=onboarding_id)
            onboarding.approval_status = "under_update"
            serializer = OnBoardingSerializer(
                onboarding, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                onboarding.confirm_update()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except OnBoarding.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


class BulkOnBoardingCreateAPI(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        request={
            "type": "object",
            "properties": {
                "application_ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "List of JobAdvertApplication IDs to create onboarding records for",
                }
            },
            "required": ["application_ids"],
        },
        summary="Bulk Create Onboarding Records",
        description="Create onboarding records for multiple applications with initial status",
        tags=["Onboarding"],
    )
    @transaction.atomic()
    def post(self, request):
        application_ids = request.data.get("application_ids", [])

        if not application_ids:
            return Response(
                {"error": "application_ids is required and cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(application_ids, list):
            return Response(
                {"error": "application_ids must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate that all application_ids are integers
        if not all(isinstance(app_id, int) for app_id in application_ids):
            return Response(
                {"error": "All application_ids must be integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_onboardings = []
        skipped_applications = []

        try:
            with transaction.atomic():
                # Get all valid applications
                valid_applications = JobAdvertApplication.objects.filter(
                    id__in=application_ids
                ).select_related("onboarding")

                valid_app_ids = set(valid_applications.values_list("id", flat=True))
                invalid_app_ids = set(application_ids) - valid_app_ids

                # Track invalid application IDs
                for invalid_id in invalid_app_ids:
                    skipped_applications.append(
                        {
                            "application_id": invalid_id,
                            "reason": "Application not found",
                        }
                    )

                # Process valid applications
                for application in valid_applications:
                    # Check if onboarding record already exists
                    if hasattr(application, "onboarding") and application.onboarding:
                        skipped_applications.append(
                            {
                                "application_id": application.id,
                                "reason": "Onboarding record already exists",
                            }
                        )
                        continue

                    # Create onboarding record
                    onboarding = OnBoarding.objects.create(
                        application=application, status="initial"
                    )
                    # Trigger approval workflow for the created onboarding
                    onboarding.confirm_create()
                    created_onboardings.append(onboarding)

        except Exception as e:
            return Response(
                {"error": f"Failed to create onboarding records: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Serialize created onboarding records
        serializer = OnBoardingSerializer(created_onboardings, many=True)

        response_data = {
            "created": serializer.data,
            "skipped": skipped_applications,
            "summary": {
                "total_requested": len(application_ids),
                "created_count": len(created_onboardings),
                "skipped_count": len(skipped_applications),
            },
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Offboarding"],
    summary="Retrieve offboarding dashboard data",
    description=(
        "This endpoint provides aggregated data for the offboarding dashboard, including: "
        "- Separation counts by status (planned, completed, cancelled, total). "
        "- Category counts (resignation, termination, retirement, etc.). "
        "- Pending requests counts for resignations, terminations, and retirements. "
        "- List of recent separations (last 10, with details). "
        "Data is filtered by the institution associated with the authenticated user."
    ),
    parameters=[
        OpenApiParameter(
            name="institution_id",
            type=int,
            location=OpenApiParameter.PATH,
            description="ID of the institution to retrieve dashboard data for.",
            required=True,
        )
    ],
    responses={
        200: OpenApiResponse(
            description="Successful response with dashboard data",
            response={
                "type": "object",
                "properties": {
                    "separation_counts": {
                        "type": "object",
                        "properties": {
                            "planned": {
                                "type": "integer",
                                "description": "Count of initiated and in-progress offboardings",
                            },
                            "completed": {
                                "type": "integer",
                                "description": "Count of completed offboardings",
                            },
                            "cancelled": {
                                "type": "integer",
                                "description": "Count of cancelled offboardings",
                            },
                            "total": {
                                "type": "integer",
                                "description": "Total count of offboardings",
                            },
                        },
                    },
                    "category_counts": {
                        "type": "object",
                        "additionalProperties": {"type": "integer"},
                        "description": 'Counts by separation category (e.g., "Resignation": 5)',
                    },
                    "pending_requests": {
                        "type": "object",
                        "properties": {
                            "resignations": {
                                "type": "integer",
                                "description": "Count of pending employee-initiated offboardings",
                            },
                            "terminations": {
                                "type": "integer",
                                "description": "Count of pending employer-initiated offboardings",
                            },
                            "retirements": {
                                "type": "integer",
                                "description": "Count of pending retirement offboardings",
                            },
                            "total": {
                                "type": "integer",
                                "description": "Total count of pending offboardings",
                            },
                        },
                    },
                    "recent_separations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "type": "integer",
                                    "description": "Offboarding ID",
                                },
                                "employee_name": {
                                    "type": "string",
                                    "description": "Name of the employee",
                                },
                                "separation_type": {
                                    "type": "string",
                                    "description": "Name of the termination type",
                                },
                                "category": {
                                    "type": "string",
                                    "description": "Category of separation (e.g., Resignation, Termination, Retirement)",
                                },
                                "effective_date": {
                                    "type": "string",
                                    "description": "Last working day",
                                },
                                "separation_status": {
                                    "type": "string",
                                    "description": "Status of the offboarding (e.g., INITIATED, COMPLETED)",
                                },
                                "additional_notes": {
                                    "type": "string",
                                    "nullable": True,
                                    "description": "Reason for offboarding",
                                },
                            },
                        },
                        "description": "List of up to 10 recent separations",
                    },
                    "date_range": {
                        "type": "object",
                        "properties": {
                            "start_date": {
                                "type": "string",
                                "description": "Start of date range",
                            },
                            "end_date": {
                                "type": "string",
                                "description": "End of date range",
                            },
                        },
                    },
                },
            },
        ),
        400: OpenApiResponse(
            description="Bad request (e.g., invalid institution_id)",
            response={
                "type": "object",
                "properties": {
                    "error": {"type": "string", "description": "Error message"}
                },
            },
        ),
        403: OpenApiResponse(
            description="Permission denied",
            response={
                "type": "object",
                "properties": {
                    "error": {"type": "string", "description": "Error message"}
                },
            },
        ),
    },
)
class OffboardingDashboardView(APIView):

    def get(self, request):
        """
        Dashboard endpoint providing key offboarding metrics and recent activities.
        """
        # Ensure the user has access to the institution
        try:
            institution_id = request.user.profile.institution
        except ValueError:
            return Response(
                {'error': 'Invalid institution_id'},
                status=400
            )

        if not request.user.has_perm('view_institution', institution_id):
            return Response(
                {'error': 'You do not have permission to view this institution.'},
                status=403
            )

        # Define date range (last 30 days)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        # Base queryset for offboardings
        base_queryset = Offboarding.objects.filter(
            termination_type__institution_id=institution_id,
            created_at__range=(start_date, end_date)
        )

        # Separation counts
        status_counts = base_queryset.values('status').annotate(count=Count('id')).order_by('status')
        status_dict = {item['status']: item['count'] for item in status_counts}
        separation_counts = {
            'planned': status_dict.get('INITIATED', 0) + status_dict.get('IN_PROGRESS', 0),
            'completed': status_dict.get('COMPLETED', 0),
            'cancelled': status_dict.get('CANCELLED', 0),
            'total': base_queryset.count()
        }

        # Category counts
        category_counts = base_queryset.values('termination_type__name').annotate(
            count=Count('id')
        ).order_by('termination_type__name')
        category_counts_dict = {
            item['termination_type__name']: item['count']
            for item in category_counts
        }

        # Pending requests
        pending_queryset = base_queryset.filter(
            Q(status='INITIATED') | Q(status='IN_PROGRESS')
        )
        resignations = pending_queryset.filter(
            initiator_type='EMPLOYEE',
            termination_type__name__iexact='Resignation'
        ).count()
        terminations = pending_queryset.filter(
            initiator_type='EMPLOYER',
            termination_type__name__iexact='Termination'
        ).count()
        retirements = pending_queryset.filter(
            termination_type__name__iexact='Retirement'
        ).count()
        pending_requests = {
            'resignations': resignations,
            'terminations': terminations,
            'retirements': retirements,
            'total': pending_queryset.count()
        }

        # Recent separations
        recent_separations = [
            {
                'id': item['id'],
                'employee_name': item['employee__name'],
                'separation_type': item['termination_type__name'],
                'category': (
                    'Resignation' if item['initiator_type'] == 'EMPLOYEE' and 'resignation' in item['termination_type__name'].lower()
                    else 'Retirement' if 'retirement' in item['termination_type__name'].lower()
                    else 'Termination'
                ),
                'effective_date': item['last_working_day'],
                'separation_status': item['status'],
                'additional_notes': item['reason']
            }
            for item in Offboarding.get_report_data(
                start_date=start_date,
                end_date=end_date,
                institution=institution_id
            )[:10]
        ]

        # Prepare response data
        response_data = {
            'separation_counts': separation_counts,
            'category_counts': category_counts_dict,
            'pending_requests': pending_requests,
            'recent_separations': recent_separations,
            'date_range': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        }

        return Response(response_data)

class TerminationStageListCreateView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['name', 'order', 'created_at']
    default_ordering = ['order']

    @extend_schema(
        request=TerminationStageSerializer,
        responses={
            201: OpenApiResponse(
                response=TerminationStageSerializer,
                description="Termination stage created successfully."
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def post(self, request):
        serializer = TerminationStageSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="search", type=str, description="Search by name"),
            OpenApiParameter(name="ordering", type=str, description="Sort by fields (e.g., 'name,-order,created_at')")
        ],
        responses={
            200: OpenApiResponse(
                response=TerminationStageSerializer(many=True),
                description="List of termination stages."
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found.")
        },
        tags=["Offboarding"]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)

        try:
            institution = user.institution
        except AttributeError:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        stages = TerminationStage.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if search_query:
            stages = stages.filter(Q(name__icontains=search_query))

        if created_at:
            stages = stages.filter(created_at__date=created_at)

        try:
            stages = self.apply_sorting(stages, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(stages, request)
        serializer = TerminationStageSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)
    
class TerminationStageDetailView(APIView):
    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TerminationStageSerializer,
                description="Termination stage details."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination stage not found."
            )
        },
        tags=["Offboarding"]
    )
    def get(self, request, pk):
        stage = get_object_or_404(TerminationStage, pk=pk, deleted_at__isnull=True)
        serializer = TerminationStageSerializer(stage)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination stage marked for deletion and sent for approval."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination stage not found."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def delete(self, request, pk):
        stage = get_object_or_404(TerminationStage, pk=pk, deleted_at__isnull=True)
        stage.approval_status = 'under_deletion'
        stage.save(update_fields=['approval_status'])
        stage.confirm_delete()
        return Response(
            {"message": "Termination stage submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=TerminationStageSerializer,
        responses={
            200: OpenApiResponse(
                response=TerminationStageSerializer,
                description="Termination stage updated successfully."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination stage not found."
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def patch(self, request, pk):
        stage = get_object_or_404(TerminationStage, pk=pk, deleted_at__isnull=True)
        stage.approval_status = 'under_update'
        serializer = TerminationStageSerializer(stage, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            stage.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)    
    
class TerminationTypeListCreateView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['name', 'created_at', 'requires_handover_report']
    default_ordering = ['name']

    @extend_schema(
        request=TerminationTypeSerializer,
        responses={
            201: OpenApiResponse(
                response=TerminationTypeSerializer,
                description="Termination type created successfully."
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def post(self, request):
        serializer = TerminationTypeSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="search", type=str, description="Search by name or description"),
            OpenApiParameter(name="created_at", type=str, description="Filter by creation date"),
            OpenApiParameter(name="requires_handover_report", type=bool, description="Filter by handover report requirement"),
            OpenApiParameter(name="ordering", type=str, description="Sort by fields (e.g., 'name,-created_at,requires_handover_report')")
        ],
        responses={
            200: OpenApiResponse(
                response=TerminationTypeSerializer(many=True),
                description="List of termination types."
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found.")
        },
        tags=["Offboarding"]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        requires_handover = request.query_params.get("requires_handover_report", None)

        try:
            institution = user.institution
        except AttributeError:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        types = TerminationType.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if search_query:
            types = types.filter(
                Q(name__icontains=search_query) | Q(description__icontains=search_query)
            )

        if created_at:
            types = types.filter(created_at__date=created_at)

        if requires_handover is not None:
            types = types.filter(requires_handover_report=requires_handover.lower() == 'true')

        try:
            types = self.apply_sorting(types, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(types, request)
        serializer = TerminationTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class TerminationTypeDetailView(APIView):

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TerminationTypeSerializer,
                description="Termination type details."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination type not found."
            )
        },
        tags=["Offboarding"]
    )
    def get(self, request, pk):
        type = get_object_or_404(TerminationType, pk=pk, deleted_at__isnull=True)
        serializer = TerminationTypeSerializer(type)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination type marked for deletion and sent for approval."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination type not found."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def delete(self, request, pk):
        type = get_object_or_404(TerminationType, pk=pk, deleted_at__isnull=True)
        type.approval_status = 'under_deletion'
        type.save(update_fields=['approval_status'])
        type.confirm_delete()
        return Response(
            {"message": "Termination type submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=TerminationTypeSerializer,
        responses={
            200: OpenApiResponse(
                response=TerminationTypeSerializer,
                description="Termination type updated successfully."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Termination type not found."
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def patch(self, request, pk):
        type = get_object_or_404(TerminationType, pk=pk, deleted_at__isnull=True)
        type.approval_status = 'under_update'
        serializer = TerminationTypeSerializer(type, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            type.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)    

class OffboardingListCreateView(APIView, SortableAPIMixin):

    allowed_ordering_fields = ['employee__name', 'termination_type__name', 'last_working_day', 'status', 'created_at']
    default_ordering = ['-created_at']

    @extend_schema(
        request=OffboardingSerializer,
        responses={
            201: OpenApiResponse(
                response=OffboardingSerializer,
                description="Offboarding created successfully."
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def post(self, request):
        serializer = OffboardingSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="search", type=str, description="Search by employee name, termination type, or reason"),
            OpenApiParameter(name="created_at", type=str, description="Filter by creation date"),
            OpenApiParameter(name="status", type=str, description="Filter by status (INITIATED, IN_PROGRESS, COMPLETED, CANCELLED)"),
            OpenApiParameter(name="initiator_type", type=str, description="Filter by initiator type (EMPLOYEE, EMPLOYER)"),
            OpenApiParameter(name="ordering", type=str, description="Sort by fields (e.g., 'employee__name,-last_working_day,status')")
        ],
        responses={
            200: OpenApiResponse(
                response=OffboardingSerializer(many=True),
                description="List of offboardings."
            ),
            400: OpenApiResponse(description="Invalid ordering field or status."),
            404: OpenApiResponse(description="Institution not found.")
        },
        tags=["Offboarding"]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)
        initiator_type = request.query_params.get("initiator_type", None)

        try:
            institution = user.institution
        except AttributeError:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        offboardings = Offboarding.objects.filter(
            termination_type__institution=institution, deleted_at__isnull=True
        )

        if search_query:
            offboardings = offboardings.filter(
                Q(employee__name__icontains=search_query) |
                Q(termination_type__name__icontains=search_query) |
                Q(reason__icontains=search_query)
            )

        if created_at:
            offboardings = offboardings.filter(created_at__date=created_at)

        if status_filter:
            if status_filter.upper() not in [choice[0] for choice in Offboarding.STATUS_CHOICES]:
                return Response(
                    {"detail": "Invalid status filter."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            offboardings = offboardings.filter(status=status_filter.upper())

        if initiator_type:
            if initiator_type.upper() not in [choice[0] for choice in Offboarding.INITIATOR_CHOICES]:
                return Response(
                    {"detail": "Invalid initiator type filter."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            offboardings = offboardings.filter(initiator_type=initiator_type.upper())

        try:
            offboardings = self.apply_sorting(offboardings, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(offboardings, request)
        serializer = OffboardingSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class OffboardingDetailView(APIView):

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OffboardingSerializer,
                description="Offboarding details."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Offboarding not found."
            )
        },
        tags=["Offboarding"]
    )
    def get(self, request, pk):
        offboarding = get_object_or_404(Offboarding, pk=pk, deleted_at__isnull=True)
        serializer = OffboardingSerializer(offboarding)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Offboarding marked for deletion and sent for approval."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Offboarding not found."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def delete(self, request, pk):
        offboarding = get_object_or_404(Offboarding, pk=pk, deleted_at__isnull=True)
        offboarding.approval_status = 'under_deletion'
        offboarding.save(update_fields=['approval_status'])
        offboarding.confirm_delete()
        return Response(
            {"message": "Offboarding submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=OffboardingSerializer,
        responses={
            200: OpenApiResponse(
                response=OffboardingSerializer,
                description="Offboarding updated successfully."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Offboarding not found."
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def patch(self, request, pk):
        offboarding = get_object_or_404(Offboarding, pk=pk, deleted_at__isnull=True)
        offboarding.approval_status = 'under_update'
        serializer = OffboardingSerializer(offboarding, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            offboarding.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)        
    
class HandoverReportDetailView(APIView):

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=HandoverReportSerializer,
                description="Handover report details."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Handover report not found."
            )
        },
        tags=["Offboarding"]
    )
    def get(self, request, pk):
        report = get_object_or_404(HandoverReport, pk=pk, deleted_at__isnull=True)
        serializer = HandoverReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Handover report marked for deletion and sent for approval."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Handover report not found."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def delete(self, request, pk):
        report = get_object_or_404(HandoverReport, pk=pk, deleted_at__isnull=True)
        report.approval_status = 'under_deletion'
        report.save(update_fields=['approval_status'])
        report.confirm_delete()
        return Response(
            {"message": "Handover report submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        request=HandoverReportSerializer,
        responses={
            200: OpenApiResponse(
                response=HandoverReportSerializer,
                description="Handover report updated successfully."
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Handover report not found."
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors."
            )
        },
        tags=["Offboarding"]
    )
    @transaction.atomic
    def patch(self, request, pk):
        report = get_object_or_404(HandoverReport, pk=pk, deleted_at__isnull=True)
        report.approval_status = 'under_update'
        serializer = HandoverReportSerializer(report, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            report.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)    