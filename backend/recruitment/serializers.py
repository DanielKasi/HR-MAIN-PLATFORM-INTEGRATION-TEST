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
from django.db.models import Q, Count


class JobPositionSerializerWithMinimalData(serializers.ModelSerializer):
    class Meta:
        model = JobPosition
        fields = ["name", "description"]


class JobAdvertApplicationSerializer(serializers.ModelSerializer):
    job_position_advert_job_details = serializers.SerializerMethodField()
    positions = serializers.SerializerMethodField()

    class Meta:
        model = JobAdvertApplication
        fields = [
            "id",
            "job_position_advert",
            "job_position_advert_job_details",
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
            "positions",
        ]

    def get_job_position_advert_job_details(self, obj):
        job_position = obj.job_position_advert.job_position
        return {
            "name": job_position.name,
            "description": job_position.description,
            "job_posted_date": obj.job_position_advert.published_date,
        }

    def get_positions(self, obj):
        return obj.job_position_advert.number_of_employees_expected


class InterviewStageSerializer(serializers.ModelSerializer):
    interviewer_details = EmployeeSerializer(source="interviewer", read_only=True)
    candidates = serializers.SerializerMethodField(read_only=True)
    candidates_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InterviewStage
        fields = [
            "id",
            "job_position_advert",
            "name",
            "level",
            "interviewer",
            "interviewer_details",
            "candidates_count",
            "candidates",
        ]

    def get_candidates(self, obj):
        # Get interviews scheduled for this stage
        scheduled_interviews = JobInterview.objects.filter(
            interview_stage=obj, status="scheduled"
        ).select_related("job_position_application")

        # Get corresponding job applications from the interviews
        applications = [
            interview.job_position_application for interview in scheduled_interviews
        ]

        # Serialize the job applications
        return JobAdvertApplicationSerializer(
            applications, many=True, context=self.context
        ).data

    def get_candidates_count(self, obj):
        return JobInterview.objects.filter(
            interview_stage=obj, status="scheduled"
        ).count()


class JobPositionAdvertSerializer(serializers.ModelSerializer):
    applications = serializers.SerializerMethodField(read_only=True)
    job_position_details = serializers.SerializerMethodField()
    interview_stages = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = JobPositionAdvert
        fields = [
            "id",
            "job_position",
            "job_position_details",
            "status",
            "published_date",
            "expiry_date",
            "number_of_employees_expected",
            "extra_information",
            "applications",
            "interview_stages",
        ]

    def get_applications(self, obj):
        applications = JobAdvertApplication.objects.filter(job_position_advert=obj)
        return JobAdvertApplicationSerializer(applications, many=True).data

    def get_interview_stages(self, obj):
        interview_stages = InterviewStage.objects.filter(job_position_advert=obj)
        return InterviewStageSerializer(
            interview_stages, many=True, context=self.context
        ).data

    def get_job_position_details(self, obj):
        return {
            "id": obj.job_position.id,
            "name": obj.job_position.name,
            "description": obj.job_position.description,
        }


class JobPositionSerializer(serializers.ModelSerializer):
    department_details = DepartmentSerializer(source="department", read_only=True)
    reports_to_details = serializers.SerializerMethodField()
    job_adverts = serializers.SerializerMethodField(read_only=True)

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
            "job_adverts",
        ]

    def get_reports_to_details(self, obj):
        if obj.reports_to:
            return {
                "id": obj.reports_to.id,
                "name": obj.reports_to.name,
                "department": obj.reports_to.department.name,
            }
        return None

    def get_job_adverts(self, obj):
        adverts = JobPositionAdvert.objects.filter(job_position=obj)
        return JobPositionAdvertSerializer(adverts, many=True).data


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
            "interview_date",
            "status",
            "feedback",
            "rating",
            "interview_type",
            "location",
            "interview_time",
            "additional_notes",
        ]

    def validate(self, attrs):

        if self.instance is None or self.partial is False or "rating" in attrs:
            rating = attrs.get("rating")

            if rating is not None and (rating < 1 or rating > 10):
                raise serializers.ValidationError(
                    {"rating": "Rating must be between 1 and 10."}
                )
        return attrs
