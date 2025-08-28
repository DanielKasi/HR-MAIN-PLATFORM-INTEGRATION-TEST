"use client"

import React, { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, X, Save, RotateCcw, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { IInstitutionWorkingDays, ISystemWorkingDay } from "@/types/types.utils"

interface WorkingDaysManagerProps {
  workingDays: IInstitutionWorkingDays | null
  systemWorkingDays: ISystemWorkingDay[]
  onUpdate: (dayIds: number[]) => Promise<void>
  isSaving?: boolean
}

export function WorkingDaysManager({ workingDays, systemWorkingDays, onUpdate, isSaving = false }: WorkingDaysManagerProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [removingDayId, setRemovingDayId] = useState<number | null>(null)
  const [addingDayId, setAddingDayId] = useState<number | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)

  // Initialize selected days when workingDays changes
  React.useEffect(() => {
    if (workingDays?.days) {
      const dayIds = workingDays.days.map(day => day.id)
      setSelectedDays(dayIds)
      setHasChanges(false)
    }
  }, [workingDays])

  // Check for changes - but not during auto-save operations
  React.useEffect(() => {
    if (workingDays?.days && !isAutoSaving) {
      const currentDayIds = workingDays.days.map(day => day.id).sort()
      const selectedDayIds = [...selectedDays].sort()
      setHasChanges(JSON.stringify(currentDayIds) !== JSON.stringify(selectedDayIds))
    }
  }, [selectedDays, workingDays, isAutoSaving])

  const getDayColor = (dayCode: string) => {
    const colors = {
      MON: "bg-blue-100 text-blue-700 border-blue-200",
      TUE: "bg-green-100 text-green-700 border-green-200",
      WED: "bg-purple-100 text-purple-700 border-purple-200",
      THU: "bg-orange-100 text-orange-700 border-orange-200",
      FRI: "bg-pink-100 text-pink-700 border-pink-200",
      SAT: "bg-indigo-100 text-indigo-700 border-indigo-200",
      SUN: "bg-red-100 text-red-700 border-red-200",
    }
    return colors[dayCode as keyof typeof colors] || "bg-gray-100 text-gray-700 border-gray-200"
  }

  const getDayIcon = (dayCode: string) => {
    const icons = {
      MON: "M",
      TUE: "T",
      WED: "W",
      THU: "T",
      FRI: "F",
      SAT: "S",
      SUN: "S",
    }
    return icons[dayCode as keyof typeof icons] || dayCode[0]
  }

  const handleRemoveDay = async (dayId: number) => {
    setRemovingDayId(dayId)
    setIsAutoSaving(true)
    const newSelectedDays = selectedDays.filter(id => id !== dayId)
    setSelectedDays(newSelectedDays)
    
    // Auto-save the changes
    try {
      await onUpdate(newSelectedDays)
      setHasChanges(false)
    } catch (error) {
      // If save fails, revert the change
      setSelectedDays(selectedDays)
      toast.error("Failed to remove day. Please try again.")
    } finally {
      setRemovingDayId(null)
      setIsAutoSaving(false)
    }
  }

  const handleAddDay = async (dayId: number) => {
    setAddingDayId(dayId)
    setIsAutoSaving(true)
    const newSelectedDays = [...selectedDays, dayId]
    setSelectedDays(newSelectedDays)
    
    // Auto-save the changes
    try {
      await onUpdate(newSelectedDays)
      setHasChanges(false)
    } catch (error) {
      // If save fails, revert the change
      setSelectedDays(selectedDays)
      toast.error("Failed to add day. Please try again.")
    } finally {
      setAddingDayId(null)
      setIsAutoSaving(false)
    }
  }

  const handleDayClick = async (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      // If day is selected, remove it
      await handleRemoveDay(dayId)
    } else {
      // If day is not selected, add it
      await handleAddDay(dayId)
    }
  }

  const handleSave = async () => {
    try {
      await onUpdate(selectedDays)
      setHasChanges(false)
      toast.success("Working days updated successfully")
    } catch (error) {
      toast.error("Failed to update working days")
    }
  }

  const handleReset = () => {
    if (workingDays?.days) {
      const dayIds = workingDays.days.map(day => day.id)
      setSelectedDays(dayIds)
    }
  }

  if (!workingDays || workingDays.days.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Working Days Manager
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Working Days Set</h3>
            <p className="text-gray-500">Configure your institution's working days to get started.</p>
          </div>
        </div>
      </div>
    )
  }

  // Sort days by level for proper display order
  const sortedDays = [...systemWorkingDays].sort((a, b) => a.level - b.level)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Working Days Manager
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Click the plus (+) button on unselected days to add them, or click the cross (×) to remove selected days instantly.
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Days Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {sortedDays.map((day) => {
            const isSelected = selectedDays.includes(day.id)
            return (
              <div key={day.id} className="relative">
                <div 
                  className="text-center transition-all duration-200 rounded-lg p-2"
                >
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2 border-2 transition-all duration-200 relative",
                      isSelected ? getDayColor(day.day_code) : "bg-gray-100 text-gray-400 border-gray-200 hover:border-green-300 hover:bg-green-50 cursor-pointer"
                    )}
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!isSelected && !isSaving && addingDayId !== day.id) {
                        await handleAddDay(day.id)
                      }
                    }}
                  >
                    {addingDayId === day.id ? (
                      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    ) : isSelected ? (
                      getDayIcon(day.day_code)
                    ) : (
                      <Plus className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <p className={cn(
                    "font-medium text-sm mb-1",
                    isSelected ? "text-gray-900" : "text-gray-500"
                  )}>
                    {day.day_name}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      isSelected ? "" : "border-gray-200 text-gray-400"
                    )}
                  >
                    {day.day_code}
                  </Badge>
                </div>
                
                {/* Cross symbol - only show when day is selected */}
                {isSelected && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation()
                      await handleRemoveDay(day.id)
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors duration-200 z-10"
                    title={`Remove ${day.day_name}`}
                    disabled={isSaving || removingDayId === day.id}
                  >
                    {removingDayId === day.id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </button>
                )}


              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                <strong>{selectedDays.length}</strong> working days selected
              </span>
            </div>
            <span className="text-gray-500">
              Last updated: {new Date(workingDays.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons - Only show if there are unsaved changes */}
        {hasChanges && (
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
