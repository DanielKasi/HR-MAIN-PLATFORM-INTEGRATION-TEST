"use client";

import React, {useState, useEffect} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

interface IDepartmentEditor {
  id?: number;
  name: string;
  description?: string | null;
  job_positions?: any[];
}

interface Props {
  open: boolean;
  initial?: IDepartmentEditor | null;
  onClose: () => void;
  onSave: (dept: IDepartmentEditor) => void;
}

export default function DepartmentEditorDialog({open, initial, onClose, onSave}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
    }
  }, [initial, open]);

  const handleSave = () => {
    onSave({ id: initial?.id ?? 0, name: name.trim() || "New Department", description: description.trim() });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Department" : "Add Department"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label>Name</Label>
          <Input placeholder="e.g. Human Resources" value={name} onChange={(e) => setName(e.target.value)} />
          <Label>Description</Label>
          <Input placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <DialogFooter className="mt-8 flex justify-end gap-2">
          <Button size={"lg"} className="w-full rounded-full" onClick={handleSave}>{initial ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
