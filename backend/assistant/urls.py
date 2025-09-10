from django.urls import path
from .views import AssistantView, assistant_sse, UserChatsView

urlpatterns = [
    path("", AssistantView.as_view(), name="assistant"),
    path("sse/", assistant_sse, name="assistant-sse"),
    path("user-chats/", UserChatsView.as_view(), name="user-chats"),
]
