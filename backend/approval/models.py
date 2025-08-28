from django.db import models
from utilities.utility_base_model import UtilityBaseModel
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from institution.models import Institution

class Action(UtilityBaseModel):
    name = models.CharField(max_length=255)
    code = models.ChairField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.name.upper().replace(' ', '_')

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']    

class ApproverGroup(UtilityBaseModel):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)   
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.institution.name}"

    class Meta:
        unique_together = ['institution', 'name']     
