"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { X, Package, FileText, Edit } from "lucide-react";
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
import type { IAssetRequest, IAssetRequestFormData } from "@/types/types.utils";

interface EditAssetRequestDialogProps {
  request: IAssetRequest;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: IAssetRequest) => void;
}

export const EditAssetRequestDialog = ({
  request,
  isOpen,
  onClose,
  onSuccess,
}: EditAssetRequestDialogProps) => {
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<IAssetRequestFormData>({
    asset_id: request.asset.id,
    notes: request.notes || "",
  });

  useEffect(() => {
    if (isOpen && request) {
      setFormData({
        asset_id: request.asset.id,
        notes: request.notes || "",
      });
    }
  }, [isOpen, request]);

  const handleSubmit = async () => {
    if (!formData.asset_id) {
      toast.error("Please select an asset");
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedRequest = await assetsAPI.updateAssetRequest(request.id, formData);
      onSuccess(updatedRequest);
    } catch (error: any) {
      console.error("Error updating asset request:", error);
      const errorMessage = error.response?.data?.message || "Failed to update asset request";
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
            <Edit className="h-5 w-5" />
            <span>Edit Asset Request</span>
          </DialogTitle>
          <DialogDescription>
            Update the asset request details. Reference: {request.request_reference_code}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Asset Information (Read-only) */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-800">
              Asset
            </Label>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">{request.asset.asset_name}</p>
                  <p className="text-sm text-gray-600">
                    {request.asset.serial_number} • {request.asset.category?.category_name || 'Unknown Category'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Information (Read-only) */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-800">
              Current Status
            </Label>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  request.asset_request_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.asset_request_status === 'approved' ? 'bg-green-100 text-green-800' :
                  request.asset_request_status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {request.asset_request_status.charAt(0).toUpperCase() + request.asset_request_status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Requester Information (Read-only) */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-800">
              Requester
            </Label>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-900">
                {request.requester?.user.fullname || 'Unknown User'}
              </p>
            </div>
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
            disabled={isSubmitting}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
          >
            {isSubmitting ? "Updating..." : "Update Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
