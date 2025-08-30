from institution.serializers import InstitutionSerializer
from institution.models import Institution
from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from employee.models import Employee
from .models import LeaveType, LeaveBalance, LeaveApplication, LeavePolicy
from .utils import LeaveCalculator
from users.serializers import CustomUserSerializer
from employee.serializers import EmployeeSerializer
from users.models import CustomUser


class LeaveTypeSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = LeaveType
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
        
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['institution'] = InstitutionSerializer(instance.institution).data
        return rep      

    def validate(self, attrs):
        if attrs.get('carry_forward_allowed') and attrs.get('max_carry_forward_days', 0) > attrs.get('max_days_per_year', 0):
            raise serializers.ValidationError(
                {"error": "Max carry forward days cannot exceed max days per year"}
            )
        return attrs


class LeaveBalanceSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())  
    leave_type = serializers.PrimaryKeyRelatedField(queryset=LeaveType.objects.all())
    available_days = serializers.ReadOnlyField()
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = LeaveBalance
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'available_days')

    def validate(self, attrs):
        # Ensure used_days and pending_days don't exceed allocated + carried forward
        allocated = attrs.get('allocated_days', 0)
        carried_forward = attrs.get('carried_forward_days', 0)
        used = attrs.get('used_days', 0)
        pending = attrs.get('pending_days', 0)
        
        total_available = allocated + carried_forward
        total_used = used + pending
        
        if total_used > total_available:
            raise serializers.ValidationError(
                {"error": "Used and pending days cannot exceed allocated plus carried forward days"}
            )
        
        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['employee'] = EmployeeSerializer(instance.employee).data
        rep['leave_type'] = LeaveTypeSerializer(instance.leave_type).data
        rep['institution'] = InstitutionSerializer(instance.institution).data
        return rep


class LeaveApplicationSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    leave_type = serializers.PrimaryKeyRelatedField(queryset=LeaveType.objects.all())
    approved_by = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), 
        allow_null=True, 
        required=False
    )
    total_days = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    working_days = serializers.SerializerMethodField()
    institution  = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = LeaveApplication
        fields = '__all__'
        read_only_fields = (
            'total_days', 'approved_by', 'approved_at', 
            'created_at', 'updated_at', 'working_days'
        )

    def get_working_days(self, obj):
        """Calculate working days for the leave period"""
        return LeaveCalculator.get_working_days(obj.start_date, obj.end_date)

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        employee = attrs.get('employee')
        leave_type = attrs.get('leave_type')
        
        # Validate dates
        if start_date and end_date:
            if start_date > end_date:
                raise serializers.ValidationError({"error": "End date must be after start date"})
            
            # Check if start date is not in the past (for new applications)
            if not self.instance and start_date < timezone.now().date():
                raise serializers.ValidationError({"error": "Start date cannot be in the past"})
        
        # Validate gender-specific leave types
        if employee and leave_type:
            if leave_type.gender_specific != 'all':
                if hasattr(employee, 'gender') and employee.gender != leave_type.gender_specific:
                    raise serializers.ValidationError(
                        {"error": f"This leave type is only available for {leave_type.gender_specific} employees"}
                    )
        
        # Check if supporting document is required
        if leave_type and leave_type.requires_document:
            if not attrs.get('supporting_document') and not (self.instance and self.instance.supporting_document):
                raise serializers.ValidationError(
                    {"error": "Supporting document is required for this leave type"}
                )
        
        # Validate leave policy constraints
        if employee and leave_type and start_date:
            try:
                policy = LeavePolicy.objects.filter(leave_type=leave_type, is_active=True).first()
                
                # Check minimum notice period
                notice_days = (start_date - timezone.now().date()).days
                if notice_days < policy.min_notice_days:
                    raise serializers.ValidationError(
                        {"error": f"Minimum {policy.min_notice_days} days notice required"}
                    )
                
                # Check maximum consecutive days
                if policy.max_consecutive_days:
                    total_days = LeaveCalculator.calculate_leave_days(
                        start_date, end_date, attrs.get('duration_type', 'full_day')
                    )
                    if total_days > policy.max_consecutive_days:
                        raise serializers.ValidationError(
                            {"error": f"Maximum {policy.max_consecutive_days} consecutive days allowed"}
                        )
                
                # Check probation period
                if policy.applicable_after_probation_months > 0:
                    if hasattr(employee, 'hire_date') and employee.hire_date:
                        months_employed = (timezone.now().date() - employee.hire_date).days / 30.44
                        if months_employed < policy.applicable_after_probation_months:
                            raise serializers.ValidationError(
                                {"error": f"Leave available after {policy.applicable_after_probation_months} months of employment"}
                            )
            
            except LeavePolicy.DoesNotExist:
                pass  # No policy found, continue with default validation
        
        return attrs

    def validate_status(self, value):
        """Validate status transitions"""
        if self.instance:
            current_status = self.instance.status
            
            # Define allowed transitions
            allowed_transitions = {
                'pending': ['approved', 'rejected', 'cancelled'],
                'approved': ['cancelled'],
                'rejected': [],
                'cancelled': []
            }
            
            if current_status in allowed_transitions:
                if value not in allowed_transitions[current_status] and value != current_status:
                    raise serializers.ValidationError(
                        {"error": f"Cannot change status from {current_status} to {value}"}
                    )
        
        return value

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['employee'] = EmployeeSerializer(instance.employee).data
        rep['leave_type'] = LeaveTypeSerializer(instance.leave_type).data
        rep['institution'] = InstitutionSerializer(instance.institution).data
        if instance.approved_by:
            rep['approved_by'] = CustomUserSerializer(instance.approved_by).data
        else:
            rep['approved_by'] = None
        return rep


class LeavePolicySerializer(serializers.ModelSerializer):
    leave_type = serializers.PrimaryKeyRelatedField(queryset=LeaveType.objects.all())
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = LeavePolicy
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, attrs):
        # Ensure logical constraints
        if attrs.get('max_consecutive_days'):
            leave_type = attrs.get('leave_type')
            if leave_type and attrs['max_consecutive_days'] > leave_type.max_days_per_year:
                raise serializers.ValidationError(
                    {"error": "Max consecutive days cannot exceed leave type's max days per year"}
                )
        
        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['leave_type'] = LeaveTypeSerializer(instance.leave_type).data
        rep['institution'] = InstitutionSerializer(instance.institution).data
        return rep


# Additional serializers for specific use cases
class LeaveApplicationCreateSerializer(LeaveApplicationSerializer):
    """Serializer specifically for creating leave applications"""
    
    class Meta(LeaveApplicationSerializer.Meta):
        fields = [
            'institution', 'employee', 'leave_type', 'start_date', 'end_date', 
            'duration_type', 'reason', 'supporting_document', 'handover_notes'
        ]


class LeaveApplicationApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting leave applications"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        if attrs.get('action') == 'reject' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError(
                {"error": "Rejection reason is required when rejecting an application"}
            )
        return attrs


class LeaveBalanceInitializeSerializer(serializers.Serializer):
    """Serializer for initializing yearly leave balances"""
    year = serializers.IntegerField(default=timezone.now().year)
    
    def validate_year(self, value):
        current_year = timezone.now().year
        if value < current_year - 1 or value > current_year + 1:
            raise serializers.ValidationError(
                {"error": "Year must be within one year of current year"}
            )
        return value


class LeaveCarryForwardSerializer(serializers.Serializer):
    """Serializer for carrying forward leaves"""
    from_year = serializers.IntegerField()
    to_year = serializers.IntegerField()
    
    def validate(self, attrs):
        from_year = attrs.get('from_year')
        to_year = attrs.get('to_year')
        
        if from_year >= to_year:
            raise serializers.ValidationError(
                {"error": "From year must be less than to year"}
            )
        
        if to_year - from_year != 1:
            raise serializers.ValidationError(
                {"error": "Can only carry forward to the immediate next year"}
            )
        
        return attrs


class EmployeeLeaveSummarySerializer(serializers.Serializer):
    """Serializer for employee leave summary"""
    employee = EmployeeSerializer(read_only=True)
    year = serializers.IntegerField(read_only=True)
    balances = LeaveBalanceSerializer(many=True, read_only=True)
    applications = LeaveApplicationSerializer(many=True, read_only=True)
    statistics = serializers.DictField(read_only=True)