from django.contrib import admin
from .models import PublicHoliday, Event, Calendar, EventOccurrence

admin.site.register(PublicHoliday)
admin.site.register(Event)
admin.site.register(Calendar)
admin.site.register(EventOccurrence)
