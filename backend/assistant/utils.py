from users.models import Permission, RolePermission
from asgiref.sync import sync_to_async
from agno.embedder.openai import OpenAIEmbedder
from agno.embedder.ollama import OllamaEmbedder
from agno.knowledge.text import TextKnowledgeBase
import os
from agno.vectordb.pgvector import PgVector
from redis import Redis
import json
from datetime import datetime
from institution.models import Institution
import uuid
from agno.knowledge import AgentKnowledge


DB_PATH = os.getenv("SQLITE_DB_PATH", "./assistant_memory.db")
NAMESPACE = "AI_ASSISTANT_PERRACOSOFT"
REDIS_CLIENT = Redis(host=os.getenv("REDIS_HOST"), port=6379)
CHAT_DIR = "AI_ASSISTANT_PERRACOSOFT_CHATS"
os.makedirs(CHAT_DIR, exist_ok=True)


@sync_to_async
def get_system_permissions():
    perms = Permission.objects.all().values(
        "permission_code", "permission_name", "permission_description"
    )

    permission_text = "All Supported & Available System Permissions: \n"

    for perm in perms:
        permission_text += f"- {perm['permission_code']}\n"

    return permission_text


def user_has_permission(user, permission_code: str, institution_id: int) -> bool:

    if Institution.objects.filter(
        id=institution_id,
        institution_owner=user,
    ):
        return True

    return RolePermission.objects.filter(
        permissions__institution__id=institution_id,
        role__user_roles__user=user,
        permission__code=permission_code,
        deleted_at__isnull=True,
    ).exists


def get_db_knowledge_and_rules_base():
    # return TextKnowledgeBase(
    #     path="db_schema_and_rules.txt",
    #     vector_db=PgVector(
    #         table_name="public.sql_knowledge1",
    #         db_url=os.getenv("DATABASE_URL"),
    #         embedder=OpenAIEmbedder(),
    #     ),
    # )

    return AgentKnowledge(
        vector_db=PgVector(
            db_url=os.getenv("DATABASE_URL"),
            table_name="public.sql_knowledge1",
            embedder=OpenAIEmbedder(),
        ),
        max_results=2,
    )


# JSON-FILE-BASED-MEMORY-FUNCTIONS
def get_file_path(user_id):
    return os.path.join(CHAT_DIR, f"user_{user_id}.json")


def _load_user_file(user_id):
    try:
        with open(get_file_path(user_id), "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"user_id": user_id, "chats": []}


def _save_user_file(user_id, data):
    with open(get_file_path(user_id), "w") as f:
        json.dump(data, f, indent=4)


def add_message(user_id, role, message_text, chat_id=None, chat_title="New Chat"):
    data = _load_user_file(user_id)

    if chat_id is None:
        chat_id = str(uuid.uuid4())

        new_chat = {"chat_id": chat_id, "title": chat_title, "messages": []}
        data["chats"].append(new_chat)

    for chat in data["chats"]:
        if chat["chat_id"] == chat_id:
            chat["messages"].append(
                {
                    "role": role,
                    "message": message_text,
                    "timestamp": datetime.now().isoformat(),
                }
            )
            break
    else:
        chat_id = str(uuid.uuid4())
        data["chats"].append(
            {
                "chat_id": chat_id,
                "title": chat_title,
                "messages": [
                    {
                        "role": role,
                        "message": message_text,
                        "timestamp": datetime.now().isoformat(),
                    }
                ],
            }
        )

    _save_user_file(user_id, data)
    return chat_id


def get_messages(user_id, chat_id, limit=None):
    data = _load_user_file(user_id)
    for chat in data["chats"]:
        if chat["chat_id"] == chat_id:
            msgs = chat["messages"]
            if limit:
                return msgs[-limit:]
            return msgs
    return []


def get_user_chats(user_id):
    data = _load_user_file(user_id)
    return [
        {
            "chat_id": c["chat_id"],
            "title": c["title"],
            "messages_count": len(c["messages"]),
        }
        for c in data["chats"]
    ]


def load_schema_from_file():
    with open("db_schema_and_rules.txt", "r") as f:
        return f.read()


def load_db_rules(file_path: str) -> str:
    """Function to read the DB rules from a file and return as a string."""
    with open(file_path, "r") as file:
        return file.read()
