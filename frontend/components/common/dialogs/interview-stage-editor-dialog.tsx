"use client"

import React, { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  initial?: { id?: number | string; name?: string }
  onClose: () => void
  onSave: (payload: { name: string }) => Promise<void> | void
}

export default function InterviewStageEditorDialog({ open, initial, onClose, onSave }: Props) {
  const [name, setName] = useState<string>(initial?.name ?? "")

  useEffect(() => {
    if (open) setName(initial?.name ?? "")
  }, [open, initial])

  const handleSave = async () => {
    if (!name.trim()) return
    await onSave({ name: name.trim() })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Interview Stage</DialogTitle>
          <DialogDescription>Update the name of this interview stage.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-sm">Stage Name</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Technical Interview" />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
