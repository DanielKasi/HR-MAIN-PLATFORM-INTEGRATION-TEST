"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {ChevronLeft, ChevronRight, Plus} from "lucide-react";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {apiGet} from "@/lib/apiRequest";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Link from "next/link";

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
  const [calendar, setCalendar] = useState<ICalendar | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month");
  const selectedInstitution = useSelector(selectSelectedInstitution);

  useEffect(() => {
    if (selectedInstitution) {
      fetchCalendar(currentDate.getFullYear());
    }
  }, [selectedInstitution, currentDate.getFullYear()]);

  const fetchCalendar = async (year: number) => {
    try {
      setLoading(true);
      const response = await apiGet(`/calendar/${year}/`);
      if (response.success) {
        setCalendar(response.data);
      }
    } catch (error) {
      console.error("Error fetching calendar:", error);
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

  const localizer = momentLocalizer(moment);

  const getCalendarEvents = () => {
    const events: any[] = [];
    if (calendar) {
      calendar.event_occurrences.forEach((occurrence) => {
        const event = occurrence.event;
        events.push({
          id: occurrence.id,
          title: event.title,
          start: new Date(occurrence.date),
          end: new Date(occurrence.date),
          allDay: true,
          event: event, // Store the full event object
        });
      });
      calendar.public_holidays.forEach((holiday) => {
        events.push({
          id: holiday.id,
          title: holiday.title,
          start: new Date(holiday.date),
          end: new Date(holiday.date),
          allDay: true,
          event: holiday, // Store the full holiday object
        });
      });
    }
    return events;
  };

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#e0e0e0'; // Default color
    let borderColor = '#b0b0b0'; // Default border color

    if (event.event.event_mode === 'physical') {
      backgroundColor = '#e0f7fa'; // Light blue
      borderColor = '#b2ebf2';
    } else if (event.event.event_mode === 'online') {
      backgroundColor = '#e8daef'; // Light purple
      borderColor = '#d0bcf4';
    } else if (event.event.event_mode === 'hybrid') {
      backgroundColor = '#fff3cd'; // Light orange
      borderColor = '#ffeeba';
    }

    return {
      style: {
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        borderRadius: '4px',
        borderWidth: '1px',
        borderStyle: 'solid',
        color: '#333',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        padding: '2px 4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    };
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className=" mx-auto space-y-6">
        {/* Header */}
        
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Events Calendar</h1>
              {/* Add Event Button */}
            
            {/* <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Event
            </Button> */}
            <Link href="/events-holidays/events/add" passHref>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Event
            </Button>
          </Link>
          
            
            
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">
                {MONTHS[currentDate.getMonth()]}
              </span>
              <span className="text-xl text-muted-foreground">
                {currentDate.getFullYear()}
              </span>
            </div>
            {/* View Mode Toggles */}
            <div className="flex bg-muted rounded-lg p-1">
              {["Day", "Week", "Month", "Years"].map((mode) => (
                <button
                  key={mode}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
            <div className="flex gap-2">
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

        {/* Calendar */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-0">
            <div className="grid grid-cols-8 gap-px bg-border">
              {/* Week Numbers Column */}
              <div className="bg-muted p-3 border-r border-border"></div>
              
              {/* Day Headers */}
              {DAYS.map((day) => (
                <div key={day} className="bg-muted p-3 text-center font-semibold text-foreground text-sm border-r border-border">
                  {day}
                </div>
              ))}

              {/* Calendar Grid */}
              {weeks.map((week, weekIndex) => (
                <>
                  {/* Week Number */}
                  <div key={`week-${weekIndex}`} className="bg-muted p-3 text-center text-sm text-muted-foreground border-r border-border">
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
                        className={`min-h-[120px] p-2 bg-card border-r border-border ${
                          !isCurrentMonthDay ? "text-muted-foreground" : ""
                        }`}
                      >
                        <div className="h-full flex flex-col">
                          {/* Date Number */}
                          <div className="flex justify-center mb-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
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
                          <div className="flex-1 space-y-1">
                            {holidays.map((holiday, idx) => (
                              <div
                                key={idx}
                                className="text-xs p-1 bg-green-100 text-green-800 rounded border border-green-200 truncate"
                                title={holiday.title}
                              >
                                {holiday.title}
                              </div>
                            ))}

                            {events.slice(0, 2).map((event, idx) => (
                              <div
                                key={idx}
                                className={`text-xs p-1 rounded border truncate ${
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
                              <div className="text-xs text-muted-foreground text-center">
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
    </div>
  );
}
