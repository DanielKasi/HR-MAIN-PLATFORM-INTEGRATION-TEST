"use client";

import { useState } from "react";
import { Plus, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { showErrorToast, taxesAPI } from "@/lib/utils";
import type { ITax, ITaxFormData } from "@/types/types.utils";

interface CreateTaxDialogProps {
  institutionId: number;
  onSuccess: (newTax: ITax) => void;
  disabled?: boolean;
  isEmbeded?: boolean;
}

export function CreateTaxDialog({
  institutionId,
  onSuccess,
  disabled = false,
  isEmbeded = false,
}: CreateTaxDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ITaxFormData>({
    tax_name: "",
    tax_status: true,
  });

  const resetFormData = () => {
    setFormData({
      tax_name: "",
      tax_status: true,
    });
  };

  const handleSubmit = async () => {
    if (!formData.tax_name.trim()) {
      toast.error("Please enter a tax name");
      return;
    }

    setIsSubmitting(true);
    try {
     
      const newTax = await taxesAPI.create(formData);
      onSuccess(newTax);
      toast.success("Tax created successfully");
      resetFormData();
      setIsOpen(false);
    } catch (error: any) {
      showErrorToast({error, defaultMessage:"An error occurred while creating the tax"})
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetFormData();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={isEmbeded ? "outline" : "default"} className="flex items-center gap-2 rounded-[10px]" disabled={disabled}>
          <Plus className="h-4 w-4" />
          {!isEmbeded ? "Add Tax" : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Add Tax</DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Create a new tax type to manage tax configurations.
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
      
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary rounded-full w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Tax"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 