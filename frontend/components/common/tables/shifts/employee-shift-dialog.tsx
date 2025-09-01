"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, User } from "lucide-react"
import { useSelector } from "react-redux"
import { selectSelectedBranch } from "@/store/auth/selectors"
import apiRequest from "@/lib/apiRequest"
import { toast } from "sonner"
import type { IEmployee, IEmployeeShiftFormData, IEmployeeShift, IBranchShift } from "@/types/types.utils"

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  employee: IEmployee
  shiftId?: number
  onSaved?: () => void
}

export default function EmployeeShiftDialog({ isOpen, onOpenChange, employee, shiftId, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [branchShifts, setBranchShifts] = useState<IBranchShift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [form, setForm] = useState<IEmployeeShiftFormData>({
    shift: 0,
    context: "ALLOCATION",
    employee: employee?.id || 0,
    shift_status: "PENDING",
    date: new Date().toISOString().split("T")[0],
  })

  const selectedBranch = useSelector(selectSelectedBranch)

  const fetchBranchShifts = async () => {
    if (!selectedBranch?.id) return

    setLoadingShifts(true)
    try {
      const response = await apiRequest.get(`institution/branch-shifts/${selectedBranch.id}/`)
      setBranchShifts(response.data.results || [])
    } catch (error) {
      console.error("Failed to fetch branch shifts:", error)
      setBranchShifts([])
    } finally {
      setLoadingShifts(false)
    }
  }

  useEffect(() => {
    if (isOpen && selectedBranch?.id) {
      fetchBranchShifts()
    }
  }, [isOpen, selectedBranch?.id])

  useEffect(() => {
    if (!isOpen) {
      setForm({
        shift: 0,
        context: "ALLOCATION",
        shift_status: "PENDING",
        employee: employee.id,
        date: new Date().toISOString().split("T")[0],
      })
    }
  }, [isOpen, employee?.id])

  useEffect(() => {
    if (shiftId) {
      ; (async () => {
        try {
          const response = await apiRequest.get(`employee/employee-shifts/${shiftId}/`)
          const data: IEmployeeShift = response.data
          setForm({
            shift: data.shift.id,
            context: data.context,
            employee: data.employee,
            date: data.date,
          } as any)
        } catch (error) {
          console.error("Failed to load shift:", error)
          toast.error("Failed to load shift")
        }
      })()
    }
  }, [shiftId])

  const handleSubmit = async () => {
    if (!form.shift || !form.date) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const payload = {
        shift: form.shift,
        context: "ALLOCATION",
        employee: employee.id,
        date: form.date,
      }

      if (shiftId) {
        await apiRequest.put(`employee/employee-shifts/${shiftId}/`, payload)
        toast.success("Shift updated successfully")
      } else {
        await apiRequest.post("employee/employee-shifts/", payload)
        toast.success("Shift assigned successfully")
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      console.error("Failed to save shift:", error)
      toast.error("Failed to save shift")
    } finally {
      setLoading(false)
    }
  }

  const selectedShift = branchShifts.find((shift) => shift.id === form.shift)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {shiftId ? "Edit Shift Assignment" : "Assign Shift"}
          </DialogTitle>
          <DialogDescription>
            {shiftId
              ? "Update employee shift assignment"
              : `Assign a shift to ${employee?.first_name} ${employee?.last_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="shift">Available Shifts</Label>
            <Select
              value={form.shift ? String(form.shift) : ""}
              onValueChange={(value) => setForm((p) => ({ ...p, shift: Number(value) }))}
              disabled={loadingShifts}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingShifts ? "Loading shifts..." : "Select a shift"} />
              </SelectTrigger>
              <SelectContent>
                {branchShifts.map((shift) => (
                  <SelectItem key={shift.id} value={String(shift.id)}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{shift.name}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground ml-2">
                        <Clock className="h-3 w-3" />
                        {shift.start_time} - {shift.end_time}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* {selectedShift && (
              <div className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Day:</span> {selectedShift.shift_day?.day_name}
              </div>
            )} */}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Assignment Date</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              min={new Date().toISOString().split("T")[0]}
            />
            {/* {selectedShift && form.date && (
              <div className="text-sm text-muted-foreground mt-1">
                Make sure the selected date falls on a {selectedShift.shift_day?.}
              </div>
            )} */}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingShifts || !form.shift || !form.date}>
            {loading ? "Saving..." : shiftId ? "Update Assignment" : "Assign Shift"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
