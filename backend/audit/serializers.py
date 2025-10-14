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
            'display_name': display_name if content_obj else None,
        } if content_obj else None
    

    def get_user(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'email': user.email,
            'full_name': user.get_full_name() if hasattr(user, 'get_full_name') else user.fullname
        } if user else None

    def get_institution(self, obj):
        content_obj = obj.content_object
        if not content_obj:
            return None
        # institution = getattr(content_obj, 'institution', None)
        # if not institution:
        #     return None 
        # return {
        #     'id': institution.id,
        #     'name': institution.name
        # }
    
        try:
            # Get the user from the audit log itself
            user = obj.user
            if user and hasattr(user, 'profile') and hasattr(user.profile, 'institution'):
                institution = user.profile.institution
                if institution and hasattr(institution, 'institution_name'):
                    return {
                        'id': institution.id,
                        'name': institution.institution_name,
                    }
        except:
            pass
        
        return None