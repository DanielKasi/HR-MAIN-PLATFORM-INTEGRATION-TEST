from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from institution.models import Institution
from utilities.sortable_api import SortableAPIMixin
from .models import EmailProviderConfig, MeetingIntegration, SystemConfiguration, SystemDay
from .serializers import EmailProviderConfigSerializer, MeetingIntegrationSerializer, SystemConfigurationSerializer, SystemDaySerializer
from utilities.pagination import CustomPageNumberPagination
from slugify import slugify
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, models

class SystemDayListVIew(APIView):
    @extend_schema(
        description="Retrieve a list of system days.",
        responses={200: SystemDaySerializer(many=True)},
        tags=["System Days"],
    )
    def get(self, request):
        queryset = SystemDay.objects.all().order_by("level")
        serializer = SystemDaySerializer(queryset, many=True)
        return Response(serializer.data)


class SystemConfigurationListCreateAPIView(APIView):
    @extend_schema(
        description="Retrieve a paginated list of system configurations.",
        responses={200: SystemConfigurationSerializer(many=True)},
        tags=["System Configurations"],
    )
    def get(self, request):
        queryset = SystemConfiguration.objects.filter(deleted_at__isnull=True).order_by("-id")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = SystemConfigurationSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        description="Create a new system configuration. The code is auto-generated from the name.",
        request=SystemConfigurationSerializer,
        responses={201: SystemConfigurationSerializer, 400: None},
        tags=["System Configurations"],
    )
    def post(self, request):
        serializer = SystemConfigurationSerializer()
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SystemConfigurationRetrieveUpdateDeleteAPIView(APIView):
    def get_object(self, pk):
        try:
            return SystemConfiguration.objects.get(pk=pk)
        except SystemConfiguration.DoesNotExist:
            return None

    @extend_schema(
        description="Retrieve a specific system configuration by ID",
        responses={200: SystemConfigurationSerializer, 404: None},
        tags=["System Configurations"],
    )
    def get(self, request, pk):
        system_config = self.get_object(pk)
        if not system_config:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = SystemConfigurationSerializer(system_config)
        return Response(serializer.data)

    @extend_schema(
        description="Partially update a system configuration. The code is automatically regenerated if name changes.",
        request=SystemConfigurationSerializer,
        responses={200: SystemConfigurationSerializer, 404: None, 400: None},
        tags=["System Configurations"],
    )
    def patch(self, request, pk):
        system_config = self.get_object(pk)
        if not system_config:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = SystemConfigurationSerializer(
            system_config, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete a system configuration",
        responses={204: None, 404: None},
        tags=["System Configurations"],
    )
    def delete(self, request, pk):
        system_config = self.get_object(pk)
        if not system_config:
            return Response(status=status.HTTP_404_NOT_FOUND)
        system_config.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class MeetingIntegrationListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['platform', 'updated_at']
    default_ordering = ['-updated_at']

    @extend_schema(
        request=MeetingIntegrationSerializer,
        responses={
            201: OpenApiResponse(response=MeetingIntegrationSerializer, description="Meeting integration created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def post(self, request):

        serializer = MeetingIntegrationSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            instance = serializer.save()
            
            instance.confirm_create()

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by platform"},
            {"name": "updated_at", "type": "date", "description": "Filter by update date"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'platform,-updated_at')"},
        ],
        responses={
            200: OpenApiResponse(response=MeetingIntegrationSerializer(many=True), description="List of meeting integrations."),
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

        integrations = MeetingIntegration.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        updated_at = request.query_params.get("updated_at", None)

        if search_query:
            integrations = integrations.filter(platform__icontains=search_query)
        if updated_at:
            integrations = integrations.filter(updated_at__date=updated_at)

        try:
            integrations = self.apply_sorting(integrations, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(integrations, request)
        serializer = MeetingIntegrationSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class MeetingIntegrationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=MeetingIntegrationSerializer, description="Meeting integration details."),
            404: OpenApiResponse(description="Meeting integration not found."),
        },
        tags=["Performance Management"],
    )
    def get(self, request, pk):
        integration = get_object_or_404(MeetingIntegration, pk=pk)
        serializer = MeetingIntegrationSerializer(integration)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Meeting integration marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Meeting integration not found."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        integration = get_object_or_404(MeetingIntegration, pk=pk)
        integration.approval_status = 'under_deletion'
        integration.save(update_fields=['approval_status'])
        integration.confirm_delete()
        return Response({"message": "Meeting integration submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=MeetingIntegrationSerializer,
        responses={
            200: OpenApiResponse(response=MeetingIntegrationSerializer, description="Meeting integration updated successfully."),
            404: OpenApiResponse(description="Meeting integration not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Performance Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        integration = get_object_or_404(MeetingIntegration, pk=pk)
        integration.approval_status = 'under_update'
        serializer = MeetingIntegrationSerializer(integration, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            integration.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)    


class EmailProviderConfigListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['provider', 'updated_at']  
    default_ordering = ['-updated_at']

    @extend_schema(
        request=EmailProviderConfigSerializer,
        responses={
            201: OpenApiResponse(response=EmailProviderConfigSerializer, description="Email provider config created successfully."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Email Management"],
    )
    
    @transaction.atomic()
    def post(self, request):
        serializer = EmailProviderConfigSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            try:
                instance = serializer.save()
                instance.confirm_create()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": "Failed to create config", "details": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by provider or domain"},
            {"name": "updated_at", "type": "date", "description": "Filter by update date"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'provider,-updated_at')"},
        ],
        responses={
            200: OpenApiResponse(response=EmailProviderConfigSerializer(many=True), description="List of email provider configs."),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Email Management"],
    )
    def get(self, request):
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        configs = EmailProviderConfig.objects.filter(institution=institution, deleted_at__isnull=True)
        search_query = request.query_params.get("search", None)
        updated_at = request.query_params.get("updated_at", None)

        if search_query:
            configs = configs.filter(
                models.Q(provider__icontains=search_query) | models.Q(domain__icontains=search_query)
            )
        if updated_at:
            configs = configs.filter(updated_at__date=updated_at)

        try:
            configs = self.apply_sorting(configs, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(configs, request)
        serializer = EmailProviderConfigSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class EmailProviderConfigDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(response=EmailProviderConfigSerializer, description="Email provider config details."),
            404: OpenApiResponse(description="Email provider config not found."),
        },
        tags=["Email Management"],
    )
    def get(self, request, pk):
        config = get_object_or_404(EmailProviderConfig, pk=pk)
        serializer = EmailProviderConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Email provider config marked for deletion and sent for approval."),
            404: OpenApiResponse(description="Email provider config not found."),
        },
        tags=["Email Management"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        config = get_object_or_404(EmailProviderConfig, pk=pk)
        config.approval_status = 'under_deletion'  
        config.save(update_fields=['approval_status'])
        config.confirm_delete() 
        return Response({"message": "Email provider config submitted for deletion approval."}, status=status.HTTP_200_OK)

    @extend_schema(
        request=EmailProviderConfigSerializer,
        responses={
            200: OpenApiResponse(response=EmailProviderConfigSerializer, description="Email provider config updated successfully."),
            404: OpenApiResponse(description="Email provider config not found."),
            400: OpenApiResponse(description="Bad request, validation errors."),
        },
        tags=["Email Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        config = get_object_or_404(EmailProviderConfig, pk=pk)
        config.approval_status = 'under_update'  
        serializer = EmailProviderConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            config.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
