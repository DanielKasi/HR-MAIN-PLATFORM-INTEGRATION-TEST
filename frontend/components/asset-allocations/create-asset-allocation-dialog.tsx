"use client";

import { useState, useEffect } from "react";
import { X, Package, User, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { assetsAPI, getAllEmployees } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
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
    asset: 0,
    allocated_to: 0,
    responding_to_request: undefined,
  });

  // Search states
  const [assetSearchTerm, setAssetSearchTerm] = useState("");
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [isRequestDropdownOpen, setIsRequestDropdownOpen] = useState(false);

  console.log("Employees", employees);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Filtered assets and employees based on search
  const filteredAssets = assets.filter((asset) =>
    asset.asset_name.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
    asset.serial_number.toLowerCase().includes(assetSearchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter((employee) => {
    const fullName = employee.user?.fullname || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown';
    const employeeId = employee.employee_id || '';
    return (
      fullName.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
      employeeId.toLowerCase().includes(employeeSearchTerm.toLowerCase())
    );
  });

  const filteredAssetRequests = assetRequests.filter((request) =>
    request.request_reference_code.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
    request.asset.asset_name.toLowerCase().includes(requestSearchTerm.toLowerCase())
  );

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
    if (!selectedInstitution) {
      console.warn("No institution selected");
      return;
    }

    try {
      const data = await getAllEmployees({ institutionId: selectedInstitution.id });
      setEmployees(data || []);
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
    if (isOpen && selectedInstitution) {
      fetchAssets();
      fetchEmployees();
      fetchAssetRequests();
      setFormData({
        asset: 0,
        allocated_to: 0,
        responding_to_request: undefined,
      });
      // Reset search terms when opening
      setAssetSearchTerm("");
      setEmployeeSearchTerm("");
      setRequestSearchTerm("");
    }
  }, [isOpen, selectedInstitution]);

  const handleSubmit = async () => {
    if (!formData.asset) {
      toast.error("Please select an asset");
      return;
    }

    if (!formData.allocated_to) {
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
              value={formData.asset.toString()}
              onValueChange={(value: string) => {
                setFormData({ ...formData, asset: parseInt(value) });
                setIsAssetDropdownOpen(false);
              }}
              open={isAssetDropdownOpen}
              onOpenChange={setIsAssetDropdownOpen}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {/* Asset Search Input */}
                <div className="p-2 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assets..."
                      value={assetSearchTerm}
                      onChange={(e) => setAssetSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-sm border-0 focus:ring-0 focus:border-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                {/* Asset Options */}
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4" />
                        <span>{asset.asset_name}</span>
                        <span className="text-gray-500 text-xs">
                          ({asset.serial_number})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    {assetSearchTerm ? "No assets found" : "No assets available"}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee" className="text-sm font-medium text-gray-700">
              Allocate To *
            </Label>
            {!selectedInstitution ? (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md">
                Please select an institution to load employees
              </div>
            ) : (
              <Select
                value={formData.allocated_to.toString()}
                onValueChange={(value: string) => {
                  setFormData({ ...formData, allocated_to: parseInt(value) });
                  setIsEmployeeDropdownOpen(false);
                }}
                open={isEmployeeDropdownOpen}
                onOpenChange={setIsEmployeeDropdownOpen}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {/* Employee Search Input */}
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search employees..."
                        value={employeeSearchTerm}
                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-sm border-0 focus:ring-0 focus:border-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  {/* Employee Options */}
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{employee.user?.fullname || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown'}</span>
                          <span className="text-gray-500 text-xs">
                            ({employee.employee_id})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      {employeeSearchTerm ? "No employees found" : "No employees available"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Asset Request Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="request" className="text-sm font-medium text-gray-700">
              Responding to Request (Optional)
            </Label>
            <Select
              value={formData.responding_to_request?.toString() || "none"}
              onValueChange={(value: string) => {
                setFormData({ 
                  ...formData, 
                  responding_to_request: value === "none" ? undefined : parseInt(value)
                });
                setIsRequestDropdownOpen(false);
              }}
              open={isRequestDropdownOpen}
              onOpenChange={setIsRequestDropdownOpen}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an asset request (optional)" />
              </SelectTrigger>
              <SelectContent>
                {/* Asset Request Search Input */}
                <div className="p-2 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search asset requests..."
                      value={requestSearchTerm}
                      onChange={(e) => setRequestSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-sm border-0 focus:ring-0 focus:border-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                <SelectItem value="none">None</SelectItem>
                {filteredAssetRequests.length > 0 ? (
                  filteredAssetRequests.map((request) => (
                    <SelectItem key={request.id} value={request.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>{request.request_reference_code}</span>
                        <span className="text-gray-500 text-xs">
                          ({request.asset.asset_name})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    {requestSearchTerm ? "No asset requests found" : "No asset requests available"}
                  </div>
                )}
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
            disabled={isSubmitting || !formData.asset || !formData.allocated_to || !selectedInstitution}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? "Creating..." : "Create Allocation"}
          </Button>
        </div>
      </div>
    </div>
  );
};
