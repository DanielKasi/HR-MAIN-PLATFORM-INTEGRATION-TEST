from rest_framework import serializers
import re
from employee.models import Employee
from recruitment.models import JobPosition
from institution.models import Department
from general.serializers import BaseApprovableSerializer
from utilities.common_serializers import ContentTypeSerializer
from .models import Announcement, EmployeeAnnouncementAcknowledgment, Notification
from django.contrib.contenttypes.models import ContentType


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class AnnouncementSerializer(BaseApprovableSerializer):
    content_type_name = serializers.SerializerMethodField()
    target_employees = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        many=True,
        required=False
    )
    target_departments = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        many=True,
        required=False
    )
    target_job_positions = serializers.PrimaryKeyRelatedField(
        queryset=JobPosition.objects.all(), 
        many=True,
        required=False
    )
    target_employees_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Announcement
        fields = '__all__'

    def get_content_type_name(self, obj):
        if not getattr(obj, "announcement_type", None):
            return None  # or return "" if you prefer empty string instead

        model_class = obj.announcement_type.model_class()
        if not model_class:
            return obj.announcement_type.name

        name = model_class.__name__
        name = re.sub(r'(?<!^)(?=[A-Z])', ' ', name)
        return name.strip()


    def get_target_employees_details(self, obj):
        from employee.models import Employee
        employees = obj.get_target_employees()
        return [
            {
                'id': emp.id,
                'name': emp.name,
                'email': emp.email,
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

class EmployeeAnnouncementAcknowledgmentSerializer(serializers.ModelSerializer):
    announcement = AnnouncementSerializer(read_only=True)

    class Meta:
        model = EmployeeAnnouncementAcknowledgment
        fields = '__all__'    