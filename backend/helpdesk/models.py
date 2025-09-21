from django.db import models
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from employee.models import Employee
from approval.models import BaseApprovableModel


class FAQCategory(BaseApprovableModel):
    institution = models.ForeignKey(
        "institution.Institution", on_delete=models.CASCADE, related_name="faq_categories"
    )
    name = models.CharField(max_length=255)
    description = models.TextField()

    def __str__(self):
        return f"{self.name}"

    def get_institution(self):
        return self.institution


class FAQ(BaseApprovableModel):
    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.ForeignKey(
        FAQCategory, on_delete=models.CASCADE, related_name="faqs"
    )

    def __str__(self):
        return f"{self.question}"

    def get_institution(self):
        return self.category.institution
    
class TicketStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    CLOSED = 'CLOSED', 'Closed'

class TicketPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'

class TicketCategory(BaseApprovableModel):
    institution = models.ForeignKey(
        "institution.Institution", on_delete=models.CASCADE, related_name="ticket_categories"
    )   
    name = models.CharField(max_length=255)   
    description = models.TextField()      

    def __str__(self):
        return f"{self.name}"
    
    def get_institution(self):
        return self.institution
    
class Ticket(BaseApprovableModel):
    title = models.CharField(max_length=255)    
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN)
    priority = models.CharField(max_length=20, choices=TicketPriority.choices, default=TicketPriority.MEDIUM)
    category = models.ForeignKey(TicketCategory, on_delete=models.CASCADE, null=True)
    assigned_to = models.ForeignKey(Employee, on_delete=models.CASCADE, null=True, related_name='assigned_tickets')

    def __str__(self):
        return f"{self.title}"

    def get_institution(self):
        return self.category.institution
    
class TicketComment(SoftDeletableTimeStampedModel):    
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    comment = models.TextField()

    def __str__(self):
        return f"{self.ticket.title}"
    

class TicketAttachment(SoftDeletableTimeStampedModel):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='tickets/attachments/')

    def __str__(self):
        return f"{self.ticket.title}"