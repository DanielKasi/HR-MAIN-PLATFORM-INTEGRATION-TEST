from django.contrib import admin
from .models import SystemConfiguration, MeetingIntegration, EmailProviderConfig

admin.site.register(SystemConfiguration)
admin.site.register(MeetingIntegration)
admin.site.register(EmailProviderConfig)
