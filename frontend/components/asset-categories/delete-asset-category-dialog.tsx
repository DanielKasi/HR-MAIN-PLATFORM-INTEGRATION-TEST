"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { assetCategoriesAPI } from "@/lib/utils";
import type { IAssetCategory } from "@/types/types.utils";

interface DeleteAssetCategoryDialogProps {
  assetCategory: IAssetCategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: number) => void;
}

export function DeleteAssetCategoryDialog({
  assetCategory,
  isOpen,
  onClose,
  onSuccess,
}: DeleteAssetCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await assetCategoriesAPI.delete(assetCategory.id);
      onSuccess(assetCategory.id);
      toast.success("Asset category deleted successfully");
      onClose();
    } catch (error: any) {
      console.error("Error deleting asset category:", error);
      toast.error(error.message || "An error occurred while deleting the asset category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">Delete Asset Category</DialogTitle>
              <DialogDescription className="text-gray-600 text-base mt-1">
                Are you sure you want to delete this asset category?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Category to be deleted:</h3>
            <p className="text-red-700 font-medium">{assetCategory.category_name}</p>
            {assetCategory.category_description && (
              <p className="text-red-600 text-sm mt-1">{assetCategory.category_description}</p>
            )}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium text-red-600">Warning:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>This action cannot be undone</li>
              <li>All assets in this category will be affected</li>
              <li>Related asset allocations may be impacted</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Asset Category"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 