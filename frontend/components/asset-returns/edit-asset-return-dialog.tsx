"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { assetsAPI } from "@/lib/utils";
import type { IAssetReturn, IAssetReturnFormData } from "@/types/types.utils";

interface EditAssetReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetReturn: IAssetReturn;
  onSuccess: () => void;
}

export function EditAssetReturnDialog({
  open,
  onOpenChange,
  assetReturn,
  onSuccess,
}: EditAssetReturnDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<IAssetReturnFormData>({
    asset: assetReturn.asset?.id || 0,
    allocation: assetReturn.allocation?.id || 0,
    condition: assetReturn.condition || "good",
    notes: assetReturn.notes || "",
  });

  // Update form data when asset return changes
  useEffect(() => {
    if (assetReturn) {
      setFormData({
        asset: assetReturn.asset?.id || 0,
        allocation: assetReturn.allocation?.id || 0,
        condition: assetReturn.condition || "good",
        notes: assetReturn.notes || "",
      });
    }
  }, [assetReturn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      await assetsAPI.updateAssetReturn(assetReturn.id, formData);
      toast.success("Asset return updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating asset return:", error);
      toast.error("Failed to update asset return");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form data when closing
      setFormData({
        asset: assetReturn.asset?.id || 0,
        allocation: assetReturn.allocation?.id || 0,
        condition: assetReturn.condition || "good",
        notes: assetReturn.notes || "",
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Asset Return</DialogTitle>
          <DialogDescription>
            Update the asset return details. Note that asset and allocation cannot be changed after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Display (Read-only) */}
          <div className="space-y-2">
            <Label>Asset</Label>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{assetReturn.asset?.asset_name}</div>
              <div className="text-sm text-muted-foreground">
                {assetReturn.asset?.serial_number} • {assetReturn.asset?.batch_number}
              </div>
            </div>
          </div>

          {/* Asset Condition */}
          <div className="space-y-2">
            <Label htmlFor="condition">Asset Condition *</Label>
            <Select
              value={formData.condition}
              onValueChange={(value) =>
                setFormData({ ...formData, condition: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the return..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
