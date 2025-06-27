from django.contrib import admin
from .models import LeaveType, LeaveApplication, LeavePolicy, LeaveBalance

admin.site.register(LeaveType)
admin.site.register(LeaveApplication)
admin.site.register(LeavePolicy)    
admin.site.register(LeaveBalance)
