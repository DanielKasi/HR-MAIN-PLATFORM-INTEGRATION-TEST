from rest_framework import serializers

from approval.serializers import BaseApprovableSerializer
from .models import Announcement, Acknowledgment
from django.contrib.contenttypes.models import ContentType

class AnnouncementSerializer(BaseApprovableSerializer):
    announcement_type = serializers.SlugRelatedField(
        queryset=ContentType.objects.filter(model='announcementtype'),
        slug_field='model',
        allow_null=True
    )

    class Meta:
        model = Announcement
        fields = '__all__'

class AcknowledgmentSerializer(serializers.ModelSerializer):
    announcement = AnnouncementSerializer(read_only=True)

    class Meta:
        model = Acknowledgment
        fields = '__all__'       