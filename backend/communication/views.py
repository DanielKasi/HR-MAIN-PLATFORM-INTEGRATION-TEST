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
from typing import Optional, List, Dict

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
    # Test Redis connection
    redis_client.ping()
    logger.info("✅ Successfully connected to Redis")
except redis.ConnectionError as e:
    logger.error(f"❌ Failed to connect to Redis: {str(e)}")
    raise

def add_notification(user_id: int, message: str) -> None:
    """Add a notification to the user's Redis queue with expiry."""
    print(f"🔔 Adding notification for user {user_id}: {message}")
    notification = {
        'id': int(time.time() * 1000),
        'message': message
    }
    try:
        redis_client.rpush(f"notifications:{user_id}", json.dumps(notification))
        # Set a TTL of 24 hours on the notification queue
        redis_client.expire(f"notifications:{user_id}", 86400)
        queue_length = redis_client.llen(f"notifications:{user_id}")
        print(f"✅ Notification queued for user {user_id}, queue length: {queue_length}")
    except redis.RedisError as e:
        print(f"❌ Redis error in add_notification: {str(e)}")
        raise

def get_notifications(user_id: int) -> List[Dict]:
    """Retrieve all notifications for the user without marking as read."""
    try:
        notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
        queue_length = len(notifications)
        print(f"🔎 Checking queue for user {user_id}, queue length: {queue_length}")
        
        if not notifications:
            print(f"❌ No notifications for user {user_id}")
            return []
        
        notification_list = [json.loads(notification) for notification in notifications]
        print(f"📥 Retrieved {len(notification_list)} notifications for user {user_id}")
        return notification_list
    except redis.RedisError as e:
        print(f"❌ Redis error in get_notifications: {str(e)}")
        return []

def cleanup_queue(user_id: int) -> None:
    """Delete the user's notification queue in Redis."""
    try:
        redis_client.delete(f"notifications:{user_id}")
        print(f"🧹 Cleaning up queue for user {user_id}")
    except redis.RedisError as e:
        print(f"❌ Redis error in cleanup_queue: {str(e)}")

@csrf_exempt
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
            yield "data: {\"message\": \"SSE connection established\"}\n\n"
            last_heartbeat = time.time()

            while True:
                notifications = await sync_to_async(lambda: get_notifications(user_id))()
                if notifications:
                    for notification in notifications:
                        print(f"📤 Sending notification to SSE client {user_id}: {notification}")
                        yield f"data: {json.dumps(notification)}\n\n"
                else:
                    print(f"❌ No notifications for user {user_id}")

                current_time = time.time()
                if current_time - last_heartbeat > 10:
                    print(f"💓 Sending heartbeat for user {user_id}")
                    yield "data: {}\n\n"
                    last_heartbeat = current_time

                await asyncio.sleep(0.5)

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

@csrf_exempt
async def mark_notification_read(request):
    """Mark a notification as read by removing it from the queue."""
    try:
        authenticator = JWTAuthentication()
        user_auth_tuple = await sync_to_async(authenticator.authenticate)(request)
        if user_auth_tuple is None:
            return HttpResponse("Unauthorized", status=401)

        user, _ = user_auth_tuple
        user_id = await sync_to_async(lambda: user.id)()
        data = json.loads(request.body)
        notification_id = data.get('notification_id')

        if not notification_id:
            return HttpResponse("Missing notification_id", status=400)

        try:
            notifications = redis_client.lrange(f"notifications:{user_id}", 0, -1)
            for i, notification in enumerate(notifications):
                notification_data = json.loads(notification)
                if notification_data['id'] == notification_id:
                    redis_client.lrem(f"notifications:{user_id}", 1, notification)
                    print(f"✅ Removed notification {notification_id} for user {user_id}")
                    break
            else:
                print(f"❌ Notification {notification_id} not found for user {user_id}")
            return HttpResponse(status=200)
        except redis.RedisError as e:
            print(f"❌ Redis error in mark_notification_read: {str(e)}")
            return HttpResponse(f"Error: {str(e)}", status=500)

    except Exception as e:
        print(f"❌ Error in mark_notification_read: {str(e)}")
        return HttpResponse(f"Error: {str(e)}", status=500)