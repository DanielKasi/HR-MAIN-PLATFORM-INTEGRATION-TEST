"use client"

import { useState } from "react"
import { Trash2, Loader2 } from 'lucide-react'
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
import type { IAllowanceType } from "@/types/types.utils"
import { deleteAllowanceType } from "@/lib/utils"

interface DeleteAllowanceTypeDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  allowanceType: IAllowanceType | null
  onSuccess: (deletedId: number) => void
}

export function DeleteAllowanceTypeDialog({
  isOpen,
  onOpenChange,
  allowanceType,
  onSuccess,
}: DeleteAllowanceTypeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDelete = async () => {
    if (!allowanceType) return

    setIsSubmitting(true)
    try {
      const success = await deleteAllowanceType(allowanceType.id)

      if (success) {
        onSuccess(allowanceType.id)
        toast.success("Allowance type deleted successfully")
        onOpenChange(false)
      } else {
        toast.error("Failed to delete allowance type")
      }
    } catch (error: any) {
      console.error("Error deleting allowance type:", error)
      toast.error(error.message || "An error occurred while deleting the allowance type")
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
            Delete Allowance Type
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">"{allowanceType?.name}"</span>? This action
            cannot be undone and will permanently remove this allowance type from your system.
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
