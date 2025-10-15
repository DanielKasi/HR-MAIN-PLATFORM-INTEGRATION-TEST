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

        raw_display_name = str(content_obj)
        display_name = raw_display_name.replace('_', ' ').title()

        return {
            'id': getattr(content_obj, 'id', None),
            'type': obj.content_type.model.replace('_', ' ').title(),
            'display_name': obj.content_type.model.replace('_', ' ').title(),
        } if content_obj else None
    

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
