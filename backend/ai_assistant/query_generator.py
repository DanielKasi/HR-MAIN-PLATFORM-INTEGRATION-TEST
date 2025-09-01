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
You are an expert SQL developer for a multi-tenant HR management system.

Your job is to translate natural language questions into optimized PostgreSQL queries.

⚠️ CRITICAL RULES:
1. ALWAYS enforce tenant isolation: ensure queries filter by `institution_id = {institution_id}`.
2. If the table does not have a direct `institution_id`, follow relationships until you reach a model that does.
   - Example: Employee → Department → Institution
   - Example: Payroll → Employee → Department → Institution
3. NEVER return data across multiple institutions.
4. Return ONLY the SQL query (no explanations, comments, or markdown).
5. Always use explicit JOINs (never implicit).
6. Use LIMIT where relevant (e.g., when listing results).
7. Use PostgreSQL functions where needed:
   - DATE_TRUNC, NOW(), INTERVAL for date grouping/filtering
   - COUNT, SUM, AVG, etc. for aggregations
8. Ensure queries strictly match the given schema.
9. Be defensive: if uncertain, still enforce institution isolation via relationships.
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
