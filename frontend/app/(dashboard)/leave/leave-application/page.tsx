"use client";

import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  MoreHorizontal,
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {toast} from "sonner";
import {
  createLeaveApplication,
  getLeaveApplications,
  updateLeaveApplication,
  deleteLeaveApplication,
  approveRejectLeaveApplication,
  getLeaveTypes,
  getAllEmployees,
  getLeavePolicies,
} from "@/lib/utils";
import {
  ILeaveRequest,
  ILeaveRequestFormData,
  ILeaveType,
  ILeavePolicy,
  Employee,
  ILeaveBalance,
  IEmployee,
} from "@/types/types.utils";
import {selectSelectedInstitution, selectAttachedInstitutions} from "@/store/auth/selectors";
import {IUserInstitution} from "@/types";
import {useSelector} from "react-redux";
import {EmployeeSearchableSelect} from "@/components/ui/employee-searchable-select";
import {handleDownload, getFileUrl, getFileName} from "@/lib/helpers";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Card, CardHeader } from "@/components/ui/card";

const STATUS_CHOICES = [
  {value: "pending", label: "Pending"},
  {value: "approved", label: "Approved"},
  {value: "rejected", label: "Rejected"},
  {value: "cancelled", label: "Cancelled"},
];

const DURATION_TYPES = [
  {value: "full_day", label: "Full Day"},
  {value: "half_day_morning", label: "Half Day - Morning"},
  {value: "half_day_afternoon", label: "Half Day - Afternoon"},
  {value: "hourly", label: "Hourly"},
];

const LeaveApplicationComponent = () => {
  const [applications, setApplications] = useState<ILeaveRequest[]>([]);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<ILeavePolicy[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<ILeaveBalance[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<ILeaveRequest | null>(null);
  const [viewingApplication, setViewingApplication] = useState<ILeaveRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const selectedInstitution = useSelector(selectSelectedInstitution);

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

  const refreshApplications = async () => {
    if (!selectedInstitution?.id) return;

    try {
      const applicationsData = await getLeaveApplications({institutionId: selectedInstitution?.id});
      setApplications(
        Array.isArray(applicationsData)
          ? applicationsData
          : applicationsData
            ? [applicationsData]
            : [],
      );
    } catch (error) {
      toast.error("Error refreshing applications");
    }
  };

  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getSelectedEmployee = () => {
    if (!formData.employee) return null;
    return employees.find((emp) => emp.id.toString() === formData.employee);
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
    const fetchEmployees = async () => {
      if (!selectedInstitution?.id) {
        setIsLoadingEmployees(false);
        return;
      }

      setIsLoadingEmployees(true);

      try {
        const fetchedEmployees = await getAllEmployees({institutionId: selectedInstitution?.id});
          setEmployees(fetchedEmployees.results || []);
      } catch (error) {
        setEmployees([]);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [selectedInstitution?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedInstitution?.id) {
        return;
      }

      setIsLoading(true);

      try {
        const [leaveTypesData, applicationsData, policiesData] = await Promise.all([
          getLeaveTypes({institutionId: selectedInstitution.id}),
          getLeaveApplications({institutionId: selectedInstitution.id}),
          getLeavePolicies({institutionId: selectedInstitution.id}),
        ]);

        const activeLeaveTypes = leaveTypesData?.filter((type) => type.is_active !== false) || [];
        setLeaveTypes(activeLeaveTypes);
        setApplications(Array.isArray(applicationsData) ? applicationsData : []);
        setLeavePolicies(policiesData || []);
      } catch (error) {
        toast.error("Failed to load data");
        setLeaveTypes([]);
        setApplications([]);
        setLeavePolicies([]);
      } finally {
        setIsLoading(false);
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

      const newApplication = await createLeaveApplication({
        institutionId: selectedInstitution.id,
        leaveApplicationData: applicationData,
      });

      if (newApplication) {
        setApplications([newApplication, ...applications]);
        toast.success("Leave application created successfully");
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

      const updatedApplication = await updateLeaveApplication({
        leaveApplicationId: editingApplication.id?.toString() || "",
        leaveApplicationData: applicationData,
      });

      if (updatedApplication) {
        const updatedApplications = applications.map((app) =>
          app.id?.toString() === editingApplication.id?.toString() ? updatedApplication : app,
        );
        setApplications(updatedApplications);
        toast.success("Leave application updated successfully");
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
      const updatedApplication = await approveRejectLeaveApplication({
        leaveApplicationId: id,
        institutionId: selectedInstitution?.id,
        action,
        rejectionReason,
      });

      if (updatedApplication) {
        const updatedApplications = applications.map((app) =>
          app.id?.toString() === id.toString() ? updatedApplication : app,
        );
        setApplications(updatedApplications);
        toast.success(`Application ${action}d successfully`);
      } else {
        toast.error(`Failed to ${action} application - no data returned`);
        await refreshApplications();
      }
    } catch (error) {
      toast.error(`An error occurred while ${action}ing the application`);
      await refreshApplications();
    } finally {
      setIsSubmitting(false);
    }
    setConfirmDialog({isOpen: false, type: "approve", applicationId: "", applicationName: ""});
  };

  const handleDeleteApplication = async (id: string | number) => {
    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required");
      return;
    }

    const applicationToDelete = applications.find((app) => app.id?.toString() === id.toString());
    if (applicationToDelete && applicationToDelete.status !== "pending") {
      toast.error("Can only delete pending applications");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await deleteLeaveApplication({
        leaveApplicationId: id,
        institutionId: selectedInstitution?.id,
      });
      if (success) {
        const filteredApplications = applications.filter(
          (app) => app.id?.toString() !== id.toString(),
        );
        setApplications(filteredApplications);
        toast.success("Leave application deleted successfully");
      } else {
        toast.error(
          "Failed to delete leave application. Only pending applications can be deleted.",
        );
        await refreshApplications();
      }
    } catch (error: any) {
      let errorMessage = "An error occurred while deleting the leave application";

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = "Cannot delete this application. Only pending applications can be deleted.";
      }

      toast.error(errorMessage);
      await refreshApplications();
    } finally {
      setIsSubmitting(false);
    }
    setConfirmDialog({isOpen: false, type: "delete", applicationId: "", applicationName: ""});
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
            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
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
            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
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
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  validation.type === "error"
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
                  className={`text-sm font-medium ${
                    validation.type === "error" ? "text-red-800" : "text-amber-800"
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

  const filteredApplications = applications.filter(
    (app) => statusFilter === "all" || app.status === statusFilter,
  );

  if (isLoading && !selectedInstitution?.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading institution data...</span>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <div className="w-full px-2 py-8">
        {/* Header Section */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Applications</h1>
              <p className="text-gray-600">Manage employee leave requests and approvals</p>
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_CHOICES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={!selectedInstitution?.id}
                  >
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee" className="text-sm font-medium">
                        Employee *
                      </Label>
                      <EmployeeSearchableSelect
                        employees={employees}
                        value={[formData.employee]}
                        onValueChange={(value) =>
                          setFormData({...formData, employee: value.toString()})
                        }
                        disabled={isSubmitting || isLoadingEmployees}
                        placeholder="Search and select employee"
                        isLoading={isLoadingEmployees}
                        showEmployeeId={true}
                        showDepartment={false}
                      />
                      {!isLoadingEmployees && employees.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          No employees found. Please check if employees are registered for this
                          institution.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leave_type" className="text-sm font-medium">
                        Leave Type *
                      </Label>
                      <Select
                        value={formData.leave_type}
                        onValueChange={(value) => setFormData({...formData, leave_type: value})}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
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
                        onValueChange={(value) => setFormData({...formData, duration_type: value})}
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
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, handover_notes: e.target.value})}
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
                      !employees.length ||
                      !leaveTypes.length ||
                      validateLeaveApplication().filter((v) => v.type === "error").length > 0
                    }
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Creating..." : "Submit Application"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 px-2 mt-10">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {applications.filter((app) => app.status === "pending").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {applications.filter((app) => app.status === "approved").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {applications.filter((app) => app.status === "rejected").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
         <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-900">Employee</TableHead>
                <TableHead className="font-semibold text-gray-900">Leave Type</TableHead>
                <TableHead className="font-semibold text-gray-900">Start Date</TableHead>
                <TableHead className="font-semibold text-gray-900">End Date</TableHead>
                <TableHead className="font-semibold text-gray-900">Duration</TableHead>
                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                <TableHead className="font-semibold text-gray-900">Reason</TableHead>
                <TableHead className="font-semibold text-gray-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((application) => (
                <TableRow
                  key={
                    application.id?.toString() ||
                    (application.employee as any)?.id ||
                    `row-${Math.random()}`
                  }
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">
                        {getEmployeeName(application.employee)}
                      </div>
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
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {application.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  openConfirmDialog(
                                    "approve",
                                    application.id?.toString() || "",
                                    getEmployeeName(application.employee),
                                  )
                                }
                                className="cursor-pointer hover:bg-green-50 focus:bg-green-50 text-green-600"
                                disabled={isSubmitting}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openConfirmDialog(
                                    "reject",
                                    application.id?.toString() || "",
                                    getEmployeeName(application.employee),
                                  )
                                }
                                className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
                                disabled={isSubmitting}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditApplication(application)}
                                className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                                disabled={isSubmitting}
                              >
                                <Edit className="h-4 w-4 mr-2 text-orange-600" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openConfirmDialog(
                                    "delete",
                                    application.id?.toString() || "",
                                    getEmployeeName(application.employee),
                                  )
                                }
                                className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuItem
                            onClick={() => handleViewApplication(application)}
                            className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-2 text-blue-600" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredApplications.length === 0 && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter === "all"
                  ? "No leave applications have been submitted yet."
                  : `No ${statusFilter} applications found.`}
              </p>
            </div>
          )}
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
                      <FileText className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-gray-900">
                        {renderSupportingDocumentName(viewingApplication.supporting_document)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-orange-600 hover:bg-orange-100"
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
                  employees={employees}
                  value={[formData.employee]}
                  onValueChange={(value) => setFormData({...formData, employee: value.toString()})}
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
                  onValueChange={(value) => setFormData({...formData, leave_type: value})}
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
                  onValueChange={(value) => setFormData({...formData, duration_type: value})}
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
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, handover_notes: e.target.value})}
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
                      setFormData({...formData, supporting_document: e.target.files?.[0] || null})
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
          onOpenChange={(open) => setConfirmDialog({...confirmDialog, isOpen: open})}
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
                className={`${
                  confirmDialog.type === "approve"
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
    </div>
  );
};

export default LeaveApplicationComponent;
