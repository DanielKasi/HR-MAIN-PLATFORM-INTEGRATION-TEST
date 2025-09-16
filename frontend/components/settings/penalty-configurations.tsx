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
import {Plus, Edit, Trash2, X} from "lucide-react";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {penaltyConfigAPI, showErrorToast} from "@/lib/utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import type {
  IInstitutionPenaltyConfig,
  IInstitutionPenaltyConfigFormData,
} from "@/types/types.utils";
import FormatNumberInput from "@/components/format-number-input";
import {ConfirmationDialog} from "../confirmation-dialog";

export const PenaltyConfigurations = () => {
  const institution = useSelector(selectSelectedInstitution);

  const [isLoading, setIsLoading] = useState(false);
  const [isPenaltyFormOpen, setIsPenaltyFormOpen] = useState(false);
  const [editingPenaltyConfig, setEditingPenaltyConfig] =
    useState<IInstitutionPenaltyConfig | null>(null);
  const [penaltyConfigurationToDelete, setPenaltyConfigurationToDelete] =
    useState<IInstitutionPenaltyConfig | null>(null);
  const [penaltySearchTerm, setPenaltySearchTerm] = useState("");
  const [penaltyTypeFilter, setPenaltyTypeFilter] = useState("all");
  const [penaltyFormData, setPenaltyFormData] = useState<IInstitutionPenaltyConfigFormData>({
    penalty_type: "",
    penalty_value_type: "",
    penalty_value: 0,
    percentage: 0,
    institution: institution?.id || 0,
  });

  const institutionPenaltyRefreshRef = useRef<(() => void) | null>(null);

  // Penalty Configuration helper functions
  const handlePenaltyInputChange = (
    field: keyof IInstitutionPenaltyConfigFormData,
    value: string | number,
  ) => {
    setPenaltyFormData((prev) => ({...prev, [field]: value}));
  };

  const resetPenaltyForm = () => {
    setPenaltyFormData({
      penalty_type: "",
      penalty_value_type: "",
      penalty_value: 0,
      percentage: 0,
      institution: institution?.id || 0,
    });
    setEditingPenaltyConfig(null);
    setIsPenaltyFormOpen(false);
  };

  const handleCreatePenaltyConfig = () => {
    resetPenaltyForm();
    setIsPenaltyFormOpen(true);
  };

  const handleEditPenaltyConfig = (config: IInstitutionPenaltyConfig) => {
    setPenaltyFormData({
      penalty_type: config.penalty_type,
      penalty_value_type: config.penalty_value_type,
      penalty_value: config.penalty_value,
      percentage: config.percentage || 0,
      institution: institution?.id || 0,
    });
    setEditingPenaltyConfig(config);
    setIsPenaltyFormOpen(true);
  };

  const handleSavePenaltyConfig = async () => {
    if (!institution?.id) return;

    setIsLoading(true);
    try {
      if (editingPenaltyConfig) {
        await penaltyConfigAPI.updateInstitutionPenaltyConfig(
          editingPenaltyConfig.id,
          penaltyFormData,
        );
        toast.success("Penalty configuration updated successfully");
      } else {
        await penaltyConfigAPI.createInstitutionPenaltyConfig(penaltyFormData);
        toast.success("Penalty configuration created successfully");
      }
      resetPenaltyForm();
      // Trigger table refresh
      institutionPenaltyRefreshRef.current?.();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to save penalty configuration"});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePenaltyConfig = async (config: IInstitutionPenaltyConfig) => {
    if (penaltyConfigurationToDelete) {
      try {
        await penaltyConfigAPI.deleteInstitutionPenaltyConfig(config.id);
        toast.success("Penalty configuration deleted successfully");
        // Trigger table refresh
        institutionPenaltyRefreshRef.current?.();
      } catch (error) {
        showErrorToast({error, defaultMessage: "Failed to delete penalty configuration"});
      }
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

  const formatPenaltyValue = (config: IInstitutionPenaltyConfig) => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Penalty Configurations</h2>
        <Button
          onClick={handleCreatePenaltyConfig}
          className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Penalty</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Icon
            icon="hugeicons:search-01"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5"
          />
          <Input
            placeholder="Search penalty types"
            value={penaltySearchTerm}
            onChange={(e) => setPenaltySearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={penaltyTypeFilter} onValueChange={setPenaltyTypeFilter}>
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

      {/* Penalty Configurations Table */}
      <div className="">
        <PaginatedTableWrapper<IInstitutionPenaltyConfig>
          fetchFirstPage={async () => {
            if (!institution) throw new Error("No institution selected");
            return await penaltyConfigAPI.getInstitutionPenaltyConfigs({
              institutionId: institution.id,
              page: 1,
              search: penaltySearchTerm || undefined,
              penalty_type: penaltyTypeFilter !== "all" ? penaltyTypeFilter : undefined,
            });
          }}
          fetchFromUrl={penaltyConfigAPI.getInstitutionPenaltyConfigsFromUrl}
          deps={[institution?.id, penaltySearchTerm, penaltyTypeFilter]}
          className="space-y-4"
          footerClassName="pt-4"
        >
          {({data, loading, refresh}) => {
            if (refresh && institutionPenaltyRefreshRef.current !== refresh) {
              institutionPenaltyRefreshRef.current = refresh;
            }

            if (loading) {
              return <TableSkeleton rows={5} columns={4} />;
            }

            if (!data || data.results.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  {penaltySearchTerm
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
                                  <DropdownMenuItem onClick={() => handleEditPenaltyConfig(config)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePenaltyConfig(config)}
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

      {/* Penalty Configuration Form Modal */}
      {isPenaltyFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingPenaltyConfig ? "Edit Penalty Configuration" : "Add Penalty Configuration"}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={resetPenaltyForm}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-900" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="penalty_type">Penalty Type</Label>
                <Select
                  value={penaltyFormData.penalty_type}
                  onValueChange={(value) => handlePenaltyInputChange("penalty_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select penalty type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="late_coming">Late Coming</SelectItem>
                    <SelectItem value="early_leaving">Early Checkout</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="no_response_spotcheck">No Response for Spotcheck</SelectItem>
                    <SelectItem value="late_spotcheck_response">Late Spotcheck Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="penalty_value_type">Value Type</Label>
                <Select
                  value={penaltyFormData.penalty_value_type}
                  onValueChange={(value) => handlePenaltyInputChange("penalty_value_type", value)}
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

              {penaltyFormData.penalty_value_type === "fixed" ? (
                <div>
                  <Label htmlFor="penalty_value">Penalty Amount</Label>
                  <FormatNumberInput
                    id="penalty_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter penalty amount"
                    value={
                      penaltyFormData.penalty_value === 0
                        ? ""
                        : penaltyFormData.penalty_value.toString()
                    }
                    onChange={(formatted, numeric) =>
                      handlePenaltyInputChange("penalty_value", numeric)
                    }
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="percentage">Percentage (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={penaltyFormData.percentage || ""}
                    onChange={(e) =>
                      handlePenaltyInputChange("percentage", Number.parseFloat(e.target.value) || 0)
                    }
                    placeholder="Enter percentage"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={handleSavePenaltyConfig}
                disabled={isLoading}
                className="rounded-full w-full"
              >
                {isLoading ? "Saving..." : editingPenaltyConfig ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {penaltyConfigurationToDelete && (
        <ConfirmationDialog
          description="Are you sure you want to delete this penalty configuration ? This action cannot be undone."
          isOpen={!!penaltyConfigurationToDelete}
          title={`Delete penalty configuratio ${penaltyConfigurationToDelete.penalty_type}?`}
          onConfirm={() => handleDeletePenaltyConfig(penaltyConfigurationToDelete)}
          onClose={() => {
            setPenaltyConfigurationToDelete(null);
          }}
        />
      )}
    </div>
  );
};
