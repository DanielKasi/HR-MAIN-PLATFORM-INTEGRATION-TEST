"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ShiftsTable from "@/components/common/tables/shifts/shifts-table";
import { shiftsAPI, showErrorToast } from "@/lib/utils";
import { toast } from "sonner";
import type { IEmployee, IEmployeeShiftFormData } from "@/types/types.utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import EmployeeShiftDialog from "@/components/common/tables/shifts/employee-shift-dialog";

interface Props {
  employee: IEmployee;
}

export default function EmployeeShifts({ employee }: Props) {
  const refreshRef = useRef<() => void>(() => {});
  const [openCreate, setOpenCreate] = useState(false);
  const [editingShift, setEditingShift] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, shiftId: 0, loading: false });

  const handleCreate = () => setOpenCreate(true);

  const handleEdit = (shiftId: number) => setEditingShift(shiftId);

  const handleDelete = async () => {
    setDeleteConfirmation((p) => ({ ...p, loading: true }));
    try {
      await shiftsAPI.EMPLOYEE.delete(deleteConfirmation.shiftId);
      toast.success("Shift deleted");
      if (refreshRef.current) refreshRef.current();
    } catch (err: any) {
      showErrorToast({ error: err, defaultMessage: "Failed to delete shift" });
    } finally {
      setDeleteConfirmation({ isOpen: false, shiftId: 0, loading: false });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shifts</h3>
        <div className="flex items-center gap-2">
          <Button size={"sm"} className="rounded-full" onClick={handleCreate}>Assign Shift</Button>
        </div>
      </div>

      <ShiftsTable scope={{ type: "employee", employee }} refreshTableRef={refreshRef} />

      <EmployeeShiftDialog
        isOpen={openCreate || editingShift !== null}
        onOpenChange={(v: boolean) => {
          if (!v) {
            setOpenCreate(false);
            setEditingShift(null);
          }
        }}
        employee={employee}
        shiftId={editingShift || undefined}
        onSaved={() => {
          if (refreshRef.current) refreshRef.current();
        }}
      />

      <ConfirmationDialog
        description={"You're about to delete this shift. Do you want to proceed?"}
        disabled={deleteConfirmation.loading}
        isOpen={deleteConfirmation.isOpen}
        title={`Delete shift`}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmation({ isOpen: false, shiftId: 0, loading: false })}
      />
    </div>
  );
}
