from .serializers import AIAssistantSerializer, UserChatsSerializer
from drf_spectacular.utils import extend_schema
import random
import json
import time
import uuid
import threading
from .utils import user_has_permission, add_message
from .service import (
    map_permission_based_on_question,
    classify_question,
    chat,
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse
import asyncio
from asgiref.sync import async_to_sync
from institution.models import Institution
import queue
import logging
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from .utils import (
    _load_user_file,
)

logger = logging.getLogger(__name__)

sse_connections = {}

print("sse_connections", sse_connections)


@csrf_exempt
def assistant_sse(request):
    session_id = request.GET.get("session_id")
    if not session_id:
        return StreamingHttpResponse(
            json.dumps({"error": "session_id parameter is required"}),
            content_type="application/json",
            status=400,
        )

    def event_stream():
        connection_queue = queue.Queue()
        sse_connections[session_id] = connection_queue

        try:
            yield f"data: {json.dumps({'type': 'connected', 'message': 'AI Assistant connected', 'session_id': session_id})}\n\n"

            while True:
                try:
                    message = connection_queue.get(timeout=60)
                    yield f"data: {json.dumps(message)}\n\n"

                    if message.get("type") == "final_response":
                        break

                except queue.Empty:
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"

        except GeneratorExit:
            pass
        finally:
            if session_id in sse_connections:
                del sse_connections[session_id]

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["Connection"] = "keep-alive"
    response["Access-Control-Allow-Origin"] = "*"
    return response


class AssistantView(APIView):
    @extend_schema(
        responses={
            200: AIAssistantSerializer,
            400: {"description": "Bad Request"},
            403: {"description": "Forbidden"},
            404: {"description": "Not Found"},
            500: {"description": "Internal Server Error"},
        },
        summary="AI System Query Assistant with SSE",
        tags=["Complete AI Assistant"],
        request=AIAssistantSerializer,
    )
    def post(self, request):
        GREETING_RESPONSES = [
            "Hello! How can I help you today?",
            "Hi there! What can I do for you?",
            "Greetings! How's your day going?",
            "Hey! Need assistance with the system?",
            "Hello! Feel free to ask me anything about Perracosoft, its Usage or Features.",
        ]

        serializer = AIAssistantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data["question"]
        chat_id = serializer.validated_data.get("chat_id")
        session_id = request.data.get("session_id")
        user = request.user

        if not session_id:
            session_id = str(uuid.uuid4())

        is_new_chat = False
        if not chat_id:
            chat_id = str(uuid.uuid4())
            is_new_chat = True

        try:
            institution = Institution.objects.get(id=user.profile.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "User institution not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if institution:
            thread = threading.Thread(
                target=self.process_question_async,
                args=(
                    question,
                    user,
                    institution,
                    str(chat_id),
                    session_id,
                    GREETING_RESPONSES,
                ),
            )
            thread.daemon = True
            thread.start()

            response_data = {
                "session_id": session_id,
                "message": "Processing started. Connect to SSE endpoint to receive real-time updates.",
            }

            if is_new_chat:
                response_data["chat_id"] = chat_id

            return Response(response_data, status=status.HTTP_200_OK)

    def process_question_async(
        self, question, user, institution, chat_id, session_id, greeting_responses
    ):
        """
        Process the AI question asynchronously and send updates via SSE
        """
        try:
            self.send_sse_message(
                session_id,
                {
                    "type": "processing_start",
                    "message": "Starting to process your question...",
                    "chat_id": chat_id,
                    "timestamp": time.time(),
                },
            )

            self.send_sse_message(
                session_id,
                {
                    "type": "progress",
                    "message": "Analyzing your question...",
                    "step": 1,
                    "total_steps": 3,
                    "chat_id": chat_id,
                    "timestamp": time.time(),
                },
            )

            detected_domain, mapped_permission = async_to_sync(self.run_async_tasks)(
                question
            )

            # Step 2: Permission checking
            self.send_sse_message(
                session_id,
                {
                    "type": "progress",
                    "message": "Checking permissions...",
                    "step": 2,
                    "total_steps": 3,
                    "chat_id": chat_id,
                    "timestamp": time.time(),
                },
            )

            if detected_domain == "greeting":
                response_text = random.choice(greeting_responses)
                self.send_sse_message(
                    session_id,
                    {
                        "type": "final_response",
                        "answer": response_text,
                        "domain": detected_domain,
                        "chat_id": chat_id,
                        "timestamp": time.time(),
                    },
                )

                record_question = add_message(user.id, "user", question, chat_id)
                add_message(user.id, "assistant", response_text, record_question)

            elif detected_domain == "feature_inquiry":
                response_text = (
                    "Inquiry responses are still under development. Thank you"
                )
                self.send_sse_message(
                    session_id,
                    {
                        "type": "final_response",
                        "answer": response_text,
                        "domain": detected_domain,
                        "chat_id": chat_id,
                        "timestamp": time.time(),
                    },
                )

                record_question = add_message(user.id, "user", question, chat_id)
                add_message(user.id, "assistant", response_text, record_question)

            elif detected_domain == "malicious":
                response_text = "I cannot respond to harmful or offensive content."
                self.send_sse_message(
                    session_id,
                    {
                        "type": "final_response",
                        "answer": response_text,
                        "domain": detected_domain,
                        "chat_id": chat_id,
                        "timestamp": time.time(),
                    },
                )

            else:
                if mapped_permission and mapped_permission != "none":
                    user_has_access = user_has_permission(
                        user, mapped_permission, institution.id
                    )
                    if user_has_access:
                        self.send_sse_message(
                            session_id,
                            {
                                "type": "progress",
                                "message": "Generating AI response...",
                                "step": 3,
                                "total_steps": 3,
                                "chat_id": chat_id,
                                "timestamp": time.time(),
                            },
                        )

                        response_text = chat(user.id, institution.id, question, chat_id)

                        self.send_sse_message(
                            session_id,
                            {
                                "type": "final_response",
                                "answer": response_text,
                                "domain": detected_domain,
                                "chat_id": chat_id,
                                "timestamp": time.time(),
                            },
                        )
                    else:
                        response_text = "You don't have the necessary permissions to access this resource. Kindly contact the system administrator for further clarification"
                        self.send_sse_message(
                            session_id,
                            {
                                "type": "final_response",
                                "answer": response_text,
                                "domain": detected_domain,
                                "chat_id": chat_id,
                                "timestamp": time.time(),
                            },
                        )

        except Exception as e:
            logger.error(
                f"Error processing question for session {session_id}: {str(e)}"
            )
            self.send_sse_message(
                session_id,
                {
                    "type": "error",
                    "message": "An error occurred while processing your question.",
                    "error": str(e),
                    "timestamp": time.time(),
                },
            )

    def send_sse_message(self, session_id, message):
        """
        Send message to SSE connection if it exists
        """
        if session_id in sse_connections:
            try:
                sse_connections[session_id].put_nowait(message)
            except queue.Full:
                logger.warning(f"SSE queue full for session {session_id}")
        else:
            logger.info(f"No SSE connection found for session {session_id}")

    async def run_async_tasks(self, question):
        classify_task = asyncio.create_task(classify_question(question))
        permission_task = asyncio.create_task(
            map_permission_based_on_question(question)
        )

        detected_domain = await classify_task

        if detected_domain != "system_domain" and not permission_task.done():
            permission_task.cancel()
            mapped_permission = None
        else:
            mapped_permission = await permission_task

        return detected_domain, mapped_permission


class UserChatsView(APIView):

    @extend_schema(
        responses={
            200: UserChatsSerializer,
            400: {"description": "Bad Request"},
            403: {"description": "Forbidden"},
            404: {"description": "Not Found"},
            500: {"description": "Internal Server Error"},
        },
        summary="AI USER CHATS",
        tags=["Complete AI Assistant"],
    )
    def get(self, request):
        user_id = request.user.id

        try:
            user_data = _load_user_file(user_id)

            serializer = UserChatsSerializer(user_data)
            return Response(serializer.data, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
