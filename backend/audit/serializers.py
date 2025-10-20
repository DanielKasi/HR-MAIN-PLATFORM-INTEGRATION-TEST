from rest_framework import serializers
from .models import AuditLog
import re

class AuditLogSerializer(serializers.ModelSerializer):
    content_type = serializers.SerializerMethodField()
    content_object = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    institution = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'
        read_only_fields = ['id', 'content_object', 'user', 'institution', 'timestamp']

    def get_content_type(self, obj):
        return obj.content_type.model.replace('_', ' ').title()

    def get_content_object(self, obj):
        content_obj = obj.content_object
        if not content_obj:
            return None

        model_name = obj.content_type.model
        humanized_name = re.sub(r'([a-z])([A-Z])', r'\1 \2', model_name)  
        humanized_name = humanized_name.replace('_', ' ').title() 
        display_name = str(content_obj) 

        return {
            'id': getattr(content_obj, 'id', None),
            'type': humanized_name,
            'display_name': display_name,
        }

    def get_user(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'email': user.email,
            'full_name': user.get_full_name() if hasattr(user, 'get_full_name') else user.fullname
        } if user else None

    def get_institution(self, obj):
        institution = obj.institution
        return {
            'id': institution.id,
            'name': institution.institution_name
        } if institution else None