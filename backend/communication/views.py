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

def add_notification(user_id: int, message: str) -> None:
    """Add a notification to the user's Redis queue without expiry."""
    print(f"🔔 Adding notification for user {user_id}: {message}")
    notification = {
        'id': int(time.time() * 1000),
        'message': message
    }
    try:
        redis_client.rpush(f"notifications:{user_id}", json.dumps(notification))
        queue_length = redis_client.llen(f"notifications:{user_id}")
        print(f"✅ Notification queued for user {user_id}, queue length: {queue_length}")
    except redis.RedisError as e:
        print(f"❌ Redis error in add_notification: {str(e)}")
        raise

def get_notification(user_id: int) -> Optional[dict]:
    """Retrieve the oldest unread notification for the user."""
    try:
        # Get all notifications for the user
        notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
        queue_length = len(notifications)
        print(f"🔎 Checking queue for user {user_id}, queue length: {queue_length}")
        
        # Check for unread notifications
        read_notifications_key = f"read_notifications:{user_id}"
        for notification in notifications:
            notification_data = json.loads(notification)
            notification_id = notification_data['id']
            # Check if notification was already read
            if not redis_client.sismember(read_notifications_key, notification_id):
                print(f"📥 Retrieved notification for user {user_id}: {notification}")
                # Mark as read
                redis_client.sadd(read_notifications_key, notification_id)
                return notification_data
        print(f"❌ No unread notifications for user {user_id}")
        return None
    except redis.RedisError as e:
        print(f"❌ Redis error in get_notification: {str(e)}")
        return None

def get_unread_count(user_id: int) -> int:
    """Get the count of unread notifications for the user."""
    try:
        notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
        read_notifications_key = f"read_notifications:{user_id}"
        unread_count = 0
        for notification in notifications:
            notification_data = json.loads(notification)
            notification_id = notification_data['id']
            if not redis_client.sismember(read_notifications_key, notification_id):
                unread_count += 1
        print(f"📊 Unread notification count for user {user_id}: {unread_count}")
        return unread_count
    except redis.RedisError as e:
        print(f"❌ Redis error in get_unread_count: {str(e)}")
        return 0

def cleanup_queue(user_id: int) -> None:
    """Delete the user's notification queue and read notifications in Redis."""
    try:
        redis_client.delete(f"notifications:{user_id}")
        redis_client.delete(f"read_notifications:{user_id}")
        print(f"🧹 Cleaning up queue for user {user_id}")
    except redis.RedisError as e:
        print(f"❌ Redis error in cleanup_queue: {str(e)}")

@csrf_exempt
@extend_schema(
    summary="SSE for Real-Time Notifications",
    description="Internal endpoint to handle Server-Sent Events (SSE) connections for streaming real-time notifications to the authenticated user. Includes unread notification count.",
    responses={
        200: OpenApiResponse(description="SSE stream of notifications in the format: `data: {\"id\": int, \"message\": string, \"unread_count\": int}\\n\\n` for notifications or `data: {\"unread_count\": int}\\n\\n` for heartbeats"),
        401: OpenApiResponse(description="Unauthorized - Invalid or missing JWT token"),
        500: OpenApiResponse(description="Server error - Internal server issue")
    },
    auth=["BearerAuth"]
)
async def sse_notifications(request):
    """Handle SSE connections for real-time notifications."""
    user_id: Optional[int] = None
    try:
        print("🔍 Starting SSE request processing")
        authenticator = JWTAuthentication()
        start_time = time.time()
        user_auth_tuple = await sync_to_async(authenticator.authenticate)(request)
        auth_time = time.time() - start_time
        print(f"🔐 Authentication took {auth_time:.2f} seconds")

        if user_auth_tuple is None:
            print("❌ User not authenticated")
            return HttpResponse("Unauthorized", status=401)

        user, _ = user_auth_tuple
        user_id = await sync_to_async(lambda: user.id)()
        print(f"🌐 SSE connection started for user {user_id}")

        async def event_stream():
            print(f"🚀 Initializing event stream for user {user_id}")
            yield "data: {\"message\": \"SSE connection established\", \"unread_count\": 0}\n\n"
            last_heartbeat = time.time()

            while True:
                notif = await sync_to_async(lambda: get_notification(user_id))()
                unread_count = await sync_to_async(lambda: get_unread_count(user_id))()
                if notif:
                    notif['unread_count'] = unread_count
                    print(f"📤 Sending notification to SSE client {user_id}: {notif}")
                    yield f"data: {json.dumps(notif)}\n\n"

                current_time = time.time()
                if current_time - last_heartbeat > 10:
                    print(f"💓 Sending heartbeat for user {user_id} with unread count: {unread_count}")
                    yield f'data: {{"unread_count": {unread_count}}}\n\n'
                    last_heartbeat = current_time

                await asyncio.sleep(5)

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'
        return response

    except Exception as e:
        print(f"❌ Error in SSE view: {str(e)}")
        if user_id is not None:
            await sync_to_async(lambda: cleanup_queue(user_id))()
        return HttpResponse(f"Error: {str(e)}", status=500)

# @csrf_exempt
# @extend_schema(
#     summary="SSE Proxy for Real-Time Notifications",
#     description="Establishes a Server-Sent Events (SSE) connection to stream real-time notifications for the authenticated user. Includes unread notification count. Requires JWT token in the Authorization header.",
#     responses={
#         200: OpenApiResponse(description="SSE stream of notifications in the format: `data: {\"id\": int, \"message\": string, \"unread_count\": int}\\n\\n` for notifications or `data: {\"unread_count\": int}\\n\\n` for heartbeats"),
#         401: OpenApiResponse(description="Unauthorized - Invalid or missing JWT token"),
#         500: OpenApiResponse(description="Server error - Internal server issue")
#     },
#     auth=["BearerAuth"]
# )
# async def sse_proxy(request):
#     """Proxy endpoint to authenticate with Authorization header and forward to SSE."""
#     try:
#         print("🔍 Starting SSE proxy request processing")
#         authenticator = JWTAuthentication()
#         start_time = time.time()
#         user_auth_tuple = await sync_to_async(authenticator.authenticate)(request)
#         auth_time = time.time() - start_time
#         print(f"🔐 Authentication took {auth_time:.2f} seconds")

#         if user_auth_tuple is None:
#             print("❌ User not authenticated")
#             return HttpResponse("Unauthorized", status=401)

#         # Update the request with the authenticated user
#         request.user = user_auth_tuple[0]

#         # Forward to the existing sse_notifications view
#         print("🔄 Forwarding to SSE notifications endpoint")
#         return await sse_notifications(request)

#     except Exception as e:
#         print(f"❌ Error in SSE proxy: {str(e)}")
#         return HttpResponse(f"Error: {str(e)}", status=500)

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
                    "notification_id": {"type": "integer", "description": "The ID of the notification to mark as read"}
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
                print("❌ User not authenticated")
                return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

            user_id = user.id
            notification_id = request.data.get('notification_id')
            if not notification_id:
                print("❌ No notification_id provided")
                return Response({"error": "notification_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                notification_id = int(notification_id)
            except (ValueError, TypeError):
                print(f"❌ Invalid notification_id: {notification_id}")
                return Response({"error": "notification_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

            read_notifications_key = f"read_notifications:{user_id}"
            try:
                # Mark the notification as read
                redis_client.sadd(read_notifications_key, notification_id)
                print(f"✅ Notification {notification_id} marked as read for user {user_id}")
                return Response({"message": f"Notification {notification_id} marked as read"}, status=status.HTTP_200_OK)
            except redis.RedisError as e:
                print(f"❌ Redis error in mark_notification_read: {str(e)}")
                return Response({"error": "Failed to mark notification as read"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            print(f"❌ Error in MarkNotificationRead: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GetAllNotifications(APIView):
    """Endpoint to fetch all notifications (read and unread) for the user with pagination."""
    authentication_classes = [JWTAuthentication]
    pagination_class = CustomPageNumberPagination

    @extend_schema(
        summary="Get All Notifications",
        description="Retrieves all notifications (both read and unread) for the authenticated user with pagination support. Use 'page' and 'page_size' query parameters to control pagination.",
        responses={
            200: OpenApiResponse(description="Paginated list of notifications", examples={
                "application/json": {
                    "count": 100,
                    "next": "http://api.example.com/notifications?page=2",
                    "previous": None,
                    "results": [
                        {"id": 123456789, "message": "Test notification", "is_read": True},
                        {"id": 123456790, "message": "Another notification", "is_read": False}
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
                print("❌ User not authenticated")
                return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

            user_id = user.id
            try:
                # Get all notifications for the user
                notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
                read_notifications_key = f"read_notifications:{user_id}"
                notifications_list = []

                for notification in notifications:
                    notification_data = json.loads(notification)
                    notification_id = notification_data['id']
                    # Check if the notification is read
                    is_read = redis_client.sismember(read_notifications_key, notification_id)
                    notification_data['is_read'] = is_read
                    notifications_list.append(notification_data)

                # Apply pagination
                paginator = self.pagination_class()
                paginated_notifications = paginator.paginate_queryset(notifications_list, request)
                print(f"📋 Retrieved {len(paginated_notifications)} notifications for user {user_id} on page {paginator.page.number}")

                return paginator.get_paginated_response({"notifications": paginated_notifications})

            except redis.RedisError as e:
                print(f"❌ Redis error in get_all_notifications: {str(e)}")
                return Response({"error": "Failed to fetch notifications"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            print(f"❌ Error in GetAllNotifications: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# class GetUnreadNotifications(APIView):
#     """Endpoint to fetch unread notifications and their count for the user."""
#     authentication_classes = [JWTAuthentication]

#     @extend_schema(
#         summary="Get Unread Notifications",
#         description="Retrieves all unread notifications for the authenticated user along with the total count of unread notifications.",
#         responses={
#             200: OpenApiResponse(description="List of unread notifications and count", examples={
#                 "application/json": {
#                     "count": 2,
#                     "notifications": [
#                         {"id": 123456789, "message": "Test notification"},
#                         {"id": 123456790, "message": "Another notification"}
#                     ]
#                 }
#             }),
#             401: OpenApiResponse(description="Unauthorized - Invalid or missing JWT token"),
#             500: OpenApiResponse(description="Server error - Internal server issue")
#         },
#         auth=["BearerAuth"]
#     )
#     def get(self, request):
#         try:
#             user = request.user
#             if not user.is_authenticated:
#                 print("❌ User not authenticated")
#                 return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

#             user_id = user.id
#             try:
#                 # Get all notifications for the user
#                 notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
#                 read_notifications_key = f"read_notifications:{user_id}"
#                 unread_notifications = []

#                 for notification in notifications:
#                     notification_data = json.loads(notification)
#                     notification_id = notification_data['id']
#                     # Only include unread notifications
#                     if not redis_client.sismember(read_notifications_key, notification_id):
#                         unread_notifications.append(notification_data)

#                 print(f"📋 Retrieved {len(unread_notifications)} unread notifications for user {user_id}")
#                 return Response({
#                     "count": len(unread_notifications),
#                     "notifications": unread_notifications
#                 }, status=status.HTTP_200_OK)

#             except redis.RedisError as e:
#                 print(f"❌ Redis error in get_unread_notifications: {str(e)}")
#                 return Response({"error": "Failed to fetch unread notifications"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#         except Exception as e:
#             print(f"❌ Error in GetUnreadNotifications: {str(e)}")
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)