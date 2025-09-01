"use client"

import React, { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, X, Save, RotateCcw, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { IBranchDay, IBranchWorkingDays, IInstitutionWorkingDays, ISystemWorkingDay } from "@/types/types.utils"

interface WorkingDaysManagerProps {
  scope:
  | { type: "branch"; branchId: number; branchWorkingDays: IBranchWorkingDays | null }
  | { type: "institution"; institutionWorkingDays: IInstitutionWorkingDays | null };
  systemWorkingDays: ISystemWorkingDay[];
  onUpdate: (args: any) => Promise<void>; // args: number[] for institution, { dayId, dayType } for branch add, or day_name for remove
  isSaving?: boolean;
}

export function WorkingDaysManager({ scope, systemWorkingDays, onUpdate, isSaving = false }: WorkingDaysManagerProps) {
  // For institution: selectedDays is array of system day ids
  // For branch: selectedBranchDays is array of IBranchDay
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedBranchDays, setSelectedBranchDays] = useState<IBranchDay[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [removingDayId, setRemovingDayId] = useState<number | null>(null);
  const [addingDayId, setAddingDayId] = useState<number | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [addDayType, setAddDayType] = useState<"PHYSICAL" | "REMOTE" | null>(null);
  const [pendingAddDayId, setPendingAddDayId] = useState<number | null>(null);

  // Initialize selected days when workingDays changes
  React.useEffect(() => {
    if (scope.type === "institution" && scope.institutionWorkingDays?.days) {
      const dayIds = scope.institutionWorkingDays.days.map(day => day.id);
      setSelectedDays(dayIds);
      setHasChanges(false);
    } else if (scope.type === "branch" && scope.branchWorkingDays?.branch_days) {
      console.log("New branch working days from scope:", scope.branchWorkingDays.branch_days);
      setSelectedBranchDays(scope.branchWorkingDays.branch_days);
      setHasChanges(false);
    }
  }, [scope]);

  // Check for changes - but not during auto-save operations
  React.useEffect(() => {
    if (scope.type === "institution" && scope.institutionWorkingDays?.days && !isAutoSaving) {
      const currentDayIds = scope.institutionWorkingDays?.days.map(day => day.id).sort();
      const selectedDayIds = [...selectedDays].sort();
      setHasChanges(JSON.stringify(currentDayIds) !== JSON.stringify(selectedDayIds));
    } else if (scope.type === "branch" && scope.branchWorkingDays?.branch_days && !isAutoSaving) {
      // Compare by day_id and day_type
      const current = scope.branchWorkingDays.branch_days.map(d => `${d.day_id}-${d.day_type}`).sort();
      const selected = selectedBranchDays.map(d => `${d.day_id}-${d.day_type}`).sort();
      setHasChanges(JSON.stringify(current) !== JSON.stringify(selected));
    }
  }, [selectedDays, selectedBranchDays, scope, isAutoSaving]);

  React.useEffect(() => {
    console.log("\n\n selectedBranchDays changed as :", selectedBranchDays);

  }, [selectedBranchDays]);

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


  // Institution handlers
  const handleRemoveDay = async (dayId: number) => {
    setRemovingDayId(dayId);
    setIsAutoSaving(true);
    const newSelectedDays = selectedDays.filter(id => id !== dayId);
    setSelectedDays(newSelectedDays);
    try {
      await onUpdate(newSelectedDays);
      setHasChanges(false);
    } catch (error) {
      setSelectedDays(selectedDays);
      toast.error("Failed to remove day. Please try again.");
    } finally {
      setRemovingDayId(null);
      setIsAutoSaving(false);
    }
  };
  const handleAddDay = async (dayId: number) => {
    setAddingDayId(dayId);
    setIsAutoSaving(true);
    const newSelectedDays = [...selectedDays, dayId];
    setSelectedDays(newSelectedDays);
    try {
      await onUpdate(newSelectedDays);
      setHasChanges(false);
    } catch (error) {
      setSelectedDays(selectedDays);
      toast.error("Failed to add day. Please try again.");
    } finally {
      setAddingDayId(null);
      setIsAutoSaving(false);
    }
  };

  // Branch handlers
  const handleRemoveBranchDay = async (branchDay: IBranchDay) => {
    setRemovingDayId(branchDay.day_id);
    setIsAutoSaving(true);
    const newSelectedBranchDays = selectedBranchDays.filter(d => d.day_name.toLowerCase() !== branchDay.day_name.toLowerCase());
    console.log("\n\n Removing branch day:", branchDay, "New selectedBranchDays:", newSelectedBranchDays, "\n\n From branch days : ", selectedBranchDays);

    setSelectedBranchDays(newSelectedBranchDays);
    try {
      await onUpdate({ action: "remove", day_name: branchDay.day_name });
      setHasChanges(false);
    } catch (error) {
      setSelectedBranchDays(selectedBranchDays);
      toast.error("Failed to remove day. Please try again.");
    } finally {
      setRemovingDayId(null);
      setIsAutoSaving(false);
    }
  };
  const handleAddBranchDay = async (dayId: number, dayType: "PHYSICAL" | "REMOTE") => {
    setAddingDayId(dayId);
    setIsAutoSaving(true);
    const newSelectedBranchDays = [...selectedBranchDays, { id: 0, day_id: dayId, day_name: systemWorkingDays.find(d => d.id === dayId)?.day_name || "", day_type: dayType }];
    setSelectedBranchDays(newSelectedBranchDays);
    try {
      await onUpdate({ action: "add", dayId, dayType });
      setHasChanges(false);
    } catch (error) {
      setSelectedBranchDays(selectedBranchDays);
      toast.error("Failed to add day. Please try again.");
    } finally {
      setAddingDayId(null);
      setIsAutoSaving(false);
      setAddDayType(null);
      setPendingAddDayId(null);
    }
  };


  // For branch, open type selector before adding
  const handleBranchDayClick = (dayId: number) => {
    setPendingAddDayId(dayId);
  };

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
    if (scope.type === "institution" && scope.institutionWorkingDays?.days) {
      const dayIds = scope.institutionWorkingDays.days.map(day => day.id)
      setSelectedDays(dayIds)
    }
  }

  if (scope.type === "institution" && (!scope.institutionWorkingDays || scope.institutionWorkingDays.days.length === 0)) {
    // For institution, show empty state if no days set
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">

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
    );
  }
  // For branch: always render the grid, even if no days are set

  // Sort days by level for proper display order
  const sortedDays = [...systemWorkingDays].sort((a, b) => a.level - b.level);


  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">

        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {scope.type === "institution"
            ? "Click the plus (+) button on unselected days to add them, or click the cross (×) to remove selected days instantly."
            : "Click the plus (+) button on unselected days to add them, then choose if it's PHYSICAL or REMOTE. Click the cross (×) to remove selected days."}
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Days Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {sortedDays.length === 0 && (
            <div className="col-span-full text-center text-gray-400">No system working days found.</div>
          )}
          {sortedDays.map((day) => {
            if (scope.type === "institution") {
              const isSelected = selectedDays.includes(day.id);
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
                        e.stopPropagation();
                        if (!isSelected && !isSaving && addingDayId !== day.id) {
                          await handleAddDay(day.id);
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
                        e.stopPropagation();
                        await handleRemoveDay(day.id);
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
              );
            } else {
              // Branch context
              const branchDay = selectedBranchDays.find(d => d.day_name.toLowerCase() === day.day_name.toLowerCase());
              const isSelected = !!branchDay;
              return (
                <div key={day.id} className="relative">
                  <div className="text-center transition-all duration-200 rounded-lg p-2">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2 border-2 transition-all duration-200 relative",
                        isSelected ? getDayColor(day.day_code) : "bg-gray-100 text-gray-400 border-gray-200 hover:border-green-300 hover:bg-green-50 cursor-pointer"
                      )}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!isSelected && !isSaving && addingDayId !== day.id) {
                          handleBranchDayClick(day.id);
                        }
                      }}
                    >
                      {addingDayId === day.id ? (
                        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : isSelected ? (
                        branchDay?.day_type === "PHYSICAL" ? (
                          <span>P</span>
                        ) : (
                          <span>R</span>
                        )
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
                        isSelected ? (branchDay?.day_type === "PHYSICAL" ? "border-blue-300 text-blue-700" : "border-green-300 text-green-700") : "border-gray-200 text-gray-400"
                      )}
                    >
                      {isSelected ? branchDay?.day_type : day.day_code}
                    </Badge>
                  </div>
                  {/* Cross symbol - only show when day is selected */}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleRemoveBranchDay(branchDay!);
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
                  {/* Add type selector popover/dialog */}
                  {pendingAddDayId === day.id && !isSelected && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 bg-white border rounded shadow p-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => await handleAddBranchDay(day.id, "PHYSICAL")}>Physical</Button>
                      <Button size="sm" variant="outline" onClick={async () => await handleAddBranchDay(day.id, "REMOTE")}>Remote</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setPendingAddDayId(null); setAddDayType(null); }}>Cancel</Button>
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                <strong>{scope.type === "institution" ? selectedDays.length : selectedBranchDays.length}</strong> working days selected
              </span>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
