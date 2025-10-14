from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    content_object = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    institution = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'
        read_only_fields = ['id', 'content_object', 'user', 'institution', 'timestamp']

    def get_content_object(self, obj):
        content_obj = obj.content_object
        return {
            'id': getattr(content_obj, 'id', None),
            'type': obj.content_type.model,
            'display_name': str(content_obj) if content_obj else None,
            'name': getattr(content_obj, 'institution_name', None)
        } if content_obj else None

    def get_user(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'email': user.email,
            'full_name': user.get_full_name() if hasattr(user, 'get_full_name') else user.email
        } if user else None

    def get_institution(self, obj):
        content_obj = obj.content_object
        if not content_obj:
            return None
        
        institution = (
            getattr(content_obj, 'institution', None) or
            (content_obj.get_institution() if hasattr(content_obj, 'get_institution') else None) or
            (content_obj if hasattr(content_obj, 'institution_name') else None)
        )
        
        return {
            'id': institution.id,
            'name': institution.institution_name
        } if institution and hasattr(institution, 'institution_name') else None