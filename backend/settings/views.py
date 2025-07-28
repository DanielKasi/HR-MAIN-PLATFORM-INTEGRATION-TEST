from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from .models import SystemConfiguration
from .serializers import SystemConfigurationSerializer
from utilities.pagination import CustomPageNumberPagination
from slugify import slugify

class SystemConfigurationListCreateAPIView(APIView):
    @extend_schema(
        description="Retrieve a paginated list of system configurations for a given institution.",
        responses={200: SystemConfigurationSerializer(many=True)},
        tags=['System Configurations']
    )
    def get(self, request, institution_id):
        queryset = SystemConfiguration.objects.filter(institution_id=institution_id).order_by('-id')
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = SystemConfigurationSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        description="Create a new system configuration for the given institution. The code is auto-generated from the name.",
        request=SystemConfigurationSerializer,
        responses={201: SystemConfigurationSerializer, 400: None},
        tags=['System Configurations']
    )
    def post(self, request, institution_id):
        
        data = request.data.copy()
        data['institution'] = institution_id
        
        serializer = SystemConfigurationSerializer(data=data)
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
        tags=['System Configurations']
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
        tags=['System Configurations']
    )
    def patch(self, request, pk):
        system_config = self.get_object(pk)
        if not system_config:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = SystemConfigurationSerializer(system_config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete a system configuration",
        responses={204: None, 404: None},
        tags=['System Configurations']
    )
    def delete(self, request, pk):
        system_config = self.get_object(pk)
        if not system_config:
            return Response(status=status.HTTP_404_NOT_FOUND)
        system_config.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)