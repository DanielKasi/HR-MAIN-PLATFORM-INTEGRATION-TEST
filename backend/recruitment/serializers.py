from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from documents.models import DocumentTemplate
from recruitment.models import (
    JobPosition,
    JobPositionAdvert,
    JobAdvertApplication,
    InterviewStage,
    JobInterview,
    JobPositionDocumentTemplate,
    SkillZone,
    SkillZoneCategory,
    ApplicationDocument,
)
from employee.serializers import EmployeeSerializer
from django.db.models import Q, Count
import PyPDF2
from docx import Document
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from users.models import CustomUser
from users.serializers import CustomUserSerializer
from recruitment.models import RequiredDocument, ApplicationDocument
from employee.models import Employee, WorkType, EmployeeType
from general.serializers import BaseApprovableSerializer
import copy


class RequiredDocumentSerializer(serializers.ModelSerializer):
    content_object = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RequiredDocument
        fields = ["id", "document_name", "description", "is_optional", "content_object"]

    def get_content_object(self, obj):
        if not obj.content_object:
            return None
        content_type = obj.content_type
        model_class = content_type.model_class()
        obj_instance = obj.content_object
        representation = {
            "model": content_type.model,
            "app_label": content_type.app_label,
            "id": obj_instance.id,
        }
        return representation
    
class ApplicationDocumentSerializer(serializers.ModelSerializer):
    required_document = RequiredDocumentSerializer(read_only=True)

    class Meta:
        model = ApplicationDocument
        fields = '__all__'

    def validate_file(self, value):
        if value.size > 5 * 1024 * 1024:  
            raise serializers.ValidationError({"error": "File size must be under 5MB"})
        if not value.name.lower().endswith(('.pdf', '.doc', '.docx')):
            raise serializers.ValidationError({"error": "Only PDF, DOC, or DOCX files are allowed"})
        return value    



class JobPositionSerializerWithMinimalData(serializers.ModelSerializer):
    class Meta:
        model = JobPosition
        fields = ["name", "description"]



class JobAdvertApplicationSerializer(serializers.ModelSerializer):
    job_position_advert_job_details = serializers.SerializerMethodField()
    positions = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    reviewed_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), required=False, allow_null=True
    )
    shortlisted_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), required=False, allow_null=True
    )
    recommended_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), required=False, allow_null=True
    )
    documents = ApplicationDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = JobAdvertApplication
        fields = '__all__'

    def validate(self, data):
        job_position_advert = data.get("job_position_advert")
        content_type = ContentType.objects.get_for_model(JobPositionAdvert)
        required_documents = RequiredDocument.objects.filter(
            content_type=content_type, object_id=job_position_advert.id, is_optional=False
        )
        request = self.context.get("request")
        files = getattr(request, 'FILES', {}) if request else {}
        post_data = getattr(request, 'POST', {}) if request else {}

        for req_doc in required_documents:
            file_key = f"document_{req_doc.id}"
            if file_key not in files:
                raise serializers.ValidationError(
                    f"Missing required document: {req_doc.document_name}"
                )

        return data

    @transaction.atomic
    def create(self, validated_data):
        application = JobAdvertApplication.objects.create(**validated_data)

        request = self.context.get("request")
        content_type = ContentType.objects.get_for_model(JobPositionAdvert)
        if request and hasattr(request, 'FILES'):
            for key, file in request.FILES.items():
                if key.startswith("document_"):
                    try:
                        doc_id = int(key.split("_")[1])
                        required_document = RequiredDocument.objects.get(
                            id=doc_id,
                            content_type=content_type,
                            object_id=application.job_position_advert.id
                        )
                        ApplicationDocument.objects.create(
                            job_advert_application=application,
                            required_document=required_document,
                            file=file
                        )
                    except (ValueError, RequiredDocument.DoesNotExist) as e:
                        continue

        return application

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
        ).data if instance.created_by else None
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


class InterviewStageSerializer(BaseApprovableSerializer):
    interviewers_details = EmployeeSerializer(
        source="interviewers", many=True, read_only=True
    )
    candidates = serializers.SerializerMethodField(read_only=True)
    candidates_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InterviewStage
        fields = '__all__'

    def get_candidates(self, obj):
        scheduled_interviews = JobInterview.objects.filter(
            interview_stage=obj, status="scheduled"
        ).select_related("job_position_application")

        applications = [
            interview.job_position_application for interview in scheduled_interviews
        ]

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

        valid_types = ["text", "rating", "checkbox"]

        for field in value:
            if not isinstance(field, dict):
                raise ValidationError({"error": "Each feedback field must be an object."})

            required_props = ["label", "type", "required"]
            if not all(prop in field for prop in required_props):
                missing_props = [prop for prop in required_props if prop not in field]
                raise ValidationError(
                    {"error": f"Missing required properties in a feedback field: {', '.join(missing_props)}."}
                )

            if field["type"] not in valid_types:
                raise ValidationError(
                    {"error": f"Invalid field type '{field['type']}'. Must be one of: {', '.join(valid_types)}."}
                )

            if field["type"] == "rating":
                if "options" not in field:
                    raise ValidationError(
                        {"error": "A 'rating' type field must have an 'options' list."}
                    )
                if not isinstance(field["options"], list) or not all(isinstance(i, int) for i in field["options"]):
                    raise ValidationError(
                        {"error": "'options' for a 'rating' type must be a list of integers."}
                    )

            if not isinstance(field["required"], bool):
                raise ValidationError(
                    {"error": "'required' property must be a boolean."}
                )
        
        return value



class JobPositionAdvertSerializer(BaseApprovableSerializer):
    applications = serializers.SerializerMethodField(read_only=True)
    job_position_details = serializers.SerializerMethodField()
    interview_stages = serializers.SerializerMethodField(read_only=True)
    work_type = serializers.PrimaryKeyRelatedField(queryset=WorkType.objects.all(), required=False)
    employee_type = serializers.PrimaryKeyRelatedField(queryset=EmployeeType.objects.all(), required=False)
    institution = serializers.SerializerMethodField()
    required_documents = RequiredDocumentSerializer(many=True, required=False)

    class Meta:
        model = JobPositionAdvert
        fields = '__all__'

    def get_required_documents(self, obj):
        content_type = ContentType.objects.get_for_model(JobPositionAdvert)
        documents = RequiredDocument.objects.filter(
            content_type=content_type, object_id=obj.id
        )
        return RequiredDocumentSerializer(documents, many=True, context=self.context).data

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
        representation = super().to_representation(instance)
        if instance.work_type:
            representation["work_type"] = {
                "id": instance.work_type.id,
                "name": instance.work_type.name 
            }
        if instance.employee_type:
            representation["employee_type"] = {
                "id": instance.employee_type.id,
                "name": instance.employee_type.name  
            }
        representation["required_documents"] = self.get_required_documents(instance)
        return representation   
    
    def get_applications(self, obj):
        applications = JobAdvertApplication.objects.filter(job_position_advert=obj)
        return JobAdvertApplicationSerializer(applications, many=True, context=self.context).data

    def get_interview_stages(self, obj):
        interview_stages = InterviewStage.objects.filter(job_position_advert=obj)
        return InterviewStageSerializer(interview_stages, many=True, context=self.context).data

    def get_job_position_details(self, obj):
        return {
            "id": obj.job_position.id,
            "name": obj.job_position.name,
            "description": obj.job_position.description,
        }

    def validate(self, data):
        return data

    @transaction.atomic
    def create(self, validated_data):
        required_documents_data = validated_data.pop("required_documents", [])

        advert = JobPositionAdvert.objects.create(**validated_data)

        content_type = ContentType.objects.get_for_model(JobPositionAdvert)
        for doc_data in required_documents_data:
            RequiredDocument.objects.create(
                content_type=content_type,
                object_id=advert.id,
                **doc_data
            )

        return advert
    
    @transaction.atomic
    def update(self, validated_data):
        required_documents_data = validated_data.pop("required_documents", None)
        
        instance = super().update(instance, validated_data)
        
        if required_documents_data is not None:
            content_type = ContentType.objects.get_for_model(JobPositionAdvert)
            RequiredDocument.objects.filter(
                content_type=content_type, object_id=instance.id
            ).delete()
            for doc_data in required_documents_data:
                RequiredDocument.objects.create(
                    content_type=content_type,
                    object_id=instance.id,
                    document_name=doc_data.get("document_name"),
                    description=doc_data.get("description", ""),
                    is_optional=doc_data.get("is_optional", False)
                )
        
        return instance

class JobPositionDocumentTemplateSerializer(serializers.ModelSerializer):
    document_template = serializers.PrimaryKeyRelatedField(queryset=DocumentTemplate.objects.all())

    class Meta:
        model = JobPositionDocumentTemplate
        fields = ['document_template', 'purpose']

    def to_internal_value(self, data):
        print(f"JobPositionDocumentTemplateSerializer to_internal_value input: {data}")
        return super().to_internal_value(data)

    def to_representation(self, instance):
        print(f"JobPositionDocumentTemplateSerializer to_representation instance: {instance}")
        ret = super().to_representation(instance)
        print(f"JobPositionDocumentTemplateSerializer to_representation output: {ret}")
        return ret

    def validate(self, attrs):
        print(f"Validating JobPositionDocumentTemplateSerializer with attrs: {attrs}")
        purpose = attrs.get('purpose')
        
        # Validate purpose
        valid_purposes = [choice[0] for choice in JobPositionDocumentTemplate._meta.get_field('purpose').choices]
        if purpose not in valid_purposes:
            raise serializers.ValidationError({
                'purpose': f"Purpose must be one of: {', '.join(valid_purposes)}."
            })
        
        # Check for duplicate purpose
        job_position = self.context.get('job_position')
        if job_position and JobPositionDocumentTemplate.objects.filter(
            job_position=job_position,
            purpose=purpose
        ).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError({
                'purpose': f"A template with purpose '{purpose}' already exists for this job position."
            })
        
        return attrs

    


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
    salary_range_display = serializers.ReadOnlyField()
    salary_midpoint = serializers.ReadOnlyField()
    document_templates = JobPositionDocumentTemplateSerializer(
        source='document_template_assignments',  # For serialization (response)
        many=True,
        required=False
    )

    class Meta:
        model = JobPosition
        fields = '__all__'

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
    
    def to_internal_value(self, data):
        print(f"Raw JobPositionSerializer data: {data}")
        # Preserve document_templates as raw data
        data = copy.deepcopy(data)
        # Rename document_templates to document_template_assignments for validation
        if 'document_templates' in data:
            data['document_template_assignments'] = data.pop('document_templates')
        internal_data = super().to_internal_value(data)
        print(f"Internal data after processing: {internal_data}")
        # Rename back to document_templates for create/update
        if 'document_template_assignments' in internal_data:
            internal_data['document_templates'] = internal_data.pop('document_template_assignments')
        return internal_data

    def validate(self, attrs):
        salary_min = attrs.get('salary_min')
        salary_max = attrs.get('salary_max')
        if salary_min and salary_max and salary_max < salary_min:
            raise serializers.ValidationError({
                'salary_max': 'Maximum salary must be greater than or equal to minimum salary.'
            })

        employee_ids = attrs.get("apply_salary_to_employees", [])
        if employee_ids:
            invalid_ids = (
                Employee.objects.exclude(id__in=employee_ids)
                .filter(position=self.instance)
                .values_list("id", flat=True)
            )
            if invalid_ids:
                raise serializers.ValidationError(
                    {"error": f"Some employee IDs are invalid: {list(invalid_ids)}"}
                )
        return attrs

    def create(self, validated_data):
        print(f"Creating JobPosition with validated_data: {validated_data}")
        document_templates_data = validated_data.pop("document_templates", [])
        
        with transaction.atomic():
            job_position = JobPosition.objects.create(**validated_data)
            
            for template_data in document_templates_data:
                print(f"Processing template_data: {template_data}")
                document_template = template_data['document_template']
                if isinstance(document_template, DocumentTemplate):
                    document_template = document_template.pk
                serializer_data = {
                    'document_template': document_template,
                    'purpose': template_data['purpose']
                }
                print(f"Passing to JobPositionDocumentTemplateSerializer: {serializer_data}")
                serializer = JobPositionDocumentTemplateSerializer(
                    data=serializer_data,
                    context={'job_position': job_position, 'institution_id': self.context.get('institution_id')}
                )
                serializer.is_valid(raise_exception=True)
                print(f"Validated template_data: {serializer.validated_data}")
                JobPositionDocumentTemplate.objects.create(
                    job_position=job_position,
                    document_template=serializer.validated_data['document_template'],
                    purpose=serializer.validated_data['purpose']
                )
            
            return job_position

    def update(self, instance, validated_data):
        print(f"Updating JobPosition with validated_data: {validated_data}")
        document_templates_data = validated_data.pop("document_templates", [])
        
        with transaction.atomic():
            employee_ids = validated_data.pop("apply_salary_to_employees", [])
            old_salary_min = instance.salary_min
            new_salary_min = validated_data.get("salary_min", old_salary_min)
            
            instance = super().update(instance, validated_data)
            
            if document_templates_data:
                instance.document_template_assignments.all().delete()
                for template_data in document_templates_data:
                    print(f"Processing template_data: {template_data}")
                    document_template = template_data['document_template']
                    if isinstance(document_template, DocumentTemplate):
                        document_template = document_template.pk
                    serializer_data = {
                        'document_template': document_template,
                        'purpose': template_data['purpose']
                    }
                    print(f"Passing to JobPositionDocumentTemplateSerializer: {serializer_data}")
                    serializer = JobPositionDocumentTemplateSerializer(
                        data=serializer_data,
                        context={'job_position': instance, 'institution_id': self.context.get('institution_id')}
                    )
                    serializer.is_valid(raise_exception=True)
                    print(f"Validated template_data: {serializer.validated_data}")
                    JobPositionDocumentTemplate.objects.create(
                        job_position=instance,
                        document_template=serializer.validated_data['document_template'],
                        purpose=serializer.validated_data['purpose']
                    )
            
            if (new_salary_min is not None and 
                old_salary_min != new_salary_min and 
                employee_ids):
                Employee.objects.filter(
                    id__in=employee_ids,
                    position=instance
                ).update(salary=new_salary_min)
            
            return instance



class JobInterviewSerializer(BaseApprovableSerializer):
    job_position_application_details = JobAdvertApplicationSerializer(
        source="job_position_application", read_only=True
    )
    interview_stage_details = InterviewStageSerializer(
        source="interview_stage", read_only=True
    )

    class Meta:
        model = JobInterview
        fields = '__all__'

    def validate(self, attrs):
        if self.instance is None or self.partial is False or "rating" in attrs:
            rating = attrs.get("rating")
            if rating is not None and (rating < 1 or rating > 10):
                raise serializers.ValidationError(
                    {"error": "Rating must be between 1 and 10."}
                )

        interview_stage = None
        if self.instance:
            interview_stage = self.instance.interview_stage
        if "interview_stage" in attrs:
            interview_stage = attrs["interview_stage"]

        if interview_stage and "feedback" in attrs:
            feedback = attrs.get("feedback")
            feedback_fields = interview_stage.feedback_fields or []
            status = attrs.get("status", self.instance.status if self.instance else "scheduled")

            if feedback is not None:
                if not isinstance(feedback, dict):
                    raise serializers.ValidationError(
                        {"error": "Feedback must be a JSON object."}
                    )

                self._validate_feedback(feedback, feedback_fields, status)

        return attrs

    def _validate_feedback(self, feedback, feedback_fields, status):
        """
        Validates the feedback field against the feedback_fields structure.
        """
        if not feedback_fields:
            if feedback:
                raise serializers.ValidationError(
                    {"error": "No feedback fields defined for this interview stage, so feedback should be empty."}
                )
            return

        expected_labels = {field["label"] for field in feedback_fields}
        provided_labels = set(feedback.keys())

        unexpected_labels = provided_labels - expected_labels
        if unexpected_labels:
            raise serializers.ValidationError(
                {"error": f"Unexpected feedback fields provided: {', '.join(unexpected_labels)}."}
            )

        for field in feedback_fields:
            label = field["label"]
            field_type = field["type"]
            required = field["required"]

            if required and status == "completed" and label not in feedback:
                raise serializers.ValidationError(
                    {"error": f"Missing required feedback field: {label}."}
                )

            if label in feedback:
                value = feedback[label]
                if field_type == "text" and not isinstance(value, str):
                    raise serializers.ValidationError(
                        {"error": f"Feedback field '{label}' must be a string."}
                    )
                elif field_type == "rating":
                    if not isinstance(value, int):
                        raise serializers.ValidationError(
                            {"error": f"Feedback field '{label}' must be an integer."}
                        )
                    if "options" in field and value not in field["options"]:
                        raise serializers.ValidationError(
                            {"error": f"Feedback field '{label}' value must be one of: {field['options']}."}
                        )
                elif field_type == "checkbox" and not isinstance(value, bool):
                    raise serializers.ValidationError(
                        {"error": f"Feedback field '{label}' must be a boolean."}
                    )

    def create(self, validated_data):
        if "feedback" not in validated_data and validated_data.get("interview_stage"):
            validated_data["feedback"] = {}
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "feedback" not in validated_data and validated_data.get("interview_stage"):
            validated_data["feedback"] = instance.feedback or {}
        return super().update(instance, validated_data)
    
    
class SkillZoneCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillZoneCategory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at']

    def create(self, validated_data):
        """Set institution from the request user."""
        validated_data['institution'] = self.context['request'].user.profile.institution
        return super().create(validated_data)    


class SkillZoneSerializer(BaseApprovableSerializer):
    candidate = serializers.PrimaryKeyRelatedField(
        queryset=JobAdvertApplication.objects.filter(status='rejected')
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=SkillZoneCategory.objects.all(), many=True, required=False
    )
    applicant_name = serializers.CharField(source='candidate.applicant_name', read_only=True)
    job_title = serializers.CharField(
        source='candidate.job_position_advert.job_position.name', read_only=True
    )
    category_names = serializers.SerializerMethodField()

    class Meta:
        model = SkillZone
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at', 'applicant_name', 'job_title']

    def get_category_names(self, obj):
        """Return list of category names for the SkillZone entry."""
        return [category.name for category in obj.category.all()]


    def validate_category(self, value):
        """Ensure categories belong to the same institution as the candidate."""
        institution = self.context['request'].user.profile.institution
        for category in value:
            if category.institution != institution:
                raise ValidationError(f"Category {category.name} does not belong to your institution.")
        return value

    def create(self, validated_data):
        """Create SkillZone entry and assign categories."""
        categories = validated_data.pop('category', [])
        skill_zone = super().create(validated_data)
        skill_zone.category.set(categories)
        return skill_zone

    def update(self, instance, validated_data):
        """Update SkillZone entry and reassign categories if provided."""
        categories = validated_data.pop('category', None)
        instance = super().update(instance, validated_data)
        if categories is not None:
            instance.category.set(categories)
        return instance