"use client"

import { useState, useEffect } from "react"
import { PerformanceForm, type FormField } from "../common/performance-form"
import type { IMeeting, IMeetingFormData, IEventMode } from "@/types/types.utils"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select"

interface MeetingFormProps {
    initialData?: IMeeting
    onSubmit: (data: IMeetingFormData) => void
    onCancel?: () => void
    isLoading?: boolean
}

export function MeetingForm({ initialData, onSubmit, onCancel, isLoading }: MeetingFormProps) {
    const currentInstitution = useSelector(selectSelectedInstitution)
    const [participantsValue, setParticipantsValue] = useState<(string | number)[]>([])
    const [organizerValue, setOrganizerValue] = useState<(string | number)[]>([])

    useEffect(() => {
        // Set initial values
        if (initialData) {
            setParticipantsValue(initialData.participants.map((p) => p.id))
            if (initialData.organizer) {
                setOrganizerValue([initialData.organizer.id])
            }
        }
    }, [initialData])

    const modeOptions = [
        { value: "physical", label: "Physical" },
        { value: "online", label: "Online" },
        { value: "hybrid", label: "Hybrid" },
    ]

    const fields: FormField[] = [
        {
            name: "title",
            label: "Meeting Title",
            type: "text",
            placeholder: "e.g., Q1 Performance Review Meeting",
            required: true,
            validation: (value: string) => {
                if (value.length < 5) return "Meeting title must be at least 5 characters"
                return null
            },
        },
        {
            name: "description",
            label: "Description",
            type: "textarea",
            placeholder: "Describe the meeting purpose and agenda...",
            validation: (value: string) => {
                if (value && value.length < 10) return "Description must be at least 10 characters"
                return null
            },
        },
        {
            name: "start_time",
            label: "Start Date & Time",
            type: "datetime-local",
            required: true,
            validation: (value: string) => {
                try {
                    const date = new Date(value)
                    if (isNaN(date.getTime())) return "Invalid date format"

                    const now = new Date()
                    if (date < now) return "Start time cannot be in the past"

                    return null
                } catch {
                    return "Invalid date format"
                }
            },
        },
        {
            name: "end_time",
            label: "End Date & Time",
            type: "datetime-local", // We'll handle datetime manually
            required: true,
            validation: (value: string, formData?: Record<string, any>) => {
                try {
                    const endDate = new Date(value)
                    if (isNaN(endDate.getTime())) return "Invalid date format"

                    if (formData?.start_time) {
                        const startDate = new Date(formData.start_time)
                        if (endDate <= startDate) return "End time must be after start time"

                        const diffMs = endDate.getTime() - startDate.getTime()
                        const diffMinutes = diffMs / (1000 * 60)
                        if (diffMinutes < 15) return "Meeting must be at least 15 minutes long"
                    }

                    return null
                } catch {
                    return "Invalid date format"
                }
            },
        },
        {
            name: "mode",
            label: "Meeting Mode",
            type: "select",
            options: modeOptions,
            required: true,
        },
        {
            name: "location",
            label: "Location",
            type: "text",
            placeholder: "Meeting room or address",
            validation: (value: string, formData?: Record<string, any>) => {
                if (formData?.mode === "physical" && !value) {
                    return "Location is required for physical meetings"
                }
                return null
            },
        },
        {
            name: "online_link",
            label: "Online Link",
            type: "text",
            placeholder: "https://zoom.us/j/...",
            validation: (value: string, formData?: Record<string, any>) => {
                if ((formData?.mode === "online" || formData?.mode === "hybrid") && !value) {
                    return "Online link is required for online/hybrid meetings"
                }
                if (value && !value.startsWith("http")) {
                    return "Online link must be a valid URL"
                }
                return null
            },
        },
        {
            name: "agenda",
            label: "Agenda",
            type: "textarea",
            placeholder: "Meeting agenda items...",
        },
        {
            name: "is_recurring",
            label: "Recurring Meeting",
            type: "switch",
            description: "Set up as a recurring meeting",
        },
        {
            name: "recurrence_rule",
            label: "Recurrence Rule",
            type: "text",
            placeholder: "e.g., FREQ=WEEKLY;BYDAY=MO",
            validation: (value: string, formData?: Record<string, any>) => {
                if (formData?.is_recurring && !value) {
                    return "Recurrence rule is required for recurring meetings"
                }
                return null
            },
        },
    ]

    const handleSubmit = (formData: Record<string, any>) => {
        if (!currentInstitution || participantsValue.length === 0) return

        const meetingData: IMeetingFormData = {
            institution: currentInstitution.id,
            title: formData.title,
            description: formData.description || undefined,
            start_time: formData.start_time,
            end_time: formData.end_time,
            mode: formData.mode as IEventMode,
            location: formData.location || undefined,
            online_link: formData.online_link || undefined,
            participant_ids: participantsValue.map((id) => Number(id)),
            organizer: organizerValue.length > 0 ? Number(organizerValue[0]) : undefined,
            agenda: formData.agenda || undefined,
            is_recurring: formData.is_recurring || false,
            recurrence_rule: formData.recurrence_rule || undefined,
        }

        onSubmit(meetingData)
    }

    const getInitialFormData = () => {
        if (!initialData) {
            return {
                mode: "online",
                is_recurring: false,
            }
        }

        return {
            title: initialData.title,
            description: initialData.description,
            start_time: initialData.start_time,
            end_time: initialData.end_time,
            mode: initialData.mode,
            location: initialData.location,
            online_link: initialData.online_link,
            agenda: initialData.agenda,
            is_recurring: initialData.is_recurring,
            recurrence_rule: initialData.recurrence_rule,
        }
    }

    return (
        <div className="space-y-6">
            {/* Form Fields */}
            <PerformanceForm
                fields={fields}
                initialData={getInitialFormData()}
                onSubmit={handleSubmit}
                onCancel={onCancel}
                isLoading={isLoading}
                submitLabel={initialData ? "Update Meeting" : "Create Meeting"}
                showCancel={false}
            />

            {/* Participants Selection */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Participants</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Organizer (Optional)</label>
                        <EmployeeSearchableSelect
                            value={organizerValue}
                            onValueChange={setOrganizerValue}
                            placeholder="Select meeting organizer"
                            multiple={false}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-slate-500">Person responsible for organizing the meeting</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Participants <span className="text-red-500">*</span>
                        </label>
                        <EmployeeSearchableSelect
                            value={participantsValue}
                            onValueChange={setParticipantsValue}
                            placeholder="Select participants"
                            multiple={true}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-slate-500">People who will attend the meeting</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
