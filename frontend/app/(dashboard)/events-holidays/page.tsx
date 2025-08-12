"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {ChevronLeft, ChevronRight, Plus} from "lucide-react";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import { Calendar } from 'lucide-react';
import Link from "next/link";
import { calendarAPI } from "@/lib/utils";
import { ICalendarEvent } from "@/types/types.utils";

interface IEvent {
  id: number;
  institution: number;
  title: string;
  description: string;
  date: string;
  target_audience: "all" | "department" | "individual" | "specific_employees";
  event_mode: "physical" | "online" | "hybrid";
  department: any;
  specific_employees: any[];
  created_at: string;
  updated_at: string;
  created_by: any;
  updated_by: any;
}

interface IPublicHoliday {
  id: number;
  institution: number;
  title: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface IEventOccurrence {
  id: number;
  event: IEvent;
  date: string;
}

interface ICalendar {
  id: number;
  institution: number;
  year: number;
  public_holidays: IPublicHoliday[];
  event_occurrences: IEventOccurrence[];
  created_at: string;
  updated_at: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function EventsCalendarPage() {
  const [calendar, setCalendar] = useState<ICalendarEvent[] | null>(null);
  const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month");
  const selectedInstitution = useSelector(selectSelectedInstitution);

  console.log("publicHolidays", publicHolidays);



  useEffect(() => {
    if (selectedInstitution) {
      fetchCalendar(currentDate.getFullYear());
      fetchPublicHolidays();
    }
  }, [selectedInstitution, currentDate.getFullYear()]);

  const fetchCalendar = async (year: number) => {
    
    try {
      setLoading(true);
      
      const response = await calendarAPI.getInstitutionCalendar(year);
  
      if (response) {
        setCalendar(response);
      }
    } catch (error) {
      console.warn("Error fetching calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicHolidays = async () => {
    if (!selectedInstitution?.id) return;
    
    try {
      const response = await calendarAPI.getPublicHolidays();
      console.log("response", response);
      if (response.results  ) {
        setPublicHolidays(response.results as IPublicHoliday[]);
      }
    } catch (error) {
      console.warn("Error fetching public holidays:", error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    if (!calendar) return { events: [], holidays: [] };

    const dateStr = date.toISOString().split('T')[0];
    
    const events = calendar.event_occurrences.filter(
      (occurrence) => occurrence.date === dateStr
    );
    
    const holidays = calendar.public_holidays.filter(
      (holiday) => holiday.date === dateStr
    );

    return { events, holidays };
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    );
  };

  const getWeekNumber = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }





 
  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Events Calendar</h1>
            {/* Add Event Button */}
            <Link href="/events-holidays/events/add" passHref>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Event
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-foreground">
                {MONTHS[currentDate.getMonth()]}
              </span>
              <span className="text-lg sm:text-xl text-muted-foreground">
                {currentDate.getFullYear()}
              </span>
            </div>
            
            {/* View Mode Toggles */}
            <div className="flex bg-muted rounded-lg p-1 overflow-x-auto">
              {["Day", "Week", "Month", "Years"].map((mode) => (
                <button
                  key={mode}
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    viewMode === mode.toLowerCase()
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setViewMode(mode.toLowerCase())}
                >
                  {mode}
                </button>
              ))}
            </div>

            

            {/* Navigation Arrows */}
            <div className="flex gap-2 justify-center lg:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
                className="border-border hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
                className="border-border hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content - Calendar and Events Side by Side */}
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6">
          {/* Calendar - Left Side */}
          <div className="flex-1 min-w-0">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-0">
                <div className="grid grid-cols-8 gap-px bg-border">
                  {/* Week Numbers Column */}
                  <div className="bg-muted p-2 sm:p-3 border-r border-border"></div>
                  
                  {/* Day Headers */}
                  {DAYS.map((day) => (
                    <div key={day} className="bg-muted p-2 sm:p-3 text-center font-semibold text-foreground text-xs sm:text-sm border-r border-border">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Grid */}
                  {weeks.map((week, weekIndex) => (
                    <>
                      {/* Week Number */}
                      <div key={`week-${weekIndex}`} className="bg-muted p-2 sm:p-3 text-center text-xs sm:text-sm text-muted-foreground border-r border-border">
                        {getWeekNumber(week[0])}
                      </div>
                      
                      {/* Days in Week */}
                      {week.map((day, dayIndex) => {
                        if (!day) return null;
                        
                        const { events, holidays } = getEventsForDate(day);
                        const isCurrentMonthDay = isCurrentMonth(day);
                        const isTodayDate = isToday(day);

                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            className={`min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] p-1 sm:p-2 bg-card border-r border-border ${
                              !isCurrentMonthDay ? "text-muted-foreground" : ""
                            }`}
                          >
                            <div className="h-full flex flex-col">
                              {/* Date Number */}
                              <div className="flex justify-center mb-1 sm:mb-2">
                                <div
                                  className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                                    isTodayDate
                                      ? "bg-primary text-primary-foreground"
                                      : isCurrentMonthDay
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {day.getDate()}
                                </div>
                              </div>

                              {/* Events and Holidays */}
                              <div className="flex-1 space-y-0.5 sm:space-y-1">
                                {holidays.map((holiday, idx) => (
                                  <div
                                    key={idx}
                                    className="text-[10px] sm:text-xs p-0.5 sm:p-1 bg-green-100 text-green-800 rounded border border-green-200 truncate"
                                    title={holiday.title}
                                  >
                                    {holiday.title}
                                  </div>
                                ))}

                                {events.slice(0, 2).map((event, idx) => (
                                  <div
                                    key={idx}
                                    className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded border truncate ${
                                      event.event.event_mode === "physical"
                                        ? "bg-blue-100 text-blue-800 border-blue-200"
                                        : event.event.event_mode === "online"
                                        ? "bg-purple-100 text-purple-800 border-purple-200"
                                        : "bg-orange-100 text-orange-800 border-orange-200"
                                    }`}
                                    title={event.event.title}
                                  >
                                    {event.event.title}
                                  </div>
                                ))}

                                {events.length > 2 && (
                                  <div className="text-[10px] sm:text-xs text-muted-foreground text-center">
                                    +{events.length - 2} more
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Events Sidebar - Right Side */}
          <div className="w-full xl:w-80 space-y-4">
            {/* Upcoming Events */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Upcoming Events</h3>
              <div className="space-y-2 sm:space-y-3">
                {calendar?.event_occurrences
                  .filter(occurrence => new Date(occurrence.date) >= new Date())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((occurrence, idx) => (
                    <div key={idx} className="p-2 sm:p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground text-xs sm:text-sm line-clamp-2 flex-1 mr-2">
                          {occurrence.event.title}
                        </h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          occurrence.event.event_mode === "physical"
                            ? "bg-blue-100 text-blue-800"
                            : occurrence.event.event_mode === "online"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}>
                          {occurrence.event.event_mode}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {new Date(occurrence.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {occurrence.event.description}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Audience: {occurrence.event.target_audience.replace('_', ' ')}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 sm:py-6 text-muted-foreground">
                      <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm sm:text-base">No upcoming events</p>
                    </div>
                  )}
              </div>
            </div>

            {/* Public Holidays */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Public Holidays</h3>
              <div className="space-y-2">
                {publicHolidays
                  .filter(holiday => new Date(holiday.date) >= new Date())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 3)
                  .map((holiday, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-xs sm:text-sm font-medium text-green-800 flex-1 mr-2">
                        {holiday.title}
                      </span>
                      <span className="text-xs text-green-600 flex-shrink-0">
                        {new Date(holiday.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )) || (
                    <div className="text-center py-3 sm:py-4 text-muted-foreground">
                      <p className="text-xs sm:text-sm">No upcoming holidays</p>
                    </div>
                  )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">This Month</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-base sm:text-lg font-bold text-blue-800">
                    {calendar?.event_occurrences.filter(occurrence => 
                      new Date(occurrence.date).getMonth() === currentDate.getMonth() &&
                      new Date(occurrence.date).getFullYear() === currentDate.getFullYear()
                    ).length || 0}
                  </div>
                  <div className="text-xs text-blue-600">Events</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-base sm:text-lg font-bold text-green-800">
                    {publicHolidays.filter(holiday => 
                      new Date(holiday.date).getMonth() === currentDate.getMonth() &&
                      new Date(holiday.date).getFullYear() === currentDate.getFullYear()
                    ).length || 0}
                  </div>
                  <div className="text-xs text-green-600">Holidays</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
