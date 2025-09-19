from rest_framework import serializers
from approval.serializers import BaseApprovableSerializer
from employee.models import Employee
from employee.serializers import EmployeeSerializer
from .models import Period, Objectives, EmployeeObjectives, KeyResult, Feedback360, EmployeeBonusPoint, QuestionTemplate, BonusPointSettings, Meeting
from django.contrib.contenttypes.models import ContentType
from django.db import models

class PeriodSerializer(BaseApprovableSerializer):
    class Meta:
        model = Period
        fields = '__all__'
        read_only_fields = ['institution']

class KeyResultSerializer(BaseApprovableSerializer):
    class Meta:
        model = KeyResult
        fields = '__all__'
        read_only_fields = ['institution']

class ObjectivesSerializer(BaseApprovableSerializer):
    managers = EmployeeSerializer(read_only=True)
    assignees = EmployeeSerializer(many=True, read_only=True)
    key_result = KeyResultSerializer(read_only=True)
    managers_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='managers', write_only=True, required=False
    )
    assignees_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='assignees', write_only=True, many=True, required=False
    )
    key_result_id = serializers.PrimaryKeyRelatedField(
        queryset=KeyResult.objects.all(), source='key_result', write_only=True, required=False
    )

    class Meta:
        model = Objectives
        fields = '__all__'
        read_only_fields = ['institution']

    def create(self, validated_data):
        assignees = validated_data.pop('assignees', [])
        validated_data['institution'] = self.context['request'].user.profile.institution
        objective = Objectives.objects.create(**validated_data)
        if assignees:
            objective.assignees.set(assignees)  # Set the M2M relationship
        return objective

class EmployeeObjectivesSerializer(BaseApprovableSerializer):
    employee = EmployeeSerializer(read_only=True)
    objective = ObjectivesSerializer(read_only=True)
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='employee', write_only=True
    )
    objective_id = serializers.PrimaryKeyRelatedField(
        queryset=Objectives.objects.all(), source='objective', write_only=True
    )

    class Meta:
        model = EmployeeObjectives
        fields = '__all__'

class Feedback360Serializer(BaseApprovableSerializer):
    given_by = EmployeeSerializer(read_only=True)
    reviewer = EmployeeSerializer(read_only=True)
    period = PeriodSerializer(read_only=True)
    given_by_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='given_by', write_only=True
    )
    reviewer_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='reviewer', write_only=True
    )
    period_id = serializers.PrimaryKeyRelatedField(
        queryset=Period.objects.all(), source='period', write_only=True, required=False
    )

    class Meta:
        model = Feedback360
        fields = '__all__'

class BonusPointSettingsSerializer(BaseApprovableSerializer):
    content_type = serializers.PrimaryKeyRelatedField(queryset=ContentType.objects.filter(model__in=[
        'period', 'objectives', 'employeeobjectives', 'keyresult', 'feedback360', 'employeebonuspoint', 'questiontemplate', 'meeting'
    ]))
    content_object = serializers.SerializerMethodField()

    def get_content_object(self, obj):
        return str(obj.content_object)

    def validate(self, data):
        model_name = data['content_type'].model
        allowed_fields = BonusPointSettings.ALLOWED_FIELDS.get(model_name.capitalize(), [])
        if data.get('condition_field') not in allowed_fields:
            raise serializers.ValidationError({
                "condition_field": f"Invalid field for {model_name}. Must be one of: {', '.join(allowed_fields)}"
            })
        if data.get('condition_operator') not in [op[0] for op in BonusPointSettings.CONDITION_OPERATOR_CHOICES]:
            raise serializers.ValidationError({
                "condition_operator": f"Invalid operator. Must be one of: {', '.join(op[0] for op in BonusPointSettings.CONDITION_OPERATOR_CHOICES)}"
            })
        model_class = data['content_type'].model_class()
        field = model_class._meta.get_field(data['condition_field'])
        condition_value = data.get('condition_value')
        # if isinstance(field, (models.DateField, models.DateTimeField)):
        #     try:
        #         from datetime import datetime
        #         datetime.strptime(condition_value, '%Y-%m-%d')
        #     except ValueError:
        #         raise serializers.ValidationError({
        #             "condition_value": f"Invalid value for {data['condition_field']}. Must be a valid date (YYYY-MM-DD)."
        #         })
        # elif isinstance(field, models.BooleanField):
        #     if condition_value.lower() not in ['true', 'false']:
        #         raise serializers.ValidationError({
        #             "condition_value": f"Invalid value for {data['condition_field']}. Must be 'true' or 'false'."
        #         })
        # elif isinstance(field, (models.IntegerField, models.FloatField)):
        #     try:
        #         float(condition_value)
        #     except ValueError:
        #         raise serializers.ValidationError({
        #             "condition_value": f"Invalid value for {data['condition_field']}. Must be a number."
        #         })
        return data

    class Meta:
        model = BonusPointSettings
        fields = '__all__'
        read_only_fields = ['institution']        

class EmployeeBonusPointSerializer(BaseApprovableSerializer):
    employee = EmployeeSerializer(read_only=True)
    bonus_point_setting = BonusPointSettingsSerializer(read_only=True)
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='employee', write_only=True
    )
    period_id = serializers.PrimaryKeyRelatedField(
        queryset=Period.objects.all(), source='period', write_only=True, required=False
    )
    bonus_point_setting_id = serializers.PrimaryKeyRelatedField(
        queryset=BonusPointSettings.objects.all(),
        source='bonus_point_setting',
        write_only=True,
        required=False
    )

    class Meta:
        model = EmployeeBonusPoint
        fields = '__all__'

class QuestionTemplateSerializer(BaseApprovableSerializer):
    class Meta:
        model = QuestionTemplate
        fields = '__all__'
        read_only_fields = ['institution']



class MeetingSerializer(BaseApprovableSerializer):
    organizer = EmployeeSerializer(read_only=True)
    participants = EmployeeSerializer(many=True, read_only=True)
    organizer_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='organizer', write_only=True, required=False
    )
    participant_ids = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='participants', many=True, write_only=True
    )

    class Meta:
        model = Meeting
        fields = '__all__'
        read_only_fields = ['institution', 'online_link', 'calendar_event_id']