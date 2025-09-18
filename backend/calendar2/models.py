from django.db import models
from datetime import timedelta, date
from dateutil.relativedelta import relativedelta
from utilities.holiday_manager import HolidayManager
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from approval.models import BaseApprovableModel


class PublicHoliday(BaseApprovableModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="institution_public_holidays",
    )
    title = models.CharField(max_length=100)
    date = models.DateField()

    def __str__(self):
        return f"{self.title} on {self.date}"

    class Meta:
        verbose_name = "Public Holiday"
        verbose_name_plural = "Public Holidays"
        ordering = ["date"]
        unique_together = ("institution", "date")

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            self._add_public_holiday_to_calendar()

    def _add_public_holiday_to_calendar(self):
        from calendar2.models import Calendar

        year = self.date.year

        calendar, _ = Calendar.objects.get_or_create(
            institution=self.institution,
            year=year,
        )

        calendar.public_holidays.add(self)

    def get_institution(self):
        return self.institution


# Preferably Zoom
# class OnlineMeeting(BaseApprovableModel):
#     event = models.OneToOneField(
#         "Event", on_delete=models.CASCADE, related_name="online_event_details"
#     )
#     meeting_id = models.CharField(max_length=100, unique=True)
#     start_time = models.DateTimeField()
#     duration = models.PositiveIntegerField()
#     topic = models.CharField(max_length=200, blank=True, null=True)
#     join_url = models.URLField()
#     start_url = models.URLField()

#     def __str__(self):
#         return f"Online Meeting for {self.topic} at {self.start_time}"

#     def get_institution(self):
#         return self.event.institution


class Event(BaseApprovableModel):
    TARGET_AUDIENCE_CHOICES = [
        ("all", "All Employees"),
        ("department", "Specific Department"),
        ("individual", "Specific Individual"),
        ("specific_employees", "Specific Employees"),
    ]
    EVENT_FREQUENCY_CHOICES = [
        ("once", "Once"),
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]
    EVENT_MODE_CHOICES = [
        ("physical", "Physical"),
        ("online", "Online"),
        ("hybrid", "Hybrid"),
    ]

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="institution_events",
    )

    title = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()

    target_audience = models.CharField(
        max_length=20, choices=TARGET_AUDIENCE_CHOICES, default="all"
    )

    event_mode = models.CharField(
        max_length=20, choices=EVENT_MODE_CHOICES, default="physical"
    )

    department = models.ForeignKey(
        "institution.Department",
        on_delete=models.CASCADE,
        related_name="department_events",
        blank=True,
        null=True,
    )

    specific_employees = models.ManyToManyField(
        "users.Profile",
        related_name="specific_employees_events",
        blank=True,
    )

    frequency = models.CharField(
        max_length=20, choices=EVENT_FREQUENCY_CHOICES, default="once"
    )
    is_birthday = models.BooleanField(default=False)

    repeat_until = models.DateField(
        blank=True,
        null=True,
        help_text="If frequency is set, event will repeat until this date",
    )


    def __str__(self):
        return f"{self.title} on {self.date} at {self.institution.institution_name}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            self._add_event_to_calendar()

            # This will be opened after Review
            """
            if self.event_mode == "online":
                self._create_online_meeting()
            """

    # def _create_online_meeting(self):
    #     from calendar2.zoom_api import create_zoom_meeting
    #     from calendar2.models import ZoomMeeting
    #     from datetime import datetime

    #     access_token = self.institution.get_zoom_access_token()
    #     start_time = datetime.combine(self.date, datetime.min.time())

    #     zoom_data = create_zoom_meeting(
    #         access_token=access_token,
    #         topic=self.title,
    #         start_time=start_time.isoformat(),
    #         duration=60,
    #     )

    #     ZoomMeeting.objects.create(
    #         event=self,
    #         meeting_id=zoom_data["id"],
    #         start_time=zoom_data["start_time"],
    #         duration=zoom_data["duration"],
    #         topic=zoom_data["topic"],
    #         join_url=zoom_data["join_url"],
    #         start_url=zoom_data["start_url"],
    #     )

    def _add_event_to_calendar(self):
        from calendar2.models import Calendar, EventOccurrence

        start_date = self.date
        end_date = self.repeat_until if self.repeat_until else self.date

        if self.frequency == "weekly":
            delta = timedelta(weeks=1)
        elif self.frequency == "monthly":
            delta = relativedelta(months=1)
        elif self.frequency == "yearly":
            delta = relativedelta(years=1)
        elif self.frequency == "once":
            year = self.date.year
            calendar, _ = Calendar.objects.get_or_create(
                institution=self.institution,
                year=year,
            )
            EventOccurrence.objects.get_or_create(
                event=self,
                date=self.date,
                calendar=calendar,
            )
            return
        else:
            delta = timedelta(days=1)

        current_date = start_date
        occurrences_to_create = []
        calendars = {}

        while current_date <= end_date:
            year = current_date.year

            if year not in calendars:
                calendars[year], _ = Calendar.objects.get_or_create(
                    institution=self.institution,
                    year=year,
                )

            calendar = calendars[year]

            occurrences_to_create.append(
                EventOccurrence(
                    event=self,
                    date=current_date,
                    calendar=calendar,
                )
            )

            current_date += delta

        EventOccurrence.objects.bulk_create(
            occurrences_to_create,
            ignore_conflicts=True,
        )

        for calendar in calendars.values():
            calendar.events.add(self)

    def get_institution(self):
        return self.institution


class EventOccurrence(models.Model):
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="occurrences"
    )
    date = models.DateField()
    calendar = models.ForeignKey(
        "calendar2.Calendar", on_delete=models.CASCADE, related_name="event_occurrences"
    )

    class Meta:
        unique_together = ("event", "date")
        ordering = ["date"]

    def __str__(self):
        return f"{self.event.title} on {self.date}"


class Calendar(SoftDeletableTimeStampedModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="institution_calendars",
    )

    year = models.PositiveIntegerField()

    public_holidays = models.ManyToManyField(
        PublicHoliday,
        related_name="calendars",
        blank=True,
    )
    events = models.ManyToManyField(
        Event,
        related_name="calendars",
        blank=True,
    )

    def __str__(self):
        return f"Calendar for {self.institution.institution_name} - {self.year}"

    class Meta:
        verbose_name = "Calendar"
        verbose_name_plural = "Calendars"
        unique_together = ("institution", "year")
        ordering = ["-year", "created_at"]

    @classmethod
    def create_with_holidays(cls, institution, year):
        calendar, created = cls.objects.get_or_create(
            institution=institution,
            year=year,
        )

        if created:
            country_code = institution.country_code

            manager = HolidayManager(country_code, year)

            holidays_dict = manager.get_holidays()

            for holiday_date, title in holidays_dict.items():
                public_holiday, _ = PublicHoliday.objects.get_or_create(
                    institution=institution,
                    date=holiday_date,
                    defaults={"title": title},
                )

                calendar.public_holidays.add(public_holiday)

        return calendar
