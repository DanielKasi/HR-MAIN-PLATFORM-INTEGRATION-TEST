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
import PyPDF2
from docx import Document
from workflows.models import WorkflowAction, InstitutionApprovalStep, ApprovalTask
from django.contrib.contenttypes.models import ContentType
from django.db import transaction


class JobPositionSerializerWithMinimalData(serializers.ModelSerializer):
    class Meta:
        model = JobPosition
        fields = ["name", "description"]


class JobAdvertApplicationSerializer(serializers.ModelSerializer):
    job_position_advert_job_details = serializers.SerializerMethodField()
    positions = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all()
    )
    reviewed_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), required=False, allow_null=True
    )
    shortlisted_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), required=False, allow_null=True
    )

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
            "created_at",
            "updated_at",
            "created_by",
            "reviewed_by",
            "shortlisted_by",
        ]

    def get_job_position_advert_job_details(self, obj):
        job_position = obj.job_position_advert.job_position
        return {
            "name": job_position.name,
            "description": job_position.description,
            "job_posted_date": obj.job_position_advert.published_date,
            "department": obj.job_position_advert.job_position.department.name,
        }

    def get_positions(self, obj):
        return obj.job_position_advert.number_of_employees_expected

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["created_by"] = CustomUserSerializer(
            instance.created_by, context=self.context
        ).data
        representation["reviewed_by"] = (
            CustomUserSerializer(instance.reviewed_by, context=self.context).data
            if instance.reviewed_by
            else None
        )
        representation["shortlisted_by"] = (
            CustomUserSerializer(instance.shortlisted_by, context=self.context).data
            if instance.shortlisted_by
            else None
        )
        return representation    


class InterviewStageSerializer(serializers.ModelSerializer):
    interviewers_details = EmployeeSerializer(
        source="interviewers", many=True, read_only=True
    )
    candidates = serializers.SerializerMethodField(read_only=True)
    candidates_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InterviewStage
        fields = [
            "id",
            "job_position_advert",
            "name",
            "level",
            "interviewers",
            "interviewers_details",
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
            "job_position_advert_status",
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

    @transaction.atomic
    def create(self, validated_data):

        advert = JobPositionAdvert.objects.create(**validated_data)

        institution = advert.job_position.department.institution

        print(
            f"Creating advert for institution: {institution.institution_name}\n\n\n\n"
        )
        content_type = ContentType.objects.get_for_model(JobPositionAdvert)

        try:
            action = WorkflowAction.objects.get(code="job_position_advertisement")
        except WorkflowAction.DoesNotExist:
            action = None

        if action:
            steps = InstitutionApprovalStep.objects.filter(
                institution=institution, action=action
            ).order_by("level")

            if not steps.exists():
                advert.finish_workflow()
            else:
                for i, step in enumerate(steps):
                    ApprovalTask.objects.create(
                        step=step,
                        content_type=content_type,
                        object_id=advert.id,
                        status="pending" if i == 0 else "not_started",
                    )
        else:
            advert.finish_workflow()

        return advert


class JobPositionSerializer(serializers.ModelSerializer):
    department_details = DepartmentSerializer(source="department", read_only=True)
    reports_to_details = serializers.SerializerMethodField()
    job_adverts = serializers.SerializerMethodField(read_only=True)
    apply_salary_to_employees = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of employee IDs to apply salary change to",
    )
    employees = EmployeeSerializer(many=True, read_only=True)

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
            "offer_letter_template",
            "salary",
            "job_adverts",
            "employees",
            "apply_salary_to_employees",
            "job_position_status",
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

    def validate(self, attrs):
        employee_ids = attrs.get("apply_salary_to_employees", [])
        if employee_ids:
            from employee.models import Employee

            invalid_ids = (
                Employee.objects.exclude(id__in=employee_ids)
                .filter(position=self.instance)
                .values_list("id", flat=True)
            )
            if invalid_ids:
                raise serializers.ValidationError(
                    {
                        "apply_salary_to_employees": f"Some employee IDs are invalid: {list(invalid_ids)}"
                    }
                )
        return attrs

    def create(self, validated_data):
        job_position = JobPosition.objects.create(**validated_data)

        institution = job_position.department.institution
        content_type = ContentType.objects.get_for_model(JobPosition)

        try:
            action = WorkflowAction.objects.get(code="job_position_creation")
        except WorkflowAction.DoesNotExist:
            action = None

        if action:
            steps = InstitutionApprovalStep.objects.filter(
                institution=institution, action=action
            ).order_by("level")

            if not steps.exists():
                job_position.finish_workflow()
            else:
                for i, step in enumerate(steps):
                    ApprovalTask.objects.create(
                        step=step,
                        content_type=content_type,
                        object_id=job_position.id,
                        status="pending" if i == 0 else "not_started",
                    )
        else:
            job_position.finish_workflow()

        return job_position

    def update(self, instance, validated_data):
        from employee.models import Employee

        employee_ids = validated_data.pop("apply_salary_to_employees", [])
        old_salary = instance.salary
        new_salary = validated_data.get("salary", old_salary)

        instance = super().update(instance, validated_data)

        if new_salary is not None and old_salary != new_salary and employee_ids:
            Employee.objects.filter(id__in=employee_ids, position=instance).update(
                salary=new_salary
            )

        return instance


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
            "created_at",
            "updated_at",
            "created_by",
        ]

    def validate(self, attrs):

        if self.instance is None or self.partial is False or "rating" in attrs:
            rating = attrs.get("rating")

            if rating is not None and (rating < 1 or rating > 10):
                raise serializers.ValidationError(
                    {"rating": "Rating must be between 1 and 10."}
                )
        return attrs
