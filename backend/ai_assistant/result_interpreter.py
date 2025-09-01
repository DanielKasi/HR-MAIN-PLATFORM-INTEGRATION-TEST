from .utils import prompt_groq
import re


def interpret_sql_results_with_groq(
    question: str, columns: list, rows: list, sql: str = None
) -> str:
    if not rows:
        return "No results found for your question."

    row_count = len(rows)
    data_summary = (
        f"Query returned {row_count} rows with columns: {', '.join(columns)}\n\n"
    )
    sample_rows = rows[:10]
    data_summary += "Sample data:\n"
    for i, row in enumerate(sample_rows):
        row_data = dict(zip(columns, row))
        data_summary += f"Row {i + 1}: {row_data}\n"
    if len(rows) > 10:
        data_summary += f"... and {len(rows) - 10} more rows\n"

    system_prompt = """
You are an AI assistant that interprets SQL query results for supermarket managers.

Your job is to convert database output into clear, insightful, and business-relevant summaries.

Guidelines:
1. Provide only concise, direct business insights — no explanations or extra commentary.
2. Do NOT expose or reveal any sensitive or confidential information especially ids in your responses.
3. Use a professional but friendly tone.
4. Focus on patterns, trends, and outliers.
5. Use actual numbers and percentages where applicable.
6. Highlight actionable insights only.
7. Use UGX for monetary values.
8. Avoid showing SQL, markdown, tables, or technical details.
"""

    user_prompt = f"""
ORIGINAL QUESTION: {question}

{f"SQL EXECUTED: {sql}" if sql else ""}

QUERY RESULTS:
{data_summary}

Generate a concise, clear business insight from this data:
"""

    full_prompt = system_prompt.strip() + "\n\n" + user_prompt.strip()

    try:
        return prompt_groq(full_prompt)
    except Exception as e:
        if len(rows) == 1 and len(columns) == 1:
            return f"The answer to your question is: {rows[0][0]}"
        return f"Found {len(rows)} results. Example row: {dict(zip(columns, rows[0]))}"
