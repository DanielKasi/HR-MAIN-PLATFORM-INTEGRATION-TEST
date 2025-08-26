"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { calendarAPI } from "@/lib/utils"
import { ICalendar, IEvent } from "@/types/types.utils"
import { Calendar, Clock, Users, MapPin } from "lucide-react"
import { useState, useEffect } from "react"




interface EventsAndHolidaysWidgetProps {
  onRefresh?: () => void
}



export function EventsAndHolidaysWidget({ onRefresh }: EventsAndHolidaysWidgetProps) {
  const [calendarData, setCalendarData] = useState<ICalendar | null>(null)
  const [events, setEvents] = useState<IEvent[]>([])
  const [activeTab, setActiveTab] = useState<"holidays" | "events">("holidays")
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear]  = useState<number>(new Date().getFullYear());

  const fetchData = async () => {
    setLoading(true)
    try {
      const [calendarResponse, eventsResponse] = await Promise.all([
        calendarAPI.getInstitutionCalendar({year:currentYear}),
        calendarAPI.getEvents(),
      ])
      setCalendarData(calendarResponse)
      setEvents(eventsResponse.results)
    } catch (error) {
      console.error("Failed to fetch calendar data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  }

  const getEventModeIcon = (mode: string) => {
    switch (mode) {
      case "online":
        return "💻"
      case "physical":
        return <MapPin className="w-3 h-3" />
      case "hybrid":
        return "🔄"
      default:
        return <Calendar className="w-3 h-3" />
    }
  }

  const getAudienceDisplay = (targetAudience: string, department?: string) => {
    switch (targetAudience) {
      case "all":
        return "All Employees"
      case "department":
        return department || "Department"
      case "specific_employees":
        return "Selected Employees"
      default:
        return "All Employees"
    }
  }

  const displayItems =
    activeTab === "holidays"
      ? calendarData?.public_holidays || []
      : [...(calendarData?.event_occurrences.map((eo) => eo.event) || []), ...events]

  return (
    <Card className="h-fit shadow-sm border-none">
      <CardHeader className="pb-2">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("holidays")}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              activeTab === "holidays"
                ? "border-red-500 text-red-500"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Holidays {calendarData?.public_holidays.length || 0}
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              activeTab === "events"
                ? "border-red-500 text-red-500"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Events {(calendarData?.event_occurrences.length || 0) + events.length}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading...</div>
        ) : (
<>
{ activeTab === "events" ? (
    <> {
                  calendarData?.event_occurrences.map((item, index) => (
            <div key={`${activeTab}-${index}`} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
              <div className="w-1 h-full min-h-24 bg-red-500 rounded-full mt-1" />

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{item.event.title}</h4>
                <div className="flex flex-col items-start gap-2 mt-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(item.date)}
                  </div>

                    <>
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                        {getEventModeIcon(item.event.event_mode)}
                        {item.event.event_mode}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                        <Users className="w-3 h-3" />
                        {getAudienceDisplay(item.event.target_audience, item.event.department)}
                      </div>
                    </>
                </div>
              </div>
              </div>
            </div>
          ))
    }
    </>
):

<>
{
    calendarData?.public_holidays.map((item, index) => (
            <div key={`${activeTab}-${index}`} className="flex items-start gap-3">
              <div className="w-1 h-12 bg-red-500 rounded-full flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{item.title}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(item.date)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    All Day
                  </div>
                </div>
              </div>
            </div>
          ))
}
</>
} 

</>

        )}
        {onRefresh && (
          <button
            onClick={() => {
              fetchData()
              onRefresh()
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-2"
          >
            Refresh
          </button>
        )}
      </CardContent>
    </Card>
  )
}
