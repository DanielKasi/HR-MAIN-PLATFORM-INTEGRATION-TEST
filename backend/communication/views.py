from django.http import StreamingHttpResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import json
import asyncio
import redis
import time
import logging
from asgiref.sync import sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from typing import Optional
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db import transaction
from django.db.models import Q

from employee.models import Employee
from institution.models import Institution
from utilities.sortable_api import SortableAPIMixin
from .models import EmployeeAnnouncementAcknowledgment, Announcement, Notification
from .serializers import EmployeeAnnouncementAcknowledgmentSerializer, AnnouncementSerializer, NotificationSerializer
from utilities.pagination import CustomPageNumberPagination
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()

# Set up logging
logger = logging.getLogger(__name__)

# Initialize Redis client
try:
    redis_client: redis.Redis = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True
    )
    redis_client.ping()
except redis.ConnectionError as e:
    raise

# def add_notification(user_id: int, message: str, model_name: str = None, object_id: str = None, requires_acknowledgment: bool = False) -> None:
#     """Add a notification to the user's Redis queue with optional model, object ID, and acknowledgment requirement."""
#     notification = {
#         'id': str(int(time.time() * 1000)),
#         'message': message,
#         'model_name': model_name,
#         'object_id': object_id,
#         'requires_acknowledgment': requires_acknowledgment
#     }
#     try:
#         redis_client.rpush(f"notifications:{user_id}", json.dumps(notification))
#         queue_length = redis_client.llen(f"notifications:{user_id}")
#     except redis.RedisError as e:
#         raise

def add_notification(user_id, message, model_name=None, object_id=None, requires_acknowledgment=False):

    notification = Notification.objects.create(
        user_id=user_id,
        message=message,
        model_name=model_name,
        object_id=object_id,
        requires_acknowledgment=requires_acknowledgment
    )
    return notification     

def get_notification(user_id: int) -> Optional[dict]:
    """Retrieve the oldest unread notification for the user."""
    lock_key = f"lock:notifications:{user_id}"
    with redis_client.lock(lock_key, timeout=5):
        try:
            notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
            read_notifications_key = f"read_notifications:{user_id}"
            read_notifications = redis_client.smembers(read_notifications_key)
            for notification in notifications:
                try:
                    notification_data = json.loads(notification)
                    notification_id = str(notification_data['id'])
                    if not redis_client.sismember(read_notifications_key, notification_id):
                        return notification_data
                except (json.JSONDecodeError, KeyError) as e:
                    continue
            return None
        except redis.RedisError as e:
            return None

def get_unread_count(user_id: int) -> int:
    """Get the count of unread notifications for the user."""
    lock_key = f"lock:notifications:{user_id}"
    with redis_client.lock(lock_key, timeout=5):
        try:
            notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
            read_notifications_key = f"read_notifications:{user_id}"
            read_notifications = redis_client.smembers(read_notifications_key)
            unread_count = 0
            for notification in notifications:
                try:
                    notification_data = json.loads(notification)
                    notification_id = str(notification_data['id'])
                    if not redis_client.sismember(read_notifications_key, notification_id):
                        unread_count += 1
                except (json.JSONDecodeError, KeyError) as e:
                    continue
            return unread_count
        except redis.RedisError as e:
            return 0

def mark_notification_read(user_id: int, notification_id: str) -> None:
    """Mark a notification as read for the user."""
    try:
        read_notifications_key = f"read_notifications:{user_id}"
        redis_client.sadd(read_notifications_key, str(notification_id))
    except redis.RedisError as e:
        pass

def cleanup_queue(user_id: int) -> None:
    """Delete the user's notification queue and read notifications in Redis."""
    try:
        redis_client.delete(f"notifications:{user_id}")
        redis_client.delete(f"read_notifications:{user_id}")
    except redis.RedisError as e:
        pass

@csrf_exempt
@extend_schema(
    summary="SSE for Real-Time Notifications",
    description="Internal endpoint to handle Server-Sent Events (SSE) connections for streaming real-time notifications to the authenticated user. Includes unread notification count and optional model and object ID.",
    responses={
        200: OpenApiResponse(description="SSE stream of notifications in the format: `data: {\"id\": string, \"message\": string, \"model_name\": string|null, \"object_id\": string|null, \"unread_count\": int}\\n\\n` for notifications or `data: {\"unread_count\": int}\\n\\n` for heartbeats"),
        401: OpenApiResponse(description="Unauthorized - Invalid or missing JWT token"),
        500: OpenApiResponse(description="Server error - Internal server issue")
    },
    auth=["BearerAuth"]
)
async def sse_notifications(request):
    """Handle SSE connections for real-time notifications."""
    user_id: Optional[int] = None
    try:
        authenticator = JWTAuthentication()
        start_time = time.time()
        user_auth_tuple = await sync_to_async(authenticator.authenticate)(request)
        auth_time = time.time() - start_time

        if user_auth_tuple is None:
            print("Unauthorized access attempt to SSE endpoint")
            return HttpResponse("Unauthorized", status=401)

        user, _ = user_auth_tuple
        user_id = await sync_to_async(lambda: user.id)()

        async def event_stream():
            print(f"Starting SSE stream for user {user_id}")
            yield "data: {\"message\": \"SSE connection established\", \"unread_count\": 0}\n\n"
            last_heartbeat = time.time()

            while True:
                try:
                    # Fetch all notifications
                    notifications = await sync_to_async(lambda: redis_client.lrange(f"notifications:{user_id}", 0, -1))()
                    read_notifications_key = f"read_notifications:{user_id}"
                    read_notifications = await sync_to_async(lambda: redis_client.smembers(read_notifications_key))()
                    
                    # Log the read notifications for debugging
                    print(f"User {user_id} read notifications: {read_notifications}")

                    unread_notifications = []
                    for notification in notifications:
                        try:
                            notification_data = json.loads(notification)
                            notification_id = str(notification_data['id'])
                            # Ensure read_notifications contains strings
                            if str(notification_id) not in [str(rid) for rid in read_notifications]:
                                unread_notifications.append(notification_data)
                            else:
                                print(f"Skipping read notification {notification_id} for user {user_id}")
                        except (json.JSONDecodeError, KeyError) as e:
                            print(f"Error processing notification for user {user_id}: {str(e)}")
                            continue

                    unread_count = len(unread_notifications)
                    print(f"User {user_id} has {unread_count} unread notifications")

                    # Send all unread notifications
                    for notif in unread_notifications:
                        notif['unread_count'] = unread_count
                        yield f"data: {json.dumps(notif)}\n\n"
                        print(f"Sent notification {notif['id']} to user {user_id}")

                    # Send heartbeat if no notifications or periodically
                    current_time = time.time()
                    if current_time - last_heartbeat > 10:
                        yield f'data: {{"unread_count": {unread_count}}}\n\n'
                        last_heartbeat = current_time

                except Exception as e:
                    print(f"Error in SSE stream for user {user_id}: {str(e)}")
                    yield f"data: {{\"error\": \"Stream error: {str(e)}\"}}\n\n"

                await asyncio.sleep(0.5)

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'

        # Below block is expected to fix issues on server deployment
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        return response

    except Exception as e:
        print(f"SSE setup error for user {user_id}: {str(e)}")
        if user_id is not None:
            await sync_to_async(lambda: cleanup_queue(user_id))()
        return HttpResponse(f"Error: {str(e)}", status=500)

# class MarkNotificationRead(APIView):
#     """Endpoint to mark a notification as read."""
#     authentication_classes = [JWTAuthentication]

#     @extend_schema(
#         summary="Mark a Notification as Read",
#         description="Marks a specific notification as read for the authenticated user by adding its ID to the read notifications set.",
#         request={
#             "application/json": {
#                 "type": "object",
#                 "properties": {
#                     "notification_id": {"type": "string", "description": "The ID of the notification to mark as read"}
#                 },
#                 "required": ["notification_id"]
#             }
#         },
#         responses={
#             200: OpenApiResponse(description="Notification marked as read", examples={
#                 "application/json": {"message": "Notification 123456789 marked as read"}
#             }),
#             400: OpenApiResponse(description="Bad request - Missing or invalid notification_id"),
#             401: OpenApiResponse(description="Unauthorized - Invalid or missing JWT token"),
#             500: OpenApiResponse(description="Server error - Internal server issue")
#         },
#         auth=["BearerAuth"]
#     )
#     def post(self, request):
#         try:
#             user = request.user
#             if not user.is_authenticated:
#                 return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

#             user_id = user.id
#             notification_id = request.data.get('notification_id')
#             if not notification_id:
#                 return Response({"error": "notification_id is required"}, status=status.HTTP_400_BAD_REQUEST)

#             read_notifications_key = f"read_notifications:{user_id}"
#             try:
#                 redis_client.sadd(read_notifications_key, str(notification_id))
#                 return Response({"message": f"Notification {notification_id} marked as read"}, status=status.HTTP_200_OK)
#             except redis.RedisError as e:
#                 return Response({"error": "Failed to mark notification as read"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GetAllNotifications(APIView):
    """Endpoint to fetch all notifications (read and unread) for the user with pagination."""
    authentication_classes = [JWTAuthentication]
    pagination_class = CustomPageNumberPagination

    @extend_schema(
        summary="Get All Notifications",
        description="Retrieves all notifications (both read and unread) for the authenticated user with pagination support. Use 'page' and 'page_size' query parameters to control pagination. Notifications include optional model_name and object_id fields.",
        responses={
            200: OpenApiResponse(description="Paginated list of notifications", examples={
                "application/json": {
                    "count": 100,
                    "next": "http://api.example.com/notifications?page=2",
                    "previous": None,
                    "results": [
                        {
                            "id": "123456789",
                            "message": "Test notification",
                            "model_name": "approvergroup",
                            "object_id": "1",
                            "is_read": True
                        },
                        {
                            "id": "123456790",
                            "message": "Another notification",
                            "model_name": "assets",
                            "object_id": 1,
                            "is_read": False
                        }
                    ]
                }
            }),
            401: OpenApiResponse(description="Unauthorized - Invalid or missing JWT token"),
            500: OpenApiResponse(description="Server error - Internal server issue")
        },
        auth=["BearerAuth"]
    )
    def get(self, request):
        try:
            user = request.user
            if not user.is_authenticated:
                return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

            user_id = user.id
            try:
                notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
                read_notifications_key = f"read_notifications:{user_id}"
                notifications_list = []

                for notification in notifications:
                    try:
                        notification_data = json.loads(notification)
                        notification_id = str(notification_data['id'])
                        is_read = redis_client.sismember(read_notifications_key, notification_id)
                        notification_data['is_read'] = is_read
                        notifications_list.append(notification_data)
                    except (json.JSONDecodeError, KeyError) as e:
                        continue

                paginator = self.pagination_class()
                paginated_notifications = paginator.paginate_queryset(notifications_list, request)
                return paginator.get_paginated_response({"notifications": paginated_notifications})

            except redis.RedisError as e:
                return Response({"error": "Failed to fetch notifications"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class NotificationListView(APIView):        
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=NotificationSerializer,
        responses={
            200: OpenApiResponse(
                response=NotificationSerializer(many=True),
                description="List of notifications.",
            ),
        },
        tags=["Notifications"]
    )
    def get(self, request):
        notifications = Notification.objects.filter(user_id=request.user, is_read=False).order_by('-created_at')
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(notifications, request)
        serializer = NotificationSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                response=NotificationSerializer,
                description="Notification marked as read successfully.",
            ),
            400: OpenApiResponse(
                description="Invalid notification ID or no notifications found.",
            ),
            403: OpenApiResponse(
                description="You do not have permission to modify this notification.",
            ),
        },
        tags=["Notifications"],
        parameters=[
            {
                "name": "id",
                "in": "query",
                "description": "ID of the notification to mark as read. If not provided, all unread notifications for the user are marked as read.",
                "required": False,
                "schema": {"type": "string"},
            }
        ]
    )
    def post(self, request):
        notification_id = request.query_params.get('notification_id')  # Match API call parameter

        if not notification_id:
            return Response(
                {"error": "Notification ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Fetch the specific notification for the authenticated user
            notification = Notification.objects.get(id=notification_id, user_id=request.user)
            notification.is_read = True
            notification.save()
            serializer = NotificationSerializer(notification)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ObjectDoesNotExist:
            return Response(
                {"error": "Notification not found or you do not have permission to modify it."},
                status=status.HTTP_400_BAD_REQUEST
            )       


class AnnouncementListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['title', 'created_at', 'requires_acknowledgment', 'approval_status']
    default_ordering = ['-created_at']

    @extend_schema(
        request=AnnouncementSerializer,
        responses={
            201: OpenApiResponse(
                response=AnnouncementSerializer,
                description="Announcement created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Announcements"],
    )
    @transaction.atomic
    def post(self, request):
        serializer = AnnouncementSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by title or content"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "type", "type": "str", "description": "Filter by announcement type (e.g., 'announcementtype')"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'title,-created_at')"},
        ],
        responses={
            200: OpenApiResponse(
                response=AnnouncementSerializer(many=True),
                description="List of announcements.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Announcements"],
    )
    def get(self, request):
        user = request.user
        try:
            employee = Employee.objects.get(user=user)
            institution = employee.get_institution()
        except (Employee.DoesNotExist, Institution.DoesNotExist):
            return Response(
                {"detail": "Institution or employee not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        announcements = Announcement.objects.filter(
            deleted_at__isnull=True,
            target_employees__department__institution=institution
        ).distinct()

        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        type_filter = request.query_params.get("type", None)

        if search_query:
            announcements = announcements.filter(
                Q(title__icontains=search_query) | Q(content__icontains=search_query)
            )

        if created_at:
            announcements = announcements.filter(created_at=created_at)

        if type_filter:
            announcements = announcements.filter(announcement_type__model=type_filter)

        try:
            announcements = self.apply_sorting(announcements, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(announcements, request)
        serializer = AnnouncementSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class AnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AnnouncementSerializer,
                description="Announcement details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Announcement not found.",
            ),
        },
        tags=["Announcements"],
    )
    def get(self, request, pk):
        announcement = get_object_or_404(Announcement, pk=pk, deleted_at__isnull=True)
        serializer = AnnouncementSerializer(announcement)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Announcement marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Announcement not found.",
            ),
        },
        tags=["Announcements"],
    )
    @transaction.atomic
    def delete(self, request, pk):
        announcement = get_object_or_404(Announcement, pk=pk, deleted_at__isnull=True)
        announcement.approval_status = 'under_deletion'
        announcement.save(update_fields=['approval_status'])
        announcement.confirm_delete()
        return Response(
            {"message": "Announcement submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AnnouncementSerializer,
                description="Announcement updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Announcement not found.",
            ),
        },
        tags=["Announcements"],
    )
    @transaction.atomic
    def patch(self, request, pk):
        announcement = get_object_or_404(Announcement, pk=pk, deleted_at__isnull=True)
        announcement.approval_status = 'under_update'
        serializer = AnnouncementSerializer(announcement, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            announcement.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmployeeAnnouncementAcknowledgmentListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            {"name": "acknowledged", "type": "bool", "description": "Filter by acknowledgment status (true/false)"},
        ],
        responses={
            200: OpenApiResponse(
                response=EmployeeAnnouncementAcknowledgmentSerializer(many=True),
                description="List of acknowledgments for the user.",
            ),
            404: OpenApiResponse(description="Employee not found."),
        },
        tags=["Acknowledgments"],
    )
    def get(self, request):
        try:
            announcement_id = request.query_params.get("announcement_id", None)
            employee = Employee.objects.get(user=request.user)
            acknowledgments = EmployeeAnnouncementAcknowledgment.objects.filter(
                employee=employee, deleted_at__isnull=True, acknowledged=False
            )

            if announcement_id:
                acknowledgments = acknowledgments.filter(announcement__id=announcement_id)

            acknowledged_filter = request.query_params.get("acknowledged", None)
            if acknowledged_filter is not None:
                acknowledgments = acknowledgments.filter(acknowledged=acknowledged_filter.lower() == 'true')

            paginator = CustomPageNumberPagination()
            paginated_qs = paginator.paginate_queryset(acknowledgments, request)
            serializer = EmployeeAnnouncementAcknowledgmentSerializer(paginated_qs, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

class AcknowledgeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Acknowledgment recorded and notification marked as read.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Invalid acknowledgment.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Employee or acknowledgment not found.",
            ),
        },
        tags=["Acknowledgments"],
    )
    @transaction.atomic
    def post(self, request):
        print(f"Acknowledge request data: {request.data}")
        ack_id = request.data.get('ack_id')
        try:
            employee = Employee.objects.get(user=request.user)
            acknowledgment = EmployeeAnnouncementAcknowledgment.objects.get(
                id=ack_id, employee=employee, deleted_at__isnull=True
            )
            acknowledgment.acknowledged = True
            acknowledgment.acknowledged_at = timezone.now()
            acknowledgment.save()

            try:
                notification = Notification.objects.get(
                    user_id=request.user,
                    model_name="Announcement",
                    object_id=str(acknowledgment.announcement.pk),
                    is_read=False
                )
                notification.is_read = True
                notification.save()
                print(f"Marked notification {notification.id} as read for user {request.user.id}")
            except Notification.DoesNotExist:
                print(f"No unread notification found for user {request.user.id} and announcement {acknowledgment.announcement.pk}")
            except Exception as e:
                print(f"Error marking notification as read: {str(e)}")

            return Response({"detail": "Acknowledgment recorded"}, status=status.HTTP_200_OK)
        except (Employee.DoesNotExist, EmployeeAnnouncementAcknowledgment.DoesNotExist):
            print(f"Invalid acknowledgment for user {request.user.id}, ack_id {ack_id}")
            return Response({"detail": "Invalid acknowledgment"}, status=status.HTTP_400_BAD_REQUEST)