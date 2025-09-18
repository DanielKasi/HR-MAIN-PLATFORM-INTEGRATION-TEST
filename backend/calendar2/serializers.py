from approval.serializers import BaseApprovableSerializer
from .models import PublicHoliday, Event, Calendar, EventOccurrence
from rest_framework import serializers


class PublicHolidaySerializer(BaseApprovableSerializer):
    class Meta:
        model = PublicHoliday
        fields = ["id", "institution", "title", "date", "created_at", "updated_at"]
        read_only_fields = ["id"]


class EventSerializer(BaseApprovableSerializer):
    class Meta:
        model = Event
        fields = [
            "id",
            "institution",
            "title",
            "description",
            "date",
            "target_audience",
            "event_mode",
            "frequency",
            "repeat_until",
            "department",
            "specific_employees",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class EventOccurrenceSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    is_birthday = serializers.BooleanField(source='event.is_birthday')
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = EventOccurrence
        fields = ["id", "event", "date", "is_birthday", "employee_name"]
        read_only_fields = ["id"]

    def get_employee_name(self, obj):
        if obj.event.is_birthday and obj.event.specific_employees.exists():
            return obj.event.specific_employees.first().user.fullname
        return None    


class CalendarSerializer(serializers.ModelSerializer):

    public_holidays = PublicHolidaySerializer(many=True, read_only=True)
    event_occurrences = EventOccurrenceSerializer(many=True, read_only=True)

    class Meta:
        model = Calendar
        fields = [
            "id",
            "institution",
            "year",
            "public_holidays",
            "event_occurrences",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]
