from rest_framework import serializers
from institution.serializers import DepartmentSerializer
from recruitment.models import (
    JobPosition,
    JobPositionAdvert,
    JobAdvertApplication,
    InterviewStage,
    JobInterview,
)
from employee.serializers import EmployeeSerializer


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


class JobPositionAdvertSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPositionAdvert
        fields = [
            "id",
            "job_position",
            "status",
            "published_date",
            "expiry_date",
            "number_of_employees_expected",
            "extra_information",
        ]


class JobAdvertApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobAdvertApplication
        fields = [
            "id",
            "job_position_advert",
            "applicant_name",
            "applicant_email",
            "applicant_phone",
            "resume",
            "cover_letter",
            "application_date",
            "status",
            "gender",
            "state",
            "address",
            "country",
            "source",
        ]


class InterviewStageSerializer(serializers.ModelSerializer):
    interviewer_details = EmployeeSerializer(source="interviewer", read_only=True)

    class Meta:
        model = InterviewStage
        fields = [
            "id",
            "job_position_advert",
            "name",
            "level",
            "interviewer",
            "interviewer_details",
        ]


class JobInterviewSerializer(serializers.ModelSerializer):
    job_position_application_details = JobAdvertApplicationSerializer(
        source="job_position_application", read_only=True
    )
    interview_stage_details = InterviewStageSerializer(
        source="interview_stage", read_only=True
    )

    class Meta:
        model = JobInterview
        fields = [
            "id",
            "job_position_application",
            "job_position_application_details",
            "interview_stage",
            "interview_stage_details",
            "scheduled_date",
            "status",
            "feedback",
            "rating",
        ]
