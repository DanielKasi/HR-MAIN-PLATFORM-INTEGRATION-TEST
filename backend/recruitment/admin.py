from django.contrib import admin

from .models import JobAdvertApplication, JobInterview, JobPosition, JobPositionAdvert, InterviewStage, JobPositionDocumentTemplate, SkillZoneCategory, SkillZone, ApplicationDocument

admin.site.register(JobPositionAdvert)
admin.site.register(JobAdvertApplication)
admin.site.register(JobInterview)
admin.site.register(JobPosition)
admin.site.register(InterviewStage)
admin.site.register(SkillZoneCategory)
admin.site.register(SkillZone)
admin.site.register(ApplicationDocument)
admin.site.register(JobPositionDocumentTemplate)

