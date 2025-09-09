import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter

# Set the default settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

# Ensure Django is fully initialized
django.setup()

# Django's ASGI application for HTTP (including SSE)
django_asgi_app = get_asgi_application()

# Define the ASGI application
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,  # Handles all HTTP requests, including SSE
    }
)