from django.http import StreamingHttpResponse
import json
import asyncio
from queue import Queue
from threading import Lock
from django.http import HttpResponse


notification_queues = {}
queue_lock = Lock()

def add_notification(user_id, message):
    with queue_lock:
        if user_id not in notification_queues:
            notification_queues[user_id] = Queue()
        notification_queues[user_id].put({
            'id': int(asyncio.get_event_loop().time()),
            'message': message
        })

async def sse_notifications(request):
    async def event_stream(user_id):
        with queue_lock:
            if user_id not in notification_queues:
                notification_queues[user_id] = Queue()
        last_id = 0
        while True:
            with queue_lock:
                queue = notification_queues[user_id]
                if not queue.empty():
                    notif = queue.get()
                    if notif['id'] > last_id:
                        yield f"data: {json.dumps(notif)}\n\n"
                        last_id = notif['id']
            await asyncio.sleep(1)

    if not request.user.is_authenticated:
        return HttpResponse("Unauthorized", status=401)
    user_id = request.user.id

    response = StreamingHttpResponse(event_stream(user_id), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response