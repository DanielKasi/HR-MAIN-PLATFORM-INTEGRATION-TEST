"use client";

import {useState, useEffect} from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Icon} from "@iconify/react";
import {toast} from "sonner";
import {Plus, Edit, Trash2, Settings} from "lucide-react";
import {spotcheckAPI, showErrorToast} from "@/lib/utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution, selectSelectedBranch} from "@/store/auth/selectors";
import type {IBranchSpotCheckSetting, IBranchSpotCheckSettingFormData} from "@/types/types.utils";
import {SpotcheckConfigModal} from "./spotcheck-config-modal";
import {ConfirmationDialog} from "../confirmation-dialog";

export const BranchSpotcheckConfigurations = () => {
  const selectedBranch = useSelector(selectSelectedBranch);

  const [branchSpotcheckSettings, setBranchSpotcheckSettings] = useState<IBranchSpotCheckSetting[]>(
    [],
  );
  const [branchSpotcheckFormData, setBranchSpotcheckFormData] =
    useState<IBranchSpotCheckSettingFormData>({
      lower_threshold: 0,
      upper_threshold: 0,
      expires_after_minutes: 0,
      late_starts_after_minutes: 0,
      branch: 0,
    });
  const [isBranchSpotcheckFormOpen, setIsBranchSpotcheckFormOpen] = useState(false);
  const [editingBranchSpotcheckSetting, setEditingBranchSpotcheckSetting] =
    useState<IBranchSpotCheckSetting | null>(null);
  const [spotcheckConfigurationToDelete, setSpotcheckConfigurationToDelete] =
    useState<IBranchSpotCheckSetting | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Branch Spotcheck Configuration helper functions
  const handleBranchSpotcheckInputChange = (
    field: keyof IBranchSpotCheckSettingFormData,
    value: number,
  ) => {
    setBranchSpotcheckFormData((prev) => ({...prev, [field]: value}));
  };

  const resetBranchSpotcheckForm = () => {
    setBranchSpotcheckFormData({
      lower_threshold: 0,
      upper_threshold: 0,
      expires_after_minutes: 0,
      late_starts_after_minutes: 0,
      branch: selectedBranch?.id || 0,
    });
    setEditingBranchSpotcheckSetting(null);
    setIsBranchSpotcheckFormOpen(false);
  };

  const handleCreateBranchSpotcheckConfig = () => {
    if (!selectedBranch?.id) {
      toast.error("Please select a branch first");
      return;
    }
    resetBranchSpotcheckForm();
    setIsBranchSpotcheckFormOpen(true);
  };

  const handleEditBranchSpotcheckConfig = (setting: IBranchSpotCheckSetting) => {
    setBranchSpotcheckFormData({
      lower_threshold: setting.lower_threshold,
      upper_threshold: setting.upper_threshold,
      expires_after_minutes: setting.expires_after_minutes,
      late_starts_after_minutes: setting.late_starts_after_minutes,
      branch: setting.branch.id,
    });
    setEditingBranchSpotcheckSetting(setting);
    setIsBranchSpotcheckFormOpen(true);
  };

  const handleSaveBranchSpotcheckConfig = async () => {
    if (!selectedBranch?.id) return;

    setIsLoading(true);
    try {
      if (editingBranchSpotcheckSetting) {
        await spotcheckAPI.CONFIGS.BRANCH.update({
          branchId: selectedBranch.id,
          data: branchSpotcheckFormData,
        });
        toast.success("Branch spotcheck configuration updated successfully");
      } else {
        await spotcheckAPI.CONFIGS.BRANCH.create({
          branchId: selectedBranch.id,
          data: branchSpotcheckFormData,
        });
        toast.success("Branch spotcheck configuration created successfully");
      }
      resetBranchSpotcheckForm();
      // Refresh branch spotcheck settings
      await fetchBranchSpotcheckSettings();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to save branch spotcheck configuration"});
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranchSpotcheckSettings = async () => {
    if (!selectedBranch?.id) return;
    try {
      const setting = await spotcheckAPI.CONFIGS.BRANCH.getByBranch({branchId: selectedBranch.id});
      setBranchSpotcheckSettings(setting ? [setting] : []);
    } catch (error) {
      // Branch doesn't have a setting yet, set empty array
      setBranchSpotcheckSettings([]);
    }
  };

  const handleDeleteBranchSpotcheckConfig = async (setting: IBranchSpotCheckSetting) => {
    if (spotcheckConfigurationToDelete) {
      setIsLoading(true);
      try {
        // If delete endpoint exists, uncomment the line below:
        // await spotcheckAPI.CONFIGS.BRANCH.delete(setting.branch.id);
        setBranchSpotcheckSettings((prev) => prev.filter((s) => s.branch.id !== setting.branch.id));
        toast.success("Branch spotcheck configuration deleted successfully");
      } catch (error) {
        showErrorToast({error, defaultMessage: "Failed to delete branch spotcheck configuration"});
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchBranchSpotcheckSettings();
    }
  }, [selectedBranch?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Branch Spotcheck Configurations</h2>
        <Button
          onClick={handleCreateBranchSpotcheckConfig}
          className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
          disabled={!selectedBranch?.id}
        >
          <Plus className="w-4 h-4" />
          <span>Add Branch Configuration</span>
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
                Managing spotcheck configuration for: <strong>{selectedBranch.branch_name}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branch Spotcheck Configurations Table */}
      {selectedBranch?.id && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Lower Threshold</TableHead>
                    <TableHead>Upper Threshold</TableHead>
                    <TableHead>Expires After</TableHead>
                    <TableHead>Late Starts After</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchSpotcheckSettings.length > 0 ? (
                    branchSpotcheckSettings.map((setting) => (
                      <TableRow key={setting.branch.id}>
                        <TableCell className="font-medium">{setting.branch.branch_name}</TableCell>
                        <TableCell>{setting.lower_threshold}</TableCell>
                        <TableCell>{setting.upper_threshold}</TableCell>
                        <TableCell>{setting.expires_after_minutes} min</TableCell>
                        <TableCell>{setting.late_starts_after_minutes} min</TableCell>
                        <TableCell>
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
                                onClick={() => handleEditBranchSpotcheckConfig(setting)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteBranchSpotcheckConfig(setting)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No spotcheck configuration found for this branch. Click "Add Branch
                        Configuration" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Branch Spotcheck Configuration Form Modal */}
      <SpotcheckConfigModal
        isOpen={isBranchSpotcheckFormOpen && !!selectedBranch?.id}
        onClose={resetBranchSpotcheckForm}
        onSave={handleSaveBranchSpotcheckConfig}
        formData={branchSpotcheckFormData}
        onInputChange={handleBranchSpotcheckInputChange}
        isLoading={isLoading}
        isEditing={!!editingBranchSpotcheckSetting}
        title={
          editingBranchSpotcheckSetting
            ? "Edit Branch Spotcheck Configuration"
            : "Add Branch Spotcheck Configuration"
        }
      />
      {spotcheckConfigurationToDelete && (
        <ConfirmationDialog
          description="Are you sure you want to delete this branch spotcheck configuration ? This action cannot be undone."
          isOpen={!!spotcheckConfigurationToDelete}
          title={`Delete branch spotcheck configuration for branch ${spotcheckConfigurationToDelete.branch.branch_name}?`}
          onConfirm={() => handleDeleteBranchSpotcheckConfig(spotcheckConfigurationToDelete)}
          onClose={() => {
            setSpotcheckConfigurationToDelete(null);
          }}
        />
      )}
    </div>
  );
};
