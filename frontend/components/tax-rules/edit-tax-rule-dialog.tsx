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
import { taxRulesAPI } from "@/lib/utils";
import type { ITaxRule } from "@/types/types.utils";
import { formatCurrency } from "@/lib/helpers";

interface EditTaxRuleDialogProps {
  taxRule: ITaxRule;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTaxRule: ITaxRule) => void;
}

export function EditTaxRuleDialog({
  taxRule,
  isOpen,
  onClose,
  onSuccess,
}: EditTaxRuleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    calculation_type: "percentage" as "percentage" | "fixed",
    tax_rule_name: "",
    tax_rule_description: "",
    tax_rule_percentage: undefined as number | undefined,
    tax_rule_fixed_amount: undefined as number | undefined,
    salary_from: 0,
    salary_to: 0,
  });

  useEffect(() => {
    if (taxRule) {
      setFormData({
        calculation_type: taxRule.calculation_type as "percentage" | "fixed",
        tax_rule_name: taxRule.tax_rule_name || "",
        tax_rule_description: taxRule.tax_rule_description || "",
        tax_rule_percentage: taxRule.tax_rule_percentage,
        tax_rule_fixed_amount: taxRule.tax_rule_fixed_amount,
        salary_from: taxRule.salary_from || 0,
        salary_to: taxRule.salary_to || 0,
      });
    }
  }, [taxRule]);

  const handleSubmit = async () => {
    if (!formData.tax_rule_name.trim()) {
      toast.error("Please enter a tax rule name");
      return;
    }

    if (!formData.salary_from || !formData.salary_to) {
      toast.error("Please enter salary range");
      return;
    }

    if (formData.salary_from >= formData.salary_to) {
      toast.error("Salary 'from' must be less than salary 'to'");
      return;
    }

    if (formData.calculation_type === "percentage" && (!formData.tax_rule_percentage || formData.tax_rule_percentage <= 0)) {
      toast.error("Please enter a valid percentage");
      return;
    }

    if (formData.calculation_type === "fixed" && (!formData.tax_rule_fixed_amount || formData.tax_rule_fixed_amount <= 0)) {
      toast.error("Please enter a valid fixed amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedTaxRule = await taxRulesAPI.update(taxRule.id, formData)
      onSuccess(updatedTaxRule);
      toast.success("Tax rule updated successfully");
      onClose();
    } catch (error: any) {
      console.error("Error updating tax rule:", error);
      toast.error(error.message || "An error occurred while updating the tax rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Edit Tax Rule</DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Update the tax calculation rule information below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 py-6">
          <div className="space-y-3">
            <Label htmlFor="tax_rule_name" className="text-sm text-gray-800">
              Tax Rule Name *
            </Label>
            <Input
              id="tax_rule_name"
              type="text"
              value={formData.tax_rule_name}
              onChange={(e) => setFormData({ ...formData, tax_rule_name: e.target.value })}
              placeholder="e.g., Basic Tax Rate"
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="tax_rule_description" className="text-sm text-gray-800">
              Description
            </Label>
            <Input
              id="tax_rule_description"
              type="text"
              value={formData.tax_rule_description}
              onChange={(e) => setFormData({ ...formData, tax_rule_description: e.target.value })}
              placeholder="e.g., Basic tax rate for standard income"
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="calculation_type" className="text-sm text-gray-800">
              Calculation Type *
            </Label>
            <Select
              value={formData.calculation_type}
              onValueChange={(value: "percentage" | "fixed") =>
                setFormData({ ...formData, calculation_type: value })
              }
            >
              <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.calculation_type === "percentage" ? (
            <div className="space-y-3">
              <Label htmlFor="percentage" className="text-sm text-gray-800">
                Percentage Rate *
              </Label>
              <div className="relative">
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax_rule_percentage || ""}
                  onChange={(e) => setFormData({ ...formData, tax_rule_percentage: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 10.5"
                  disabled={isSubmitting}
                  className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="fixed_amount" className="text-sm text-gray-800">
                Fixed Amount *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="fixed_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tax_rule_fixed_amount || ""}
                  onChange={(e) => setFormData({ ...formData, tax_rule_fixed_amount: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 5000.00"
                  disabled={isSubmitting}
                  className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pl-8"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="salary_from" className="text-sm text-gray-800">
                Salary From *
              </Label>
              <div className="relative">
              
                <Input
                  id="salary_from"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary_from || ""}
                  onChange={(e) => setFormData({ ...formData, salary_from: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 0"
                  disabled={isSubmitting}
                  className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pl-8"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="salary_to" className="text-sm text-gray-800">
                Salary To *
              </Label>
              <div className="relative">
                
                <Input
                  id="salary_to"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary_to || ""}
                  onChange={(e) => setFormData({ ...formData, salary_to: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 50000"
                  disabled={isSubmitting}
                  className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pl-8"
                />
              </div>
            </div>
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
              "Update Tax Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 