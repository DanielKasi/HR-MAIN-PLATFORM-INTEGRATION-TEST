from django.contrib import admin

from .models import JobAdvertApplication, JobInterview, JobPosition, JobPositionAdvert, InterviewStage, ContractTemplate

admin.site.register(JobPositionAdvert)
admin.site.register(JobAdvertApplication)
admin.site.register(JobInterview)
admin.site.register(JobPosition)
admin.site.register(InterviewStage)
admin.site.register(ContractTemplate)
