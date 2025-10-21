from datetime import datetime, timedelta
from django.utils import timezone
import json
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import (
    extend_schema,
    OpenApiResponse,
    OpenApiTypes,
    inline_serializer,
)
from employee.models import Employee, EmployeeAttendance, EmployeeLogs
from spotcheck.tasks import initiate_spotcheck_responses_from_attendance_records
from spotcheck.utilities import create_spotchecks_for_today
from utilities.pagination import CustomPageNumberPagination
from utilities.sortable_api import SortableAPIMixin
from .models import Device, DeviceStatus, DeviceEmployeeAttachment
from .serializers import DeviceSerializer, DeviceEmployeeAttachmentSerializer
from institution.models import Institution
from django.shortcuts import get_object_or_404
import requests
from decouple import config
from rest_framework import serializers


class DeviceListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ["serial_number", "status", "created_at"]
    default_ordering = ["serial_number"]

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
        print("\n=== Incoming Device Creation Request ===")
        print(f"User: {request.user}")
        print(f"Request Data: {request.data}")

        try:
            institution = request.user.profile.institution
            print(f"Institution: {institution}")
        except (AttributeError, Institution.DoesNotExist):
            print("User is not associated with an institution.")
            return Response(
                {"detail": "User is not associated with an institution."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DeviceSerializer(
            data=request.data, context={"request": request, "institution": institution}
        )

        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()

            external_data = {
                "serialnumber": instance.serial_number,
            }

            external_api_url = config("DEVICE_REG_API", default="")
            api_key = config("API_KEY", default="")

            masked_key = api_key[:4] + "****" if api_key else "NOT SET"

            print("\n=== Sending to External API ===")
            print(f"External API URL: {external_api_url}")
            print(f"API Key (masked): {masked_key}")
            print(f"Payload: {external_data}")

            try:
                response = requests.post(
                    external_api_url,
                    json=external_data,
                    headers={"X-API-KEY": api_key},
                    timeout=10,
                )
                print(f"External API Response Status: {response.status_code}")
                print(f"External API Response Text: {response.text}")
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                print(f"External API registration failed: {str(e)}")
                return Response(
                    {"detail": f"External API registration failed: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            print(f"✅ Device created successfully: {instance.serial_number}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        print("❌ Validation Errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {
                "name": "search",
                "type": "str",
                "description": "Search by serial number or description",
            },
            {
                "name": "status",
                "type": "str",
                "description": "Filter by status (active/inactive/maintenance/faulty)",
            },
            {
                "name": "created_at",
                "type": "date",
                "description": "Filter by creation date",
            },
            {
                "name": "ordering",
                "type": "str",
                "description": "Sort by fields (e.g., 'serial_number,-status,created_at')",
            },
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

        devices = Device.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if search_query:
            devices = devices.filter(
                Q(serial_number__icontains=search_query)
                | Q(description__icontains=search_query)
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
        device.approval_status = "under_deletion"
        device.save(update_fields=["approval_status"])
        device.confirm_delete()
        return Response(
            {"message": "Device submitted for deletion approval."},
            status=status.HTTP_200_OK,
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
        device.approval_status = "under_update"
        serializer = DeviceSerializer(device, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            device.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeviceEmployeeAttachmentListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ["created_at"]
    default_ordering = ["created_at"]

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
        print("\n=== Incoming Employee Attachment Request ===")
        print(f"Request Data: {request.data}")

        serializer = DeviceEmployeeAttachmentSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            employee = instance.employee

            print(f"Employee: {employee}")
            print(f"Device Serial: {instance.device.serial_number}")
            print(f"Institution: {instance.device.institution}")

            # Check if employee already synced
            is_employee_synced = DeviceEmployeeAttachment.objects.filter(
                employee=employee,
                device__institution=instance.device.institution,
                is_synced=True,
            ).exists()

            print(f"Is Employee Already Synced? {is_employee_synced}")

            payload = {"cmd": "addUser"}
            if not is_employee_synced:
                payload["name"] = employee.name or employee.user.fullname
                payload["external_user_id"] = employee.employee_id

                external_api_url = config("DEVICE_USER_REG_API")
                url = external_api_url % instance.device.serial_number
                api_key = config("API_KEY")

                masked_key = api_key[:4] + "****" if api_key else "NOT SET"

                print("\n=== Sending to External API ===")
                print(f"External API URL: {url}")
                print(f"API Key (masked): {masked_key}")
                print(f"Payload: {payload}")

                try:
                    response = requests.post(
                        url, json=payload, headers={"X-API-KEY": api_key}, timeout=5
                    )

                    print(f"External API Response Status: {response.status_code}")
                    print(f"External API Response Text: {response.text}")

                    if response.status_code != 200:
                        print("❌ Failed to register employee. Rolling back instance.")
                        instance.delete()
                        return Response(
                            {
                                "detail": f"Failed to register employee with external system: {response.text}"
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    instance.is_synced = True
                    instance.save()

                except requests.RequestException as e:
                    print(f"❌ Error communicating with device system: {str(e)}")
                    print("Rolling back instance.")
                    instance.delete()
                    return Response(
                        {"detail": f"Error communicating with device system: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            print(
                f"✅ Employee attached successfully to device {instance.device.serial_number}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        print("❌ Validation Errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {
                "name": "created_at",
                "type": "date",
                "description": "Filter by creation date",
            },
            {
                "name": "ordering",
                "type": "str",
                "description": "Sort by fields (e.g., 'created_at')",
            },
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
            status=status.HTTP_200_OK,
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
        serializer = DeviceEmployeeAttachmentSerializer(
            attachment, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeviceCallbackView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=inline_serializer(
            name="DeviceCallbackRequest",
            fields={
                "event": serializers.CharField(),
                "records": serializers.ListField(
                    child=inline_serializer(
                        name="Record",
                        fields={
                            "serial_number": serializers.CharField(),
                            "internal_user_id": serializers.CharField(required=False),
                            "external_user_id": serializers.CharField(),
                            "record_reference": serializers.CharField(),
                            "datetime": serializers.DateTimeField(),
                        },
                    ),
                    required=False,
                ),
                "device_sn": serializers.CharField(required=False),
                "external_user_id": serializers.CharField(required=False),
                "status": serializers.CharField(required=False),
            },
        ),
        responses={
            200: OpenApiResponse(
                description="Callback received and processed successfully."
            ),
            400: OpenApiResponse(description="Invalid payload or unknown event type."),
            404: OpenApiResponse(
                description="Device or employee not found in HR system."
            ),
            500: OpenApiResponse(description="Internal error processing callback."),
        },
        tags=["Device Mgt"],
        description="Endpoint to handle device callback events (e.g., registration, logs, employee enrollment, fingerprint capture).",
    )
    def post(self, request):
        try:
            payload = request.data
            event = payload.get("event")
            # device_sn = payload.get("device_sn")
            external_user_id = payload.get("external_user_id")
            # status_str = payload.get("status")
        except json.JSONDecodeError:
            return Response(
                {"detail": "Invalid JSON payload."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not event:
            return Response(
                {"detail": "Missing event in payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if event == "log":
                # print(f"payload: {payload}")
                if not payload.get("records"):
                    return Response(
                        {"detail": "Missing records for log event."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                records_by_employee_date = {}
                logs_to_create = []

                for record in payload["records"]:
                    # Validate required fields
                    serial_number = record.get("serial_number")
                    external_user_id = record.get("external_user_id")
                    record_reference = record.get("record_reference")
                    datetime_str = record.get("datetime")

                    if not all(
                        [
                            serial_number,
                            external_user_id,
                            record_reference,
                            datetime_str,
                        ]
                    ):
                        continue
                        return Response(
                            {
                                "detail": "Missing required fields in record: serial_number, external_user_id, record_reference, datetime."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Retrieve device
                    try:
                        device = Device.objects.get(serial_number=serial_number)
                    except Device.DoesNotExist:
                        continue

                        return Response(
                            {
                                "detail": f"Device with serial number {serial_number} not found."
                            },
                            status=status.HTTP_404_NOT_FOUND,
                        )

                    # Retrieve employee
                    try:
                        employee = Employee.objects.get(employee_id=external_user_id)
                    except Employee.DoesNotExist:
                        print(
                            f"Employee with ID {external_user_id} not found. Skipping record."
                        )
                        continue

                    # Parse datetime
                    try:
                        record_datetime = datetime.fromisoformat(datetime_str)
                        print(f"Parsed datetime: {record_datetime} from {datetime_str}")
                        record_date = record_datetime.date()
                        record_time = record_datetime.time()
                    except ValueError:
                        return Response(
                            {"detail": f"Invalid datetime format: {datetime_str}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Validate datetime is not in the future
                    if record_datetime > timezone.now():
                        return Response(
                            {"detail": f"Future datetime not allowed: {datetime_str}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Store log for creation
                    logs_to_create.append(
                        EmployeeLogs(
                            employee=employee,
                            device=device,
                            record_reference=record_reference,
                            date=record_date,
                            time=record_time,
                        )
                    )

                    # Group records by employee and date
                    key = (employee.id, record_date)
                    if key not in records_by_employee_date:
                        records_by_employee_date[key] = []
                    records_by_employee_date[key].append(record_time)

                with transaction.atomic():
                    # Bulk create EmployeeLogs
                    created_logs = EmployeeLogs.objects.bulk_create(logs_to_create)

                    # Process attendance for each employee-date pair
                    for (employee_id, record_date), times in sorted(
                        records_by_employee_date.items(), key=lambda x: x[0][1]
                    ):
                        employee = Employee.objects.get(id=employee_id)
                        # Find earliest time for check-in
                        check_in_time = min(times)

                        # Create or update attendance record for current date (check-in)
                        attendance, created = EmployeeAttendance.objects.get_or_create(
                            employee=employee,
                            date=record_date,
                            defaults={
                                "check_in_time": check_in_time,
                                "status": "approved",
                            },
                        )
                        if created:
                            # Create spotchecks for today if attendance is created for today
                            if record_date == timezone.localdate():
                                create_spotchecks_for_today(employee)

                        if not created and (
                            not attendance.check_in_time
                            or check_in_time < attendance.check_in_time
                        ):
                            # Update check-in time if new time is earlier
                            attendance.check_in_time = check_in_time
                            attendance.save()

                        # Update check-out for previous day
                        previous_date = record_date - timedelta(days=1)
                        last_log = (
                            EmployeeLogs.objects.filter(
                                employee=employee, date=previous_date
                            )
                            .order_by("-time")
                            .first()
                        )

                        if last_log:
                            # Only update if previous day has a check-in
                            if EmployeeLogs.objects.filter(
                                employee=employee, date=previous_date
                            ).exists():
                                prev_attendance, prev_created = (
                                    EmployeeAttendance.objects.get_or_create(
                                        employee=employee,
                                        date=previous_date,
                                        defaults={
                                            "check_out_time": last_log.time,
                                            "status": "approved",
                                        },
                                    )
                                )
                                if not prev_created and (
                                    not prev_attendance.check_out_time
                                    or last_log.time > prev_attendance.check_out_time
                                ):
                                    # Update check-out time if new time is later
                                    prev_attendance.check_out_time = last_log.time
                                    prev_attendance.save()
                            else:
                                print(
                                    f"No check-in logs for {employee} on {previous_date}. Skipping check-out update."
                                )
                        else:
                            print(
                                f"No logs found for {employee} on {previous_date}. Skipping check-out update."
                            )
                log_ids = [log.id for log in created_logs]
                initiate_spotcheck_responses_from_attendance_records.apply_async(
                    args=[log_ids], countdown=5
                )
            elif event == "reg" or event == "connect":
                pass
            else:
                return Response(
                    {"detail": f"Unknown event: {event}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {"message": "Callback received successfully."},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            #     print(f"❌ Internal error processing callback: {str(e)}")
            #     return Response({"detail": f"Internal error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            raise


class CopyUserToDevice(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="CopyUserToDeviceRequest",
            fields={
                "device_id": serializers.IntegerField(),
                "employee_id": serializers.CharField(),
            },
        ),
        responses={
            201: OpenApiResponse(
                response=DeviceEmployeeAttachmentSerializer,
                description="Employee successfully copied to device and registered with external system.",
            ),
            400: OpenApiResponse(
                description="Invalid request, employee not synced, or failed to register with external system."
            ),
            404: OpenApiResponse(
                description="Device or employee not found, or employee not synced with any device."
            ),
        },
        tags=["Device Mgt"],
        description="Copy an existing synced employee to another device in the external device system.",
    )
    @transaction.atomic()
    def post(self, request):
        print("\n=== Incoming CopyUserToDevice Request ===")
        print(f"Request Data: {request.data}")
        print(f"User: {request.user}")

        device_id = request.data.get("device_id")
        employee_id = request.data.get("employee_id")

        # Validate inputs
        if not device_id or not employee_id:
            print("❌ Missing required fields: device_id or employee_id")
            return Response(
                {"detail": "device_id and employee_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        print(f"Looking up Device ID: {device_id} and Employee ID: {employee_id}")

        # Check device and employee existence
        try:
            device = Device.objects.get(
                id=device_id, institution=request.user.profile.institution
            )
            employee = Employee.objects.get(
                employee_id=employee_id,
                department__institution=request.user.profile.institution,
            )
            print(f"✅ Device found: {device.serial_number}")
            print(f"✅ Employee found: {employee.name}")

        except Device.DoesNotExist:
            print("❌ Device not found or not part of user's institution.")
            return Response(
                {"detail": "Device not found or not in your institution."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Employee.DoesNotExist:
            print("❌ Employee not found in user's institution.")
            return Response(
                {"detail": "Employee not found in your institution."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Call external device system
        external_api_url = config("DEVICE_USER_REG_API", default="")
        url = external_api_url % device.serial_number
        api_key = config("API_KEY", default="")

        payload = {"cmd": "copyUserToDevice", "external_user_id": employee.employee_id}

        masked_key = api_key[:4] + "****" if api_key else "NOT SET"

        print("\n=== Sending to External API ===")
        print(f"External API URL: {url}")
        print(f"API Key (masked): {masked_key}")
        print(f"Payload: {payload}")

        try:
            response = requests.post(
                url, json=payload, headers={"X-API-KEY": api_key}, timeout=5
            )

            print(f"External API Response Status: {response.status_code}")
            print(f"External API Response Text: {response.text}")

            if response.status_code != 200:
                print("❌ Failed to copy employee to device.")
                return Response(
                    {"detail": f"Failed to copy employee to device: {response.text}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except requests.RequestException as e:
            print(f"❌ Error communicating with external device system: {str(e)}")
            return Response(
                {"detail": f"Error communicating with device system: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        print(
            f"✅ Successfully copied Employee '{employee.name}' to Device '{device.serial_number}'"
        )
        return Response(
            {
                "detail": f"Employee {employee.name} successfully copied to device {device.serial_number}."
            },
            status=status.HTTP_201_CREATED,
        )


class CaptureFingerPrint(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="CaptureFingerPrintRequest",
            fields={
                "device_id": serializers.IntegerField(),
                "employee_id": serializers.CharField(),
            },
        ),
        responses={
            200: OpenApiResponse(
                description="Fingerprint capture initiated successfully."
            ),
            400: OpenApiResponse(
                description="Invalid request, employee not synced with device, or failed to communicate with external system."
            ),
            404: OpenApiResponse(
                description="Device, employee, or device-employee attachment not found."
            ),
        },
        tags=["Device Mgt"],
        description="Initiate fingerprint capture for an existing synced employee on a specific device.",
    )
    def post(self, request):
        print("\n=== CaptureFingerPrint API CALLED ===")
        print("Incoming request data:", request.data)
        print("Authenticated user:", request.user)

        device_id = request.data.get("device_id")
        employee_id = request.data.get("employee_id")
        print(f"Extracted device_id={device_id}, employee_id={employee_id}")

        # Validate inputs
        if not device_id or not employee_id:
            print("❌ Missing device_id or employee_id")
            return Response(
                {"detail": "device_id and employee_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check device and employee existence
        try:
            print("Checking if device exists for this user’s institution...")
            device = Device.objects.get(
                id=device_id, institution=request.user.profile.institution
            )
            print("✅ Device found:", device)

            print("Checking if employee exists in institution...")
            employee = Employee.objects.get(
                employee_id=employee_id,
                department__institution=request.user.profile.institution,
            )
            print("✅ Employee found:", employee)

        except Device.DoesNotExist:
            print("❌ Device not found or not in user's institution.")
            return Response(
                {"detail": "Device not found or not in your institution."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Employee.DoesNotExist:
            print("❌ Employee not found in user's institution.")
            return Response(
                {"detail": "Employee not found in your institution."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Call external device system
        external_api_url = config("DEVICE_USER_REG_API")
        url = external_api_url % device.serial_number
        api_key = config("API_KEY", default="")
        payload = {
            "cmd": "captureFingerPrint",
            "external_user_id": employee.employee_id,
        }

        print("Preparing to call external API...")
        print(f"External API URL: {url}")
        print(f"Payload: {payload}")
        print(f"API Key: {'[HIDDEN]' if api_key else 'None'}")

        try:
            response = requests.post(
                url, json=payload, headers={"X-API-KEY": api_key}, timeout=5
            )
            print("External API Response Code:", response.status_code)
            print("External API Response Text:", response.text)

            if response.status_code != 200:
                print("❌ Failed to initiate fingerprint capture.")
                return Response(
                    {
                        "detail": f"Failed to initiate fingerprint capture: {response.text}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except requests.RequestException as e:
            print("❌ RequestException occurred:", str(e))
            return Response(
                {"detail": f"Error communicating with device system: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        print("✅ Fingerprint capture initiated successfully.")
        return Response(
            {"detail": "Fingerprint capture initiated successfully."},
            status=status.HTTP_200_OK,
        )


class CaptureFace(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="CaptureFaceRequest",
            fields={
                "device_id": serializers.IntegerField(),
                "employee_id": serializers.CharField(),
            },
        ),
        responses={
            200: OpenApiResponse(description="Face capture initiated successfully."),
            400: OpenApiResponse(
                description="Invalid request, employee not synced with device, or failed to communicate with external system."
            ),
            404: OpenApiResponse(
                description="Device, employee, or device-employee attachment not found."
            ),
        },
        tags=["Device Mgt"],
        description="Initiate face capture for an existing synced employee on a specific device.",
    )
    def post(self, request):
        print("\n=== CaptureFace API CALLED ===")
        print("Incoming request data:", request.data)
        print("Authenticated user:", request.user)

        device_id = request.data.get("device_id")
        employee_id = request.data.get("employee_id")
        print(f"Extracted device_id={device_id}, employee_id={employee_id}")

        # Validate inputs
        if not device_id or not employee_id:
            print("❌ Missing device_id or employee_id")
            return Response(
                {"detail": "device_id and employee_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check device and employee existence
        try:
            print("Checking if device exists for this user’s institution...")
            device = Device.objects.get(
                id=device_id, institution=request.user.profile.institution
            )
            print("✅ Device found:", device)

            print("Checking if employee exists in institution...")
            employee = Employee.objects.get(
                employee_id=employee_id,
                department__institution=request.user.profile.institution,
            )
            print("✅ Employee found:", employee)

        except Device.DoesNotExist:
            print("❌ Device not found or not in user's institution.")
            return Response(
                {"detail": "Device not found or not in your institution."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Employee.DoesNotExist:
            print("❌ Employee not found in user's institution.")
            return Response(
                {"detail": "Employee not found in your institution."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Call external device system
        external_api_url = config("DEVICE_USER_REG_API")
        url = external_api_url % device.serial_number
        api_key = config("API_KEY", default="")
        payload = {"cmd": "captureFace", "external_user_id": employee.employee_id}

        print("Preparing to call external API...")
        print(f"External API URL: {url}")
        print(f"Payload: {payload}")
        print(f"API Key: {'[HIDDEN]' if api_key else 'None'}")

        try:
            response = requests.post(
                url, json=payload, headers={"X-API-KEY": api_key}, timeout=5
            )
            print("External API Response Code:", response.status_code)
            print("External API Response Text:", response.text)

            if response.status_code != 200:
                print("❌ Failed to initiate face capture.")
                return Response(
                    {"detail": f"Failed to initiate face capture: {response.text}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except requests.RequestException as e:
            print("❌ RequestException occurred:", str(e))
            return Response(
                {"detail": f"Error communicating with device system: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        print("✅ Face capture initiated successfully.")
        return Response(
            {"detail": "Face capture initiated successfully."},
            status=status.HTTP_200_OK,
        )
