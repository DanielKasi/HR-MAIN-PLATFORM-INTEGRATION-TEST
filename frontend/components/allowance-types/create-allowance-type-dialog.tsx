"use client"

import { useEffect, useState } from "react"
import { Plus, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { IAllowanceTypeFormData } from "@/types/types.utils"
import { ALLOWANCE_FREQUENCIES } from "@/constants"
import { createAllowanceType } from "@/lib/utils"
import { Checkbox } from "../ui/checkbox"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { useSelector } from "react-redux"

interface CreateAllowanceTypeDialogProps {
  onSuccess: (newAllowanceType: any) => void
  disabled?: boolean,
  isEmbeded?:boolean,
  isOpen: boolean,
  onOpenChange: (open: boolean) => void
}

export function CreateAllowanceTypeDialog({
  onSuccess,
  disabled = false,
  isEmbeded = false,
  isOpen,
  onOpenChange
}: CreateAllowanceTypeDialogProps) {
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<IAllowanceTypeFormData>({
    name: "",
    description: "",
    is_taxable: true,
    is_active: true,
    is_recurring: false,
  })

  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      is_taxable: true,
      is_active: true,
      is_recurring: false,
    })
  }

  const handleSubmit = async () => {
    if(!currentInstitution) {return}
    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.is_recurring && !formData.frequency) {
      toast.error("You must set a frequency!")
      return
    }

    setIsSubmitting(true)
    try {
      const allowanceTypeData: IAllowanceTypeFormData = {
        name: formData.name,
        description: formData.description,
        is_taxable: formData.is_taxable,
        is_active: formData.is_active,
        is_recurring: formData.is_recurring,
      }

      if (formData.is_recurring) {
        allowanceTypeData.frequency = formData.frequency
      }

      const newAllowanceType = await createAllowanceType({
        institutionId:currentInstitution.id,
        allowanceTypeData,
      })

      if (newAllowanceType) {
        onSuccess(newAllowanceType)
        toast.success("Allowance type created successfully")
        resetFormData()
        onOpenChange(false)
      } else {
        toast.error("Failed to create allowance type")
      }
    } catch (error: any) {
      console.error("Error creating allowance type:", error)
      toast.error(error.message || "An error occurred while creating the allowance type")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => { 
    if (!isOpen) {
      resetFormData()
    }
  }, [isOpen])


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Add Allowance Type</DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Create a new allowance type to manage employee allowances efficiently.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 py-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm text-gray-800">
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Housing Allowance, Transportation"
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base resize-none"
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
              placeholder="Provide a detailed description of this allowance type..."
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base resize-none"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="recurrence" className="text-sm font-semibold text-gray-800">
              Is it a recurring or a one time allowance? *
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
                How often this allowance is given *
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
                  id="is_taxable"
                  checked={formData.is_taxable}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      is_taxable: !!checked.valueOf(),
                    })
                  }
                  disabled={isSubmitting}
                  className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                />
                <Label htmlFor="is_taxable" className="text-sm font-medium text-gray-700">
                  Is Taxable
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
                  className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                />
                <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Is Active
                </Label>
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
                Creating...
              </>
            ) : (
              "Create Allowance Type"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
