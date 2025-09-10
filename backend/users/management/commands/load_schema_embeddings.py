from django.core.management.base import BaseCommand
from agno.knowledge.text import TextKnowledgeBase
from agno.vectordb.pgvector import PgVector
from agno.embedder.openai import OpenAIEmbedder
import os

VECTOR_TABLE_NAME = "public.sql_knowledge1"
SCHEMA_FILE = "db_schema_and_rules.txt"


class Command(BaseCommand):
    help = "Load schema embeddings into PgVector (one-time setup)"

    def handle(self, *args, **options):
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            self.stderr.write(self.style.ERROR("DATABASE_URL not set in environment"))
            return

        if not os.path.exists(SCHEMA_FILE):
            self.stderr.write(self.style.ERROR(f"Schema file not found: {SCHEMA_FILE}"))
            return

        self.stdout.write("Loading schema embeddings into PgVector...")

        knowledge_base = TextKnowledgeBase(
            path=SCHEMA_FILE,
            vector_db=PgVector(
                table_name=VECTOR_TABLE_NAME, db_url=db_url, embedder=OpenAIEmbedder()
            ),
        )

        knowledge_base.load(recreate=False)

        self.stdout.write(
            self.style.SUCCESS(f"Schema embeddings loaded into '{VECTOR_TABLE_NAME}'")
        )
