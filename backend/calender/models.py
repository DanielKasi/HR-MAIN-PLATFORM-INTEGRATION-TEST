from django.db import models


class PublicHoliday(models.Model):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="institution_public_holidays",
    )
    title = models.CharField(max_length=100, unique=True)
    date = models.DateField()

    def __str__(self):
        return f"{self.title} on {self.date}"

    class Meta:
        verbose_name = "Public Holiday"
        verbose_name_plural = "Public Holidays"
        ordering = ["date"]
        unique_together = ("institution", "date")


class Event(models.Model):
    TARGET_AUDIENCE_CHOICES = [
        ("all", "All Employees"),
        ("department", "Specific Department"),
        ("individual", "Specific Individual"),
        ("specific_employees", "Specific Employees"),
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

    created_at = models.DateTimeField(blank=True, null=True, auto_now_add=True)
    updated_at = models.DateTimeField(blank=True, null=True, auto_now=True)

    created_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="created_events",
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="updated_events",
        blank=True,
        null=True,
    )

    def __str__(self):
        return f"{self.title} on {self.date} at {self.institution.institution_name}"


class Calender(models.Model):
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Calendar for {self.institution.institution_name} - {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        verbose_name = "Calendar"
        verbose_name_plural = "Calendars"
        unique_together = ("institution", "year")
        ordering = ["-year", "created_at"]
