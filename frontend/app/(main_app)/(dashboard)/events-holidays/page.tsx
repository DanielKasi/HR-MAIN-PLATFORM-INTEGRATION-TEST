"use client";

import React, {useEffect, useState, useCallback, useMemo} from "react";
import {Button} from "@/components/ui/button";
import {ArrowLeft, ChevronLeft, ChevronRight, Plus} from "lucide-react";
import {Calendar} from "lucide-react";
import Link from "next/link";
import {calendarAPI} from "@/lib/utils";
import {Icon} from "@iconify/react";
import {EditEventModal} from "@/components/events-holidays/edit-event-modal";
import {EditHolidayModal} from "@/components/events-holidays/edit-holiday-modal";
import {ICalendar, IEvent, IPublicHoliday} from "@/types/types.utils";

// Define types inline to avoid import issues
interface ICalendarEvent {
  id: number;
  public_holidays: IPublicHoliday[];
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
  const [calendar, setCalendar] = useState<ICalendar | null>(null);
  const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month");
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [holidaySearchTerm, setHolidaySearchTerm] = useState("");
  const [holidayFilter, setHolidayFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("events");
  const [selectedItem, setSelectedItem] = useState<{type: "event" | "holiday"; data: any} | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({x: 0, y: 0});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<IEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditHolidayModal, setShowEditHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<IPublicHoliday | null>(null);
  const [isEditingHoliday, setIsEditingHoliday] = useState(false);

  const selectedInstitution = useMemo(
    () => ({
      id: 1,
      name: "Sample Institution",
    }),
    [],
  );

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModal && !(event.target as Element).closest(".popover-content")) {
        setShowModal(false);
        setSelectedItem(null);
      }
    };

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

  const fetchCalendar = useCallback(async (year: number) => {
    try {
      setLoading(true);
      const response = await calendarAPI.getInstitutionCalendar({year});
      if (response) {
        setCalendar(response);
        setPublicHolidays(response.public_holidays || []);
      }
    } catch (error) {
      console.warn("Error fetching calendar:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const openEditModal = (event: IEvent) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const openEditHolidayModal = (holiday: IPublicHoliday) => {
    setEditingHoliday(holiday);
    setShowEditHolidayModal(true);
  };

  const handleSaveEvent = async (eventId: number, updatedData: Partial<IEvent>) => {
    setIsEditing(true);
    try {
      // Make API call to update the event in the database
      const response = await calendarAPI.updateEvent(eventId, updatedData);

      // Update local state with the response from the API
      setEvents((prev) =>
        prev.map((event) => (event.id === eventId ? {...event, ...response} : event)),
      );

      setShowEditModal(false);
      setEditingEvent(null);

      // You can add a success toast here
      console.log("Event updated successfully:", response);
    } catch (error) {
      console.error("Error updating event:", error);
      // You can add an error toast here
      // Don't close the modal on error so user can retry
      throw error; // Re-throw to let the modal handle the error display
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveHoliday = async (holidayId: number, updatedData: Partial<IPublicHoliday>) => {
    setIsEditingHoliday(true);
    try {
      // Make API call to update the holiday in the database
      const response = await calendarAPI.updatePublicHoliday(holidayId, updatedData);

      // Update local state with the response from the API
      setPublicHolidays((prev) =>
        prev.map((holiday) => (holiday.id === holidayId ? {...holiday, ...response} : holiday)),
      );

      setShowEditHolidayModal(false);
      setEditingHoliday(null);

      // You can add a success toast here
      console.log("Holiday updated successfully:", response);
    } catch (error) {
      console.error("Error updating holiday:", error);
      // You can add an error toast here
      // Don't close the modal on error so user can retry
      throw error; // Re-throw to let the modal handle the error display
    } finally {
      setIsEditingHoliday(false);
    }
  };

  const fetchEvents = useCallback(async () => {
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
  }, [selectedInstitution]);

  useEffect(() => {
    if (selectedInstitution) {
      fetchCalendar(currentDate.getFullYear());
      fetchEvents();
    }
  }, [selectedInstitution, fetchCalendar, fetchEvents, currentDate]);

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
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    // Get events for this date from the events state
    const eventsForDate = events.filter((event) => event.date === dateStr);

    // Get holidays for this date from the publicHolidays state
    const holidaysForDate = publicHolidays.filter((holiday) => holiday.date === dateStr);

    return {events: eventsForDate, holidays: holidaysForDate};
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
      date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
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
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 overflow-x-hidden w-full max-w-full">
      <div className="mx-auto space-y-4 lg:space-y-6 w-full">
        {/* Header */}
        <div className="space-y-3 lg:space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-4 w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/events-holidays" passHref>
                <Button variant="outline" size="sm" className="rounded-full aspect-square">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </Link>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                Events Calendar
              </h1>
            </div>

            {/* Add Event Button */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center min-w-0">
              <Link href="/events-holidays/events/add" passHref>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto text-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Event
                </Button>
              </Link>
              <Link href="/events-holidays/holidays/add" passHref>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto text-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Holiday
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 w-full">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                {MONTHS[currentDate.getMonth()]}
              </span>
              <span className="text-lg sm:text-xl lg:text-2xl text-muted-foreground">
                {currentDate.getFullYear()}
              </span>
            </div>

            {/* View Mode Toggles */}
            <div className="flex rounded-lg p-1 overflow-x-auto min-w-0">
              {["Day", "Week", "Month", "Years"].map((mode) => (
                <button
                  key={mode}
                  className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-0 flex-shrink-0 ${
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
            <div className="flex gap-2 justify-center lg:justify-end min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => getNavigationFunction()("prev")}
                className="border-border hover:bg-muted h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getNavigationFunction()("next")}
                className="border-border hover:bg-muted h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content - Calendar and Events Side by Side */}
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6">
          {/* Calendar - Left Side */}
          <div className="flex-1 min-w-0 w-full">
            {viewMode === "day" && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="text-center mb-4 lg:mb-6">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                      {currentDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h2>
                  </div>

                  <div className="space-y-4 lg:space-y-6">
                    {/* Day Timeline */}
                    <div className="space-y-4">
                      {/* All Day Events */}
                      <div className="border-b border-border pb-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          All Day Events
                        </h3>
                        <div className="space-y-2 lg:space-y-3">
                          {getEventsForDate(currentDate).events.map((event, idx) => (
                            <div
                              key={`day-event-${idx}`}
                              className={`p-3 lg:p-4 rounded border ${
                                event.event_mode === "physical"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : event.event_mode === "online"
                                    ? "bg-purple-100 text-purple-800 border-purple-200"
                                    : "bg-orange-100 text-orange-800 border-orange-200"
                              }`}
                            >
                              <div className="font-medium text-sm sm:text-base">{event.title}</div>
                              <div className="text-xs sm:text-sm opacity-75 mt-1">
                                {event.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Holidays */}
                      {getEventsForDate(currentDate).holidays.length > 0 && (
                        <div className="border-b border-border pb-4">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Holidays
                          </h3>
                          <div className="space-y-2 lg:space-y-3">
                            {getEventsForDate(currentDate).holidays.map((holiday, idx) => (
                              <div
                                key={`day-holiday-${idx}`}
                                className="p-3 lg:p-4 bg-green-100 text-green-800 rounded border border-green-200"
                              >
                                <div className="font-medium text-sm sm:text-base">
                                  {holiday.title}
                                </div>
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
                <div className="p-2 sm:p-4">
                  <div className="text-center mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                      Week {getWeekNumber(currentDate)} - {currentDate.getFullYear()}
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="w-full min-w-0 grid grid-cols-7 gap-px bg-border">
                      {/* Day Headers */}
                      {getDaysInWeek(currentDate).map((day) => (
                        <div
                          key={day.toISOString()}
                          className="bg-muted p-1 sm:p-2 lg:p-3 text-center font-semibold text-foreground text-xs sm:text-sm border-r border-border"
                        >
                          <div className="text-xs sm:text-sm">
                            {day.toLocaleDateString("en-US", {weekday: "short"})}
                          </div>
                          <div className="text-xs text-muted-foreground">{day.getDate()}</div>
                        </div>
                      ))}

                      {/* Week Grid */}
                      {getDaysInWeek(currentDate).map((day) => {
                        const {events, holidays} = getEventsForDate(day);
                        return (
                          <div
                            key={day.toISOString()}
                            className="min-h-[120px] sm:min-h-[150px] lg:min-h-[200px] p-1 sm:p-2 bg-card border-r border-border"
                          >
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              {day.toLocaleDateString("en-US", {month: "short", day: "numeric"})}
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
                                  className="text-xs p-1 bg-green-100 text-green-800 rounded border border-green-200 truncate cursor-pointer hover:bg-green-200 transition-colors"
                                  title={holiday.title}
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setPopoverPosition({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top,
                                    });
                                    setSelectedItem({type: "holiday", data: holiday});
                                    setShowModal(true);
                                  }}
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
              </div>
            )}

            {viewMode === "month" && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <div className="w-full min-w-0">
                      <div className="grid grid-cols-8 gap-px bg-border">
                        {/* Week Numbers Column */}
                        <div className="bg-muted p-1 sm:p-2 lg:p-3 border-r border-border text-xs sm:text-sm text-center text-muted-foreground">
                          Wk
                        </div>

                        {/* Day Headers */}
                        {DAYS.map((day) => (
                          <div
                            key={day}
                            className="bg-muted p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-medium text-muted-foreground"
                          >
                            {day.slice(0, 3)}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-8 gap-px bg-border">
                        {weeks.map((week, weekIndex) => (
                          <React.Fragment key={`week-${weekIndex}`}>
                            {/* Week Number */}
                            <div className="bg-muted p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm text-muted-foreground border-r border-border">
                              {getWeekNumber(week[0])}
                            </div>

                            {/* Days in Week */}
                            {week.map((day, dayIndex) => {
                              if (!day) return null;

                              const {events, holidays} = getEventsForDate(day);
                              const isCurrentMonthDay = isCurrentMonth(day);
                              const isTodayDate = isToday(day);

                              return (
                                <div
                                  key={`${weekIndex}-${dayIndex}`}
                                  className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] xl:min-h-[120px] p-1 sm:p-2 bg-card border-r border-border ${
                                    !isCurrentMonthDay ? "text-muted-foreground" : ""
                                  }`}
                                >
                                  <div className="h-full flex flex-col">
                                    {/* Date Number */}
                                    <div className="flex justify-center mb-1 sm:mb-2">
                                      <div
                                        className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
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
                                      {holidays.length > 0 &&
                                        holidays.map((holiday: IPublicHoliday, idx: number) => (
                                          <div
                                            key={`holiday-${weekIndex}-${dayIndex}-${idx}`}
                                            className="text-[9px] sm:text-[10px] lg:text-xs p-0.5 sm:p-1 bg-green-100 text-green-800 rounded border border-green-200 truncate cursor-pointer hover:bg-green-200 transition-colors"
                                            title={holiday.title}
                                            onClick={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setPopoverPosition({
                                                x: rect.left + rect.width / 2,
                                                y: rect.top,
                                              });
                                              setSelectedItem({type: "holiday", data: holiday});
                                              setShowModal(true);
                                            }}
                                          >
                                            {holiday.title}
                                          </div>
                                        ))}

                                      {events.length > 0 &&
                                        events.slice(0, 2).map((event, idx) => (
                                          <div
                                            key={`event-${weekIndex}-${dayIndex}-${idx}`}
                                            className={`text-[9px] sm:text-[10px] lg:text-xs p-0.5 sm:p-1 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${
                                              event.event_mode === "physical"
                                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                                : event.event_mode === "online"
                                                  ? "bg-purple-100 text-purple-800 border-purple-200"
                                                  : "bg-orange-100 text-orange-800 border-orange-200"
                                            }`}
                                            title={event.title}
                                            onClick={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setPopoverPosition({
                                                x: rect.left + rect.width / 2,
                                                y: rect.top,
                                              });
                                              setSelectedItem({type: "event", data: event});
                                              setShowModal(true);
                                            }}
                                          >
                                            {event.title}
                                          </div>
                                        ))}

                                      {events.length > 2 && (
                                        <div className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground text-center">
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
                </div>
              </div>
            )}

            {viewMode === "years" && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="text-center mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      {currentDate.getFullYear()}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                    {getYearsRange(currentDate.getFullYear()).map((year) => (
                      <div
                        key={year}
                        className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                          year === currentDate.getFullYear()
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setCurrentDate(new Date(year, 0, 1))}
                      >
                        <div className="text-center">
                          <div
                            className={`text-sm sm:text-base lg:text-lg font-bold ${
                              year === currentDate.getFullYear()
                                ? "text-primary"
                                : "text-foreground"
                            }`}
                          >
                            {year}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                            {
                              events.filter((event) => new Date(event.date).getFullYear() === year)
                                .length
                            }{" "}
                            events
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {
                              publicHolidays.filter(
                                (holiday) => new Date(holiday.date).getFullYear() === year,
                              ).length
                            }{" "}
                            holidays
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
            {/* Tab Navigation */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <div className="flex rounded-lg p-1 mb-4">
                <button
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "events"
                      ? "text-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                  onClick={() => setActiveTab("events")}
                >
                  Events
                </button>
                <button
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "holidays"
                      ? "text-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                  onClick={() => setActiveTab("holidays")}
                >
                  Public Holidays
                </button>
              </div>

              {/* Events Tab Content */}
              {activeTab === "events" && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                    Events
                  </h3>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search events..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={eventSearchTerm}
                        onChange={(e) => setEventSearchTerm(e.target.value)}
                      />
                      <div className="absolute right-3 top-2.5">
                        <Icon
                          icon="hugeicons:search-01"
                          className="w-4 h-4 text-muted-foreground"
                        />
                      </div>
                    </div>
                    <select
                      className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background w-full sm:w-auto min-w-0 sm:min-w-[120px]"
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
                        filteredEvents = filteredEvents.filter(
                          (event) =>
                            event.title.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                            event.description.toLowerCase().includes(eventSearchTerm.toLowerCase()),
                        );
                      }

                      // Apply time filter
                      if (eventFilter === "recent") {
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        filteredEvents = filteredEvents.filter(
                          (event) => new Date(event.date) >= thirtyDaysAgo,
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
                        <div
                          key={`upcoming-event-${event.id || idx}`}
                          className="p-2 sm:p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-foreground text-xs sm:text-sm line-clamp-2 flex-1 mr-2">
                              {event.title}
                            </h4>
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                event.event_mode === "physical"
                                  ? "bg-blue-100 text-blue-800"
                                  : event.event_mode === "online"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {event.event_mode}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {new Date(event.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Audience: {event.target_audience.replace("_", " ")}
                          </div>

                          {/* Edit Event Button */}
                          <div className="mt-3 pt-2 border-t border-border">
                            <Button
                              onClick={() => openEditModal(event)}
                              className="w-full text-xs py-1 bg-primary text-white"
                            >
                              <Icon icon="hugeicons:edit-04" className="w-3 h-3 mr-1" />
                              Edit Event
                            </Button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Holidays Tab Content */}
              {activeTab === "holidays" && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                    Public Holidays
                  </h3>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search holidays..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={holidaySearchTerm}
                        onChange={(e) => setHolidaySearchTerm(e.target.value)}
                      />
                      <div className="absolute right-3 top-2.5">
                        <Icon
                          icon="hugeicons:search-01"
                          className="w-4 h-4 text-muted-foreground"
                        />
                      </div>
                    </div>
                    <select
                      className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background w-full sm:w-auto min-w-0 sm:min-w-[120px]"
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
                        .filter((holiday) => new Date(holiday.date) >= new Date())
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                      // Apply search filter
                      if (holidaySearchTerm) {
                        filteredHolidays = filteredHolidays.filter((holiday) =>
                          holiday.title.toLowerCase().includes(holidaySearchTerm.toLowerCase()),
                        );
                      }

                      // Apply time filter
                      if (holidayFilter === "recent") {
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        filteredHolidays = filteredHolidays.filter(
                          (holiday) => new Date(holiday.date) >= thirtyDaysAgo,
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
                        <div
                          key={`holiday-${holiday.id || holiday.date}-${idx}`}
                          className="flex flex-col p-2 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-medium text-green-800 flex-1 mr-2 truncate">
                              {holiday.title}
                            </span>
                            <span className="text-xs text-green-600 flex-shrink-0">
                              {new Date(holiday.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          {/* Edit Holiday Button */}
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <Button
                              className="w-full text-xs py-1 bg-primary text-white"
                              onClick={() => openEditHolidayModal(holiday)}
                            >
                              <Icon icon="hugeicons:edit-04" className="w-3 h-3 mr-1" />
                              Edit Holiday
                            </Button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                This Month
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-base sm:text-lg font-bold text-blue-800">
                    {events.filter(
                      (event) =>
                        new Date(event.date).getMonth() === currentDate.getMonth() &&
                        new Date(event.date).getFullYear() === currentDate.getFullYear(),
                    ).length || 0}
                  </div>
                  <div className="text-xs text-blue-600">Events</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-base sm:text-lg font-bold text-green-800">
                    {publicHolidays.filter(
                      (holiday) =>
                        new Date(holiday.date).getMonth() === currentDate.getMonth() &&
                        new Date(holiday.date).getFullYear() === currentDate.getFullYear(),
                    ).length || 0}
                  </div>
                  <div className="text-xs text-green-600">Holidays</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event/Holiday Detail Popover */}
      {showModal && selectedItem && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-border p-3 max-w-[90vw] sm:max-w-xs lg:max-w-sm popover-content"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "calc(100vw - 2rem)",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => {
              setShowModal(false);
              setSelectedItem(null);
            }}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          {selectedItem.type === "event" ? (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground text-sm pr-6">
                {selectedItem.data.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {selectedItem.data.description}
              </p>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Date:</span>
                  <span className="text-muted-foreground">
                    {new Date(selectedItem.data.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Mode:</span>
                  <div
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedItem.data.event_mode === "physical"
                        ? "bg-blue-100 text-blue-800"
                        : selectedItem.data.event_mode === "online"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {selectedItem.data.event_mode}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Audience:</span>
                  <span className="text-muted-foreground">
                    {selectedItem.data.target_audience.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground text-sm pr-6">
                {selectedItem.data.title}
              </h4>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Date:</span>
                  <span className="text-muted-foreground">
                    {new Date(selectedItem.data.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <EditEventModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          event={editingEvent}
          onSave={handleSaveEvent}
        />
      )}

      {/* Edit Holiday Modal */}
      {showEditHolidayModal && editingHoliday && (
        <EditHolidayModal
          isOpen={showEditHolidayModal}
          onClose={() => setShowEditHolidayModal(false)}
          holiday={editingHoliday}
          onSave={handleSaveHoliday}
        />
      )}
    </div>
  );
}
