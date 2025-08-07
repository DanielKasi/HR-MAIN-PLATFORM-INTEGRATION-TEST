"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ISystemWorkingDay } from "@/types/types.utils"

interface DaySelectionCardProps {
  day: ISystemWorkingDay
  isSelected: boolean
  onToggle: (dayId: number) => void
  disabled?: boolean
}

export function DaySelectionCard({ day, isSelected, onToggle, disabled = false }: DaySelectionCardProps) {
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

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary ring-offset-2 bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      onClick={() => !disabled && onToggle(day.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Checkbox checked={isSelected} disabled={disabled} className="pointer-events-none" />
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                  getDayColor(day.day_code),
                )}
              >
                {getDayIcon(day.day_code)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{day.day_name}</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {day.day_code}
                  </Badge>
                  <span className="text-xs text-gray-500">Level {day.level}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
