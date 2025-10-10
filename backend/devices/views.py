from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from utilities.pagination import CustomPageNumberPagination
from utilities.sortable_api import SortableAPIMixin
from .models import Device, DeviceStatus, DeviceEmployeeAttachment
from .serializers import DeviceSerializer, DeviceEmployeeAttachmentSerializer
from institution.models import Institution
from django.shortcuts import get_object_or_404
import requests
from decouple import config


class DeviceListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['serial_number', 'status', 'created_at']
    default_ordering = ['serial_number']

    @extend_schema(
        request=DeviceSerializer,
        responses={
            201: OpenApiResponse(
                response=DeviceSerializer,
                description="Device created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Device Mgt"],
    )
    @transaction.atomic()
    def post(self, request):
        try:
            institution = request.user.profile.institution
        except (AttributeError, Institution.DoesNotExist):
            return Response(
                {"detail": "User is not associated with an institution."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DeviceSerializer(
            data=request.data,
            context={"request": request, "institution": institution}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()

            external_data = {
                "serial_number": instance.serial_number,
            }

            external_api_url = config('DEVICE_REG_API')
            response = requests.post(
                external_api_url,
                json=external_data,
                headers={"API-KEY": config('API_KEY')}
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by serial number or description"},
            {"name": "status", "type": "str", "description": "Filter by status (active/inactive/maintenance/faulty)"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'serial_number,-status,created_at')"},
        ],
        responses={
            200: OpenApiResponse(
                response=DeviceSerializer(many=True),
                description="List of devices.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Device Mgt"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        status_filter = request.query_params.get("status", None)
        created_at = request.query_params.get("created_at", None)
        employee_id = request.query_params.get("employee_id", None)


        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        devices = Device.objects.filter(institution=institution, deleted_at__isnull=True)

        if search_query:
            devices = devices.filter(
                Q(serial_number__icontains=search_query) |
                Q(description__icontains=search_query)
            )

        if status_filter in [choice[0] for choice in DeviceStatus.choices]:
            devices = devices.filter(status=status_filter)

        if created_at:
            devices = devices.filter(created_at=created_at)
   
        if employee_id:
            devices = devices.filter(attached_employees__id=employee_id)

        try:
            devices = self.apply_sorting(devices, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(devices, request)
        serializer = DeviceSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)
    

class DeviceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=DeviceSerializer,
                description="Device details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device not found.",
            ),
        },
        tags=["Device Mgt"],
    )
    def get(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        serializer = DeviceSerializer(device)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device not found.",
            ),
        },
        tags=["Device Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.approval_status = 'under_deletion'
        device.save(update_fields=['approval_status'])
        device.confirm_delete()
        return Response(
            {"message": "Device submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=DeviceSerializer,
                description="Device updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device not found.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Device Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.approval_status = 'under_update'
        serializer = DeviceSerializer(device, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            device.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)    
    
class DeviceEmployeeAttachmentListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['enroll_id', 'created_at']
    default_ordering = ['enroll_id']

    @extend_schema(
        request=DeviceEmployeeAttachmentSerializer,
        responses={
            201: OpenApiResponse(
                response=DeviceEmployeeAttachmentSerializer,
                description="Device-employee attachment created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Device Mgt"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = DeviceEmployeeAttachmentSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by enroll_id"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'enroll_id,created_at')"},
        ],
        responses={
            200: OpenApiResponse(
                response=DeviceEmployeeAttachmentSerializer(many=True),
                description="List of device-employee attachments.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Device Mgt"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        attachments = DeviceEmployeeAttachment.objects.filter(
            device__institution=institution, deleted_at__isnull=True
        )

        if search_query:
            attachments = attachments.filter(enroll_id__icontains=search_query)

        if created_at:
            attachments = attachments.filter(created_at=created_at)



        try:
            attachments = self.apply_sorting(attachments, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(attachments, request)
        serializer = DeviceEmployeeAttachmentSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class DeviceEmployeeAttachmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=DeviceEmployeeAttachmentSerializer,
                description="Device-employee attachment details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device-employee attachment not found.",
            ),
        },
        tags=["Device Mgt"],
    )
    def get(self, request, pk):
        attachment = get_object_or_404(DeviceEmployeeAttachment, pk=pk)
        serializer = DeviceEmployeeAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device-employee attachment marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device-employee attachment not found.",
            ),
        },
        tags=["Device Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        attachment = get_object_or_404(DeviceEmployeeAttachment, pk=pk)
        attachment.delete()
        return Response(
            {"message": "Device-employee attachment submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=DeviceEmployeeAttachmentSerializer,
                description="Device-employee attachment updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Device-employee attachment not found.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Device Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        attachment = get_object_or_404(DeviceEmployeeAttachment, pk=pk)
        serializer = DeviceEmployeeAttachmentSerializer(attachment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)    