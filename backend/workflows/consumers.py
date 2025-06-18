import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.db.models import Q
from .models import ApprovalTask
from .serializers import ApprovalTaskSerializer

class NotificationConsumer(AsyncWebsocketConsumer):
    pass
    # def __init__(self, *args, **kwargs):
    #     super().__init__(*args, **kwargs)
    #     self.notification_group = None
    #     self.user = None

    # async def connect(self):
    #     self.user = self.scope["user"]

    #     if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
    #         await self.close()
    #         return

    #     self.notification_group = f"user_{self.user.id}_notifications"

    #     await self.channel_layer.group_add(self.notification_group, self.channel_name)

    #     await self.accept()

    #     tasks = await self.get_user_tasks()
    #     await self.send(text_data=json.dumps({"type": "initial_tasks", "tasks": tasks}))

    # async def disconnect(self, close_code):
    #     if self.notification_group:
    #         try:
    #             await self.channel_layer.group_discard(
    #                 self.notification_group, self.channel_name
    #             )
    #         except Exception as e:
    #             print(f"Error in disconnect(): {e}")

    #     else:
    #         print("No notification group set, Skipping....")

    # async def receive(self, text_data):
    #     data = json.loads(text_data)
    #     message_type = data.get("type", "")

    #     if message_type == "fetch_tasks":
    #         tasks = await self.get_user_tasks()
    #         await self.send(
    #             text_data=json.dumps({"type": "tasks_data", "tasks": tasks})
    #         )

    # async def notification_message(self, event):
    #     await self.send(
    #         text_data=json.dumps(
    #             {
    #                 "type": "notification",
    #                 "message": event["message"],
    #                 "task": event.get("task", None),
    #             }
    #         )
    #     )

    # async def tasks_update(self, event):
    #     await self.send(
    #         text_data=json.dumps({"type": "tasks_update", "tasks": event["tasks"]})
    #     )

    # @database_sync_to_async
    # def get_user_tasks(self):
    #     user = self.user
    #     user_roles = user.user_roles.values_list("role_id", flat=True)

    #     tasks = ApprovalTask.objects.filter(
    #         Q(step__roles__approver_role__id__in=user_roles)
    #         | Q(step__approver__approver_user__user__id=user.id)
    #     ).distinct()

    #     serializer = ApprovalTaskSerializer(tasks, many=True)
    #     return serializer.data
