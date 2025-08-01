"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  MapPin,
  Video,
  Clock,
  Star,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {apiGet} from "@/lib/apiRequest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getEventModeIcon = (mode: string) => {
  switch (mode) {
    case "online":
      return <Video className="h-3 w-3" />;
    case "physical":
      return <MapPin className="h-3 w-3" />;
    case "hybrid":
      return <Users className="h-3 w-3" />;
    default:
      return <CalendarIcon className="h-3 w-3" />;
  }
};

const getEventModeColor = (mode: string) => {
  switch (mode) {
    case "online":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "physical":
      return "bg-green-100 text-green-800 border-green-200";
    case "hybrid":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getTargetAudienceColor = (audience: string) => {
  switch (audience) {
    case "all":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "department":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "individual":
      return "bg-pink-100 text-pink-800 border-pink-200";
    case "specific_employees":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<ICalendar | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [filterAudience, setFilterAudience] = useState("all");

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionId = selectedInstitution?.id;

  const fetchCalendar = async (year: number) => {
    try {
      setLoading(true);
      const response = await apiGet(`/calendar/institutions-calendar/?year=${year}`);
      setCalendar(response.data);
    } catch (error) {
      console.error("Error fetching calendar:", error);
      setCalendar(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (institutionId) {
      fetchCalendar(currentDate.getFullYear());
    }
  }, [institutionId, currentDate.getFullYear()]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    if (!calendar) return {events: [], holidays: []};

    const dateStr = date.toISOString().split("T")[0];

    const events = calendar.event_occurrences
      .filter((occurrence) => occurrence.date === dateStr)
      .map((occurrence) => occurrence.event)
      .filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMode = filterMode === "all" || event.event_mode === filterMode;
        const matchesAudience =
          filterAudience === "all" || event.target_audience === filterAudience;
        return matchesSearch && matchesMode && matchesAudience;
      });

    const holidays = calendar.public_holidays
      .filter((holiday) => holiday.date === dateStr)
      .filter((holiday) => holiday.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return {events, holidays};
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
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const totalEvents = calendar?.event_occurrences.length || 0;
  const totalHolidays = calendar?.public_holidays.length || 0;
  const upcomingEvents =
    calendar?.event_occurrences
      .filter((occurrence) => new Date(occurrence.date) >= new Date())
      .slice(0, 5) || [];

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Calendar Dashboard
            </h1>
            <p className="text-slate-600 text-lg">Manage events, holidays, and schedules</p>
          </div>
          <div className="flex gap-3">
            <Link href="/events-holidays/events/add">
              <Button>
                <Plus className="mr-2 h-5 w-5" />
                Add Event
              </Button>
            </Link>
            <Link href="/events-holidays/holidays/add">
              <Button variant="outline" className="shadow-sm bg-transparent">
                <Star className="mr-2 h-5 w-5" />
                Add Holiday
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Events</p>
                  <p className="text-3xl font-bold">{totalEvents}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Public Holidays</p>
                  <p className="text-3xl font-bold">{totalHolidays}</p>
                </div>
                <Star className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">This Month</p>
                  <p className="text-3xl font-bold">
                    {calendar?.event_occurrences.filter((occurrence) => {
                      const occurrenceDate = new Date(occurrence.date);
                      return (
                        occurrenceDate.getMonth() === currentDate.getMonth() &&
                        occurrenceDate.getFullYear() === currentDate.getFullYear()
                      );
                    }).length || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Upcoming</p>
                  <p className="text-3xl font-bold">{upcomingEvents.length}</p>
                </div>
                <Users className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Calendar */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth("prev")}
                      className="shadow-sm bg-transparent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-2xl font-bold">
                      {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth("next")}
                      className="shadow-sm bg-transparent"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search events and holidays..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-slate-200 focus:border-blue-500"
                    />
                  </div>

                  <Select value={filterMode} onValueChange={setFilterMode}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Event Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterAudience} onValueChange={setFilterAudience}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Audience</SelectItem>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="specific_employees">Specific Employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {DAYS.map((day) => (
                    <div key={day} className="p-3 text-center font-semibold text-slate-600 text-sm">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={index} className="h-32 p-1"></div>;
                    }

                    const {events, holidays} = getEventsForDate(day);
                    const hasEvents = events.length > 0 || holidays.length > 0;

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          h-32 p-1 border border-slate-200 rounded-lg cursor-pointer transition-all duration-200
                          ${isToday(day) ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-slate-50"}
                          ${isSelected(day) ? "ring-2 ring-blue-500" : ""}
                          ${hasEvents ? "shadow-sm" : ""}
                        `}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="h-full flex flex-col">
                          <div
                            className={`
                            text-sm font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full
                            ${isToday(day) ? "bg-blue-600 text-white" : "text-slate-900"}
                          `}
                          >
                            {day.getDate()}
                          </div>

                          <div className="flex-1 space-y-1 overflow-hidden">
                            {holidays.map((holiday, idx) => (
                              <div
                                key={idx}
                                className="text-xs p-1 bg-red-100 text-red-800 rounded border border-red-200 truncate"
                                title={holiday.title}
                              >
                                <Star className="h-2 w-2 inline mr-1" />
                                {holiday.title}
                              </div>
                            ))}

                            {events.slice(0, 2).map((event, idx) => (
                              <div
                                key={idx}
                                className={`text-xs p-1 rounded border truncate ${getEventModeColor(event.event_mode)}`}
                                title={event.title}
                              >
                                {getEventModeIcon(event.event_mode)}
                                <span className="ml-1">{event.title}</span>
                              </div>
                            ))}

                            {events.length > 2 && (
                              <div className="text-xs text-slate-600 font-medium">
                                +{events.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            {selectedDate && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const {events, holidays} = getEventsForDate(selectedDate);

                    if (events.length === 0 && holidays.length === 0) {
                      return (
                        <p className="text-slate-500 text-sm text-center py-4">
                          No events or holidays on this date
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {holidays.map((holiday) => (
                          <div
                            key={holiday.id}
                            className="p-3 bg-red-50 border border-red-200 rounded-lg"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="h-4 w-4 text-red-600" />
                              <span className="font-medium text-red-800">{holiday.title}</span>
                            </div>
                            <p className="text-xs text-red-700">Public Holiday</p>
                          </div>
                        ))}

                        {events.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 border border-slate-200 rounded-lg bg-white"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-slate-900 text-sm">{event.title}</h4>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/calendar/events/${event.id}`}>
                                      <Eye className="mr-2 h-3 w-3" />
                                      View
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/calendar/events/edit/${event.id}`}>
                                      <Edit className="mr-2 h-3 w-3" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {event.description && (
                              <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-1">
                              <Badge className={`${getEventModeColor(event.event_mode)} text-xs`}>
                                {getEventModeIcon(event.event_mode)}
                                <span className="ml-1">{event.event_mode}</span>
                              </Badge>
                              <Badge
                                className={`${getTargetAudienceColor(event.target_audience)} text-xs`}
                              >
                                {event.target_audience.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">No upcoming events</p>
                  ) : (
                    upcomingEvents.map((occurrence) => (
                      <div
                        key={occurrence.id}
                        className="p-3 border border-slate-200 rounded-lg bg-white"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-slate-900 text-sm">
                            {occurrence.event.title}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {new Date(occurrence.date).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-1">
                          <Badge
                            className={`${getEventModeColor(occurrence.event.event_mode)} text-xs`}
                          >
                            {getEventModeIcon(occurrence.event.event_mode)}
                            <span className="ml-1">{occurrence.event.event_mode}</span>
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/events-holidays/events/add">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                  </Button>
                </Link>
                <Link href="/events-holidays/holidays/add">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Star className="mr-2 h-4 w-4" />
                    Add Holiday
                  </Button>
                </Link>
                <Link href="/events-holidays/events">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    View All Events
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
