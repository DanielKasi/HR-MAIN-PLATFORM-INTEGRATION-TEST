from django.contrib import admin

from .models import JobAdvertApplication, JobInterview, JobPosition, JobPositionAdvert

admin.site.register(JobPositionAdvert)
admin.site.register(JobAdvertApplication)
admin.site.register(JobInterview)
admin.site.register(JobPosition)
