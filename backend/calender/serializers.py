from .models import PublicHoliday, Event, Calender
from rest_framework import serializers


class PublicHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicHoliday
        fields = "__all__"
        read_only_fields = "id"


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "id",
            "institution",
            "title",
            "description",
            "date",
            "target_audience",
            "department",
            "specific_employees",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class CalenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calender
        fields = [
            "id",
            "institution",
            "year",
            "public_holidays",
            "events",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]
