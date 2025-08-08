"use client";

import { useState, useEffect } from "react";
import { X, Package, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { IAsset, IAssetRequest, IAssetAllocationFormData } from "@/types/types.utils";

interface CreateAssetAllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (allocation: any) => void;
}

export const CreateAssetAllocationDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateAssetAllocationDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assets, setAssets] = useState<IAsset[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assetRequests, setAssetRequests] = useState<IAssetRequest[]>([]);
  const [formData, setFormData] = useState<IAssetAllocationFormData>({
    asset_id: 0,
    allocated_to_id: 0,
    responding_to_request_id: undefined,
  });

  // Fetch available assets, employees, and asset requests
  const fetchAssets = async () => {
    try {
      const response = await assetsAPI.getAll();
      // Filter for available assets (not currently allocated)
      const availableAssets = response.filter((asset: IAsset) => 
        asset.status === "available" && asset.is_active
      );
      setAssets(availableAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Failed to load assets");
    }
  };

  const fetchEmployees = async () => {
    try {
      // This would need to be implemented based on your employee API
      // For now, using a placeholder
      const response = await fetch("/api/employees/");
      const data = await response.json();
      setEmployees(data.results || data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const fetchAssetRequests = async () => {
    try {
      const response = await assetsAPI.getAssetRequests();
      // Filter for approved requests
      const approvedRequests = response.filter((request: IAssetRequest) => 
        request.asset_request_status === "approved"
      );
      setAssetRequests(approvedRequests);
    } catch (error) {
      console.error("Error fetching asset requests:", error);
      toast.error("Failed to load asset requests");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
      fetchEmployees();
      fetchAssetRequests();
      setFormData({
        asset_id: 0,
        allocated_to_id: 0,
        responding_to_request_id: undefined,
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.asset_id) {
      toast.error("Please select an asset");
      return;
    }

    if (!formData.allocated_to_id) {
      toast.error("Please select an employee to allocate to");
      return;
    }

    try {
      setIsSubmitting(true);
      const newAllocation = await assetsAPI.createAssetAllocation(formData);
      onSuccess(newAllocation);
    } catch (error: any) {
      console.error("Error creating asset allocation:", error);
      toast.error(error.response?.data?.message || "Failed to create asset allocation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Create Asset Allocation
              </h2>
              <p className="text-sm text-gray-600">
                Allocate an asset to an employee
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="asset" className="text-sm font-medium text-gray-700">
              Asset *
            </Label>
            <Select
              value={formData.asset_id.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, asset_id: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>{asset.asset_name}</span>
                      <span className="text-gray-500 text-xs">
                        ({asset.serial_number})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee" className="text-sm font-medium text-gray-700">
              Allocate To *
            </Label>
            <Select
              value={formData.allocated_to_id.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, allocated_to_id: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{employee.fullname}</span>
                      <span className="text-gray-500 text-xs">
                        ({employee.employee_id})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asset Request Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="request" className="text-sm font-medium text-gray-700">
              Responding to Request (Optional)
            </Label>
            <Select
              value={formData.responding_to_request_id?.toString() || ""}
              onValueChange={(value) =>
                setFormData({ 
                  ...formData, 
                  responding_to_request_id: value ? parseInt(value) : undefined 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an asset request (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {assetRequests.map((request) => (
                  <SelectItem key={request.id} value={request.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>{request.request_reference_code}</span>
                      <span className="text-gray-500 text-xs">
                        ({request.asset.asset_name})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.asset_id || !formData.allocated_to_id}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? "Creating..." : "Create Allocation"}
          </Button>
        </div>
      </div>
    </div>
  );
};
