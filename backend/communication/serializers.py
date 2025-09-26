from rest_framework import serializers
import re
from approval.serializers import BaseApprovableSerializer
from utilities.common_serializers import ContentTypeSerializer
from .models import Announcement, Acknowledgment
from django.contrib.contenttypes.models import ContentType

class AnnouncementSerializer(BaseApprovableSerializer):
    content_type_name = serializers.SerializerMethodField()
    target_employees = serializers.SerializerMethodField()
    target_departments = serializers.SerializerMethodField()
    target_job_positions = serializers.SerializerMethodField()


  
    class Meta:
        model = Announcement
        fields = '__all__'

    def get_content_type_name(self, obj):
        model_class = obj.announcement_type.model_class()
        if not model_class:
            return obj.announcement_type.name
        name = model_class.__name__
        name = re.sub(r'(?<!^)(?=[A-Z])', ' ', name)
        return name.strip()    
    
    def get_target_employees(self, obj):
        from employee.models import Employee
        employees = obj.target_employees.all()
        return [
            {
                'id': emp.id,
                'name': emp.name,
                'email': emp.email,
                'department': emp.department.id if emp.department else None,
                'position': emp.position.id if emp.position else None
            }
            for emp in employees
        ]

    def get_target_departments(self, obj):
        from institution.models import Department
        departments = obj.target_departments.all()
        return [{'id': dept.id, 'name': dept.name} for dept in departments]

    def get_target_job_positions(self, obj):
        from recruitment.models import JobPosition
        job_positions = obj.target_job_positions.all()
        return [{'id': jp.id, 'title': jp.title} for jp in job_positions]

class AcknowledgmentSerializer(serializers.ModelSerializer):
    announcement = AnnouncementSerializer(read_only=True)

    class Meta:
        model = Acknowledgment
        fields = '__all__'       