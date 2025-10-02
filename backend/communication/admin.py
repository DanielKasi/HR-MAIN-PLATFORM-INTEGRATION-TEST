from django.contrib import admin
from .models import Announcement, EmployeeAnnouncementAcknowledgment, Notification

admin.site.register(Announcement)
admin.site.register(EmployeeAnnouncementAcknowledgment)
admin.site.register(Notification)
