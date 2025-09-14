"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { MEETINGS_API } from "@/lib/utils"
import type { IMeeting, IMeetingFormData } from "@/types/types.utils"
import { MeetingsTable } from "@/components/performance/meetings/meetings-table"
import { MeetingModal } from "@/components/performance/meetings/meetings-modal"
import { PerformanceStatsCard } from "@/components/performance/common/performance-stats-card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Calendar, Video, MapPin, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState<IMeeting[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingMeeting, setEditingMeeting] = useState<IMeeting | undefined>()
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const currentInstitution = useSelector(selectSelectedInstitution)

    const fetchMeetings = async () => {
        if (!currentInstitution) return

        setLoading(true)
        try {
            const response = await MEETINGS_API.getPaginated({
                search: searchQuery || undefined,
            })
            setMeetings(response.results)
        } catch (error) {
            toast.error("Failed to fetch meetings")
            console.error("Error fetching meetings:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMeetings()
    }, [currentInstitution, searchQuery])

    const handleCreate = () => {
        setEditingMeeting(undefined)
        setModalOpen(true)
    }

    const handleEdit = (meeting: IMeeting) => {
        setEditingMeeting(meeting)
        setModalOpen(true)
    }

    const handleSubmit = async (data: IMeetingFormData) => {
        setSubmitting(true)
        try {
            if (editingMeeting) {
                await MEETINGS_API.update({ meetingId: editingMeeting.id, data })
                toast.success("Meeting updated successfully")
            } else {
                await MEETINGS_API.create({ data })
                toast.success("Meeting scheduled successfully")
            }

            setModalOpen(false)
            fetchMeetings()
        } catch (error: any) {
            toast.error(error.message || "Failed to save meeting")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (meeting: IMeeting) => {
        if (!confirm(`Are you sure you want to delete "${meeting.title}"?`)) return

        try {
            await MEETINGS_API.delete({ meetingId: meeting.id })
            toast.success("Meeting deleted successfully")
            fetchMeetings()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete meeting")
        }
    }

    const handleSearch = (query: string) => {
        setSearchQuery(query)
    }

    // Calculate stats
    const totalMeetings = meetings.length
    const now = new Date()
    const upcomingMeetings = meetings.filter((m) => new Date(m.start_time) > now).length
    const onlineMeetings = meetings.filter((m) => m.mode === "online").length
    const recurringMeetings = meetings.filter((m) => m.is_recurring).length

    return (
        <div className="min-h-screen p-6 bg-white">
            <div className="">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/performance">
                            <Button variant="outline" size="sm" className="rounded-full aspect-square p-0 w-10 h-10 bg-transparent">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                                Performance Meetings
                            </h1>
                            <p className="text-slate-600 text-lg">Schedule and manage performance review meetings</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <PerformanceStatsCard
                        title="Total Meetings"
                        value={totalMeetings}
                        icon={<Calendar className="h-5 w-5" />}
                        description="All meetings"
                    />
                    <PerformanceStatsCard
                        title="Upcoming"
                        value={upcomingMeetings}
                        icon={<Users className="h-5 w-5" />}
                        description="Future meetings"
                    />
                    <PerformanceStatsCard
                        title="Online Meetings"
                        value={onlineMeetings}
                        icon={<Video className="h-5 w-5" />}
                        description="Virtual meetings"
                    />
                    <PerformanceStatsCard
                        title="Recurring"
                        value={recurringMeetings}
                        icon={<MapPin className="h-5 w-5" />}
                        description="Repeating meetings"
                    />
                </div>

                {/* Meetings Table */}
                <MeetingsTable
                    meetings={meetings}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAdd={handleCreate}
                    onSearch={handleSearch}
                    isLoading={loading}
                />

                {/* Meeting Modal */}
                <MeetingModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    meeting={editingMeeting}
                    onSubmit={handleSubmit}
                    isLoading={submitting}
                />
            </div>
        </div>
    )
}
