"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shiftsAPI, showErrorToast } from "@/lib/utils";
import { toast } from "sonner";
import type { IEmployee, IEmployeeShiftFormData, IEmployeeShift } from "@/types/types.utils";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee: IEmployee;
  shiftId?: number;
  onSaved?: () => void;
}

export default function EmployeeShiftDialog({ isOpen, onOpenChange, employee, shiftId, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<IEmployeeShiftFormData>({ shift: 0, context: "ASSIGNMENT", shift_status: "ASSIGNED", employee: employee?.id || 0, date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (shiftId) {
      (async () => {
        try {
          const data: IEmployeeShift = await shiftsAPI.EMPLOYEE.getById(shiftId);
          setForm({ shift: data.shift.id, context: data.context, shift_status: data.shift_status, employee: data.employee, date: data.date } as any);
        } catch (err: any) {
          showErrorToast({ error: err, defaultMessage: "Failed to load shift" });
        }
      })();
    } else {
      setForm({ shift: 0, context: "ASSIGNMENT", shift_status: "ASSIGNED", employee: employee?.id || 0, date: new Date().toISOString().split('T')[0] });
    }
  }, [shiftId]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: Partial<IEmployeeShiftFormData> = { ...form, employee: employee.id } as any;
      if (shiftId) {
        await shiftsAPI.EMPLOYEE.update(shiftId, payload);
        toast.success("Shift updated");
      } else {
        await shiftsAPI.EMPLOYEE.create(payload as IEmployeeShiftFormData);
        toast.success("Shift assigned");
      }
      onOpenChange(false);
      onSaved && onSaved();
    } catch (err: any) {
      showErrorToast({ error: err, defaultMessage: "Failed to save shift" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{shiftId ? "Edit Shift" : "Assign Shift"}</DialogTitle>
          <DialogDescription>{shiftId ? "Update employee shift" : "Assign a shift to this employee"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Shift (Branch shift id)</label>
            <Input value={String(form.shift || "")} onChange={(e) => setForm((p) => ({ ...p, shift: Number(e.target.value) }))} />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Context</label>
            <Input value={form.context} onChange={(e) => setForm((p) => ({ ...p, context: e.target.value as any }))} />
          </div>

        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{shiftId ? "Update" : "Assign"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
