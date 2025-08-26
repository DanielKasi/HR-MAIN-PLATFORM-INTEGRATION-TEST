from rest_framework import serializers
from rest_framework.exceptions import ValidationError
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
from users.models import CustomUser
from users.serializers import CustomUserSerializer
from recruitment.models import RequiredDocument
from employee.models import Employee, WorkType, EmployeeType




class JobPositionSerializerWithMinimalData(serializers.ModelSerializer):
    class Meta:
        model = JobPosition
        fields = ["name", "description"]


class JobAdvertApplicationSerializer(serializers.ModelSerializer):
    job_position_advert_job_details = serializers.SerializerMethodField()
    positions = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    reviewed_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), required=False, allow_null=True
    )
    shortlisted_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), required=False, allow_null=True
    )
    recommended_by = serializers.PrimaryKeyRelatedField(
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
            "recommended_by",
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
        representation["recommended_by"] = (
            CustomUserSerializer(instance.recommended_by, context=self.context).data
            if instance.recommended_by
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
            'feedback_fields',
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
    
    def validate_feedback_fields(self, value):
        """
        Validates the structure of the feedback_fields JSON data.
        """
        if not isinstance(value, list):
            raise ValidationError({"error": "feedback_fields must be a list of objects."})

        # Define valid field types
        valid_types = ["text", "rating", "checkbox"]

        for field in value:
            # Check if each item is a dictionary
            if not isinstance(field, dict):
                raise ValidationError({"error": "Each feedback field must be an object."})

            # Check for required properties in each field
            required_props = ["label", "type", "required"]
            if not all(prop in field for prop in required_props):
                missing_props = [prop for prop in required_props if prop not in field]
                raise ValidationError(
                    {"error": f"Missing required properties in a feedback field: {', '.join(missing_props)}."}
                )

            # Validate the type of the field
            if field["type"] not in valid_types:
                raise ValidationError(
                    {"error": f"Invalid field type '{field['type']}'. Must be one of: {', '.join(valid_types)}."}
                )

            # Specific validation for 'rating' type
            if field["type"] == "rating":
                if "options" not in field:
                    raise ValidationError(
                        {"error": "A 'rating' type field must have an 'options' list."}
                    )
                if not isinstance(field["options"], list) or not all(isinstance(i, int) for i in field["options"]):
                    raise ValidationError(
                        {"error": "'options' for a 'rating' type must be a list of integers."}
                    )

            # Ensure 'required' is a boolean
            if not isinstance(field["required"], bool):
                raise ValidationError(
                    {"error": "'required' property must be a boolean."}
                )
        
        return value



class JobPositionAdvertSerializer(serializers.ModelSerializer):
    applications = serializers.SerializerMethodField(read_only=True)
    job_position_details = serializers.SerializerMethodField()
    interview_stages = serializers.SerializerMethodField(read_only=True)
    work_type = serializers.PrimaryKeyRelatedField(queryset=WorkType.objects.all(), required=False)
    employee_type = serializers.PrimaryKeyRelatedField(queryset=EmployeeType.objects.all(), required=False)
    institution = serializers.SerializerMethodField()

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
            "work_type",
            "employee_type",
            "institution"
        ]

    def get_institution(self, obj):
        department = getattr(obj.job_position, "department", None)
        if department and hasattr(department, "institution") and department.institution:
            institution = department.institution
            return {
                "id": institution.id,
                "name": institution.institution_name
            }
        return None    

    def to_representation(self, instance):
        """Customize output for work_type and employee_type"""
        representation = super().to_representation(instance)

        # Add work_type details
        if instance.work_type:
            representation["work_type"] = {
                "id": instance.work_type.id,
                "name": instance.work_type.name 
            }

        # Add employee_type details
        if instance.employee_type:
            representation["employee_type"] = {
                "id": instance.employee_type.id,
                "name": instance.employee_type.name  
            }

        return representation   

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


class RequiredDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequiredDocument
        fields = ["id", "document_name", "description", "is_optional"]


class JobPositionSerializer(serializers.ModelSerializer):
    department_details = serializers.SerializerMethodField(read_only=True)
    reports_to_details = serializers.SerializerMethodField()
    job_adverts = serializers.SerializerMethodField(read_only=True)
    apply_salary_to_employees = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of employee IDs to apply minimum salary to",
    )
    employees = EmployeeSerializer(many=True, read_only=True)
    required_documents = RequiredDocumentSerializer(many=True, required=False)
    
    # Add computed salary fields
    salary_range_display = serializers.ReadOnlyField()
    salary_midpoint = serializers.ReadOnlyField()

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
            "salary_min",
            "salary_max",  # Fixed typo: was "salery_max"
            "salary_range_display",
            "salary_midpoint",
            "job_adverts",
            "employees",
            "apply_salary_to_employees",
            "job_position_status",
            "is_active",
            "required_documents",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from institution.serializers import DepartmentSerializer

        self.fields["department_details"] = DepartmentSerializer(
            source="department", read_only=True
        )

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
        # Validate salary range
        salary_min = attrs.get('salary_min')
        salary_max = attrs.get('salary_max')
        
        if salary_min and salary_max and salary_max < salary_min:
            raise serializers.ValidationError({
                'salary_max': 'Maximum salary must be greater than or equal to minimum salary.'
            })

        # Validate employee IDs
        employee_ids = attrs.get("apply_salary_to_employees", [])
        if employee_ids:


            invalid_ids = (
                Employee.objects.exclude(id__in=employee_ids)
                .filter(position=self.instance)
                .values_list("id", flat=True)
            )
            if invalid_ids:
                raise serializers.ValidationError(
                    {
                        "error": f"Some employee IDs are invalid: {list(invalid_ids)}"
                    }
                )
        return attrs

    def create(self, validated_data):
        documents_data = validated_data.pop("required_documents", [])
        validated_data.pop("apply_salary_to_employees", [])  # Remove this from model creation

        job_position = JobPosition.objects.create(**validated_data)

        institution = job_position.department.institution
        content_type = ContentType.objects.get_for_model(JobPosition)

        for doc_data in documents_data:
            RequiredDocument.objects.create(
                content_type=content_type,
                object_id=job_position.id,
                **doc_data
            )

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

        employee_ids = validated_data.pop("apply_salary_to_employees", [])
        documents_data = validated_data.pop("required_documents", None)
        
        # Get old and new salary_min for comparison
        old_salary_min = instance.salary_min
        new_salary_min = validated_data.get("salary_min", old_salary_min)
        
        instance = super().update(instance, validated_data)

        # Update required documents if provided
        if documents_data is not None:
            instance.required_documents.all().delete()
            content_type = ContentType.objects.get_for_model(JobPosition)
            for doc in documents_data:
                RequiredDocument.objects.create(
                    content_type=content_type,
                    object_id=instance.id,
                    **doc
                )

        # Apply salary_min to selected employees if it changed
        if (new_salary_min is not None and 
            old_salary_min != new_salary_min and 
            employee_ids):
            Employee.objects.filter(
                id__in=employee_ids, 
                position=instance
            ).update(salary=new_salary_min)

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
                    {"error": "Rating must be between 1 and 10."}
                )
        return attrs
