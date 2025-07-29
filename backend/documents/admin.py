from django.contrib import admin
from .models import DocumentType, DocumentTemplate, Document

admin.site.register(DocumentType)
admin.site.register(DocumentTemplate)
admin.site.register(Document)
