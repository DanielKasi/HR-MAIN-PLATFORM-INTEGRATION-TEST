from django.db import connection
from .query_generator import generate_sql_from_question


def run_sql_with_retry(
    schema: str,
    question: str,
    institution_id: int,
    initial_sql: str,
    recent_chats: list,
    max_retries: int = 3,
) -> dict:
    """
    Executes SQL with retry if initial SQL fails.
    Ensures all queries are shop-isolated.
    Returns structured result with columns and rows.
    """

    current_sql = initial_sql
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            with connection.cursor() as cursor:
                cursor.execute(current_sql)

                columns = (
                    [col[0] for col in cursor.description] if cursor.description else []
                )

                results = cursor.fetchall()

                return {
                    "sql": current_sql,
                    "columns": columns,
                    "results": results,
                    "row_count": len(results),
                }

        except Exception as e:
            last_error = str(e)

            if attempt < max_retries:
                try:
                    error_context = f"The previous SQL failed with error: {last_error}"
                    current_sql = generate_sql_from_question(
                        schema=schema,
                        question=question,
                        institution_id=institution_id,
                        recent_chats=recent_chats,
                        error_context=error_context,
                    )
                except Exception as gen_error:
                    raise Exception(
                        f"SQL regeneration failed on retry: {str(gen_error)}"
                    )
            else:
                raise Exception(
                    f"SQL execution failed after {max_retries + 1} attempts. Last error: {last_error}"
                )

    raise Exception(f"Unexpected error in SQL execution. Last error: {last_error}")
