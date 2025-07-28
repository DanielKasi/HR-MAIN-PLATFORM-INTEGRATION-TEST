import holidays
from datetime import date


class HolidayManager:
    def __init__(self, country_code, year):
        self.country_code = country_code
        self.year = year
        self.holiday_list = self._load_holidays()

    def _load_holidays(self):
        try:
            country_holidays = holidays.CountryHoliday(
                self.country_code, years=self.year
            )
            return country_holidays

        except NotImplementedError:
            if self.country_code == "UG":
                return self._uganda_holidays()
            else:
                return self._general_holidays()

    def _general_holidays(self):
        return {
            date(self.year, 1, 1): "New Year's Day",
            date(self.year, 12, 25): "Christmas Day",
            date(self.year, 12, 26): "Boxing Day",
            date(self.year, 12, 31): "New Year's Eve",
        }

    def _uganda_holidays(self):
        return {
            date(self.year, 1, 1): "New Year's Day",
            date(self.year, 1, 26): "NRM Liberation Day",
            date(self.year, 2, 16): "Archbishop Janani Luwum Day",
            date(self.year, 3, 8): "International Women's Day",
            date(self.year, 5, 1): "Labour Day",
            date(self.year, 6, 3): "Martyrs' Day",
            date(self.year, 6, 9): "National Heroes' Day",
            date(self.year, 10, 9): "Independence Day",
            date(self.year, 12, 25): "Christmas Day",
            date(self.year, 12, 26): "Boxing Day",
            date(self.year, 11, 1): "All Saints' Day",
            date(self.year, 12, 31): "New Year's Eve",
        }

    def get_holidays(self):
        return dict(self.holiday_list)
