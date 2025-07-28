from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import DocumentType
from institution.models import Institution  
from institution.serializers import InstitutionSerializer

class DocumentTypeSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = DocumentType
        fields = ['id', 'institution', 'name', 'code', 'description']
        read_only_fields = ['code']

    def to_representation(self, instance):
        """Override to include institution name in the representation"""
        data = super().to_representation(instance)
        data['institution'] = InstitutionSerializer(instance.institution).data
        return data    