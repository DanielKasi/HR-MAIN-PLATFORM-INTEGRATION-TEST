from approval.serializers import BaseApprovableSerializer
from .models import PublicHoliday, Event, Calendar, EventOccurrence
from rest_framework import serializers


class PublicHolidaySerializer(BaseApprovableSerializer):
    class Meta:
        model = PublicHoliday
        fields = '__all__'


class EventSerializer(BaseApprovableSerializer):
    class Meta:
        model = Event
        fields = '__all__'
 


class EventOccurrenceSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    is_birthday = serializers.BooleanField(source='event.is_birthday')
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = EventOccurrence
        fields = '__all__'
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
        fields = '__all__'

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]
