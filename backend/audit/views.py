from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
from django.db.models import Q
from audit.models import AuditLog
from institution.models import Institution
from .serializers import AuditLogSerializer
from utilities.sortable_api import SortableAPIMixin
from utilities.pagination import CustomPageNumberPagination
from django.utils.dateparse import parse_date
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.decorators import permission_required
from django.utils.decorators import method_decorator

class InstitutionAuditLogsView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['timestamp', 'action', 'user__email', 'content_type__model']
    default_ordering = ['-timestamp']

    @extend_schema(
        parameters=[
            OpenApiParameter(name="search", type=str, description="Search by action, user email, or description"),
            OpenApiParameter(name="action", type=str, description="Filter by action type (CREATE, UPDATE, DELETE)"),
            OpenApiParameter(name="content_type", type=str, description="Filter by content type (e.g., institution, branch, department)"),
            OpenApiParameter(name="user_id", type=int, description="Filter by user ID"),
            OpenApiParameter(name="date_from", type=str, description="Filter from date (YYYY-MM-DD)"),
            OpenApiParameter(name="date_to", type=str, description="Filter to date (YYYY-MM-DD)"),
            OpenApiParameter(name="ordering", type=str, description="Sort by fields (e.g., 'timestamp,-action,user__email')"),
        ],
        responses={
            200: OpenApiResponse(
                response=AuditLogSerializer(many=True),
                description="List of institution audit logs.",
            ),
            400: OpenApiResponse(description="Invalid ordering field or date format."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Audit Logs"],
    )
    @method_decorator(permission_required('can_view_audit_logs', raise_exception=True))
    def get(self, request, institution_id):
        try:
            user_profile = request.user.profile
            institution = Institution.objects.get(id=institution_id)

            if user_profile.institution != institution and not request.user.is_superuser:
                return Response(
                    {"detail": "You do not have permission to view logs for this institution."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except AttributeError:
            return Response(
                {"detail": "User profile not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get query parameters
        search_query = request.query_params.get("search", None)
        action = request.query_params.get("action", None)
        content_type = request.query_params.get("content_type", None)
        user_id = request.query_params.get("user_id", None)
        date_from = request.query_params.get("date_from", None)
        date_to = request.query_params.get("date_to", None)

        # Get all institution-related content types
        institution_related_models = [
            'institution', 'institutionbanktype', 'institutionbankaccount', 
            'institutionworkingdays', 'institutiontax', 'institutiontaxrule',
            'branch', 'branchworkingdays', 'branchshift', 'department',
            'institutionpenaltyconfig', 'branchpenaltyconfig', 'branchlocationcomparisonconfig'
        ]
        
        content_types = ContentType.objects.filter(model__in=institution_related_models)
        
        # Get audit logs for these content types
        logs = AuditLog.objects.filter(content_type__in=content_types)
        
        query = Q()
        
        for content_type_obj in content_types:
            model_class = content_type_obj.model_class()
            
            if hasattr(model_class, 'institution'):
                object_ids = model_class.objects.filter(institution=institution).values_list('id', flat=True)
                for obj_id in object_ids:
                    query |= Q(content_type=content_type_obj, object_id=obj_id)
            elif hasattr(model_class, 'get_institution'):
                # For models with get_institution method
                for obj in model_class.objects.all():
                    try:
                        if obj.get_institution() == institution:
                            query |= Q(content_type=content_type_obj, object_id=obj.id)
                    except:
                        continue
        
        logs = logs.filter(query)

        # Apply filters
        if search_query:
            logs = logs.filter(
                Q(action__icontains=search_query) |
                Q(user__email__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(content_type__model__icontains=search_query)
            )

        if action:
            logs = logs.filter(action=action.upper())

        if content_type:
            logs = logs.filter(content_type__model=content_type.lower())

        if user_id:
            logs = logs.filter(user__id=user_id)

        if date_from:
            try:
                parsed_date = parse_date(date_from)
                if parsed_date:
                    logs = logs.filter(timestamp__date__gte=parsed_date)
            except ValueError:
                return Response(
                    {"detail": "Invalid date_from format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if date_to:
            try:
                parsed_date = parse_date(date_to)
                if parsed_date:
                    logs = logs.filter(timestamp__date__lte=parsed_date)
            except ValueError:
                return Response(
                    {"detail": "Invalid date_to format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Apply sorting
        try:
            logs = self.apply_sorting(logs, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Paginate and return response
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(logs, request)
        serializer = AuditLogSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)