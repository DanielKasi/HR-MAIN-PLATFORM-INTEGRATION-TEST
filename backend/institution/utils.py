import string
import secrets


def generate_compliant_password(length=12):
    if length < 8:
        raise ValueError("Password must be at least 8 characters long.")

    # Required components
    lower = secrets.choice(string.ascii_lowercase)
    upper = secrets.choice(string.ascii_uppercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice("!@#$%^&*()-_=+[]{};:,.<>?")

    # Remaining random characters
    all_chars = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[]{};:,.<>?"
    remaining = [secrets.choice(all_chars) for _ in range(length - 4)]

    # Combine and shuffle
    password_list = [lower, upper, digit, special] + remaining
    secrets.SystemRandom().shuffle(password_list)

    return "".join(password_list)


import uuid
from datetime import datetime
import os
import json

CHAT_DIR = "AI_ASSISTANT_PERRACOSOFT_CHATS"
os.makedirs(CHAT_DIR, exist_ok=True)


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

    def convert(obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [convert(i) for i in obj]
        return obj

    with open(get_file_path(user_id), "w") as f:
        json.dump(convert(data), f, indent=4)


def add_message(user_id, role, message_text, chat_id=None, chat_title="New Chat"):
    data = _load_user_file(user_id)


    if chat_id is None:
        chat_id = str(uuid.uuid4())
        new_chat = {"chat_id": chat_id, "title": chat_title, "messages": []}
        data["chats"].append(new_chat)

        new_chat["messages"].append(
            {
                "role": role,
                "message": message_text,
                "timestamp": datetime.now().isoformat(),
            }
        )
    else:
        chat_found = False
        for chat in data["chats"]:

            if str(chat["chat_id"]).strip() == str(chat_id).strip():

                chat["messages"].append(
                    {
                        "role": role,
                        "message": message_text,
                        "timestamp": datetime.now().isoformat(),
                    }
                )
                chat_found = True
                break

        if not chat_found:
            new_chat = {
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
            data["chats"].append(new_chat)

    _save_user_file(user_id, data)
    return chat_id


def get_messages(user_id, chat_id, limit=None):
    data = _load_user_file(user_id)
    for chat in data["chats"]:
        if str(chat["chat_id"]) == str(chat_id):
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


def load_db_rules(file_path: str) -> str:
    """Function to read the DB rules from a file and return as a string."""
    with open(file_path, "r") as file:
        return file.read()
