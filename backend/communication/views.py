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

from utilities.pagination import CustomPageNumberPagination

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
    logger.info("✅ Successfully connected to Redis")
except redis.ConnectionError as e:
    logger.error(f"❌ Failed to connect to Redis: {str(e)}")
    raise

def add_notification(user_id: int, message: str, model_name: str = None, object_id: str = None) -> None:
    """Add a notification to the user's Redis queue with optional model and object ID."""
    notification = {
        'id': str(int(time.time() * 1000)),  # Store ID as string
        'message': message,
        'model_name': model_name,
        'object_id': object_id
    }
    try:
        redis_client.rpush(f"notifications:{user_id}", json.dumps(notification))
        queue_length = redis_client.llen(f"notifications:{user_id}")
    except redis.RedisError as e:
        raise

def get_notification(user_id: int) -> Optional[dict]:
    """Retrieve the oldest unread notification for the user."""
    lock_key = f"lock:notifications:{user_id}"
    with redis_client.lock(lock_key, timeout=50):
        try:
            notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
            queue_length = len(notifications)
            
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
            return HttpResponse("Unauthorized", status=401)

        user, _ = user_auth_tuple
        user_id = await sync_to_async(lambda: user.id)()

        async def event_stream():
            yield "data: {\"message\": \"SSE connection established\", \"unread_count\": 0}\n\n"
            last_heartbeat = time.time()

            while True:
                notif = await sync_to_async(lambda: get_notification(user_id))()
                unread_count = await sync_to_async(lambda: get_unread_count(user_id))()
                if notif:
                    notif['unread_count'] = unread_count
                    yield f"data: {json.dumps(notif)}\n\n"
                    # Removed: await sync_to_async(lambda: mark_notification_read(user_id, notif['id']))()
                
                current_time = time.time()
                if current_time - last_heartbeat > 10:
                    yield f'data: {{"unread_count": {unread_count}}}\n\n'
                    last_heartbeat = current_time

                await asyncio.sleep(500)

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'
        return response

    except Exception as e:
        if user_id is not None:
            await sync_to_async(lambda: cleanup_queue(user_id))()
        return HttpResponse(f"Error: {str(e)}", status=500)

class MarkNotificationRead(APIView):
    """Endpoint to mark a notification as read."""
    authentication_classes = [JWTAuthentication]

    @extend_schema(
        summary="Mark a Notification as Read",
        description="Marks a specific notification as read for the authenticated user by adding its ID to the read notifications set.",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "notification_id": {"type": "string", "description": "The ID of the notification to mark as read"}
                },
                "required": ["notification_id"]
            }
        },
        responses={
            200: OpenApiResponse(description="Notification marked as read", examples={
                "application/json": {"message": "Notification 123456789 marked as read"}
            }),
            400: OpenApiResponse(description="Bad request - Missing or invalid notification_id"),
            401: OpenApiResponse(description="Unauthorized - Invalid or missing JWT token"),
            500: OpenApiResponse(description="Server error - Internal server issue")
        },
        auth=["BearerAuth"]
    )
    def post(self, request):
        try:
            user = request.user
            if not user.is_authenticated:
                return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

            user_id = user.id
            notification_id = request.data.get('notification_id')
            if not notification_id:
                return Response({"error": "notification_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            read_notifications_key = f"read_notifications:{user_id}"
            try:
                redis_client.sadd(read_notifications_key, str(notification_id))
                return Response({"message": f"Notification {notification_id} marked as read"}, status=status.HTTP_200_OK)
            except redis.RedisError as e:
                return Response({"error": "Failed to mark notification as read"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
