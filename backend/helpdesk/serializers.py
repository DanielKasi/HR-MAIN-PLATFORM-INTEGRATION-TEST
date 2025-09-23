from approval.serializers import BaseApprovableSerializer
from rest_framework import serializers

from employee.models import Employee
from employee.serializers import EmployeeSerializer
from .models  import FAQ, FAQCategory, Ticket, TicketAttachment, TicketCategory, TicketComment
from institution.models import Institution
from institution.serializers import InstitutionSerializer

class FAQCategorySerializer(BaseApprovableSerializer):

    class Meta:
        model = FAQCategory
        fields = '__all__'
        read_only_fields = ['institution']

    def create(self, validated_data):
        validated_data['institution'] = self.context['request'].user.profile.institution
        data = FAQCategory.objects.create(**validated_data)
        return data

class FAQSerializer(BaseApprovableSerializer):
    category = FAQCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=FAQCategory.objects.all(), source='category', write_only=True
    )

    class Meta:
        model = FAQ
        fields = '__all__'

class TicketCategorySerializer(BaseApprovableSerializer):

    class Meta:
        model = TicketCategory
        fields = '__all__'
        read_only_fields = ['institution']

    def create(self, validated_data):
        validated_data['institution'] = self.context['request'].user.profile.institution
        data = TicketCategory.objects.create(**validated_data)
        return data
    
class TicketCommentSerializer(serializers.ModelSerializer):
    ticket = serializers.PrimaryKeyRelatedField(queryset=Ticket.objects.all(), write_only=True)
    ticket_detail = serializers.SerializerMethodField(read_only=True)
    created_by = serializers.SerializerMethodField(read_only=True)
    updated_by = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = TicketComment
        fields = ['id', 'ticket', 'ticket_detail', 'comment', 'created_at', 'updated_at', 'is_active', 'created_by', 'updated_by']

    def get_ticket_detail(self, obj):
        if obj.ticket:
            return {'id': obj.ticket.id, 'title': obj.ticket.title}
        return None

    def get_created_by(self, obj):
        if obj.created_by:
            return {'name': obj.created_by.fullname}
        return None

    def get_updated_by(self, obj):
        if obj.updated_by:
            return {'name': obj.updated_by.fullname}
        return None

    def validate(self, data):
        request = self.context.get('request')
        ticket = data.get('ticket')
        user_employee = request.user.employees.first()
        if ticket and ticket.assigned_to != user_employee:
            raise serializers.ValidationError(
                {"error": "Only the assigned employee can comment on this ticket."}
            )
        return data

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return TicketComment.objects.create(**validated_data) 

class TicketAttachmentSerializer(BaseApprovableSerializer):
    ticket = serializers.PrimaryKeyRelatedField(queryset=Ticket.objects.all(), write_only=True)
    ticket_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TicketAttachment
        fields = '__all__'

    def get_ticket_detail(self, obj):
        return {'id': obj.ticket.id, 'title': obj.ticket.title}

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return TicketAttachment.objects.create(**validated_data)     
    
class TicketSerializer(serializers.ModelSerializer):
    category = TicketCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=TicketCategory.objects.all(), source='category', write_only=True, allow_null=True
    )
    assigned_to = EmployeeSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), source='assigned_to', write_only=True, allow_null=True
    )
    comments = TicketCommentSerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    new_comments = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )
    new_attachments = serializers.ListField(
        child=serializers.FileField(max_length=100000, allow_empty_file=False), 
        write_only=True, 
        required=False
    )

    class Meta:
        model = Ticket
        fields = '__all__'


    def create(self, validated_data):
        new_comments = validated_data.pop('new_comments', [])
        new_attachments = validated_data.pop('new_attachments', [])
        ticket = Ticket.objects.create(**validated_data)



        # Create comments if provided
        for comment_text in new_comments:
            TicketComment.objects.create(
                ticket=ticket,
                comment=comment_text,
                created_by=self.context['request'].user
            )

        # Create attachments if provided
        for attachment_file in new_attachments:
            try:
                attachment = TicketAttachment.objects.create(
                    ticket=ticket,
                    file=attachment_file,
                    created_by=self.context['request'].user
                )
            except Exception as e:
                raise serializers.ValidationError(
                    {"new_attachments": f"Failed to create attachment: {str(e)}"}
                )

        return ticket

    def update(self, instance, validated_data):
        new_comments = validated_data.pop('new_comments', [])
        new_attachments = validated_data.pop('new_attachments', [])
        print(f"update - Updating ticket with validated data: {validated_data}")
        instance = super().update(instance, validated_data)

        # Check if the user is the assigned employee for comments
        # user_employee = self.context['request'].user.employees.first()
        # if new_comments and not user_employee:
        #     raise serializers.ValidationError(
        #         {"error": "User must be linked to an Employee to add comments."}
        #     )
        # if new_comments and instance.assigned_to != user_employee:
        #     raise serializers.ValidationError(
        #         {"error": "Only the assigned employee can add comments."}
        #     )

        # Add new comments if provided
        for comment_text in new_comments:
            try:
                print(f"update - Creating comment: {comment_text}")
                comment = TicketComment.objects.create(
                    ticket=instance,
                    comment=comment_text,
                    created_by=self.context['request'].user
                )
                print(f"update - Created comment ID: {comment.id}")
            except Exception as e:
                print(f"update - Error creating comment: {str(e)}")
                raise serializers.ValidationError(
                    {"new_comments": f"Failed to create comment: {str(e)}"}
                )

        # Add new attachments if provided
        for attachment_file in new_attachments:
            try:
                print(f"update - Processing attachment: {attachment_file.name}")
                attachment = TicketAttachment.objects.create(
                    ticket=instance,
                    file=attachment_file,
                    created_by=self.context['request'].user
                )
                print(f"update - Created attachment: {attachment.file.name}")
            except Exception as e:
                print(f"update - Error creating attachment: {str(e)}")
                raise serializers.ValidationError(
                    {"new_attachments": f"Failed to create attachment: {str(e)}"}
                )

        return instance
