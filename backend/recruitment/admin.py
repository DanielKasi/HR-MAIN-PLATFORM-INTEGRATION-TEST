from django.contrib import admin

from .models import JobAdvertApplication, JobInterview, JobPosition, JobPositionAdvert, InterviewStage

admin.site.register(JobPositionAdvert)
admin.site.register(JobAdvertApplication)
admin.site.register(JobInterview)
admin.site.register(JobPosition)
admin.site.register(InterviewStage)
