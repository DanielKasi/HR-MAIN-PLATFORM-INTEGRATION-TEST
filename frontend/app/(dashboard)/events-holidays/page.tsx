"use client";

import React, {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {ArrowLeft, ChevronLeft, ChevronRight, Plus} from "lucide-react";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import { Calendar } from 'lucide-react';
import Link from "next/link";
import { calendarAPI } from "@/lib/utils";
import { ICalendarEvent, IEvent, IPublicHoliday } from "@/types/types.utils";
import { Icon } from "@iconify/react";





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
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month");
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [holidaySearchTerm, setHolidaySearchTerm] = useState("");
  const [holidayFilter, setHolidayFilter] = useState("all");
  const selectedInstitution = useSelector(selectSelectedInstitution);

  console.log("calendar", calendar);
  console.log("publicHolidays", publicHolidays);
  console.log("events", events);



  useEffect(() => {
    if (selectedInstitution) {
      fetchCalendar(currentDate.getFullYear());
      fetchEvents();
      
    }
  }, [selectedInstitution, currentDate.getFullYear()]);

  const fetchCalendar = async (year: number) => {
    
    try {
      setLoading(true);
      
      const response = await calendarAPI.getInstitutionCalendar(year);
  
      if (response) {
        setCalendar(response);
        setPublicHolidays(response.public_holidays || []);
      }
    } catch (error) {
      console.warn("Error fetching calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!selectedInstitution) return; 
    try {
      setLoading(true);
      const response = await calendarAPI.getEvents();
      setEvents(response.results || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
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
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Get events for this date from the events state
    const eventsForDate = events.filter(
      (event) => event.date === dateStr
    );
    
    // Get holidays for this date from the publicHolidays state
    const holidaysForDate = publicHolidays.filter(
      (holiday) => holiday.date === dateStr
    );

    return { events: eventsForDate, holidays: holidaysForDate };
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

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateYear = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const getNavigationFunction = () => {
    switch (viewMode) {
      case "day":
        return navigateDay;
      case "week":
        return navigateWeek;
      case "month":
        return navigateMonth;
      case "years":
        return navigateYear;
      default:
        return navigateMonth;
    }
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

  const getDaysInWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = date.getDay();
    startOfWeek.setDate(date.getDate() - day);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const newDate = new Date(startOfWeek);
      newDate.setDate(startOfWeek.getDate() + i);
      days.push(newDate);
    }
    return days;
  };

  const getWeeksInYear = (year: number) => {
    const weeks = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    while (currentDate <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  const getYearsRange = (currentYear: number) => {
    const years = [];
    const startYear = currentYear - 5;
    const endYear = currentYear + 5;
    
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
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
            <div className="flex items-center gap-3 ">
              <Link href="/events-holidays" passHref>
                <Button
                  variant="outline"
                  size="sm" 
                  className="shadow-sm bg-transparent rounded-full w-8 h-8 p-4 flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Events Calendar</h1>
            </div>
            
            {/* Add Event Button */}
            <div className="flex gap-2 items-center">
              <Link href="/events-holidays/events/add" passHref>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Event
                </Button>
              </Link>
              <Link href="/events-holidays/holidays/add" passHref>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Holiday
                </Button>
              </Link>
            </div>
            
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
                onClick={() => getNavigationFunction()("prev")}
                className="border-border hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getNavigationFunction()("next")}
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
            {viewMode === "day" && (
              <div className="overflow-hidden">
                <div className="p-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-foreground">
                      {currentDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h2>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Day Timeline */}
                    <div className="space-y-4">
                      {/* All Day Events */}
                      <div className=" pb-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">All Day Events</h3>
                        <div className="space-y-2">
                          {getEventsForDate(currentDate).events.map((event, idx) => (
                            <div
                              key={`day-event-${idx}`}
                              className={`p-3 rounded border ${
                                event.event_mode === "physical"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : event.event_mode === "online"
                                  ? "bg-purple-100 text-purple-800 border-purple-200"
                                  : "bg-orange-100 text-orange-800 border-orange-200"
                              }`}
                            >
                              <div className="font-medium">{event.title}</div>
                              <div className="text-xs opacity-75 mt-1">{event.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Holidays */}
                      {getEventsForDate(currentDate).holidays.length > 0 && (
                        <div className="border-b border-border pb-4">
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Holidays</h3>
                          <div className="space-y-2">
                            {getEventsForDate(currentDate).holidays.map((holiday, idx) => (
                              <div
                                key={`day-holiday-${idx}`}
                                className="p-3 bg-green-100 text-green-800 rounded border border-green-200"
                              >
                                <div className="font-medium">{holiday.title}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewMode === "week" && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-foreground">
                      Week {getWeekNumber(currentDate)} - {currentDate.getFullYear()}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-px bg-border">
                    {/* Day Headers */}
                    {getDaysInWeek(currentDate).map((day) => (
                      <div key={day.toISOString()} className="bg-muted p-2 text-center font-semibold text-foreground text-sm border-r border-border">
                        <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-xs text-muted-foreground">{day.getDate()}</div>
                      </div>
                    ))}

                    {/* Week Grid */}
                    {getDaysInWeek(currentDate).map((day) => {
                      const { events, holidays } = getEventsForDate(day);
                      return (
                        <div key={day.toISOString()} className="min-h-[200px] p-2 bg-card border-r border-border">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          
                          {/* Events */}
                          <div className="space-y-1">
                            {events.map((event, idx) => (
                              <div
                                key={`week-event-${idx}`}
                                className={`text-xs p-1 rounded border truncate ${
                                  event.event_mode === "physical"
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : event.event_mode === "online"
                                    ? "bg-purple-100 text-purple-800 border-purple-200"
                                    : "bg-orange-100 text-orange-800 border-orange-200"
                                }`}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}
                          </div>

                          {/* Holidays */}
                          <div className="space-y-1 mt-2">
                            {holidays.map((holiday, idx) => (
                              <div
                                key={`week-holiday-${idx}`}
                                className="text-xs p-1 bg-green-100 text-green-800 rounded border border-green-200 truncate"
                                title={holiday.title}
                              >
                                {holiday.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {viewMode === "month" && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-0">
                  <div className="grid grid-cols-8 gap-px bg-border">
                    {/* Week Numbers Column */}
                    <div className="bg-muted p-2 sm:p-3 border-r border-border w-12"></div>
                    
                    {/* Day Headers */}
                    {DAYS.map((day) => (
                      <div key={day} className="bg-muted p-2 sm:p-3 text-center font-semibold text-foreground text-xs sm:text-sm border-r border-border">
                        {day}
                      </div>
                    ))}

                    {/* Calendar Grid */}
                    {weeks.map((week, weekIndex) => (
                      <React.Fragment key={`week-${weekIndex}`}>
                        {/* Week Number */}
                        <div className="bg-muted p-2 sm:p-3 text-center text-xs sm:text-sm text-muted-foreground border-r border-border">
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
                                  {holidays.length > 0 && holidays.map((holiday: IPublicHoliday, idx: number) => (
                                    <div
                                      key={`holiday-${weekIndex}-${dayIndex}-${idx}`}
                                      className="text-[10px] sm:text-xs p-0.5 sm:p-1 bg-green-100 text-green-800 rounded border border-green-200 truncate"
                                      title={holiday.title}
                                    >
                                      {holiday.title}
                                    </div>
                                  ))}

                                  {events.length > 0 && events.slice(0, 2).map((event, idx) => (
                                    <div
                                      key={`event-${weekIndex}-${dayIndex}-${idx}`}
                                      className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded border truncate ${
                                        event.event_mode === "physical"
                                          ? "bg-blue-100 text-blue-800 border-blue-200"
                                          : event.event_mode === "online"
                                          ? "bg-purple-100 text-purple-800 border-purple-200"
                                          : "bg-orange-100 text-orange-800 border-orange-200"
                                      }`}
                                      title={event.title}
                                    >
                                      {event.title}
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
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewMode === "years" && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground">
                      {currentDate.getFullYear()}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6">
                    {getYearsRange(currentDate.getFullYear()).map((year) => (
                      <div
                        key={year}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          year === currentDate.getFullYear()
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setCurrentDate(new Date(year, 0, 1))}
                      >
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            year === currentDate.getFullYear() ? "text-primary" : "text-foreground"
                          }`}>
                            {year}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {events.filter(event => new Date(event.date).getFullYear() === year).length} events
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {publicHolidays.filter(holiday => new Date(holiday.date).getFullYear() === year).length} holidays
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Events Sidebar - Right Side */}
          <div className="w-full xl:w-80 space-y-4">
            {/* Upcoming Events */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Events</h3>
              
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-[0.7]">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={eventSearchTerm}
                    onChange={(e) => setEventSearchTerm(e.target.value)}
                  />
                  <div className="absolute right-3 top-2.5">
                    <Icon icon="hugeicons:search-01" className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <select
                  className="flex-[0.3] px-2 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                >
                  <option value="all">All Events</option>
                  <option value="recent">Recent Events</option>
                </select>
              </div>
              
              <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
                {(() => {
                  // Filter and search events
                  let filteredEvents = events;
                  
                  // Apply search filter
                  if (eventSearchTerm) {
                    filteredEvents = filteredEvents.filter(event =>
                      event.title.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                      event.description.toLowerCase().includes(eventSearchTerm.toLowerCase())
                    );
                  }
                  
                  // Apply time filter
                  if (eventFilter === "recent") {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    filteredEvents = filteredEvents.filter(event => 
                      new Date(event.date) >= thirtyDaysAgo
                    );
                  }
                  
                  if (filteredEvents.length === 0) {
                    return (
                      <div className="text-center py-4 sm:py-6 text-muted-foreground">
                        <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm sm:text-base">
                          {eventSearchTerm || eventFilter !== "all" 
                            ? "No events match your search/filter" 
                            : "No upcoming events"}
                        </p>
                      </div>
                    );
                  }
                  
                  return filteredEvents.map((event, idx) => (
                    <div key={`upcoming-event-${event.id || idx}`} className="p-2 sm:p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground text-xs sm:text-sm line-clamp-2 flex-1 mr-2">
                          {event.title}
                        </h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          event.event_mode === "physical"
                            ? "bg-blue-100 text-blue-800"
                            : event.event_mode === "online"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}>
                          {event.event_mode}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Audience: {event.target_audience.replace('_', ' ')}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Public Holidays */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Public Holidays</h3>
              
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-[0.7]">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={holidaySearchTerm}
                    onChange={(e) => setHolidaySearchTerm(e.target.value)}
                  />
                  <div className="absolute right-3 top-2.5">
                    <Icon icon="hugeicons:search-01" className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <select
                  className="flex-[0.3] px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                  value={holidayFilter}
                  onChange={(e) => setHolidayFilter(e.target.value)}
                >
                  <option value="all">All Holidays</option>
                  <option value="recent">Recent Holidays</option>
                </select>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {(() => {
                  // Filter and search holidays
                  let filteredHolidays = publicHolidays
                    .filter(holiday => new Date(holiday.date) >= new Date())
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  
                  // Apply search filter
                  if (holidaySearchTerm) {
                    filteredHolidays = filteredHolidays.filter(holiday =>
                      holiday.title.toLowerCase().includes(holidaySearchTerm.toLowerCase())
                    );
                  }
                  
                  // Apply time filter
                  if (holidayFilter === "recent") {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    filteredHolidays = filteredHolidays.filter(holiday => 
                      new Date(holiday.date) >= thirtyDaysAgo
                    );
                  }
                  
                  if (filteredHolidays.length === 0) {
                    return (
                      <div className="text-center py-3 sm:py-4 text-muted-foreground">
                        <p className="text-xs sm:text-sm">
                          {holidaySearchTerm || holidayFilter !== "all" 
                            ? "No holidays match your search/filter" 
                            : "No upcoming holidays"}
                        </p>
                      </div>
                    );
                  }
                  
                  return filteredHolidays.slice(0, 3).map((holiday, idx) => (
                    <div key={`holiday-${holiday.id || holiday.date}-${idx}`} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
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
                  ));
                })()}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">This Month</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-base sm:text-lg font-bold text-blue-800">
                    {events.filter(event => 
                      new Date(event.date).getMonth() === currentDate.getMonth() &&
                      new Date(event.date).getFullYear() === currentDate.getFullYear()
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
