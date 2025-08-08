"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Users,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ILeavePolicyResponse, ILeavePolicyFormData, ILeaveType, IInstitution } from "@/types/types.utils";
import { createLeavePolicy, getLeavePolicies, updateLeavePolicy, deleteLeavePolicy, getLeaveTypes } from "@/lib/utils";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { PERMISSION_CODES } from "@/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent";
import { IUserInstitution } from "@/types";
import { TableSkeleton } from "@/components/common/table-skeleton";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

type LeavePolicy = ILeavePolicyResponse & {
  leave_type: ILeaveType;
};

// Color utilities
const getStatusColor = (status: boolean) => {
  return status
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const getCategoryColor = (category: string) => {
  const colors = {
    annual: "bg-blue-100 text-blue-800 border-blue-200",
    sick: "bg-red-100 text-red-800 border-red-200",
    maternity: "bg-pink-100 text-pink-800 border-pink-200",
    paternity: "bg-indigo-100 text-indigo-800 border-indigo-200",
    study: "bg-purple-100 text-purple-800 border-purple-200",
    compassionate: "bg-green-100 text-green-800 border-green-200",
    unpaid: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getApprovalColor = (requiresApproval: boolean) => {
  return requiresApproval
    ? "bg-orange-100 text-orange-800 border-orange-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const LeavePolicyComponent = () => {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<LeavePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leave_type: "",
    min_notice_days: "",
    max_consecutive_days: "",
    requires_manager_approval: true,
    requires_hr_approval: false,
    applicable_after_probation_months: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      leave_type: "",
      min_notice_days: "",
      max_consecutive_days: "",
      requires_manager_approval: true,
      requires_hr_approval: false,
      applicable_after_probation_months: "",
    });
  };

  const getSelectedLeaveType = () => {
    if (!formData.leave_type) return null;
    return leaveTypes.find((type) => type.id.toString() === formData.leave_type);
  };

  const getMaxDaysValidation = () => {
    const selectedLeaveType = getSelectedLeaveType();
    if (!selectedLeaveType || !formData.max_consecutive_days) return null;

    const maxConsecutive = parseInt(formData.max_consecutive_days);
    const maxPerYear = selectedLeaveType.max_days_per_year;

    if (maxConsecutive > maxPerYear) {
      return {
        type: "error",
        message: `Cannot exceed ${maxPerYear} days (max days per year for ${selectedLeaveType.name})`,
      };
    } else if (maxConsecutive === maxPerYear) {
      return {
        type: "warning",
        message: `You've set the maximum allowed days for ${selectedLeaveType.name}`,
      };
    }

    return null;
  };

  const fetchData = useCallback(
    async (showRefreshLoader = false) => {
      if (selectedInstitution?.id === undefined) {
        setPolicies([]);
        setLeaveTypes([]);
        return;
      }

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const [policiesData, leaveTypesData] = await Promise.all([
          getLeavePolicies({ institutionId: selectedInstitution.id }),
          getLeaveTypes({ institutionId: selectedInstitution.id }),
        ]);

        const activePolicies = policiesData.filter(
          (policy) => policy.is_active !== false && policy.id != null
        );
        setPolicies(activePolicies as LeavePolicy[]);

        const activeLeaveTypes = leaveTypesData.filter((type) => type.is_active !== false);
        setLeaveTypes(activeLeaveTypes);

        if (!policiesData.length || !leaveTypesData.length) {
          console.log("No policies or leave types found for this institution");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
        setPolicies([]);
        setLeaveTypes([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedInstitution?.id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPolicy = async () => {
    if (
      !formData.name ||
      !formData.description ||
      !formData.leave_type ||
      !formData.min_notice_days ||
      !formData.applicable_after_probation_months
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validation = getMaxDaysValidation();
    if (validation?.type === "error") {
      toast.error(validation.message);
      return;
    }

    if (!selectedInstitution) {
      toast.error("No institution selected");
      return;
    }

    setIsSubmitting(true);
    try {
      const policyData: ILeavePolicyFormData = {
        name: formData.name,
        description: formData.description,
        leave_type: parseInt(formData.leave_type),
        min_notice_days: parseInt(formData.min_notice_days),
        max_consecutive_days: formData.max_consecutive_days ? parseInt(formData.max_consecutive_days) : 0,
        requires_manager_approval: formData.requires_manager_approval,
        requires_hr_approval: formData.requires_hr_approval,
        applicable_after_probation_months: parseInt(formData.applicable_after_probation_months),
        is_active: true,
      };

      const newPolicy = await createLeavePolicy({
        institutionId: selectedInstitution.id,
        leavePolicyData: policyData,
      });

      if (newPolicy) {
        const selectedLeaveType = leaveTypes.find((lt) => lt.id.toString() === formData.leave_type);
        const policyWithLeaveType = {
          ...newPolicy,
          leave_type: {
            id: selectedLeaveType?.id || formData.leave_type,
            name: selectedLeaveType?.name || "",
            category: selectedLeaveType?.category || "",
            max_days_per_year: selectedLeaveType?.max_days_per_year || 0,
          },
        };

        setPolicies([policyWithLeaveType as LeavePolicy, ...policies]);
        clearFilters();
        toast.success("Leave policy created successfully");
        resetForm();
        setIsAddDialogOpen(false);
      } else {
        toast.error("Failed to create leave policy");
      }
    } catch (error: any) {
      console.error("Error creating leave policy:", error);
      toast.error(error.message || "An error occurred while creating the leave policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy) return;

    if (
      !formData.name ||
      !formData.description ||
      !formData.leave_type ||
      !formData.min_notice_days ||
      !formData.applicable_after_probation_months
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validation = getMaxDaysValidation();
    if (validation?.type === "error") {
      toast.error(validation.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const policyData: ILeavePolicyFormData = {
        name: formData.name,
        description: formData.description,
        leave_type: parseInt(formData.leave_type),
        min_notice_days: parseInt(formData.min_notice_days),
        max_consecutive_days: formData.max_consecutive_days ? parseInt(formData.max_consecutive_days) : 0,
        requires_manager_approval: formData.requires_manager_approval,
        requires_hr_approval: formData.requires_hr_approval,
        applicable_after_probation_months: parseInt(formData.applicable_after_probation_months),
        is_active: true,
      };

      const updatedPolicy = await updateLeavePolicy({
        leavePolicyId: editingPolicy.id,
        leavePolicyData: policyData,
      });

      if (updatedPolicy) {
        const selectedLeaveType = leaveTypes.find((lt) => lt.id.toString() === formData.leave_type);
        const policyWithLeaveType = {
          ...updatedPolicy,
          leave_type: {
            id: selectedLeaveType?.id || formData.leave_type,
            name: selectedLeaveType?.name || "",
            category: selectedLeaveType?.category || "",
            max_days_per_year: selectedLeaveType?.max_days_per_year || 0,
          },
        };

        const updatedPolicies = policies.map((policy) =>
          policy.id === editingPolicy.id ? (policyWithLeaveType as LeavePolicy) : policy
        );
        setPolicies(updatedPolicies);
        clearFilters();
        toast.success("Leave policy updated successfully");
        resetForm();
        setIsEditDialogOpen(false);
        setEditingPolicy(null);
      } else {
        toast.error("Failed to update leave policy");
      }
    } catch (error: any) {
      console.error("Error updating leave policy:", error);
      toast.error(error.message || "An error occurred while updating the leave policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePolicy = async () => {
    if (!deletingPolicy) return;

    setIsSubmitting(true);
    try {
      const success = await deleteLeavePolicy({
        leavePolicyId: deletingPolicy.id,
      });

      if (success) {
        setPolicies(policies.filter((policy) => policy.id !== deletingPolicy.id));
        toast.success("Leave policy deleted successfully");
        setIsDeleteDialogOpen(false);
        setDeletingPolicy(null);
      } else {
        toast.error("Failed to delete leave policy");
      }
    } catch (error: any) {
      console.error("Error deleting leave policy:", error);
      toast.error(error.message || "An error occurred while deleting the leave policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPolicy = (policy: LeavePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description,
      leave_type: policy.leave_type.id.toString(),
      min_notice_days: policy.min_notice_days.toString(),
      max_consecutive_days: policy.max_consecutive_days?.toString() || "",
      requires_manager_approval: policy.requires_manager_approval,
      requires_hr_approval: policy.requires_hr_approval,
      applicable_after_probation_months: policy.applicable_after_probation_months.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const togglePolicyStatus = async (policy: LeavePolicy) => {
    try {
      const policyData: ILeavePolicyFormData = {
        name: policy.name,
        description: policy.description,
        leave_type: parseInt(policy.leave_type.id.toString()),
        min_notice_days: policy.min_notice_days,
        max_consecutive_days: policy.max_consecutive_days || 0,
        requires_manager_approval: policy.requires_manager_approval,
        requires_hr_approval: policy.requires_hr_approval,
        applicable_after_probation_months: policy.applicable_after_probation_months,
        is_active: !policy.is_active,
      };

      const updatedPolicy = await updateLeavePolicy({
        leavePolicyId: policy.id,
        leavePolicyData: policyData,
      });

      if (updatedPolicy) {
        const updatedPolicies = policies.map((p) =>
          p.id === policy.id ? { ...p, is_active: !p.is_active } : p
        );
        setPolicies(updatedPolicies);
        toast.success(`Policy ${!policy.is_active ? "activated" : "deactivated"} successfully`);
      } else {
        toast.error("Failed to update policy status");
      }
    } catch (error: any) {
      console.error("Error toggling policy status:", error);
      toast.error(error.message || "An error occurred while updating the policy status");
    }
  };

  const handleRefresh = () => {
    fetchData(true);
    setCurrentPage(1);
  };

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          policy.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          policy.leave_type.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && policy.is_active) ||
        (statusFilter === "inactive" && !policy.is_active);

      const matchesCategory =
        categoryFilter === "all" || policy.leave_type.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [policies, searchTerm, statusFilter, categoryFilter]);

  const activePolicies = useMemo(
    () => policies.filter((p) => p.is_active),
    [policies]
  );

  const hrApprovalPolicies = useMemo(
    () => policies.filter((p) => p.requires_hr_approval),
    [policies]
  );

  const managerApprovalPolicies = useMemo(
    () => policies.filter((p) => p.requires_manager_approval),
    [policies]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  const paginatedPolicies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredPolicies.slice(start, end);
  }, [filteredPolicies, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPolicies.length / pageSize);

  const renderMaxConsecutiveDaysField = (isEdit = false) => {
    const selectedLeaveType = getSelectedLeaveType();
    const validation = getMaxDaysValidation();
    const fieldId = isEdit ? "edit-max_consecutive_days" : "max_consecutive_days";

    return (
      <div className="space-y-3">
        <Label htmlFor={fieldId} className="text-sm font-semibold text-gray-800">
          Max Consecutive Days
        </Label>
        <Input
          id={fieldId}
          type="number"
          placeholder="Leave empty for no limit"
          value={formData.max_consecutive_days}
          onChange={(e) => setFormData({ ...formData, max_consecutive_days: e.target.value })}
          disabled={isSubmitting}
          className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
            validation?.type === "error" ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
          }`}
        />
        {selectedLeaveType && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium">
                {selectedLeaveType.name} Limit: {selectedLeaveType.max_days_per_year} days/year
              </p>
              <p className="text-blue-600">
                Max consecutive days cannot exceed the annual limit
              </p>
            </div>
          </div>
        )}
        {validation && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl ${
              validation.type === "error" ? "bg-red-50" : "bg-amber-50"
            }`}
          >
            {validation.type === "error" ? (
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <p
              className={`text-sm font-medium ${
                validation.type === "error" ? "text-red-800" : "text-amber-800"
              }`}
            >
              {validation.message}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading && !selectedInstitution?.id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Loading Institution Data</h3>
            <p className="text-gray-600">Please wait while we set up your workspace...</p>
          </div>
        </div>
      </div>
    );
  }


    if (isLoading) {
      return (
        <div className="p-2 space-y-6">
          <Card className="h-[calc(100vh-2rem)] shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between gap-8 items-center">
                <div className="flex items-center justify-start gap-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardHeader>
            <TableSkeleton rows={10} columns={8} />
          </Card>
        </div>
      )
    }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Policies</h1>
          <p className="text-muted-foreground">
            Manage leave policies for {selectedInstitution?.institution_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Leave Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[980px] w-full rounded-2xl border-0 shadow-2xl overflow-y-auto max-h-[80vh]">

                <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
                  <DialogTitle className="text-2xl font-bold text-gray-900">Add Leave Policy</DialogTitle>
                  <DialogDescription className="text-gray-600 text-base">
                    Create a new leave policy to manage employee leave requests and approval workflows.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-800">Policy Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Annual Leave Policy"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="leave_type" className="text-sm font-semibold text-gray-800">Leave Type *</Label>
                    <Select
                      value={formData.leave_type}
                      onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} ({type.max_days_per_year} days/year)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-800">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder="Provide a detailed description of this leave policy..."
                      disabled={isSubmitting}
                      className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="min_notice_days" className="text-sm font-semibold text-gray-800">Minimum Notice Days *</Label>
                    <Input
                      id="min_notice_days"
                      type="number"
                      value={formData.min_notice_days}
                      onChange={(e) => setFormData({ ...formData, min_notice_days: e.target.value })}
                      placeholder="e.g., 7"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  {renderMaxConsecutiveDaysField()}
                  <div className="space-y-3">
                    <Label htmlFor="applicable_after_probation_months" className="text-sm font-semibold text-gray-800">
                      Applicable After Probation (Months) *
                    </Label>
                    <Input
                      id="applicable_after_probation_months"
                      type="number"
                      value={formData.applicable_after_probation_months}
                      onChange={(e) => setFormData({ ...formData, applicable_after_probation_months: e.target.value })}
                      placeholder="e.g., 3"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4 md:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Approval Requirements</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="requires_manager_approval"
                          checked={formData.requires_manager_approval}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              requires_manager_approval: e.target.checked,
                            })
                          }
                          disabled={isSubmitting}
                          className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                        />
                        <Label htmlFor="requires_manager_approval" className="text-sm font-medium text-gray-700">
                          Requires Manager Approval
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="requires_hr_approval"
                          checked={formData.requires_hr_approval}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              requires_hr_approval: e.target.checked,
                            })
                          }
                          disabled={isSubmitting}
                          className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                        />
                        <Label htmlFor="requires_hr_approval" className="text-sm font-medium text-gray-700">
                          Requires HR Approval
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddPolicy}
                    disabled={isSubmitting}
                    
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Leave Policy"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </ProtectedComponent>
        </div>
      </div>

         {/* Stats Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{policies.length}</div>
              <p className="text-xs text-muted-foreground">Total Policies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{activePolicies.length}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{managerApprovalPolicies.length}</div>
              <p className="text-xs text-muted-foreground">Manager Approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{hrApprovalPolicies.length}</div>
              <p className="text-xs text-muted-foreground">HR Approval</p>
            </CardContent>
          </Card>
        </div>
      )}


<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-12">
  {/* Left: Search Bar */}
  <div className="relative sm:w-[450px]">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <Input
      placeholder="Search leave policies..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10 h-10 text-sm w-full"
    />
  </div>

  {/* Center: Filters and Rows Per Page */}
  <div className="flex flex-wrap justify-center items-center gap-4 sm:ml-auto sm:mr-auto">
    {/* Status Filter */}
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[160px] h-10 text-sm px-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <SelectValue placeholder="Status" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>

    {/* Category Filter */}
    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
      <SelectTrigger className="w-[180px] h-10 text-sm px-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <SelectValue placeholder="Category" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {leaveTypes
          .map((type) => type.category)
          .filter((value, index, self) => self.indexOf(value) === index)
          .map((category) => (
            <SelectItem key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ")}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>

    {/* Rows per Page */}
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Rows per page:</span>
      <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
        <SelectTrigger className="w-[70px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
</div>


   
   
      {/* Leave Policies Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="p-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leave policies found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
              ? "No leave policies match your filter criteria."
              : "Get started by creating your first leave policy."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Min Notice</TableHead>
                <TableHead>Max Consecutive</TableHead>
                <TableHead>Probation</TableHead>
                <TableHead>Approvals</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPolicies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full ${
                          policy.is_active ? "bg-green-50" : "bg-gray-50"
                        } flex items-center justify-center`}
                      >
                        <Settings
                          className={`h-4 w-4 ${
                            policy.is_active ? "text-green-600" : "text-gray-600"
                          }`}
                        />
                      </div>
                      <span>{policy.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{policy.leave_type.name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(policy.leave_type.category)}>
                      {policy.leave_type.category.charAt(0).toUpperCase() +
                        policy.leave_type.category.slice(1).replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(policy.is_active)}>
                      {policy.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{policy.min_notice_days} days</TableCell>
                  <TableCell>{policy.max_consecutive_days ? `${policy.max_consecutive_days} days` : "No limit"}</TableCell>
                  <TableCell>{policy.applicable_after_probation_months} months</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Badge className={getApprovalColor(policy.requires_manager_approval)}>
                        {policy.requires_manager_approval ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Manager
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Manager
                          </>
                        )}
                      </Badge>
                      <Badge className={getApprovalColor(policy.requires_hr_approval)}>
                        {policy.requires_hr_approval ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            HR
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            HR
                          </>
                        )}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(policy.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPolicy(policy)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePolicyStatus(policy)}>
                            <Users className="h-4 w-4 mr-2" />
                            {policy.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDeletingPolicy(policy);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ProtectedComponent>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Clear Filters Button */}
      {(searchTerm || statusFilter !== "all" || categoryFilter !== "all") && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            Clear Filters
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredPolicies.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredPolicies.length)} of {filteredPolicies.length} leave policies
          {(searchTerm || statusFilter !== "all" || categoryFilter !== "all") &&
            ` (filtered from ${policies.length} total)`}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Select
            value={currentPage.toString()}
            onValueChange={(value) => handlePageChange(parseInt(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <SelectItem key={page} value={page.toString()}>
                  {page}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingPolicy(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[980px] w-full rounded-2xl border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
              <DialogTitle className="text-2xl font-bold text-gray-900">Edit Leave Policy</DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                Make changes to the existing leave policy configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              <div className="space-y-3">
                <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-800">Policy Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Leave Policy"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-leave_type" className="text-sm font-semibold text-gray-800">Leave Type *</Label>
                <Select
                  value={formData.leave_type}
                  onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} ({type.max_days_per_year} days/year)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-800">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Provide a detailed description of this leave policy..."
                  disabled={isSubmitting}
                  className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base resize-none"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-min_notice_days" className="text-sm font-semibold text-gray-800">Minimum Notice Days *</Label>
                <Input
                  id="edit-min_notice_days"
                  type="number"
                  value={formData.min_notice_days}
                  onChange={(e) => setFormData({ ...formData, min_notice_days: e.target.value })}
                  placeholder="e.g., 7"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                />
              </div>
              {renderMaxConsecutiveDaysField(true)}
              <div className="space-y-3">
                <Label htmlFor="edit-applicable_after_probation_months" className="text-sm font-semibold text-gray-800">
                  Applicable After Probation (Months) *
                </Label>
                <Input
                  id="edit-applicable_after_probation_months"
                  type="number"
                  value={formData.applicable_after_probation_months}
                  onChange={(e) => setFormData({ ...formData, applicable_after_probation_months: e.target.value })}
                  placeholder="e.g., 3"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-4 md:col-span-2">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Approval Requirements</h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="edit-requires_manager_approval"
                      checked={formData.requires_manager_approval}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requires_manager_approval: e.target.checked,
                        })
                      }
                      disabled={isSubmitting}
                      className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                    />
                    <Label htmlFor="edit-requires_manager_approval" className="text-sm font-medium text-gray-700">
                      Requires Manager Approval
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="edit-requires_hr_approval"
                      checked={formData.requires_hr_approval}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requires_hr_approval: e.target.checked,
                        })
                      }
                      disabled={isSubmitting}
                      className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                    />
                    <Label htmlFor="edit-requires_hr_approval" className="text-sm font-medium text-gray-700">
                      Requires HR Approval
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePolicy}
                disabled={isSubmitting}
                >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Leave Policy"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ProtectedComponent>

      {/* Delete Confirmation Dialog */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) {
              setDeletingPolicy(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
            <DialogHeader className="space-y-4 pb-6">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900 text-center">Delete Leave Policy</DialogTitle>
              <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">"{deletingPolicy?.name}"</span>? This action cannot be
                undone and will permanently remove this leave policy from your system.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePolicy}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ProtectedComponent>
    </div>
  );
};

export default LeavePolicyComponent;
