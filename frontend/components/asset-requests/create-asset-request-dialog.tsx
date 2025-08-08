"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { X, Package, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { assetsAPI } from "@/lib/utils";
import type { IAsset, IAssetRequest, IAssetRequestFormData } from "@/types/types.utils";

interface CreateAssetRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: IAssetRequest) => void;
}

export const CreateAssetRequestDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateAssetRequestDialogProps) => {
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assets, setAssets] = useState<IAsset[]>([]);
  const [formData, setFormData] = useState<IAssetRequestFormData>({
    asset_id: 0,
    notes: "",
  });

  // Fetch available assets
  const fetchAssets = async () => {
    try {
      const response = await assetsAPI.getAll();
      // Filter for available assets only
      const availableAssets = response.filter(asset => 
        asset.status === "available" && asset.is_active
      );
      setAssets(availableAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Failed to load available assets");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
      setFormData({
        asset_id: 0,
        notes: "",
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.asset_id) {
      toast.error("Please select an asset");
      return;
    }

    try {
      setIsSubmitting(true);
      const newRequest = await assetsAPI.createAssetRequest(formData);
      onSuccess(newRequest);
    } catch (error: any) {
      console.error("Error creating asset request:", error);
      const errorMessage = error.response?.data?.message || "Failed to create asset request";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Create Asset Request</span>
          </DialogTitle>
          <DialogDescription>
            Request an asset for allocation. Only available assets can be requested.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Asset Selection */}
          <div className="space-y-3">
            <Label htmlFor="asset" className="text-sm text-gray-800">
              Asset *
            </Label>
            <Select
              value={formData.asset_id.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, asset_id: parseInt(value) })
              }
            >
              <SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{asset.asset_name}</span>
                      <span className="text-sm text-gray-500">
                        {asset.serial_number} • {asset.category?.category_name || 'Unknown Category'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assets.length === 0 && (
              <p className="text-sm text-gray-500">
                No available assets found. All assets may be currently allocated or inactive.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm text-gray-800">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes or reasons for the request..."
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-[100px] rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
                      <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.asset_id}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
            >
            {isSubmitting ? "Creating..." : "Create Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
