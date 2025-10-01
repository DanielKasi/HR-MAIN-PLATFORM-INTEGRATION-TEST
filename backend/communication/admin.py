from django.contrib import admin
from .models import Announcement, EmployeeAnnouncementAcknowledgment

admin.site.register(Announcement)
admin.site.register(EmployeeAnnouncementAcknowledgment)
