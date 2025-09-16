"use client";

import {useState, useEffect, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Icon} from "@iconify/react";
import {toast} from "sonner";
import {Plus, Edit, Trash2} from "lucide-react";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {penaltyConfigAPI, showErrorToast} from "@/lib/utils";
import {useSelector} from "react-redux";
import type {IBranchPenaltyConfig, IBranchPenaltyConfigFormData} from "@/types/types.utils";
import {selectSelectedInstitution, selectSelectedBranch} from "@/store/auth/selectors";
import FormatNumberInput from "@/components/format-number-input";
import {ConfirmationDialog} from "../confirmation-dialog";

export const BranchPenaltyConfigurations = () => {
  const institution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  const [isLoading, setIsLoading] = useState(false);
  const [isBranchPenaltyFormOpen, setIsBranchPenaltyFormOpen] = useState(false);
  const [editingBranchPenaltyConfig, setEditingBranchPenaltyConfig] =
    useState<IBranchPenaltyConfig | null>(null);
  const [branchConfigurationToDelete, setBranchConfigurationToDelete] =
    useState<IBranchPenaltyConfig | null>(null);
  const [branchPenaltySearchTerm, setBranchPenaltySearchTerm] = useState("");
  const [branchPenaltyTypeFilter, setBranchPenaltyTypeFilter] = useState("all");
  const [branchPenaltyFormData, setBranchPenaltyFormData] = useState<IBranchPenaltyConfigFormData>({
    penalty_type: "",
    penalty_value_type: "",
    penalty_value: 0,
    percentage: 0,
    branch: selectedBranch?.id || 0,
  });

  const branchPenaltyRefreshRef = useRef<(() => void) | null>(null);

  // Branch Penalty Configuration helper functions
  const handleBranchPenaltyInputChange = (
    field: keyof IBranchPenaltyConfigFormData,
    value: string | number,
  ) => {
    setBranchPenaltyFormData((prev) => ({...prev, [field]: value}));
  };

  const resetBranchPenaltyForm = () => {
    setBranchPenaltyFormData({
      penalty_type: "",
      penalty_value_type: "",
      penalty_value: 0,
      percentage: 0,
      branch: selectedBranch?.id || 0,
    });
    setEditingBranchPenaltyConfig(null);
    setIsBranchPenaltyFormOpen(false);
  };

  const handleCreateBranchPenaltyConfig = () => {
    if (!selectedBranch?.id) {
      toast.error("Please select a branch first");
      return;
    }
    resetBranchPenaltyForm();
    setIsBranchPenaltyFormOpen(true);
  };

  const handleEditBranchPenaltyConfig = (config: IBranchPenaltyConfig) => {
    setBranchPenaltyFormData({
      penalty_type: config.penalty_type,
      penalty_value_type: config.penalty_value_type,
      penalty_value: config.penalty_value,
      percentage: config.percentage || 0,
      branch: config.branch,
    });
    setEditingBranchPenaltyConfig(config);
    setIsBranchPenaltyFormOpen(true);
  };

  const handleSaveBranchPenaltyConfig = async () => {
    if (!selectedBranch?.id) return;

    setIsLoading(true);
    try {
      if (editingBranchPenaltyConfig) {
        await penaltyConfigAPI.updateBranchPenaltyConfig(
          editingBranchPenaltyConfig.id,
          branchPenaltyFormData,
        );
        toast.success("Branch penalty configuration updated successfully");
      } else {
        await penaltyConfigAPI.createBranchPenaltyConfig(branchPenaltyFormData);
        toast.success("Branch penalty configuration created successfully");
      }
      resetBranchPenaltyForm();
      // Trigger table refresh
      branchPenaltyRefreshRef.current?.();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to save branch penalty configuration"});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranchPenaltyConfig = async (config: IBranchPenaltyConfig) => {
    if (!branchConfigurationToDelete) {
      return;
    }
    try {
      await penaltyConfigAPI.deleteBranchPenaltyConfig(config.id);
      toast.success("Branch penalty configuration deleted successfully");
      // Trigger table refresh
      branchPenaltyRefreshRef.current?.();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to delete branch penalty configuration"});
    }
  };

  const getPenaltyTypeLabel = (type: string) => {
    const types: {[key: string]: string} = {
      late_coming: "Late Coming",
      early_leaving: "Early Checkout",
      absent: "Absent",
      no_response_spotcheck: "No Response for Spotcheck",
      late_spotcheck_response: "Late Spotcheck Response",
    };
    return types[type] || type;
  };

  const getPenaltyTypeDisplay = (type: string) => {
    return getPenaltyTypeLabel(type);
  };

  const getPenaltyValueTypeDisplay = (type: string) => {
    return type === "fixed" ? "Fixed Amount" : "Percentage";
  };

  const formatPenaltyValue = (config: IBranchPenaltyConfig) => {
    if (config.penalty_value_type === "fixed") {
      let value: number;

      if (typeof config.penalty_value === "string") {
        value = parseFloat(config.penalty_value);
      } else if (typeof config.penalty_value === "number") {
        value = config.penalty_value;
      } else {
        return "N/A";
      }

      if (isNaN(value)) {
        return "N/A";
      }

      return `$${value.toFixed(2)}`;
    } else if (config.penalty_value_type === "percentage") {
      let percentage: number;

      if (typeof config.percentage === "string") {
        percentage = parseFloat(config.percentage);
      } else if (typeof config.percentage === "number") {
        percentage = config.percentage;
      } else {
        return "N/A";
      }

      if (isNaN(percentage)) {
        return "N/A";
      }

      return `${percentage}%`;
    }
    return "N/A";
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Branch Penalty Configurations</h2>
          <Button
            onClick={handleCreateBranchPenaltyConfig}
            className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
            disabled={!selectedBranch?.id}
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch Penalty</span>
          </Button>
        </div>

        {/* Branch Info */}
        {selectedBranch && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Icon icon="hugeicons:info-circle" className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">Selected Branch</h3>
                <p className="text-sm text-blue-700">
                  Managing penalty configuration for: <strong>{selectedBranch.branch_name}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        {selectedBranch?.id && (
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Icon
                icon="hugeicons:search-01"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5"
              />
              <Input
                placeholder="Search penalty types"
                value={branchPenaltySearchTerm}
                onChange={(e) => setBranchPenaltySearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={branchPenaltyTypeFilter} onValueChange={setBranchPenaltyTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="late_coming">Late Coming</SelectItem>
                <SelectItem value="early_leaving">Early Checkout</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="no_response_spotcheck">No Response for Spotcheck</SelectItem>
                <SelectItem value="late_spotcheck_response">Late Spotcheck Response</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Branch Penalty Configurations Table */}
        {selectedBranch?.id && (
          <div className="">
            <PaginatedTableWrapper<IBranchPenaltyConfig>
              fetchFirstPage={async () => {
                if (!selectedBranch?.id) throw new Error("No branch selected");
                return await penaltyConfigAPI.getBranchPenaltyConfigs({
                  branchId: selectedBranch.id,
                  page: 1,
                  search: branchPenaltySearchTerm || undefined,
                  penalty_type:
                    branchPenaltyTypeFilter !== "all" ? branchPenaltyTypeFilter : undefined,
                });
              }}
              fetchFromUrl={penaltyConfigAPI.getBranchPenaltyConfigsFromUrl}
              deps={[selectedBranch?.id, branchPenaltySearchTerm, branchPenaltyTypeFilter]}
              className="space-y-4"
              footerClassName="pt-4"
            >
              {({data, loading, refresh}) => {
                if (refresh && branchPenaltyRefreshRef.current !== refresh) {
                  branchPenaltyRefreshRef.current = refresh;
                }

                if (loading) {
                  return <TableSkeleton rows={5} columns={4} />;
                }

                if (!data || data.results.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      {branchPenaltySearchTerm
                        ? "No penalty configurations found matching your search criteria"
                        : "No penalty configurations found"}
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-3 text-xs sm:text-sm font-medium">
                                Penalty Type
                              </TableHead>
                              <TableHead className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-3 text-xs sm:text-sm font-medium">
                                Value Type
                              </TableHead>
                              <TableHead className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-3 text-xs sm:text-sm font-medium">
                                Penalty Value
                              </TableHead>
                              <TableHead className="w-12 sm:w-16 md:w-24 px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-3 text-xs sm:text-sm font-medium">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.results.map((config) => (
                              <TableRow key={config.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-4 text-xs sm:text-sm">
                                  {getPenaltyTypeDisplay(config.penalty_type)}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-4">
                                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                                    {getPenaltyValueTypeDisplay(config.penalty_value_type)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-4 text-xs sm:text-sm">
                                  {formatPenaltyValue(config)}
                                </TableCell>
                                <TableCell className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Icon
                                          icon="hugeicons:more-horizontal-square-01"
                                          className="!h-4 !w-4 text-dark"
                                        />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleEditBranchPenaltyConfig(config)}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteBranchPenaltyConfig(config)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                );
              }}
            </PaginatedTableWrapper>
          </div>
        )}

        {/* Branch Penalty Configuration Form Modal */}
        {isBranchPenaltyFormOpen && selectedBranch?.id && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingBranchPenaltyConfig
                    ? "Edit Branch Penalty Configuration"
                    : "Add Branch Penalty Configuration"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetBranchPenaltyForm}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <Icon icon="hugeicons:close-01" className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="branch_penalty_type">Penalty Type</Label>
                  <Select
                    value={branchPenaltyFormData.penalty_type}
                    onValueChange={(value) => handleBranchPenaltyInputChange("penalty_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select penalty type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="late_coming">Late Coming</SelectItem>
                      <SelectItem value="early_leaving">Early Checkout</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="no_response_spotcheck">
                        No Response for Spotcheck
                      </SelectItem>
                      <SelectItem value="late_spotcheck_response">
                        Late Spotcheck Response
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="branch_penalty_value_type">Value Type</Label>
                  <Select
                    value={branchPenaltyFormData.penalty_value_type}
                    onValueChange={(value) =>
                      handleBranchPenaltyInputChange("penalty_value_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select value type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage of Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {branchPenaltyFormData.penalty_value_type === "fixed" ? (
                  <div>
                    <Label htmlFor="branch_penalty_value">Penalty Amount</Label>
                    <FormatNumberInput
                      id="branch_penalty_value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter penalty amount"
                      value={
                        branchPenaltyFormData.penalty_value === 0
                          ? ""
                          : branchPenaltyFormData.penalty_value.toString()
                      }
                      onChange={(formatted, numeric) =>
                        handleBranchPenaltyInputChange("penalty_value", numeric)
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="branch_percentage">Percentage (%)</Label>
                    <Input
                      id="branch_percentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={branchPenaltyFormData.percentage || ""}
                      onChange={(e) =>
                        handleBranchPenaltyInputChange(
                          "percentage",
                          Number.parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="Enter percentage"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={resetBranchPenaltyForm}
                  disabled={isLoading}
                  className="flex-1 rounded-full bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBranchPenaltyConfig}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary text-white flex-1 rounded-full"
                >
                  {isLoading ? "Saving..." : editingBranchPenaltyConfig ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {branchConfigurationToDelete && (
        <ConfirmationDialog
          description="Are you sure you want to delete this branch penalty configuration ? This action cannot be undone."
          isOpen={!!branchConfigurationToDelete}
          title={`Delete branch penalty configuration ${branchConfigurationToDelete.penalty_type}?`}
          onConfirm={() => handleDeleteBranchPenaltyConfig(branchConfigurationToDelete)}
          onClose={() => {
            setBranchConfigurationToDelete(null);
          }}
        />
      )}
    </>
  );
};
