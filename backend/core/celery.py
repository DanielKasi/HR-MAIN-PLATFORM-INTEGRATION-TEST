import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("core")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()

app.conf.beat_schedule = {
    "check-inactive-devices-every-minute": {
        "task": "devices.tasks.check_inactive_devices",
        "schedule": 120.0,
    },
}
