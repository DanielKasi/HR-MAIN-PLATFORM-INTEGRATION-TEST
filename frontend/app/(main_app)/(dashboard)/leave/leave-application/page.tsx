"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  FileText,
  Download,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pause,
  Eye,
  Loader2,
  Info,
  AlertTriangle,
  Calendar,
  MoreVertical,
  ChevronDown,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  LeaveApplicationsAPI,
  getLeaveTypes,
  getPaginatedEmployees,
  getLeavePolicies,
} from "@/lib/utils";
import {
  ILeaveRequest,
  ILeaveRequestFormData,
  ILeaveType,
  ILeavePolicy,
  ILeaveBalance,
} from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";

import { useSelector } from "react-redux";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";
import { handleDownload, getFileUrl, getFileName } from "@/lib/helpers";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/types/types.utils";

const STATUS_CHOICES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const DURATION_TYPES = [
  { value: "full_day", label: "Full Day" },
  { value: "half_day_morning", label: "Half Day - Morning" },
  { value: "half_day_afternoon", label: "Half Day - Afternoon" },
  { value: "hourly", label: "Hourly" },
];

const LeaveApplicationComponent = () => {
  const [leavePolicies, setLeavePolicies] = useState<ILeavePolicy[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<ILeaveBalance[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<ILeaveRequest | null>(null);
  const [viewingApplication, setViewingApplication] = useState<ILeaveRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const refreshTableRef = useRef<(() => void) | null>(null);
  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Success handlers for CRUD operations
  const handleCreateSuccess = (newApplication: ILeaveRequest) => {
    toast.success("Leave application created successfully");
    refreshTableRef.current?.();
  };

  const handleUpdateSuccess = (updatedApplication: ILeaveRequest) => {
    toast.success("Leave application updated successfully");
    refreshTableRef.current?.();
  };

  const handleDeleteSuccess = () => {
    toast.success("Leave application deleted successfully");
    refreshTableRef.current?.();
  };

  // Fetch functions for PaginatedTableWrapper
  const fetchFirstPage = async (search?: string) => {
    if (!selectedInstitution?.id) {
      return { results: [], count: 0, next: null, previous: null };
    }

    return LeaveApplicationsAPI.getPaginated({
      institutionId: selectedInstitution.id,
      page: 1,
      search,
      status: statusFilter !== "all" ? statusFilter : undefined,
      leaveType: leaveTypeFilter !== "all" ? leaveTypeFilter : undefined,
    });
  };

  const fetchFromUrl = async ({ url }: { url: string }) => {
    return LeaveApplicationsAPI.getPaginatedFromUrl({ url });
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "approve" | "reject" | "delete";
    applicationId: string | number;
    applicationName: string;
  }>({
    isOpen: false,
    type: "approve",
    applicationId: "",
    applicationName: "",
  });

  const [formData, setFormData] = useState({
    employee: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    duration_type: "full_day",
    reason: "",
    handover_notes: "",
    supporting_document: null as File | null,
  });

  const getEmployeeName = (employee: ILeaveRequest["employee"]): string => {
    if (typeof employee === "object" && employee !== null) {
      return (employee as any).user?.fullname || (employee as any).email || "Unknown Employee";
    }
    return "Unknown Employee";
  };
  const getLeaveTypeName = (leaveType: ILeaveRequest["leave_type"]): string => {
    if (typeof leaveType === "object" && leaveType !== null) {
      return (leaveType as any).name || "Unknown Leave Type";
    }
    if (typeof leaveType === "number" || typeof leaveType === "string") {
      const found = leaveTypes.find((type) => type.id.toString() === leaveType.toString());
      return found?.name || "Unknown Leave Type";
    }
    return "Unknown Leave Type";
  };

  const getApproverName = (approvedBy: ILeaveRequest["approved_by"]): string => {
    return (approvedBy as any)?.fullname || (approvedBy as any)?.email || "Not Approved";
  };

  const renderSupportingDocumentName = (document: string | File | undefined): string => {
    if (!document) return "Document";

    if (typeof document === "string") {
      const filename = document.split("/").pop() || document;
      return filename.split("?")[0];
    } else if (document instanceof File) {
      return document.name || "Document";
    }

    return "Document";
  };



  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };


  const getSelectedLeaveType = () => {
    if (!formData.leave_type) return null;
    return leaveTypes.find((type) => type.id.toString() === formData.leave_type);
  };

  const getSelectedLeavePolicy = () => {
    if (!formData.leave_type) return null;
    return leavePolicies.find((policy) => policy.leave_type.toString() === formData.leave_type);
  };

  const getSelectedLeaveBalance = () => {
    if (!formData.employee || !formData.leave_type) return null;
    return leaveBalances.find((balance) => balance.leave_type.toString() === formData.leave_type);
  };

  const validateLeaveApplication = () => {
    const validations = [];
    const selectedLeaveType = getSelectedLeaveType();
    const selectedPolicy = getSelectedLeavePolicy();
    const selectedBalance = getSelectedLeaveBalance();
    const requestedDays = calculateDaysBetween(formData.start_date, formData.end_date);

    if (
      !formData.employee ||
      !formData.leave_type ||
      !formData.start_date ||
      !formData.end_date ||
      !formData.reason
    ) {
      validations.push({
        type: "error",
        message: "Please fill in all required fields",
      });
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const today = new Date();

      if (endDate < startDate) {
        validations.push({
          type: "error",
          message: "End date cannot be before start date",
        });
      }

      if (selectedPolicy) {
        const daysDifference = Math.ceil(
          (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysDifference < selectedPolicy.min_notice_days) {
          validations.push({
            type: "error",
            message: `Minimum ${selectedPolicy.min_notice_days} days notice required. Please select a start date at least ${selectedPolicy.min_notice_days} days from today.`,
          });
        }
      }

      if (
        selectedPolicy?.max_consecutive_days &&
        requestedDays > selectedPolicy.max_consecutive_days
      ) {
        validations.push({
          type: "error",
          message: `Maximum ${selectedPolicy.max_consecutive_days} consecutive days allowed for this leave type. You requested ${requestedDays} days.`,
        });
      }

      if (selectedBalance && requestedDays > Number(selectedBalance.available_days)) {
        validations.push({
          type: "error",
          message: `Insufficient leave balance. You have ${selectedBalance.available_days} days available, but requested ${requestedDays} days.`,
        });
      }

      if (selectedBalance && requestedDays > Number(selectedBalance.available_days) * 0.8) {
        validations.push({
          type: "warning",
          message: `This request will use ${Math.round((requestedDays / Number(selectedBalance.allocated_days)) * 100)}% of your annual leave balance.`,
        });
      }
    }

    // Validate supporting document if required
    if (
      selectedLeaveType?.requires_document &&
      !formData.supporting_document &&
      !editingApplication?.supporting_document
    ) {
      validations.push({
        type: "error",
        message: "A supporting document is required for this leave type.",
      });
    }

    return validations;
  };

  const getApprovalInfo = () => {
    const selectedPolicy = getSelectedLeavePolicy();
    if (!selectedPolicy) return null;

    const approvals = [];
    if (selectedPolicy.requires_manager_approval) approvals.push("Manager");
    if (selectedPolicy.requires_hr_approval) approvals.push("HR");

    return {
      approvals,
      message:
        approvals.length > 0
          ? `This application requires approval from: ${approvals.join(" and ")}`
          : "No approvals required for this leave type",
    };
  };



  useEffect(() => {
    const fetchData = async () => {
      if (!selectedInstitution?.id) {
        return;
      }

      try {
        const [leaveTypesData, policiesData] = await Promise.all([
          getLeaveTypes({ institutionId: selectedInstitution.id }),
          getLeavePolicies({ institutionId: selectedInstitution.id }),
        ]);

        const activeLeaveTypes = leaveTypesData?.filter((type) => type.is_active !== false) || [];
        setLeaveTypes(activeLeaveTypes);
        setLeavePolicies(policiesData || []);
      } catch (error) {
        toast.error("Failed to load data");
        setLeaveTypes([]);
        setLeavePolicies([]);
      }
    };

    fetchData();
  }, [selectedInstitution?.id]);

  const handleAddApplication = async () => {
    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required");
      return;
    }

    const validations = validateLeaveApplication();
    const errors = validations.filter((v) => v.type === "error");

    if (errors.length > 0) {
      toast.error(errors[0].message);
      return;
    }

    const warnings = validations.filter((v) => v.type === "warning");
    if (warnings.length > 0) {
      warnings.forEach((warning) => toast.warning(warning.message));
    }

    setIsSubmitting(true);
    try {
      const applicationData: ILeaveRequestFormData = {
        employee: parseInt(formData.employee),
        leave_type: parseInt(formData.leave_type),
        start_date: formData.start_date,
        end_date: formData.end_date,
        duration_type: formData.duration_type,
        reason: formData.reason,
        handover_notes: formData.handover_notes,
        status: "pending",
      };
      if (formData.supporting_document) {
        applicationData.supporting_document = formData.supporting_document;
      }

      const newApplication = await LeaveApplicationsAPI.create({
        institutionId: selectedInstitution.id,
        leaveApplicationData: applicationData,
      });

      if (newApplication) {
        handleCreateSuccess(newApplication);
        resetForm();
        setIsAddDialogOpen(false);
      } else {
        toast.error("Failed to create leave application");
      }
    } catch (error: any) {
      let errorMessage =
        error?.message || error?.detail || "An error occurred while creating the leave application";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateApplication = async () => {
    if (!editingApplication) return;

    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required");
      return;
    }

    const validations = validateLeaveApplication();
    const errors = validations.filter((v) => v.type === "error");

    if (errors.length > 0) {
      toast.error(errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const applicationData: Partial<ILeaveRequestFormData> = {
        employee: parseInt(formData.employee),
        leave_type: parseInt(formData.leave_type),
        start_date: formData.start_date,
        end_date: formData.end_date,
        duration_type: formData.duration_type,
        reason: formData.reason,
        handover_notes: formData.handover_notes,
      };
      if (formData.supporting_document) {
        applicationData.supporting_document = formData.supporting_document;
      }

      const updatedApplication = await LeaveApplicationsAPI.update({
        leaveApplicationId: editingApplication.id?.toString() || "",
        leaveApplicationData: applicationData,
      });

      if (updatedApplication) {
        handleUpdateSuccess(updatedApplication);
        resetForm();
        setIsEditDialogOpen(false);
        setEditingApplication(null);
      } else {
        toast.error("Failed to update leave application");
      }
    } catch (error) {
      toast.error("An error occurred while updating the leave application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (
    id: string | number,
    action: "approve" | "reject",
    rejectionReason?: string,
  ) => {
    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedApplication = action === 'approve'
        ? await LeaveApplicationsAPI.approve({
          leaveApplicationId: id,
          institutionId: selectedInstitution?.id,
          rejectionReason,
        })
        : await LeaveApplicationsAPI.reject({
          leaveApplicationId: id,
          institutionId: selectedInstitution?.id,
          rejectionReason,
        });

      if (updatedApplication) {
        toast.success(`Application ${action}d successfully`);
        refreshTableRef.current?.();
      } else {
        toast.error(`Failed to ${action} application - no data returned`);
        refreshTableRef.current?.();
      }
    } catch (error) {
      toast.error(`An error occurred while ${action}ing the application`);
      refreshTableRef.current?.();
    } finally {
      setIsSubmitting(false);
    }
    setConfirmDialog({ isOpen: false, type: "approve", applicationId: "", applicationName: "" });
  };

  const handleDeleteApplication = async (id: string | number) => {
    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await LeaveApplicationsAPI.delete(id);
      if (success) {
        handleDeleteSuccess();
      } else {
        toast.error(
          "Failed to delete leave application. Only pending applications can be deleted.",
        );
        refreshTableRef.current?.();
      }
    } catch (error: any) {
      let errorMessage = "An error occurred while deleting the leave application";

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = "Cannot delete this application. Only pending applications can be deleted.";
      }

      toast.error(errorMessage);
      refreshTableRef.current?.();
    } finally {
      setIsSubmitting(false);
    }
    setConfirmDialog({ isOpen: false, type: "delete", applicationId: "", applicationName: "" });
  };

  const openConfirmDialog = (
    type: "approve" | "reject" | "delete",
    applicationId: string | number,
    applicationName: string,
  ) => {
    setConfirmDialog({
      isOpen: true,
      type,
      applicationId,
      applicationName,
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.type === "approve") {
      handleStatusChange(confirmDialog.applicationId, "approve");
    } else if (confirmDialog.type === "reject") {
      handleStatusChange(confirmDialog.applicationId, "reject", "Application rejected");
    } else if (confirmDialog.type === "delete") {
      handleDeleteApplication(confirmDialog.applicationId);
    }
  };

  const handleEditApplication = (application: ILeaveRequest) => {
    setEditingApplication(application);

    const formatDateForInput = (dateString: string) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    };

    setFormData({
      employee:
        typeof application.employee === "object" && application.employee !== null
          ? (application.employee as any).id?.toString() || ""
          : String(application.employee || ""),
      leave_type:
        typeof application.leave_type === "object" && application.leave_type !== null
          ? (application.leave_type as any).id?.toString() || ""
          : String(application.leave_type || ""),
      start_date: formatDateForInput(application.start_date),
      end_date: formatDateForInput(application.end_date),
      duration_type: application.duration_type || "full_day",
      reason: application.reason || "",
      handover_notes: application.handover_notes || "",
      supporting_document: null,
    });

    setIsEditDialogOpen(true);
  };

  const handleViewApplication = (application: ILeaveRequest) => {
    setViewingApplication(application);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      employee: "",
      leave_type: "",
      start_date: "",
      end_date: "",
      duration_type: "full_day",
      reason: "",
      handover_notes: "",
      supporting_document: null,
    });

    setEditingApplication(null);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      approved: "bg-green-50 text-green-700 border-green-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
      cancelled: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return colors[status as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <AlertCircle className="h-3 w-3" />,
      approved: <CheckCircle2 className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
      cancelled: <Pause className="h-3 w-3" />,
    };
    return icons[status as keyof typeof icons] || <Clock className="h-3 w-3" />;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      annual: "bg-blue-50 text-blue-700 border-blue-200",
      sick: "bg-red-50 text-red-700 border-red-200",
      maternity: "bg-pink-50 text-pink-700 border-pink-200",
      paternity: "bg-indigo-50 text-indigo-700 border-indigo-200",
      study: "bg-purple-50 text-purple-700 border-purple-200",
      compassionate: "bg-green-50 text-green-700 border-green-200",
    };
    return colors[category as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const renderDateFields = (isEdit = false) => {
    const selectedPolicy = getSelectedLeavePolicy();
    const selectedBalance = getSelectedLeaveBalance();
    const requestedDays = calculateDaysBetween(formData.start_date, formData.end_date);
    const validations = validateLeaveApplication();
    const approvalInfo = getApprovalInfo();

    return (
      <>
        <div className="space-y-2">
          <Label
            htmlFor={isEdit ? "edit-start_date" : "start_date"}
            className="text-sm font-medium"
          >
            Start Date *
          </Label>
          <Input
            id={isEdit ? "edit-start_date" : "start_date"}
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="focus:ring-orange-500 focus:border-orange-500"
            disabled={isSubmitting}
            min={
              new Date(Date.now() + (selectedPolicy?.min_notice_days || 10) * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            }
          />
          {selectedPolicy && (
            <p className="text-xs text-blue-600">
              <Info className="h-3 w-3 inline mr-1" />
              Minimum {selectedPolicy.min_notice_days} days notice required
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-end_date" : "end_date"} className="text-sm font-medium">
            End Date *
          </Label>
          <Input
            id={isEdit ? "edit-end_date" : "end_date"}
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="focus:ring-orange-500 focus:border-orange-500"
            disabled={isSubmitting}
            min={formData.start_date}
          />
          {formData.start_date && formData.end_date && requestedDays > 0 && (
            <div className="text-xs space-y-1">
              <p className="text-gray-600">
                <Calendar className="h-3 w-3 inline mr-1" />
                Duration: {requestedDays} {requestedDays === 1 ? "day" : "days"}
              </p>
              {selectedBalance && (
                <p className="text-blue-600">
                  Available balance: {selectedBalance.available_days} days
                </p>
              )}
            </div>
          )}
        </div>

        {selectedPolicy && (
          <div className="md:col-span-2 space-y-2">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Leave Policy Information
              </h4>
              <div className="space-y-1 text-xs text-blue-700">
                <p>• Notice Period: {selectedPolicy.min_notice_days} days minimum</p>
                {selectedPolicy.max_consecutive_days && (
                  <p>• Maximum Consecutive Days: {selectedPolicy.max_consecutive_days} days</p>
                )}
                {approvalInfo && <p>• {approvalInfo.message}</p>}
              </div>
            </div>
          </div>
        )}

        {validations.length > 0 && (
          <div className="md:col-span-2 space-y-2">
            {validations.map((validation, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg ${validation.type === "error"
                  ? "bg-red-50 border border-red-200"
                  : "bg-amber-50 border border-amber-200"
                  }`}
              >
                {validation.type === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                )}
                <p
                  className={`text-sm font-medium ${validation.type === "error" ? "text-red-800" : "text-amber-800"
                    }`}
                >
                  {validation.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  if (!selectedInstitution?.id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">No Institution Selected</h3>
            <p className="text-gray-600">Please select an institution to manage leave applications.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      {/* Header */}
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Applications</h1>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search leave applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                <SelectValue placeholder="All Statuses" />

              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_CHOICES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                <SelectValue placeholder="All Leave Types" />

              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_APPLICATIONS}>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedInstitution?.id} className="rounded-[12px]">
                    <Plus className="h-4 w-4 mr-2" />
                    New Application
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      New Leave Application
                    </DialogTitle>
                    <DialogDescription>Submit a new leave application request.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="employee" className="text-sm font-medium">
                        Employee *
                      </Label>
                      <EmployeeSearchableSelect

                        value={[formData.employee]}
                        onValueChange={(value) =>
                          setFormData({ ...formData, employee: value.toString() })
                        }
                        disabled={isSubmitting}
                        placeholder="Search and select employee"

                        showEmployeeId={true}
                        showDepartment={false}
                      />

                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leave_type" className="text-sm font-medium">
                        Leave Type *
                      </Label>
                      <Select
                        value={formData.leave_type}
                        onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes.length > 0 ? (
                            leaveTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                <div className="flex flex-col">
                                  <span>{type.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {type.max_days_per_year} days/year • {type.category}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No leave types available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {renderDateFields()}

                    <div className="space-y-2">
                      <Label htmlFor="duration_type" className="text-sm font-medium">
                        Duration Type
                      </Label>
                      <Select
                        value={formData.duration_type}
                        onValueChange={(value) => setFormData({ ...formData, duration_type: value })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="reason" className="text-sm font-medium">
                        Reason *
                      </Label>
                      <Textarea
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        rows={3}
                        className="focus:ring-orange-500 focus:border-orange-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="handover_notes" className="text-sm font-medium">
                        Handover Notes
                      </Label>
                      <Textarea
                        id="handover_notes"
                        value={formData.handover_notes}
                        onChange={(e) => setFormData({ ...formData, handover_notes: e.target.value })}
                        rows={2}
                        placeholder="Work delegation and handover details..."
                        className="focus:ring-orange-500 focus:border-orange-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    {getSelectedLeaveType()?.requires_document && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="supporting_document" className="text-sm font-medium">
                          Supporting Document {getSelectedLeaveType()?.requires_document ? "*" : ""}
                        </Label>
                        <Input
                          id="supporting_document"
                          type="file"
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              supporting_document: e.target.files?.[0] || null,
                            })
                          }
                          className="focus:ring-orange-500 focus:border-orange-500"
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500">
                          Upload any supporting documents (medical certificates, etc.)
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAddApplication}
                    disabled={
                      isSubmitting ||
                      !leaveTypes.length ||
                      validateLeaveApplication().filter((v) => v.type === "error").length > 0
                    }
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Creating..." : "Submit Application"}
                  </Button>
                </DialogContent>
              </Dialog>
            </ProtectedComponent>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 pb-6 min-h-0">
          <PaginatedTableWrapper
            fetchFirstPage={() => fetchFirstPage(searchTerm)}
            fetchFromUrl={fetchFromUrl}
            deps={[selectedInstitution?.id, searchTerm, statusFilter, leaveTypeFilter]}
          >
            {({ data, loading, refresh }) => {
              useEffect(() => {
                refreshTableRef.current = refresh;
              }, [refresh]);

              if (loading) return <TableSkeleton rows={10} columns={8} />;

              if (!data?.results?.length) {
                return (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No leave applications found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm ? "No leave applications match your search." : "Get started by creating your first leave application."}
                    </p>

                  </div>
                );
              }

              // Apply client-side filtering
              const filteredResults = data.results.filter((app) => {
                const matchesStatus = statusFilter === "all" || app.status === statusFilter;
                const matchesLeaveType = leaveTypeFilter === "all" ||
                  (typeof app.leave_type === "object" && app.leave_type !== null
                    ? (app.leave_type as any).id?.toString() === leaveTypeFilter
                    : app.leave_type?.toString() === leaveTypeFilter);
                return matchesStatus && matchesLeaveType;
              });

              return (
                <div className="rounded-lg border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-[70px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((application) => (
                        <TableRow key={application.id?.toString() || Math.random()}>
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {getEmployeeName(application.employee)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getCategoryColor((application.leave_type as any)?.category || "annual")} border font-medium`}
                            >
                              {getLeaveTypeName(application.leave_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(application.start_date).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(application.end_date).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-900">
                              {DURATION_TYPES.find((d) => d.value === application.duration_type)?.label ||
                                application.duration_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getStatusColor(application.status)} border font-medium flex items-center gap-1 w-fit`}
                            >
                              {getStatusIcon(application.status)}
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm text-gray-900 line-clamp-2">{application.reason}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {application.status === "pending" && (
                                  <>
                                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_APPROVE_LEAVE_APPLICATIONS}>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openConfirmDialog(
                                          "approve",
                                          application.id?.toString() || "",
                                          getEmployeeName(application.employee),
                                        )
                                      }
                                      className="text-green-600"
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Approve
                                    </DropdownMenuItem>
                                    </ProtectedComponent>

                                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_REJECT_LEAVE_APPLICATIONS}>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openConfirmDialog(
                                          "reject",
                                          application.id?.toString() || "",
                                          getEmployeeName(application.employee),
                                        )
                                      }
                                      className="text-red-600"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                    </ProtectedComponent>

                                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_LEAVE_APPLICATIONS}>
                                    <DropdownMenuItem
                                      onClick={() => handleEditApplication(application)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    </ProtectedComponent>

                                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_LEAVE_APPLICATIONS}>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openConfirmDialog(
                                          "delete",
                                          application.id?.toString() || "",
                                          getEmployeeName(application.employee),
                                        )
                                      }
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                    </ProtectedComponent>
                                  </>
                                )}
                                <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_APPLICATIONS}>
                                <DropdownMenuItem
                                  onClick={() => handleViewApplication(application)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                </ProtectedComponent>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>

      {/* View Application Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Leave Application Details</DialogTitle>
            <DialogDescription>
              Complete information about the leave application.
            </DialogDescription>
          </DialogHeader>
          {viewingApplication && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Employee</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {getEmployeeName(viewingApplication.employee)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Leave Type</Label>
                  <Badge
                    className={`${getCategoryColor(
                      typeof viewingApplication.leave_type === "object" &&
                        viewingApplication.leave_type !== null
                        ? (viewingApplication.leave_type as ILeaveType).category
                        : leaveTypes.find((type) => type.id === viewingApplication.leave_type)
                          ?.category || "annual",
                    )} border font-medium mt-1`}
                  >
                    {getLeaveTypeName(viewingApplication.leave_type)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Start Date</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(viewingApplication.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">End Date</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(viewingApplication.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Duration Type</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {DURATION_TYPES.find((d) => d.value === viewingApplication.duration_type)
                      ?.label || viewingApplication.duration_type}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Days</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {calculateDaysBetween(
                      viewingApplication.start_date,
                      viewingApplication.end_date,
                    ) || "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Status</Label>
                <Badge
                  className={`${getStatusColor(viewingApplication.status)} border font-medium flex items-center gap-1 w-fit mt-1`}
                >
                  {getStatusIcon(viewingApplication.status)}
                  {viewingApplication.status.charAt(0).toUpperCase() +
                    viewingApplication.status.slice(1)}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Reason</Label>
                <p className="text-sm text-gray-900 mt-1">{viewingApplication.reason}</p>
              </div>
              {viewingApplication.handover_notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Handover Notes</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {viewingApplication.handover_notes}
                  </p>
                </div>
              )}
              {viewingApplication?.supporting_document && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Supporting Document</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <FileText className="h-4 w-4 text-myOrange" />
                    <span className="text-sm text-gray-900">
                      {renderSupportingDocumentName(viewingApplication.supporting_document)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-myOrange hover:bg-orange-100"
                      onClick={() =>
                        handleDownload(
                          getFileUrl(viewingApplication.supporting_document as string),
                          getFileName(viewingApplication.supporting_document as string),
                        )
                      }
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {viewingApplication.approved_by && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    {viewingApplication.status === "approved" ? "Approved by" : "Processed by"}
                  </Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {getApproverName(viewingApplication.approved_by)}
                  </p>
                  {viewingApplication.approved_by && (
                    <p className="text-xs text-gray-500">
                      {new Date(viewingApplication.approved_by).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {viewingApplication.rejection_reason && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Rejection Reason</Label>
                  <p className="text-sm text-red-800 mt-1">
                    {viewingApplication.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Leave Application</DialogTitle>
            <DialogDescription>Make changes to the leave application.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee" className="text-sm font-medium">
                Employee *
              </Label>
              <EmployeeSearchableSelect
                value={[formData.employee]}
                onValueChange={(value) => setFormData({ ...formData, employee: value.toString() })}
                disabled={isSubmitting}
                placeholder="Search and select employee"
                showEmployeeId={true}
                showDepartment={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-leave_type" className="text-sm font-medium">
                Leave Type *
              </Label>
              <Select
                value={formData.leave_type}
                onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      <div className="flex flex-col">
                        <span>{type.name}</span>
                        <span className="text-xs text-gray-500">
                          {type.max_days_per_year} days/year • {type.category}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderDateFields(true)}

            <div className="space-y-2">
              <Label htmlFor="edit-duration_type" className="text-sm font-medium">
                Duration Type
              </Label>
              <Select
                value={formData.duration_type}
                onValueChange={(value) => setFormData({ ...formData, duration_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                  <SelectValue placeholder="Select duration type" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-reason" className="text-sm font-medium">
                Reason *
              </Label>
              <Textarea
                id="edit-reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="focus:ring-orange-500 focus:border-orange-500"
                disabled={isSubmitting}
                placeholder="Enter reason for leave..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-handover_notes" className="text-sm font-medium">
                Handover Notes
              </Label>
              <Textarea
                id="edit-handover_notes"
                value={formData.handover_notes}
                onChange={(e) => setFormData({ ...formData, handover_notes: e.target.value })}
                rows={2}
                className="focus:ring-orange-500 focus:border-orange-500"
                disabled={isSubmitting}
                placeholder="Work delegation and handover details..."
              />
            </div>
            {getSelectedLeaveType()?.requires_document && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-supporting_document" className="text-sm font-medium">
                  Supporting Document {getSelectedLeaveType()?.requires_document ? "*" : ""}
                </Label>
                <Input
                  id="edit-supporting_document"
                  type="file"
                  onChange={(e) =>
                    setFormData({ ...formData, supporting_document: e.target.files?.[0] || null })
                  }
                  className="focus:ring-orange-500 focus:border-orange-500"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">
                  Upload a new document to replace the existing one (if any)
                </p>
              </div>
            )}
            {editingApplication?.supporting_document &&
              getSelectedLeaveType()?.requires_document && (
                <div className="md:col-span-2">
                  <div className="p-2 bg-gray-50 rounded-lg border">
                    <Label className="text-xs font-medium text-gray-600">Current Document:</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-700">
                        {renderSupportingDocumentName(editingApplication.supporting_document)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
          </div>
          <Button
            onClick={handleUpdateApplication}
            disabled={
              isSubmitting ||
              validateLeaveApplication().filter((v) => v.type === "error").length > 0
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Updating..." : "Update Application"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, isOpen: open })}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {confirmDialog.type === "approve" && "Approve Application"}
              {confirmDialog.type === "reject" && "Reject Application"}
              {confirmDialog.type === "delete" && "Delete Application"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "approve" &&
                `Are you sure you want to approve ${confirmDialog.applicationName}'s leave application? This action cannot be undone.`}
              {confirmDialog.type === "reject" &&
                `Are you sure you want to reject ${confirmDialog.applicationName}'s leave application? This action cannot be undone.`}
              {confirmDialog.type === "delete" &&
                `Are you sure you want to delete ${confirmDialog.applicationName}'s leave application? Only pending applications can be deleted.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({
                  isOpen: false,
                  type: "approve",
                  applicationId: "",
                  applicationName: "",
                })
              }
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={`${confirmDialog.type === "approve"
                ? "bg-green-600 hover:bg-green-700"
                : confirmDialog.type === "reject"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-red-600 hover:bg-red-700"
                } text-white`}
              onClick={handleConfirmAction}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  {confirmDialog.type === "approve" && "Yes, Approve"}
                  {confirmDialog.type === "reject" && "Yes, Reject"}
                  {confirmDialog.type === "delete" && "Yes, Delete"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveApplicationComponent;
