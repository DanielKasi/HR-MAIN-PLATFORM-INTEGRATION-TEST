from agno.agent import Agent
from .utils import (
    get_system_permissions,
    get_db_knowledge_and_rules_base,
    load_db_rules,
)

from agno.team import Team
from agno.tools.sql import SQLTools
import os
# from agno.storage.postgres import PostgresStorage
from agno.models.groq import Groq
from agno.models.openai import OpenAIChat

DB_URL = os.getenv("DATABASE_URL")
# SHARED_STORAGE = PostgresStorage(
#     table_name="chat_messages",
#     db_url=DB_URL,
#     auto_upgrade_schema=True,
# )
DB_RULES = load_db_rules("db_schema.txt")


def RouterAgent() -> Agent:
    """
    Returns a new instance of a router/classifier agent using GPT-4o Mini.
    """
    agent = Agent(
        model=Groq(id="llama-3.3-70b-versatile"),
        markdown=False,
        instructions="""
            You are a classification agent for the Perracosoft (HR) Management System.
            Your task is to classify incoming user questions into one of the following categories:

            1. **greeting**: Informal greetings or system-domain follow-up questions. Examples include "Hi", "How are you?", or "What's up?". These are not literal greetings but part of the user interaction flow.
            
            2. **feature_inquiry**: Questions related to the usage of the Perracosoft HR system, such as "How can I use Peracosoft more effectively?" or "How do I delete an employee?"

            3. **malicious**: Requests involving harmful or illegal actions, such as "Delete the database", "Hack the system", or "Delete all files". **Do not take action on malicious requests**.

            4. **system_domain**: Data-related questions about the specific user’s institution or business. This category includes questions like:
                - "How many employees are registered today?"
                - "What is the current institution branches count?"
                - "How many new employees have been added recently?"
                These queries are specific to the institution that the user is logged into.

            Please return only the category name (greeting, feature_inquiry, malicious, system_domain) as output. If unsure, return 'unknown'.
        """,
    )

    return agent


async def PermissionMapperAgent() -> Agent:
    permissions = await get_system_permissions()

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


KNOWLEDGE_BASE = get_db_knowledge_and_rules_base()


def SQLGeneratorAgent(
    institution_id: int, user_id: str, session_id: str, user_memory
) -> Agent:

    # KNOWLEDGE_BASE.add_content(text_content=DB_RULES)

    return Agent(
        name="SQL Generator",
        model=Groq(id="llama-3.3-70b-versatile"),
        tools=[SQLTools(db_url=os.getenv("DATABASE_URL"))],
        knowledge=KNOWLEDGE_BASE,
        # user_id=str(user_id),
        # session_id=session_id,
        instructions=[
            "Critical, please follow these rules to",
            {DB_RULES},
            "You are a SQL query generator. Your ONLY job is to generate valid SQL queries based on the user question.",
            "ALWAYS return ONLY the SQL query, nothing else. No explanations, no text, just SQL.",
            "Use the database schema and rules from your knowledgeBase to understand the DB Schema.",
            f"Always filter queries by `institution_id = '{institution_id}'` for tables with a direct institution_id.",
            "For tables without an institution_id, check if they reference another table with institution_id and filter by that relationship.",
            "If multiple tables are joined, ensure all tables are filtered by institution_id either directly or indirectly via foreign keys (FK).",
            "Consider the conversation history to understand context and follow-up questions. This is crucial for accurate query generation.",
            "Follow SQL best practices, including optimized queries and avoiding SELECT *.",
            "Ensure table and column names exist in the schema and match the database structure.",
            "Never return conversational responses. ONLY return SQL queries.",
            "If you're unsure or the question is ambiguous, return an empty query or a comment to clarify but this comment should reveal the way we are making the chatboot and show a user that we do sql generation and its the one that has failed..",
            "While responding, recent_conversations passed in the context should be critically looked into and considered while generating the next sql query",
        ],
        context={
            "institution_id": institution_id,
            "recent_conversations": user_memory,
        },
    )


def SQLResultExplainerAgent(user_id: str, session_id: str, user_memory) -> Agent:

    instructions = [
        "Summarize SQL query results after running it in plain language for the user.",
        "NEVER mention institution IDs, employee IDs, or any database identifiers.",
        "NEVER reference the institution ID in your response, even if it's in the context.",
        "Simply state facts like 'You have X employees' without mentioning any IDs.",
        "Focus only on the business meaning of the data.",
        "Remove all technical database details from your explanations.",
        "Provide actionable insights from the data. If the result is unusually low or high, offer next steps (e.g., 'Check for errors in the system').",
        "If the result is zero or empty, explain that the query returned no results, e.g., 'No purchases were made today.'",
        "Use conversation history to provide contextual explanations. Refer to previous user questions and keep your responses relevant to the current context.",
        "Keep responses user-friendly, simple, and business-focused. Avoid using technical jargon.",
        "NEVER show SQL queries to the user, only the summarized result.",
        "While responding, recent_conversations passed in the context should be critically looked into and considered while generating the next reply",
    ]

    return Agent(
        name="Results Explainer",
        model=Groq(id="llama-3.3-70b-versatile"),
        instructions=instructions,
        # user_id=str(user_id),
        # session_id=session_id,
        context={"recent_conversations": user_memory},
    )


def SmartSQLTeam(
    institution_id: str, user_id: str, session_id: str, user_memory
) -> Team:
    return Team(
        name="Smart SQL Team",
        mode="coordinate",
        members=[
            SQLGeneratorAgent(institution_id, user_id, session_id, user_memory),
            SQLResultExplainerAgent(user_id, session_id, user_memory),
        ],
        # storage=PostgresStorage(
        #     table_name="chat_messages", db_url=DB_URL, auto_upgrade_schema=True
        # ),
        # add_history_to_messages=True,
        # num_history_runs=5,
        # user_id=user_id,
        # session_id=session_id,
        instructions=[
            "1. Generator creates the SQL query considering conversation history and institution context.",
            "2. The generated query is executed to fetch results from the database.",
            "3. The Explainer provides a user-friendly, business-focused summary WITHOUT mentioning IDs or SQL details.",
            "4. The user should only see the final, actionable business result in natural language.",
        ],
        show_tool_calls=False,
    )
