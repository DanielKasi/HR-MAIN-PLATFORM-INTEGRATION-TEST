from rest_framework import serializers
from institution.serializers import DepartmentSerializer
from recruitment.models import (
    JobPosition,
    JobPositionAdvert,
    JobAdvertApplication,
    InterviewStage,
    JobInterview,
)


class JobPositionSerializer(serializers.ModelSerializer):
    department_details = DepartmentSerializer(source="department", read_only=True)
    reports_to_details = serializers.SerializerMethodField()

    class Meta:
        model = JobPosition
        fields = [
            "id",
            "name",
            "description",
            "department",
            "department_details",
            "reports_to",
            "reports_to_details",
            "contract_template",
            "offer_letter_template",
            "salary",
        ]

    def get_reports_to_details(self, obj):
        if obj.reports_to:
            return {
                "id": obj.reports_to.id,
                "name": obj.reports_to.name,
                "email": obj.reports_to.email,
                "department": obj.reports_to.department.name,
            }
        return None
