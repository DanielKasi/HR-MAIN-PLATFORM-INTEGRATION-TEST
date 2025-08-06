"use client"

import { useState } from "react"
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { deleteDeductionType } from "@/lib/utils"
import type { IDeductionType } from "@/app/types/types.utils"

interface DeleteDeductionTypeDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  deductionType: IDeductionType | null
  onSuccess: (deletedId: number) => void
}

export function DeleteDeductionTypeDialog({
  isOpen,
  onOpenChange,
  deductionType,
  onSuccess,
}: DeleteDeductionTypeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDelete = async () => {
    if (!deductionType) return

    setIsSubmitting(true)
    try {
      const success = await deleteDeductionType(deductionType.id)

      if (success) {
        onSuccess(deductionType.id)
        toast.success("Deduction type deleted successfully")
        onOpenChange(false)
      } else {
        toast.error("Failed to delete deduction type")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the deduction type")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-4 pb-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
            Delete Deduction Type
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">"{deductionType?.name}"</span>? This action
            cannot be undone and will permanently remove this deduction type from your system.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Permanently"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
