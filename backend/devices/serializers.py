from rest_framework import serializers
from .models import Device, DeviceStatus, DeviceEmployeeAttachment
from institution.serializers import InstitutionSerializer, BranchSerializer
from institution.models import Institution, Branch
from employee.models import Employee
from employee.serializers import EmployeeSerializer

class DeviceSerializer(serializers.ModelSerializer):
    institution = serializers.SerializerMethodField()
    branch = serializers.SerializerMethodField()
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), source='branch', write_only=True, allow_null=True, required=False
    )
    attached_employees = serializers.SerializerMethodField()
    status = serializers.ChoiceField(choices=DeviceStatus.choices, default=DeviceStatus.ACTIVE)

    class Meta:
        model = Device
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'institution']

    def get_institution(self, obj):
        """Return only specific institution details."""
        if obj.institution:
            return {
                'id': obj.institution.id,
                'name': obj.institution.institution_name
            }
        return None
    
    def get_branch(self, obj):
        """Return only specific branch details."""
        if obj.branch:
            return {
                'id': obj.branch.id,
                'name': obj.branch.branch_name
            }
        return None   

    def get_attached_employees(self, obj):
        """Return list of attached employees with basic details."""
        employees = obj.attached_employees.all()
        return [
            {
                'id': employee.id,
                'name': employee.name  
            }
            for employee in employees
        ]

    def validate_serial_number(self, value):
        """Ensure serial number is unique for the institution."""
        institution = self.context.get('institution')
        if institution and Device.objects.filter(serial_number=value, institution=institution).exists():
            raise serializers.ValidationError("A device with this serial number already exists for this institution.")
        return value

    def create(self, validated_data):
        """Set institution from context during creation."""
        institution = self.context.get('institution')
        if not institution:
            raise serializers.ValidationError("Institution must be provided in context.")
        validated_data['institution'] = institution
        return super().create(validated_data)
    
class DeviceEmployeeAttachmentSerializer(serializers.ModelSerializer):
    device = serializers.PrimaryKeyRelatedField(queryset=Device.objects.all())
    employee_details = serializers.SerializerMethodField()
    device_details = serializers.SerializerMethodField()
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='employee', write_only=True
    )

    class Meta:
        model = DeviceEmployeeAttachment
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_employee_details(self, obj):
        if obj.employee:
            return {
                'id': obj.employee.id,
                'name': obj.employee.name,
                'employee_id': obj.employee.employee_id
            }
        return None
    
    def get_device_details(self, obj):
        if obj.device:
            return {
                'id': obj.device.id,
                'serial_number': obj.device.serial_number
            }
        return None
    
    def get_branch(self, obj):
        """Return only specific branch details."""
        if obj.branch:
            return {
                'id': obj.branch.id,
                'name': obj.branch.branch_name
            }
        return None    

    def validate_enroll_id(self, value):
        """Ensure enroll_id is unique for the device."""
        device = self.initial_data.get('device')
        if DeviceEmployeeAttachment.objects.filter(enroll_id=value, device=device).exists():
            raise serializers.ValidationError("This enroll_id is already used for this device.")
        return value    