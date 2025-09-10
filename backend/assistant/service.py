from .agno_agents import (
    RouterAgent,
    PermissionMapperAgent,
    SmartSQLTeam,
)
from .utils import get_system_permissions, add_message, get_messages


async def classify_question(question: str) -> str:
    router_agent = RouterAgent()

    response = await router_agent.arun(question)

    text = response.content if response else ""

    category = text.strip().replace("*", "").lower()

    if category not in [
        "greeting",
        "feature_inquiry",
        "malicious",
        "system_domain",
    ]:
        return "unknown"

    return category


async def map_permission_based_on_question(question: str) -> str:
    agent = await PermissionMapperAgent()
    response = await agent.arun(question)

    text = getattr(response, "content", "")
    if not text:
        return "none"

    permission_code = text.strip().replace("*", "").lower()

    permissions = await get_system_permissions()
    if permission_code not in permissions:
        return "none"

    return permission_code


def chat(user_id: int, user_institution_id: int, question: str, chat_id: str):

    user_memory = get_messages(user_id, chat_id, limit=2)

    chat = add_message(user_id, "user", question, chat_id)

    team = SmartSQLTeam(user_institution_id, user_id, chat_id, user_memory)
    response = team.run(question)

    response_text = getattr(response, "content", str(response))

    add_message(user_id, "assistant", response_text, chat)

    return response_text
