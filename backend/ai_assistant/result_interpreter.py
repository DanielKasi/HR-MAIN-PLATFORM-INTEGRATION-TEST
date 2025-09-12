from .utils import prompt_groq
import re

FRONTEND_LINKS = {
    "Employee List": "/employees/employee-list",
    "Job Adverts": "/job-adverts",
    "Institution Assets": "/assets/assets",
    "Institution Asset Allocations": "/assets/asset-allocations",
    "Institution Asset Requests": "/assets/asset-requests",
    "Institution Branches": "/branches",
    "Institution Departments": "/admin/departments",
    "Institution Job Positions": "/job-positions",
    "Employee Terminations ": "/off-boarding/terminations",
    "Employee Allowance": "/payroll/employee-allowance",
    "Employee Deductions": "/payroll/employee-deductions",
    "Employee Tax": "/payroll/employee-tax",
    "Institution Taxes": "/admin/taxes",
    "Institution Allowance Types": "/payroll/allowance-types",
    "Institution Deduction Types": "/payroll/deduction-types",
    "Institution Projects": "/projects",
    "Employee Shifts Requests or Allocations": "/employees/shift-requests",
}


def interpret_sql_results_with_groq(
    question: str, columns: list, rows: list, recent_chats: list, sql: str = None
) -> tuple[str, list[str]]:
    """
    Returns:
        interpretation (str): AI-generated business insight.
        frontend_links (list[str]): Recommended frontend links (can be empty list if none relevant).
    """
    if not rows:
        return (
            "No results were found for your query. If you believe this is an error, please contact your IT administrator for support.",
            [],
        )

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

    system_prompt = f"""
You are an AI assistant that interprets SQL query results for institution(HR) managers.

Guidelines:
Note: While responding to would be questions, look at the last messages in the memory provided.
1. Provide concise, actionable business insights — no explanations or extra commentary.
2. Do NOT expose sensitive or confidential information, this includes ids of different objects or data in the table.
3. Use a professional but friendly tone.
4. Focus on patterns, trends, and outliers.
5. Use actual numbers and percentages where applicable.
6. Highlight actionable insights only.
7. Use UGX for monetary values.
8. Avoid showing SQL, markdown, tables, or technical details.
9. Suggest **one or more frontend links** from this list if relevant: {list(FRONTEND_LINKS.values())}.
   If none are relevant, respond with an empty list `[]`.
10. Return the response in this format:
11. While responding to questions where user was indoubt of the answer, since you have access to previous chats, answers them like your sure ie Yes, .... like that, Try not expose IDs, consider using names.

Insight: <your business insight here>
Frontend Links: [<link1>, <link2>, ...]  # a JSON-style list
"""

    user_prompt = f"""
ORIGINAL QUESTION: {question}

{f"SQL EXECUTED: {sql}" if sql else ""}

QUERY RESULTS:
{data_summary}

Generate the Insight and Frontend Links as per the system guidelines.
"""

    full_prompt = system_prompt.strip() + "\n\n" + user_prompt.strip()

    try:
        response = prompt_groq(full_prompt)
        match = re.search(
            r"Insight:\s*(.*)\nFrontend Links:\s*(.*)", response, re.DOTALL
        )
        if match:
            insight_text = match.group(1).strip()
            links_text = match.group(2).strip()
            try:
                frontend_links = eval(
                    links_text
                )  # safely convert JSON-style list to Python list
                if not isinstance(frontend_links, list):
                    frontend_links = []
            except Exception:
                frontend_links = []
            return insight_text, frontend_links

        # fallback if parsing fails
        return response, []
    except Exception:
        if len(rows) == 1 and len(columns) == 1:
            return f"The answer to your question is: {rows[0][0]}", []
        return (
            f"Found {len(rows)} results. Example row: {dict(zip(columns, rows[0]))}",
            [],
        )
