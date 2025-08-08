"use client";

import { useState, useEffect } from "react";
import { Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { taxesAPI } from "@/lib/utils";
import type { ITax, ITaxFormData } from "@/types/types.utils";

interface EditTaxDialogProps {
  tax: ITax;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTax: ITax) => void;
}

export function EditTaxDialog({
  tax,
  isOpen,
  onClose,
  onSuccess,
}: EditTaxDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ITaxFormData>({
    tax_name: "",
    tax_status: true,
  });

  useEffect(() => {
    if (tax) {
      setFormData({
        tax_name: tax.tax_name,
        tax_status: tax.tax_status,
      });
    }
  }, [tax]);

  const handleSubmit = async () => {
    if (!formData.tax_name.trim()) {
      toast.error("Please enter a tax name");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use actual API call
      const updatedTax = await taxesAPI.update(tax.id, formData);
      onSuccess(updatedTax);
      toast.success("Tax updated successfully");
      onClose();
    } catch (error: any) {
      console.error("Error updating tax:", error);
      toast.error(error.message || "An error occurred while updating the tax");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Edit Tax</DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Update the tax information below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 py-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm text-gray-800">
              Tax Name *
            </Label>
            <Input
              id="tax_name"
              value={formData.tax_name}
              onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
              placeholder="e.g., Income Tax, VAT, Corporate Tax"
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="status" className="text-sm font-semibold text-gray-800">
              Status *
            </Label>
            <Select
              value={formData.tax_status ? "active" : "inactive"}
              onValueChange={(value: "active" | "inactive") =>
                setFormData({ ...formData, tax_status: value === "active" })
              }
            >
              <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Tax"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 