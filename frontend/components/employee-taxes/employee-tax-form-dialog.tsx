"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, AlertTriangle, Info } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type {
  IEmployeeTax,

  ITax,
  IEmployeeTaxFormData,
} from "@/types/types.utils";
import { taxAPI } from "@/lib/utils";
import { formatCurrency } from "@/lib/helpers";
import { CreateTaxDialog } from "@/components/taxes/create-tax-dialog";
import { ContextSelector } from "../employee-allowances/context-selector";

interface ContextItem {
  id: number;
  name: string;
  description?: string;
}

interface ValidationResult {
  [key: string]: string[];
}

interface EmployeeTaxFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTax: IEmployeeTax | null;
  taxes: ITax[];
  institutionId: number;
  onSuccess: (tax: IEmployeeTax, isEdit: boolean) => void;
  onTaxCreated?: (newTax: ITax) => void;
}

export function EmployeeTaxFormDialog({
  isOpen,
  onOpenChange,
  editingTax,
  taxes,
  institutionId,
  onSuccess,
  onTaxCreated,
}: EmployeeTaxFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({});
  const [selectedContext, setSelectedContext] = useState<
    "employee" | "department" | "job_position" | ""
  >("");
  const [selectedContextItems, setSelectedContextItems] = useState<ContextItem[]>([]);

  const [formData, setFormData] = useState({
    institution_tax: "",
    effective_from: "",
    effective_to: "",
  });

  // Update form data when editing tax changes
  useEffect(() => {
    if (editingTax) {
      setFormData({
        institution_tax: editingTax.institution_tax.id.toString(),
        effective_from: editingTax.effective_from,
        effective_to: editingTax.effective_to || "",
      });

      // Note: Context data would need to be fetched separately
      // This is a simplified version - you may need to implement proper loading
      setSelectedContext("");
      setSelectedContextItems([]);
    } else {
      resetForm();
    }
  }, [editingTax]);

  const resetForm = () => {
    setFormData({
      institution_tax: "",
      effective_from: "",
      effective_to: "",
    });
    setSelectedContext("");
    setSelectedContextItems([]);
    setValidationErrors({});
  };

  const validateForm = (): boolean => {
    const errors: ValidationResult = {};

    if (!formData.institution_tax) {
      errors.institution_tax = ["Tax type is required"];
    }

    if (!formData.effective_from) {
      errors.effective_from = ["Effective from date is required"];
    }

    if (formData.effective_to && formData.effective_from) {
      const fromDate = new Date(formData.effective_from);
      const toDate = new Date(formData.effective_to);
      if (toDate <= fromDate) {
        errors.effective_to = ["Effective to date must be after effective from date"];
      }
    }
    // if (!formData.effective_to) {
    //   errors.effective_to = ["Effective to date is required"];
    // }

    if (selectedContext && selectedContextItems.length === 0) {
      errors.context = ["Please select at least one item"];
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const taxData: IEmployeeTaxFormData = {
        institution_tax: formData.institution_tax,
        effective_from: formData.effective_from,
      };
      if(formData.effective_to){
        taxData["effective_to"] = formData.effective_to
      }
      // Add context-specific data
      if (selectedContext && selectedContextItems.length > 0) {
        switch (selectedContext) {
          case "employee":
            taxData.target_employees = selectedContextItems.map(item => item.id);
            break;
          case "department":
            taxData.target_departments = selectedContextItems.map(item => item.id);
            break;
          case "job_position":
            taxData.target_job_positions = selectedContextItems.map(item => item.id);
            break;
        }
      }

      if (editingTax) {
        const updatedTax = await taxAPI.updateEmployeeTax({
          data: taxData,
          taxId: editingTax.id,
        });
        onSuccess(updatedTax as unknown as IEmployeeTax, true);
        toast.success("Employee tax updated successfully");
      } else {
        const newTax = await taxAPI.createEmployeeTaxes({ data: taxData });
        onSuccess(newTax as unknown as IEmployeeTax, false);
        toast.success("Employee tax created successfully");
      }

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving employee tax:", error);
      toast.error(error.message || "An error occurred while saving the employee tax");
    } finally {
      setSaving(false);
    }
  };

  const handleTaxCreated = (newTax: ITax) => {
    if (onTaxCreated) {
      onTaxCreated(newTax);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[36rem] md:max-w-[42rem] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {editingTax ? "Edit Employee Tax" : "Add Employee Tax"}
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            {editingTax
              ? "Update the employee tax configuration below."
              : "Configure tax settings for employees, departments, or job positions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6 max-h-[70svh] overflow-y-auto">
          {/* Tax Type Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="tax_type" className="text-sm font-semibold text-gray-800">
                Tax Type *
              </Label>
              <CreateTaxDialog
                institutionId={institutionId}
                onSuccess={handleTaxCreated}
                disabled={saving}
                isEmbeded={true}
              />
            </div>
            <Select
              value={formData.institution_tax}
              onValueChange={(value) =>
                setFormData({ ...formData, institution_tax: value })
              }
              disabled={saving}
            >
              <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                <SelectValue placeholder="Select a tax type" />
              </SelectTrigger>
              <SelectContent>
                {taxes.map((tax) => (
                  <SelectItem key={tax.id} value={tax.id.toString()}>
                    {tax.tax_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.institution_tax && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {validationErrors.institution_tax[0]}
              </div>
            )}
          </div>

          {/* Context Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-800">
              Apply to *
            </Label>
            <ContextSelector
              selectedContext={selectedContext}
              onContextChange={setSelectedContext}
              selectedItems={selectedContextItems}
              onItemsChange={setSelectedContextItems}
              disabled={saving}
            />
            {validationErrors.context && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {validationErrors.context[0]}
              </div>
            )}
          </div>

          {/* Effective Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="effective_from" className="text-sm font-semibold text-gray-800">
                Effective From *
              </Label>
              <Input
                id="effective_from"
                type="date"
                required
                value={formData.effective_from}
                onChange={(e) =>
                  setFormData({ ...formData, effective_from: e.target.value })
                }
                disabled={saving}
                className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
              />
              {validationErrors.effective_from && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {validationErrors.effective_from[0]}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="effective_to" className="text-sm font-semibold text-gray-800">
                Effective To (Optional)
              </Label>
              <Input
                id="effective_to"
                type="date"
                value={formData.effective_to}
                onChange={(e) =>
                  setFormData({ ...formData, effective_to: e.target.value })
                }
                disabled={saving}
                className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
              />
              {validationErrors.effective_to && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {validationErrors.effective_to[0]}
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Tax Configuration</p>
                <p>
                  This tax will be applied to the selected employees, departments, or job positions
                  from the effective date. The tax will be calculated based on the employee's salary
                  and the tax rules configured for this tax type.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-orange-600 hover:bg-orange-700"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingTax ? "Update Tax" : "Create Tax"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 