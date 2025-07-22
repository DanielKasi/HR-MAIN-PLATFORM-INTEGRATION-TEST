from rest_framework import serializers
from .models import PerformancePolicy
from institution.models import Institution
from institution.serializers import InstitutionSerializer

class PerformancePolicySerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(
        queryset=Institution.objects.all()
    )
    
    class Meta:
        model = PerformancePolicy
        fields = '__all__'
        
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['institution'] = InstitutionSerializer(instance.instituttion).data
        
        return rep    