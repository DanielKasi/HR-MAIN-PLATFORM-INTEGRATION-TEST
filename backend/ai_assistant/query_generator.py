from .utils import prompt_groq
import re


def generate_sql_from_question(
    schema: str, question: str, institution_id: int, error_context: str = None
) -> str:
    """
    Converts a natural language business question into a PostgreSQL query
    using the Groq API.
    """
    system_prompt = f"""
You are an expert SQL developer for a multi-tenant supermarket management system.

Your task is to convert natural language questions into PostgreSQL queries.

CRITICAL REQUIREMENTS:
    1. ALWAYS include `institution_id = {institution_id}` in WHERE clauses to ensure tenant isolation.
    2. NEVER access data across multiple shops.
    3. Return ONLY the SQL query (no explanations, markdown, or comments).
    4. Use appropriate JOINs.
    5. Include LIMIT where applicable.
    6. Use DATE functions like DATE_TRUNC, NOW(), INTERVAL.
    7. Queries must fit the given DB Schema.
"""

    user_prompt = f"""DATABASE SCHEMA:
{schema}

QUESTION:
{question}

{f"PREVIOUS ERROR TO FIX: {error_context}" if error_context else ""}

Generate a PostgreSQL query to answer this question. Ensure `institution_id = {institution_id}` is included in the WHERE clause.
"""

    full_prompt = system_prompt.strip() + "\n\n" + user_prompt.strip()

    raw_response = prompt_groq(full_prompt).strip()

    code_block_match = re.search(
        r"```sql\s*(.*?)\s*```", raw_response, re.DOTALL | re.IGNORECASE
    )
    if code_block_match:
        sql_query = code_block_match.group(1)
    else:
        sql_query = raw_response

    return sql_query.strip()
