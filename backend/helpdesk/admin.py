from django.contrib import admin
from .models import Ticket, TicketAttachment, TicketCategory, TicketComment, FAQ, FAQCategory

admin.site.register(Ticket)
admin.site.register(TicketAttachment)
admin.site.register(TicketCategory)
admin.site.register(TicketComment)
admin.site.register(FAQ)
admin.site.register(FAQCategory)
