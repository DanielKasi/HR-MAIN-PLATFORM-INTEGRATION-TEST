"use client"

import { useState, useEffect } from "react"
import { Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { updateDeductionType } from "@/lib/utils"
import type { IDeductionType } from "@/types/types.utils"
import { IDeductionTypeFormData } from "@/types/types.utils"
import { ALLOWANCE_FREQUENCIES } from "@/constants"



interface EditDeductionTypeDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  deductionType: IDeductionType | null
  onSuccess: (updatedDeductionType: IDeductionType) => void
}

export function EditDeductionTypeDialog({
  isOpen,
  onOpenChange,
  deductionType,
  onSuccess,
}: EditDeductionTypeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<IDeductionTypeFormData>({
    name: "",
    description: "",
    is_mandatory: false,
    is_active: true,
    is_recurring: false,
  })

  useEffect(() => {
    if (deductionType) {
      setFormData({
        name: deductionType.name,
        description: deductionType.description,
        is_mandatory: deductionType.is_mandatory,
        is_active: deductionType.is_active,
        is_recurring: deductionType.is_recurring || false,
        frequency: deductionType.frequency as ALLOWANCE_FREQUENCIES,
      })
    }
  }, [deductionType])

  const handleSubmit = async () => {
    if (!deductionType) return

    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.is_recurring && !formData.frequency) {
      toast.error("You must set a frequency for recurring deductions!")
      return
    }

    setIsSubmitting(true)
    try {
      const deductionTypeData: Partial<IDeductionTypeFormData> = {
        name: formData.name,
        description: formData.description,
        is_mandatory: formData.is_mandatory,
        is_active: formData.is_active,
        is_recurring: formData.is_recurring,
      }

      if (formData.is_recurring) {
        deductionTypeData.frequency = formData.frequency
      }

      const updatedDeductionType = await updateDeductionType({
        id: deductionType.id,
        deductionTypeData,
      })

      if (updatedDeductionType) {
        onSuccess(updatedDeductionType)
        toast.success("Deduction type updated successfully")
        onOpenChange(false)
      } else {
        toast.error("Failed to update deduction type")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while updating the deduction type")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Edit Deduction Type</DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Make changes to the existing deduction type configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 py-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm text-gray-800">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Income Tax, Health Insurance"
                disabled={isSubmitting}
                className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-800">
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Provide a detailed description of this deduction type..."
                disabled={isSubmitting}
                className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="recurrence" className="text-sm font-semibold text-gray-800">
                Is it a recurring or a one time deduction? *
              </Label>
              <Select
                name="recurrence"
                value={formData.is_recurring ? "RECURRING" : "ONE_TIME"}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_recurring: val === "RECURRING",
                    frequency: val === "RECURRING" ? prev.frequency : undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue>{formData.is_recurring ? "Recurring" : "One time"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_TIME">One time</SelectItem>
                  <SelectItem value="RECURRING">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.is_recurring && (
              <div className="space-y-3">
                <Label htmlFor="frequency" className="text-sm font-semibold text-gray-800">
                  How often this deduction is applied *
                </Label>
                <Select
                  name="frequency"
                  value={formData.frequency || ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, frequency: val as ALLOWANCE_FREQUENCIES }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALLOWANCE_FREQUENCIES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        is_mandatory: !!checked.valueOf(),
                      })
                    }
                    disabled={isSubmitting}
                    className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500/20"
                  />
                  <Label htmlFor="is_mandatory" className="text-sm font-medium text-gray-700">
                    Is Mandatory
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        is_active: !!checked.valueOf(),
                      })
                    }
                    disabled={isSubmitting}
                    className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500/20"
                  />
                  <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Is Active
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Deduction Type"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
