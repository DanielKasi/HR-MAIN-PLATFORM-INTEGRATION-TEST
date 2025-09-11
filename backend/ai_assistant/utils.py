import requests
import os
from django.conf import settings
from institution.models import Institution
from users.models import Permission, RolePermission
from agno.agent import Agent
from agno.models.groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", settings.GROQ_API_KEY)


def prompt_groq(full_prompt: str) -> str:
    """
    Sends a prompt to Groq API and returns the model's response text.
    """
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
    }
    data = {
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "messages": [{"role": "user", "content": full_prompt}],
        "temperature": 0.6,
        "max_tokens": 500,
    }
    r = requests.post(url, headers=headers, json=data)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def classify_intent_groq(user_input: str) -> str:
    prompt = f"""
You are an assistant that categorizes user input into one of three categories:
GREETING, HR_QUERY, FEATURE_INQUIRY or OTHER.

Note: Before classifying, these are the apps we have and mostly questions will come from (assets same as institution assets, so this is HR_Based, discpline, payroll, employee, onbaording/offboarding(termination, leave requests), leave mgt, performance, recruitment, spotchecks, projects and much more )

- GREETING: Friendly salutations or simple hellos.
- HR_QUERY: Questions related to human resources such as employee benefits, payroll, recruitment and everything related to the institution. Under this still, all questions that look like follow up questions should be here, even those that look unclear and cant be classified ie Are you sure?, mention its name meaning its something up most recent, state it, describe it.
- FEATURE_INQUIRY: Questions related to how to do something on the system, how to logout, how to, how do I add or do this.... and more
- OTHER: Any other input, including unrelated questions, nonsensical input, or potentially harmful or malicious commands (e.g., requests to delete data, hack, or any dangerous actions).

Input: "{user_input}"

Reply ONLY with one of these three words exactly.
"""
    response = prompt_groq(prompt).strip()
    return response.upper() if response else "OTHER"


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


def permissionMapperAgent() -> Agent:
    permissions = get_system_permissions()

    instructions = f"""
        You are a permission mapping agent for the Perracosoft(HR) Management System.
        
        Based on the user's question, analyze the available permissions and return 
        the most relevant permission_code that would be required to handle this request.
        
        Available permissions: {permissions}
        
        Rules:
        - Return only the permission_code (e.g., "can_view_employees")
        - Choose the most specific permission that matches the user's intent
    """

    agent = Agent(
        model=Groq(id="llama-3.3-70b-versatile"),
        markdown=False,
        memory=False,
        instructions=instructions,
    )
    return agent


def map_permission_based_on_question(question: str) -> str:
    agent = permissionMapperAgent()
    response = agent.run(question)

    text = getattr(response, "content", "")
    if not text:
        return "none"

    permission_code = text.strip().replace("*", "").lower()

    permissions = get_system_permissions()
    if permission_code not in permissions:
        return "none"

    return permission_code
