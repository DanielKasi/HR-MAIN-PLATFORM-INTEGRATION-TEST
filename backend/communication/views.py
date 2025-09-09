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
    """Add a notification to the user's Redis queue."""
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
    """Retrieve and remove the oldest notification from the user's Redis queue."""
    try:
        queue_length = redis_client.llen(f"notifications:{user_id}")
        print(f"🔎 Checking queue for user {user_id}, queue length: {queue_length}")
        notification = redis_client.lpop(f"notifications:{user_id}")
        if notification:
            print(f"📥 Retrieved notification for user {user_id}: {notification}")
            return json.loads(notification)
        print(f"❌ No notifications for user {user_id}")
        return None
    except redis.RedisError as e:
        print(f"❌ Redis error in get_notification: {str(e)}")
        return None

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
    user_id: Optional[int] = None  # Initialize user_id to None
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
                notif = await sync_to_async(lambda: get_notification(user_id))()
                if notif:
                    print(f"📤 Sending notification to SSE client {user_id}: {notif}")
                    yield f"data: {json.dumps(notif)}\n\n"

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