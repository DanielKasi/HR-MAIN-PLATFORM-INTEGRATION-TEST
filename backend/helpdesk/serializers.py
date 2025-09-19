from approval.serializers import BaseApprovableSerializer
from rest_framework import serializers
from .models  import FAQ, FAQCategory, TicketCategory
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

class FAQSerializer(serializers.ModelSerializer):
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
