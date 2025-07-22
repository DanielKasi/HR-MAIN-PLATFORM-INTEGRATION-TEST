from django.contrib import admin
from .models import Project, Task, TaskDocument, TaskTimeSheet, ProjectDocument


admin.site.register(Project)
admin.site.register(Task)
admin.site.register(TaskDocument)
admin.site.register(TaskTimeSheet)
admin.site.register(ProjectDocument)
