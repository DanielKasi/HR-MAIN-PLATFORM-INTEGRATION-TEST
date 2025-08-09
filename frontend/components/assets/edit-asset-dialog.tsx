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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { assetsAPI, assetCategoriesAPI } from "@/lib/utils";
import type { IAsset, IAssetFormData, IAssetCategory } from "@/types/types.utils";

interface EditAssetDialogProps {
  asset: IAsset;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAsset: IAsset) => void;
}

export function EditAssetDialog({
  asset,
  isOpen,
  onClose,
  onSuccess,
}: EditAssetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<IAssetCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [formData, setFormData] = useState<IAssetFormData>({
    asset_name: "",
    serial_number: "",
    category: 0,
    description: "",
    status: "available",
  });

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const data = await assetCategoriesAPI.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load asset categories");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setFormData({
        asset_name: asset.asset_name,
        serial_number: asset.serial_number,
        category: asset.category,
        description: asset.description || "",
        status: asset.status,
      });
    }
  }, [asset, isOpen]);

  const handleSubmit = async () => {
    if (!formData.asset_name.trim()) {
      toast.error("Please enter an asset name");
      return;
    }

    if (!formData.serial_number.trim()) {
      toast.error("Please enter a serial number");
      return;
    }

    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedAsset = await assetsAPI.update(asset.id, formData);
      onSuccess(updatedAsset);
      toast.success("Asset updated successfully");
      onClose();
    } catch (error: any) {
      console.error("Error updating asset:", error);
      toast.error(error.message || "An error occurred while updating the asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900">Edit Asset</DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Update the asset information.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 py-6">
          <div className="space-y-3">
            <Label htmlFor="asset_name" className="text-sm text-gray-800">
              Asset Name *
            </Label>
            <Input
              id="asset_name"
              value={formData.asset_name}
              onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
              placeholder="e.g., Dell Laptop XPS 13"
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="serial_number" className="text-sm text-gray-800">
              Serial Number *
            </Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="e.g., SN123456789"
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="category" className="text-sm text-gray-800">
              Category *
            </Label>
            <Select 
              value={formData.category ? formData.category.toString() : undefined} 
              onValueChange={(value) => {
                if (value && value !== "loading" && value !== "no-categories") {
                  setFormData({ ...formData, category: parseInt(value) });
                }
              }}
              disabled={isSubmitting || isLoadingCategories}
            >
              <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <SelectItem value="loading" disabled>
                    Loading categories...
                  </SelectItem>
                ) : categories.length === 0 ? (
                  <SelectItem value="no-categories" disabled>
                    No categories available
                  </SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.category_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="status" className="text-sm text-gray-800">
              Status
            </Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="maintenance">Under Maintenance</SelectItem>
                <SelectItem value="decommissioned">Decommissioned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-sm text-gray-800">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., High-performance laptop for development work"
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingCategories}
            className="bg-primary rounded-full w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Asset"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 