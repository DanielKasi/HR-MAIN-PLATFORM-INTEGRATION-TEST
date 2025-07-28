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
  Plus,
  Search,
  Calendar,
  Users,
  MapPin,
  Video,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
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

const getEventModeIcon = (mode: string) => {
  switch (mode) {
    case "online":
      return <Video className="h-4 w-4" />;
    case "physical":
      return <MapPin className="h-4 w-4" />;
    case "hybrid":
      return <Users className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
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

export default function EventsPage() {
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [filterAudience, setFilterAudience] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const selectedInstitution = useSelector(selectSelectedInstitution);

  const fetchEvents = async () => {
    try {
      const response = await apiGet("/calendar/events/");
      setEvents(response.data.results || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = filterMode === "all" || event.event_mode === filterMode;
    const matchesAudience = filterAudience === "all" || event.target_audience === filterAudience;
    return matchesSearch && matchesMode && matchesAudience;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      case "created":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const upcomingEvents = events.filter((event) => new Date(event.date) >= new Date()).length;
  const pastEvents = events.filter((event) => new Date(event.date) < new Date()).length;
  const onlineEvents = events.filter((event) => event.event_mode === "online").length;
  const physicalEvents = events.filter((event) => event.event_mode === "physical").length;

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Events Management
            </h1>
            <p className="text-slate-600 text-lg">Manage all your organization events</p>
          </div>
          <Link href="/calendar/events/add">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Events</p>
                  <p className="text-3xl font-bold">{events.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Upcoming</p>
                  <p className="text-3xl font-bold">{upcomingEvents}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Online Events</p>
                  <p className="text-3xl font-bold">{onlineEvents}</p>
                </div>
                <Video className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Physical Events</p>
                  <p className="text-3xl font-bold">{physicalEvents}</p>
                </div>
                <MapPin className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search events..."
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

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedEvents.map((event) => {
            const isUpcoming = new Date(event.date) >= new Date();
            const isPast = new Date(event.date) < new Date();

            return (
              <Card
                key={event.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getEventModeColor(event.event_mode)} border text-xs`}>
                          {getEventModeIcon(event.event_mode)}
                          <span className="ml-1">{event.event_mode}</span>
                        </Badge>
                        <Badge
                          className={`${getTargetAudienceColor(event.target_audience)} border text-xs`}
                        >
                          {event.target_audience.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/calendar/events/${event.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/calendar/events/edit/${event.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Event
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {event.description && (
                    <p className="text-slate-600 text-sm line-clamp-3">{event.description}</p>
                  )}

                  {/* Event Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                      {isUpcoming && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Upcoming
                        </Badge>
                      )}
                      {isPast && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                          Past
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/calendar/events/${event.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/calendar/events/edit/${event.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sortedEvents.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No events found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm || filterMode !== "all" || filterAudience !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by creating your first event"}
              </p>
              {!searchTerm && filterMode === "all" && filterAudience === "all" && (
                <Link href="/calendar/events/add">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
