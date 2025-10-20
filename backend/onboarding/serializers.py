from datetime import date
from employee.utilities import deactivate_employee
from employee.models import Employee
from users.models import CustomUser
from recruitment.serializers import JobAdvertApplicationSerializer
from rest_framework import serializers
from .models import (
    HandoverReport,
    Offboarding,
    OffboardingStageProgress,
    OnBoarding,
    TerminationStage,
    TerminationType,
    TerminationTypeStage,
)
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.db.models import Model
from users.serializers import ProfileSerializer
from employee.serializers import EmployeeSerializer
from general.serializers import BaseApprovableSerializer


class OnBoardingSerializer(BaseApprovableSerializer):
    application_details = JobAdvertApplicationSerializer(
        source="application", read_only=True
    )

    class Meta:
        model = OnBoarding
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class TerminationStageSerializer(BaseApprovableSerializer):
    class Meta:
        model = TerminationStage
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        if data.get('order', 0) < 0:
            raise serializers.ValidationError({'error': 'Order must be a positive integer.'})
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile') or not request.user.profile.institution:
            raise serializers.ValidationError({'error': 'User profile must have an associated institution.'})
        return data

    def create(self, validated_data):
        validated_data['institution'] = self.context['request'].user.profile.institution
        return super().create(validated_data)


class TerminationTypeStageSerializer(serializers.ModelSerializer):
    stage = TerminationStageSerializer(read_only=True)
    stage_id = serializers.PrimaryKeyRelatedField(
        queryset=TerminationStage.objects.all(),
        source='stage',
        write_only=True
    )

    class Meta:
        model = TerminationTypeStage
        fields = '__all__'
        read_only_fields = ['id']

    def validate(self, data):
        stage = data.get('stage')
        termination_type = self.context.get('termination_type')
        if termination_type and stage.institution != termination_type.institution:
            raise serializers.ValidationError({
                'error': 'Stage must belong to the same institution as the termination type.'
            })
        if data.get('order', 0) < 0:
            raise serializers.ValidationError({'error': 'Order must be a positive integer.'})
        return data

class TerminationTypeSerializer(BaseApprovableSerializer):
    supported_stages = TerminationTypeStageSerializer(
        source='stages',
        many=True,
        read_only=True
    )
    stage_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    class Meta:
        model = TerminationType
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        stage_data = data.get('stage_data', [])
        for stage_item in stage_data:
            if 'stage_id' not in stage_item or 'order' not in stage_item:
                raise serializers.ValidationError({
                    'error': 'Each stage item must include stage_id and order.'
                })
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile') or not request.user.profile.institution:
            raise serializers.ValidationError({'error': 'User profile must have an associated institution.'})
        return data

    @transaction.atomic
    def create(self, validated_data):
        validated_data['institution'] = self.context['request'].user.profile.institution
        stage_data = validated_data.pop('stage_data', [])
        termination_type = super().create(validated_data)
        for stage_item in stage_data:
            stage = TerminationStage.objects.get(id=stage_item['stage_id'])
            if stage.institution != termination_type.institution:
                raise serializers.ValidationError({
                    'error': f'Stage {stage.name} does not belong to the same institution.'
                })
            TerminationTypeStage.objects.create(
                termination_type=termination_type,
                stage=stage,
                order=stage_item['order'],
                can_be_skipped=stage_item.get('can_be_skipped', False)
            )
        return termination_type

    @transaction.atomic
    def update(self, instance, validated_data):
        stage_data = validated_data.pop('stage_data', None)
        instance = super().update(instance, validated_data)
        if stage_data is not None:
            instance.stages.all().delete()
            for stage_item in stage_data:
                stage = TerminationStage.objects.get(id=stage_item['stage_id'])
                if stage.institution != instance.institution:
                    raise serializers.ValidationError({
                        'error': f'Stage {stage.name} does not belong to the same institution.'
                    })
                TerminationTypeStage.objects.create(
                    termination_type=instance,
                    stage=stage,
                    order=stage_item['order'],
                    can_be_skipped=stage_item.get('can_be_skipped', False)
                )
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        stage_data = validated_data.pop('stage_data', None)
        instance = super().update(instance, validated_data)
        if stage_data is not None:
            instance.stages.all().delete()
            for stage_item in stage_data:
                stage = TerminationStage.objects.get(id=stage_item['stage_id'])
                if stage.institution != instance.institution:
                    raise serializers.ValidationError({
                        'error': f'Stage {stage.name} does not belong to the same institution.'
                    })
                TerminationTypeStage.objects.create(
                    termination_type=instance,
                    stage=stage,
                    order=stage_item['order'],
                    can_be_skipped=stage_item.get('can_be_skipped', False)
                )
        return instance


class OffboardingStageProgressSerializer(serializers.ModelSerializer):
    stage = TerminationStageSerializer(read_only=True)
    stage_id = serializers.PrimaryKeyRelatedField(
        queryset=TerminationStage.objects.all(),
        source='stage',
        write_only=True
    )

    class Meta:
        model = OffboardingStageProgress
        fields = '__all__'
        read_only_fields = ['completed_at', 'completed_by']

    def validate(self, data):
        offboarding = self.context.get('offboarding')
        stage = data.get('stage')
        if offboarding and stage.institution != offboarding.termination_type.institution:
            raise serializers.ValidationError({
                'error': 'Stage must belong to the same institution as the offboarding termination type.'
            })
        if data.get('custom_order', 0) < 0:
            raise serializers.ValidationError({'error': 'Custom order must be a positive integer.'})
        if data.get('skipped') and not TerminationTypeStage.objects.filter(
            termination_type=offboarding.termination_type,
            stage=stage,
            can_be_skipped=True
        ).exists():
            raise serializers.ValidationError({'error': 'This stage cannot be skipped.'})
        return data
    
    @transaction.atomic
    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        offboarding = instance.offboarding
        all_stages_done = not OffboardingStageProgress.objects.filter(
            offboarding=offboarding,
            completed=False,
            skipped=False,
            deleted_at__isnull=True
        ).exists()
        if all_stages_done and offboarding.status not in ['COMPLETED', 'CANCELLED']:
            offboarding.status = 'COMPLETED'
            offboarding.save(update_fields=['status'])
            deactivate_employee(offboarding.employee)
        return instance
    
class HandoverReportSerializer(BaseApprovableSerializer):
    class Meta:
        model = HandoverReport
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        if not data.get('report_text') and not data.get('report_file'):
            raise serializers.ValidationError({
                'error': 'Either report_text or report_file must be provided.'
            })
        return data    
    

class OffboardingSerializer(serializers.ModelSerializer):
    employee = serializers.StringRelatedField(read_only=True)
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source='employee',
        write_only=True
    )
    termination_type = TerminationTypeSerializer(read_only=True)
    termination_type_id = serializers.PrimaryKeyRelatedField(
        queryset=TerminationType.objects.all(),
        source='termination_type',
        write_only=True
    )
    initiated_by = serializers.StringRelatedField(read_only=True)
    initiated_by_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='initiated_by',
        write_only=True
    )
    stage_progress = OffboardingStageProgressSerializer(many=True, read_only=True)
    handover_report = HandoverReportSerializer(read_only=True)
    current_stage = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = Offboarding
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_current_stage(self, obj):
        current_stage = OffboardingStageProgress.objects.filter(
            offboarding=obj,
            completed=False,
            skipped=False,
            deleted_at__isnull=True
        ).order_by('custom_order').first()
        if current_stage:
            return OffboardingStageProgressSerializer(current_stage).data
        return None    

    def validate(self, data):
        termination_type = data.get('termination_type')
        employee = data.get('employee')
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile') or not request.user.profile.institution:
            raise serializers.ValidationError({'error': 'User profile must have an associated institution.'})
        institution = request.user.profile.institution
        if termination_type and termination_type.institution != institution:
            raise serializers.ValidationError({
                'error': 'Termination type must belong to the user\'s institution.'
            })
        if employee and employee.institution != institution:
            raise serializers.ValidationError({
                'error': 'Employee must belong to the user\'s institution.'
            })
        if data.get('is_paid_after_termination') and not data.get('final_payment_date'):
            raise serializers.ValidationError({
                'error': 'Final payment date is required if employee is paid after termination.'
            })
        return data

    @transaction.atomic
    def create(self, validated_data):
        offboarding = super().create(validated_data)
        termination_type_stages = TerminationTypeStage.objects.filter(
            termination_type=offboarding.termination_type
        ).order_by('order')
        for tts in termination_type_stages:
            OffboardingStageProgress.objects.create(
                offboarding=offboarding,
                stage=tts.stage,
                custom_order=tts.order,
                skipped=False
            )
        if offboarding.termination_type.requires_handover_report:
            HandoverReport.objects.create(offboarding=offboarding)
        return offboarding 
    
class OffboardingStageProgressReorderSerializer(serializers.Serializer):
    source_stage_id = serializers.IntegerField(
        help_text="ID of the OffboardingStageProgress to move"
    )
    target_stage_id = serializers.IntegerField(
        help_text="ID of the OffboardingStageProgress to move the source stage above"
    )

    def validate(self, data):
        source_stage_id = data.get('source_stage_id')
        target_stage_id = data.get('target_stage_id')
        separation_id = self.context.get('separation_id')

        if source_stage_id == target_stage_id:
            raise serializers.ValidationError({
                'error': 'Source and target stage IDs must be different.'
            })

        try:
            source_stage = OffboardingStageProgress.objects.get(
                id=source_stage_id,
                offboarding_id=separation_id,
                deleted_at__isnull=True
            )
            target_stage = OffboardingStageProgress.objects.get(
                id=target_stage_id,
                offboarding_id=separation_id,
                deleted_at__isnull=True
            )
        except OffboardingStageProgress.DoesNotExist:
            raise serializers.ValidationError({
                'error': 'Source or target stage not found for this offboarding.'
            })

        return data    