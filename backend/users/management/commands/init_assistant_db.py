import sqlite3
import os
from django.core.management.base import BaseCommand

DB_PATH = os.getenv("SQLITE_DB_PATH", "./assistant_memory.db")


def init_sqlite_db():
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
        """
    )
    connection.commit()
    connection.close()
    return f"Database initialized at {DB_PATH}"


class Command(BaseCommand):
    help = "Initialize the SQLite chat history database"

    def handle(self, *args, **kwargs):
        result = init_sqlite_db()
        self.stdout.write(self.style.SUCCESS(result))
