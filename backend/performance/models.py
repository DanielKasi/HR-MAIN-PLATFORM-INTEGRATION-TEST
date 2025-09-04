# from django.db import models
# from approval.models import BaseApprovableModel
# from employee.models import Employee
# from institution.models import Institution
# from django.utils import timezone
# from utilities.utility_base_model import SoftDeletableTimeStampedModel


# class Period(BaseApprovableModel):   
#     institution = models.ForeignKey(Institution, on_delete=models.CASCADE) 
#     name = models.CharField(max_length=50)
#     start_date = models.DateField()
#     end_date = models.DateField()
#     is_closed = models.BooleanField(default=False)

#     def __str__(self):
#         return self.name
    
#     def get_institution(self):
#         return self.institution 
    
# class Objectives(BaseApprovableModel):
#     DURATION_CHOICES = [
#         ("days", "Days"),
#         ("months", "Months"),
#         ("years", "Years")
#     ]
#     Institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
#     name = models.CharField(max_length=50)
#     description = models.CharField(max_length=255)
#     managers = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True)
#     duration_unit = models.CharField(
#         max_length=255,
#         choices=DURATION_CHOICES,
#         default="days"
#     )
#     duration = models.DurationField()
#     key_result = models.ForeignKey('KeyResult', on_delete=models.SET_NULL, null=True, blank=True)
#     assignees = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True)
    
  
    