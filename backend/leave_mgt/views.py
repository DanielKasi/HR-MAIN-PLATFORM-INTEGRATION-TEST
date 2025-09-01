from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Sum, F, ExpressionWrapper, FloatField
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from django.db.models.functions import TruncMonth
from utilities.pagination import CustomPageNumberPagination
from rest_framework.permissions import IsAuthenticated
from .models import LeaveApplication, LeaveBalance, LeavePolicy, LeaveType
from .serializers import (
    LeaveApplicationSerializer,
    LeaveBalanceSerializer,
    LeavePolicySerializer,
    LeaveTypeSerializer,
)
from .utils import LeaveCalculator, LeaveBalanceManager
from employee.models import Employee
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers

from utilities.leave_mgt_analytics import get_leave_trends_analytics


@extend_schema(tags=["Leave Types"])
class LeaveTypeListCreateAPIView(APIView):
    @extend_schema(
        summary="List all leave types", responses={200: LeaveTypeSerializer(many=True)}
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        queryset = LeaveType.objects.filter(
         institution_id=institution_id, deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(category__icontains=search_query)
            )

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = LeaveTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create a new leave type",
        request=LeaveTypeSerializer,
        responses={201: LeaveTypeSerializer},
    )
    def post(self, request, institution_id):
        serializer = LeaveTypeSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Leave Types"])
class LeaveTypeDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave type by ID", responses={200: LeaveTypeSerializer}
    )
    def get(self, request, pk):
        leave_type = get_object_or_404(LeaveType, pk=pk)
        serializer = LeaveTypeSerializer(leave_type)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave type",
        request=LeaveTypeSerializer,
        responses={200: LeaveTypeSerializer},
    )
    def patch(self, request, pk):
        leave_type = get_object_or_404(LeaveType, pk=pk)
        leave_type.approval_status = 'under_update'
        serializer = LeaveTypeSerializer(leave_type, data=request.data, partial=True)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a leave type", responses={204: None})
    def delete(self, request, pk):
        leave_type = get_object_or_404(LeaveType, pk=pk)
        leave_type.approval_status = 'under_deletion'
        leave_type.delete()
        leave_type.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Leave Balances"])
class LeaveBalanceListCreateAPIView(APIView):
    @extend_schema(
        summary="List all leave balances",
        parameters=[
            OpenApiParameter(
                name="employee_id", type=int, location=OpenApiParameter.QUERY
            ),
            OpenApiParameter(name="year", type=int, location=OpenApiParameter.QUERY),
        ],
        responses={200: LeaveBalanceSerializer(many=True)},
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        queryset = (
            LeaveBalance.objects.select_related("employee", "leave_type")
            .filter(institution_id=institution_id, deleted_at__isnull=True)
            .order_by("created_at")
        )

        employee_id = request.query_params.get("employee_id")
        year = request.query_params.get("year")

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if year:
            queryset = queryset.filter(year=year)

        if search_query:
            queryset = queryset.filter(
                Q(employee__user__fullname__icontains=search_query) |
                Q(leave_type__name__icontains=search_query)
            )    

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = LeaveBalanceSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create a new leave balance record",
        request=LeaveBalanceSerializer,
        responses={201: LeaveBalanceSerializer},
    )
    def post(self, request, institution_id):
        serializer = LeaveBalanceSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Leave Balances"])
class LeaveBalanceDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave balance by ID",
        responses={200: LeaveBalanceSerializer},
    )
    def get(self, request, pk):
        balance = get_object_or_404(LeaveBalance, pk=pk)
        serializer = LeaveBalanceSerializer(balance)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave balance",
        request=LeaveBalanceSerializer,
        responses={200: LeaveBalanceSerializer},
    )
    def patch(self, request, pk):
        balance = get_object_or_404(LeaveBalance, pk=pk)
        balance.approval_status = 'under_update'
        serializer = LeaveBalanceSerializer(balance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            balance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a leave balance", responses={204: None})
    def delete(self, request, pk):
        balance = get_object_or_404(LeaveBalance, pk=pk)
        balance.approval_status = 'under_deletion'
        balance.delete()
        balance.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Leave Applications"])
class LeaveApplicationListCreateAPIView(APIView):
    # Support both JSON and FormData for file uploads
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @extend_schema(
        summary="List all leave applications",
        parameters=[
            OpenApiParameter(
                name="employee_id", type=int, location=OpenApiParameter.QUERY
            ),
            OpenApiParameter(name="status", type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(
                name="leave_type_id", type=int, location=OpenApiParameter.QUERY
            ),
            OpenApiParameter(
                name="institutionId", type=int, location=OpenApiParameter.QUERY
            ),
        ],
        responses={200: LeaveApplicationSerializer(many=True)},
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        queryset = LeaveApplication.objects.select_related(
            "employee", "leave_type", "approved_by"
        ).filter(institution_id=institution_id, deleted_at__isnull=True)

        # Optional query parameters
        employee_id = request.query_params.get("employee_id")
        status_filter = request.query_params.get("status")
        leave_type_id = request.query_params.get("leave_type_id")

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if leave_type_id:
            queryset = queryset.filter(leave_type_id=leave_type_id)

        queryset = queryset.order_by("-start_date", "-created_at")

        if search_query:
            queryset = queryset.filter(
                Q(employee__user__fullname__icontains=search_query) |
                Q(leave_type__name__icontains=search_query)
            )

        pagination = CustomPageNumberPagination()
        paginated_qs = pagination.paginate_queryset(queryset, request)

        serializer = LeaveApplicationSerializer(paginated_qs, many=True)
        return pagination.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create a new leave application",
        request=LeaveApplicationSerializer,
        responses={
            201: LeaveApplicationSerializer,
            400: OpenApiExample(
                "Validation Error", value={"error": "Insufficient leave balance"}
            ),
        },
    )
    def post(self, request, institution_id):
        def extract_value(data, key):
            """Extract single value from QueryDict list format"""
            value = data.get(key)
            return value[0] if isinstance(value, list) and value else value

        # Process FormData if multipart, otherwise use data as-is
        if request.content_type and "multipart" in request.content_type:
            final_data = {}
            for key, value in request.data.items():
                if key not in ["supporting_document"]:  # Handle file separately
                    final_data[key] = extract_value(request.data, key)

            # Handle file upload
            if "supporting_document" in request.FILES:
                final_data["supporting_document"] = request.FILES["supporting_document"]

            # Convert data types
            for field in ["employee", "leave_type", "institutionId"]:
                if field in final_data:
                    try:
                        final_data[field] = (
                            int(final_data[field]) if final_data[field] else None
                        )
                    except (ValueError, TypeError):
                        final_data[field] = None

            data_to_serialize = final_data
        else:
            data_to_serialize = request.data

        data_to_serialize["institution"] = institution_id


        serializer = LeaveApplicationSerializer(data=data_to_serialize)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Calculate total days
            start_date = serializer.validated_data["start_date"]
            end_date = serializer.validated_data["end_date"]
            duration_type = serializer.validated_data.get("duration_type", "full_day")

            total_days = LeaveCalculator.calculate_leave_days(
                start_date, end_date, duration_type
            )

            # Check eligibility
            employee = serializer.validated_data["employee"]
            leave_type = serializer.validated_data["leave_type"]

            is_eligible, message = LeaveCalculator.check_leave_eligibility(
                employee, leave_type, start_date, total_days
            )

            if not is_eligible:
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

            # Save application with calculated days
            application = serializer.save(total_days=total_days)
            application.confirm_create()

            # Update pending balance
            try:
                balance = LeaveBalance.objects.get(
                    employee=employee, leave_type=leave_type, year=start_date.year
                )
                balance.pending_days += total_days
                balance.save()
            except LeaveBalance.DoesNotExist:
                return Response({"error": ""}, status=status.HTTP_400_BAD_REQUEST)

            return Response(
                LeaveApplicationSerializer(application).data,
                status=status.HTTP_201_CREATED,
            )


@extend_schema(tags=["Leave Applications"])
class LeaveApplicationDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave application by ID",
        responses={200: LeaveApplicationSerializer},
    )
    def get(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)
        serializer = LeaveApplicationSerializer(application)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave application",
        request=LeaveApplicationSerializer,
        responses={200: LeaveApplicationSerializer},
    )
    def patch(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)

        # Prevent updating approved/rejected applications
        if application.status in ["approved", "rejected"]:
            return Response(
                {"error": "Cannot modify approved or rejected applications"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.approval_status = 'under_update'
        serializer = LeaveApplicationSerializer(
            application, data=request.data, partial=True
        )
        if serializer.is_valid():
            with transaction.atomic():
                # If dates are being updated, recalculate days
                if "start_date" in request.data or "end_date" in request.data:
                    start_date = serializer.validated_data.get(
                        "start_date", application.start_date
                    )
                    end_date = serializer.validated_data.get(
                        "end_date", application.end_date
                    )
                    duration_type = serializer.validated_data.get(
                        "duration_type", application.duration_type
                    )

                    new_total_days = LeaveCalculator.calculate_leave_days(
                        start_date, end_date, duration_type
                    )

                    # Update balance
                    try:
                        balance = LeaveBalance.objects.get(
                            employee=application.employee,
                            leave_type=application.leave_type,
                            year=application.start_date.year,
                        )
                        # Adjust pending days
                        balance.pending_days -= application.total_days
                        balance.pending_days += new_total_days
                        balance.save()
                    except LeaveBalance.DoesNotExist:
                        pass

                    serializer.validated_data["total_days"] = new_total_days

                serializer.save()
                application.confirm_update()
                return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a leave application", responses={204: None})
    def delete(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)

        if application.status != "pending":
            return Response(
                {"error": "Can only delete pending applications"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.approval_status = 'under_deletion'
        with transaction.atomic():
            # Update balance
            try:
                balance = LeaveBalance.objects.get(
                    employee=application.employee,
                    leave_type=application.leave_type,
                    year=application.start_date.year,
                )
                balance.pending_days -= application.total_days
                balance.save()
            except LeaveBalance.DoesNotExist:
                pass

            application.is_active = False
            application.delete()
            application.confirm_delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Leave Applications"])
class LeaveApplicationApprovalAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        summary="Approve or reject a leave application",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["approve", "reject"]},
                    "rejection_reason": {"type": "string", "required": False},
                },
                "required": ["action"],
            }
        },
        responses={200: LeaveApplicationSerializer},
    )
    def post(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)
        action = request.data.get("action")

        if application.status != "pending":
            return Response(
                {"error": "Application is not pending"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action not in ["approve", "reject"]:
            return Response(
                {"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if action == "approve":
                application.status = "approved"
                application.approved_by = request.user
                application.approved_at = timezone.now()

                # Update balance
                LeaveBalanceManager.update_balance_on_approval(application)

            else:  # reject
                application.status = "rejected"
                application.rejection_reason = request.data.get("rejection_reason", "")

                # Update balance
                LeaveBalanceManager.update_balance_on_rejection(application)

            application.save()

            serializer = LeaveApplicationSerializer(application)
            return Response(serializer.data)


@extend_schema(tags=["Leave Policies"])
class LeavePolicyListCreateAPIView(APIView):
    @extend_schema(
        summary="List all leave policies",
        responses={200: LeavePolicySerializer(many=True)},
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        queryset = (
            LeavePolicy.objects.select_related("leave_type")
            .filter(deleted_at__isnull=True, institution_id=institution_id)
            .order_by("-created_at")
        )

        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(leave_type__name__icontains=search_query)
            )

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = LeavePolicySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create a new leave policy",
        request=LeavePolicySerializer,
        responses={201: LeavePolicySerializer},
    )
    def post(self, request, institution_id):
        serializer = LeavePolicySerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Leave Policies"])
class LeavePolicyDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave policy by ID", responses={200: LeavePolicySerializer}
    )
    def get(self, request, pk):
        policy = get_object_or_404(LeavePolicy, pk=pk)
        serializer = LeavePolicySerializer(policy)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave policy",
        request=LeavePolicySerializer,
        responses={200: LeavePolicySerializer},
    )
    def patch(self, request, pk):
        policy = get_object_or_404(LeavePolicy, pk=pk)
        policy.approval_status = 'under_update'
        serializer = LeavePolicySerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            policy.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a leave policy", responses={204: None})
    def delete(self, request, pk):
        policy = get_object_or_404(LeavePolicy, pk=pk)
        policy.approval_status = 'under_deletion'
        policy.delete()
        policy.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Utility endpoints
@extend_schema(tags=["Leave Management"])
@api_view(["POST"])
def initialize_yearly_balances(request, institution_id):
    """Initialize leave balances for all employees in an institution for a given year"""
    try:
        # Get year from request data, default to current year
        year_param = request.data.get("year", timezone.now().year)

        # Ensure year is an integer
        try:
            year = int(year_param)
        except (ValueError, TypeError):
            return Response(
                {"error": "Year must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Call the manager method
        result = LeaveBalanceManager.initialize_yearly_balances(institution_id, year)

        return Response(
            {
                "message": f"Successfully processed leave balances for year {year}",
                "details": {
                    "created_count": result["created_count"],
                    "updated_count": result["updated_count"],
                    "total_processed": result["total_processed"],
                },
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {"error": "An unexpected error occurred", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(tags=["Leave Management"])
@api_view(["POST"])
def carry_forward_leaves(request, institution_id):
    """Carry forward unused leaves from one year to another for a given institution"""
    try:
        from_year = request.data.get("from_year")
        to_year = request.data.get("to_year")

        if not from_year or not to_year:
            return Response(
                {"error": "Both from_year and to_year are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure years are integers
        try:
            from_year = int(from_year)
            to_year = int(to_year)
        except (ValueError, TypeError):
            return Response(
                {"error": "Both from_year and to_year must be valid integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate year logic
        if from_year >= to_year:
            return Response(
                {"error": "from_year must be less than to_year"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Call the manager method
        carried_count = LeaveBalanceManager.carry_forward_leaves(
            institution_id, from_year, to_year
        )

        return Response(
            {
                "message": f"Successfully carried forward {carried_count} leave balances from {from_year} to {to_year}",
                "details": {
                    "carried_forward_count": carried_count,
                    "from_year": from_year,
                    "to_year": to_year,
                },
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {"error": "An unexpected error occurred", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(tags=["Leave Management"])
@api_view(["GET"])
def employee_leave_summary(request, employee_id):
    """Get leave summary for a specific employee"""
    try:
        employee = get_object_or_404(Employee, pk=employee_id)

        # Get year from query parameters, default to current year
        year_param = request.query_params.get("year", timezone.now().year)

        # Ensure year is an integer
        try:
            year = int(year_param)
        except (ValueError, TypeError):
            return Response(
                {"error": "Year must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get balances for the employee
        balances = LeaveBalance.objects.filter(
            employee=employee, year=year
        ).select_related("leave_type")

        # Get applications for the employee
        applications = LeaveApplication.objects.filter(
            employee=employee, start_date__year=year
        ).select_related("leave_type")

        # Use the manager method for better balance summary
        balance_summary = LeaveBalanceManager.get_employee_balance_summary(
            employee, year
        )

        summary = {
            "employee": {
                "id": employee.id,
                "name": employee.user.fullname,
            },
            "year": year,
            "balance_summary": balance_summary,
            "balances": LeaveBalanceSerializer(balances, many=True).data,
            "applications": LeaveApplicationSerializer(applications, many=True).data,
            "statistics": {
                "total_applications": applications.count(),
                "pending_applications": applications.filter(status="pending").count(),
                "approved_applications": applications.filter(status="approved").count(),
                "rejected_applications": applications.filter(status="rejected").count(),
            },
        }

        return Response(summary, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "An unexpected error occurred", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(tags=["Leave Management"])
@api_view(["GET"])
def institution_leave_summary(request, institution_id):
    """Get leave summary for all employees in an institution"""
    try:
        # Get year from query parameters, default to current year
        year_param = request.query_params.get("year", timezone.now().year)

        # Ensure year is an integer
        try:
            year = int(year_param)
        except (ValueError, TypeError):
            return Response(
                {"error": "Year must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use the manager method to get institution summary
        summary = LeaveBalanceManager.get_institution_balance_summary(
            institution_id, year
        )

        return Response(
            {"institution_id": institution_id, "year": year, "summary": summary},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {"error": "An unexpected error occurred", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class LeaveAnalyticsAPI(APIView):
    """
    API view for leave management trends.
    The core logic is now in a separate service file.
    """
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Leave application trends and efficiency analytics.",
                response=inline_serializer(
                    name='LeaveTrendsResponse',
                    fields={
                        'total_applications': serializers.IntegerField(help_text="Total number of leave applications."),
                        'applications_by_month': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Volume of applications over time, grouped by month."),
                        'applications_by_leave_type': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Count of applications broken down by leave type."),
                        'application_status_breakdown': serializers.DictField(help_text="Breakdown of application statuses and rates."),
                        'average_approval_time_in_days': serializers.FloatField(help_text="Average time taken to approve an application, in days."),
                    }
                ),
            ),
            404: OpenApiResponse(description="No leave application data found."),
        },
        summary="Get Leave Application Analytics",
        description="Provides insights into leave application trends, efficiency, and outcomes.",
        tags=["Leave Analytics"],
    )
    def get(self, request, institution_id: int):
        analytics_data = get_leave_trends_analytics(institution_id)
        if analytics_data is None:
            return Response({"detail": "No leave application data found for this institution."}, status=status.HTTP_404_NOT_FOUND)
        return Response(analytics_data, status=status.HTTP_200_OK)


class LeaveDashboardAPIView(APIView):
    """
    API endpoint for leave management dashboard analytics.
    Provides aggregated metrics on leave applications, balances, and statuses,
    filtered by the authenticated user's institution.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Leave Dashboard'],
        description=(
            'Retrieves key analytics for the leave management module dashboard, filtered by the authenticated user\'s institution. '
            'Metrics include total leave applications, applications by status, leave balances by type, '
            'average leave days taken, and applications over time (last 6 months).'
        ),
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'total_leave_applications': {'type': 'integer', 'description': 'Total leave applications'},
                    'applications_by_status': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'status': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        },
                        'description': 'Leave applications by status'
                    },
                    'applications_by_leave_type': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'leave_type': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        },
                        'description': 'Leave applications by leave type'
                    },
                    'leave_balances_by_type': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'leave_type': {'type': 'string'},
                                'total_allocated_days': {'type': 'number'},
                                'total_used_days': {'type': 'number'},
                                'total_available_days': {'type': 'number'}
                            }
                        },
                        'description': 'Leave balances aggregated by leave type'
                    },
                    'average_leave_days_taken': {'type': 'number', 'description': 'Average leave days taken per employee'},
                    'pending_approvals': {'type': 'integer', 'description': 'Total pending leave applications'},
                    'applications_over_time': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'date': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        },
                        'description': 'Leave applications over time (last 6 months)'
                    },
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            }
        }
    )
    def get(self, request):
        user = request.user
        institution = getattr(user.profile, "institution", None)

        if not institution:
            return Response(
                {"error": "User is not associated with any institution"},
                status=400
            )

        # Filter by institution
        leave_applications = LeaveApplication.objects.filter(
            institution=institution,
            deleted_at__isnull=True
        )
        leave_balances = LeaveBalance.objects.filter(
            institution=institution,
            deleted_at__isnull=True,
            year=timezone.now().year
        )

        # Total leave applications
        total_leave_applications = leave_applications.count()

        # Applications by status
        applications_by_status = list(
            leave_applications.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        # Applications by leave type
        applications_by_leave_type = list(
            leave_applications.values('leave_type__name')
            .annotate(count=Count('id'))
            .order_by('leave_type__name')
        )

        # Leave balances by type
        leave_balances_by_type = list(
            leave_balances.values('leave_type__name')
            .annotate(
                total_allocated_days=Sum('allocated_days'),
                total_used_days=Sum('used_days'),
                total_available_days=Sum(
                    ExpressionWrapper(
                        F('allocated_days') - F('used_days'),
                        output_field=FloatField()
                    )
                )
            )
            .order_by('leave_type__name')
        )

        # Average leave days taken per employee
        avg_leave_days = leave_applications.filter(status='approved').aggregate(
            avg_days=Avg('total_days')
        )['avg_days'] or 0
        average_leave_days_taken = round(avg_leave_days, 2) if avg_leave_days else 0

        # Pending approvals
        pending_approvals = leave_applications.filter(status='pending').count()

        # Applications over time (last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        applications_over_time = list(
            leave_applications.filter(start_date__gte=six_months_ago)
            .annotate(date=TruncMonth('start_date'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
            .values('date', 'count')
        )
        applications_over_time = [
            {
                'date': item['date'].strftime('%b %Y'),
                'count': item['count']
            }
            for item in applications_over_time
        ]

        data = {
            'total_leave_applications': total_leave_applications,
            'applications_by_status': [
                {'status': item['status'], 'count': item['count']}
                for item in applications_by_status
            ],
            'applications_by_leave_type': [
                {'leave_type': item['leave_type__name'], 'count': item['count']}
                for item in applications_by_leave_type if item['leave_type__name']
            ],
            'leave_balances_by_type': [
                {
                    'leave_type': item['leave_type__name'],
                    'total_allocated_days': float(item['total_allocated_days'] or 0),
                    'total_used_days': float(item['total_used_days'] or 0),
                    'total_available_days': float(item['total_available_days'] or 0)
                }
                for item in leave_balances_by_type if item['leave_type__name']
            ],
            'average_leave_days_taken': average_leave_days_taken,
            'pending_approvals': pending_approvals,
            'applications_over_time': applications_over_time,
        }

        return Response(data)