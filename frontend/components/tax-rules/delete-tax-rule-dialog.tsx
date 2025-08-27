"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { taxRulesAPI } from "@/lib/utils";
import type { ITaxRule } from "@/types/types.utils";

interface DeleteTaxRuleDialogProps {
  taxRule: ITaxRule;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: number) => void;
}

export function DeleteTaxRuleDialog({
  taxRule,
  isOpen,
  onClose,
  onSuccess,
}: DeleteTaxRuleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await taxRulesAPI.delete(taxRule.id)
      onSuccess(taxRule.id);
      toast.success("Tax rule deleted successfully");
      onClose();
    } catch (error: any) {
      console.error("Error deleting tax rule:", error);
      toast.error(error.message || "An error occurred while deleting the tax rule");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
        <AlertDialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                Delete Tax Rule
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 mt-1">
                Are you sure you want to delete this tax rule? This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="py-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Tax Rule Details</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Calculation Type:</span> 
                <span className="ml-2 capitalize">{taxRule.calculation_type}</span>
              </div>
              <div>
                <span className="font-medium">Rate/Amount:</span> 
                <span className="ml-2">
                  {taxRule.calculation_type === "percentage" 
                    ? `${taxRule.percentage}%`
                    : formatCurrency(taxRule.fixed_amount || 0)
                  }
                </span>
              </div>
              <div>
                <span className="font-medium">Salary Range:</span> 
                <span className="ml-2">
                  {taxRule.salary_from && formatCurrency(taxRule.salary_from|| 0)}{ taxRule.salary_to && ("-" + formatCurrency(taxRule.salary_to))}
                </span>
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  taxRule.institution_tax.tax_status
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {taxRule.institution_tax.tax_status ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Warning</p>
                <p>
                  Deleting this tax rule will permanently remove it from the system. 
                  This may affect tax calculations for employees in the specified salary range.
                </p>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel 
            onClick={onClose} 
            disabled={isDeleting}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Tax Rule"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 