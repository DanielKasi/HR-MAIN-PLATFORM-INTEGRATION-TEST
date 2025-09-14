"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { OBJECTIVES_API } from "@/lib/utils"
import { IObjectives } from "@/types/types.utils"

import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"

interface ObjectiveSelectProps {
    value?: number | string
    onValueChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}

export function ObjectiveSelect({
    value,
    onValueChange,
    placeholder = "Select objective",
    disabled = false,
    className,
}: ObjectiveSelectProps) {
    const [objectives, setObjectives] = useState<IObjectives[]>([])
    const [loading, setLoading] = useState(false)
    const currentInstitution = useSelector(selectSelectedInstitution)

    useEffect(() => {
        if (!currentInstitution) return

        const fetchObjectives = async () => {
            setLoading(true)
            try {
                const response = await OBJECTIVES_API.getPaginated({})
                setObjectives(response.results)
            } catch (error) {
                console.error("Failed to fetch objectives:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchObjectives()
    }, [currentInstitution])

    return (
        <Select value={value ? String(value) : ""} onValueChange={onValueChange} disabled={disabled || loading}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={loading ? "Loading objectives..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {objectives.map((objective) => (
                    <SelectItem key={objective.id} value={String(objective.id)}>
                        <div className="flex flex-col">
                            <span>{objective.name}</span>
                            <span className="text-xs text-slate-500 truncate max-w-xs">{objective.description}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
