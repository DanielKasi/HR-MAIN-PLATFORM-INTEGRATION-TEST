from general.serializers import BaseApprovableSerializer
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

    def validate(self, data):
        date = data.get('date')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if date and not start_date:
            data['start_date'] = date

        if start_date and not end_date:
            data['end_date'] = start_date

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "End date cannot be before start date."
            })
            
        return data
 


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
