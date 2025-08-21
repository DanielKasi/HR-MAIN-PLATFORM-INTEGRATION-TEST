"use client";

import React, {useState, useEffect} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
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
import {
  Loader2,
  Calendar,
  FileText,
  Eye,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  getLeaveApplications,
  getLeaveTypes,
  createLeaveApplication,
  getLeavePolicies,
} from "@/lib/utils";
import {
  ILeaveRequest,
  ILeaveType,
  ILeaveRequestFormData,
  ILeavePolicy,
  ILeaveBalance,
} from "@/types/types.utils";
import {toast} from "sonner";

interface EmployeeLeaveApplicationsProps {
  employeeId: string;
  institutionId: number;
  onCreateNew?: () => void;
}

const DURATION_TYPES = [
  {value: "full_day", label: "Full Day"},
  {value: "half_day_morning", label: "Half Day - Morning"},
  {value: "half_day_afternoon", label: "Half Day - Afternoon"},
  {value: "hourly", label: "Hourly"},
];

const EmployeeLeaveApplications: React.FC<EmployeeLeaveApplicationsProps> = ({
  employeeId,
  institutionId,
  onCreateNew,
}) => {
  const [applications, setApplications] = useState<ILeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<ILeavePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    duration_type: "full_day",
    reason: "",
    handover_notes: "",
    supporting_document: null as File | null,
  });

  const getEmployeeId = (employee: any) => {
    return typeof employee === "object" ? employee?.id : employee;
  };

  const getLeaveTypeName = (leaveType: any): string => {
    if (typeof leaveType === "object" && leaveType?.name) {
      return leaveType.name;
    }
    const type = leaveTypes.find((type) => type.id === leaveType);
    return type?.name || "Unknown Leave Type";
  };

  const getLeaveTypeCategory = (leaveType: any): string => {
    if (typeof leaveType === "object" && leaveType?.category) {
      return leaveType.category;
    }
    const type = leaveTypes.find((type) => type.id === leaveType);
    return type?.category || "annual";
  };

  const getSelectedLeaveType = () => {
    if (!formData.leave_type) return null;
    return leaveTypes.find((type) => type.id.toString() === formData.leave_type);
  };

  const getSelectedLeavePolicy = () => {
    if (!formData.leave_type) return null;
    return leavePolicies.find((policy) => policy.leave_type.toString() === formData.leave_type);
  };

  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const validateLeaveApplication = () => {
    const validations = [];
    const selectedLeaveType = getSelectedLeaveType();
    const selectedPolicy = getSelectedLeavePolicy();
    const requestedDays = calculateDaysBetween(formData.start_date, formData.end_date);

    if (!formData.leave_type || !formData.start_date || !formData.end_date || !formData.reason) {
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
    }

    // Validate supporting document if required
    if (selectedLeaveType?.requires_document && !formData.supporting_document) {
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

  const handleAddApplication = async () => {
    if (!institutionId) {
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
        employee: parseInt(employeeId),
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
        institutionId: institutionId,
        leaveApplicationData: applicationData,
      });

      if (newApplication) {
        setApplications([newApplication, ...applications]);
        toast.success("Leave application created successfully");
        resetForm();
        setIsAddDialogOpen(false);
        if (onCreateNew) {
          onCreateNew();
        }
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

  const resetForm = () => {
    setFormData({
      leave_type: "",
      start_date: "",
      end_date: "",
      duration_type: "full_day",
      reason: "",
      handover_notes: "",
      supporting_document: null,
    });
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
      cancelled: <Clock className="h-3 w-3" />,
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

  const renderDateFields = () => {
    const selectedPolicy = getSelectedLeavePolicy();
    const requestedDays = calculateDaysBetween(formData.start_date, formData.end_date);
    const validations = validateLeaveApplication();
    const approvalInfo = getApprovalInfo();

    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="start_date" className="text-sm font-medium">
            Start Date *
          </Label>
          <Input
            id="start_date"
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
          <Label htmlFor="end_date" className="text-sm font-medium">
            End Date *
          </Label>
          <Input
            id="end_date"
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [applicationsData, types, policiesData] = await Promise.all([
        getLeaveApplications({institutionId, employeeId}),
        getLeaveTypes({institutionId}),
        getLeavePolicies({institutionId}),
      ]);

      // Backend already filters by employeeId, so we can use the data directly
      setApplications(Array.isArray(applicationsData) ? applicationsData : []);
      setLeaveTypes(types.filter((type) => type.is_active !== false));
      setLeavePolicies(policiesData || []);
    } catch (error: any) {
      toast.error("Failed to fetch leave applications");
      console.error("Error fetching leave applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId && institutionId) {
      fetchData();
    }
  }, [employeeId, institutionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-gray-600">Loading leave applications...</span>
      </div>
    );
  }

  // Calculate summary stats
  const pendingCount = applications.filter((app) => app.status === "pending").length;
  const approvedCount = applications.filter((app) => app.status === "approved").length;
  const rejectedCount = applications.filter((app) => app.status === "rejected").length;

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#162032]">Leave Applications</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="hidden sm:flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>New Application</span>
            </Button>

          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">New Leave Application</DialogTitle>
              <DialogDescription>Submit a new leave application request.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
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
                !leaveTypes.length ||
                validateLeaveApplication().filter((v) => v.type === "error").length > 0
              }
              className="bg-[#e21732] hover:bg-[#c8152d]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creating..." : "Submit Application"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats - Profile Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3">
          <div className="text-xs text-[#848496] mb-1">Total</div>
          <div className="text-lg font-bold text-[#162032]">{applications.length}</div>
        </div>
        <div className="bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3">
          <div className="text-xs text-[#848496] mb-1">Pending</div>
          <div className="text-lg font-bold text-[#e21732]">{pendingCount}</div>
        </div>
        <div className="bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3">
          <div className="text-xs text-[#848496] mb-1">Approved</div>
          <div className="text-lg font-bold text-[#3cb371]">{approvedCount}</div>
        </div>
        <div className="bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3">
          <div className="text-xs text-[#848496] mb-1">Rejected</div>
          <div className="text-lg font-bold text-[#9ca3af]">{rejectedCount}</div>
        </div>
      </div>

      {/* Applications Table - Profile Style */}
      {applications.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="h-8 w-8 text-[#848496] mx-auto mb-2" />
          <h3 className="text-sm font-medium text-[#162032] mb-1">No Leave Applications</h3>
          <p className="text-xs text-[#848496]">No leave applications found for this employee.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border border-[#e8e8f2]">
          <div className="overflow-x-auto">
            <Table className="[&_th]:border-0 [&_td]:border-0">
              <TableHeader>
                <TableRow className="bg-[#f7f7fb] hover:bg-[#f7f7fb]">
                  <TableHead className="font-semibold text-[#162032] py-3 px-4 text-xs">
                    Leave Type
                  </TableHead>
                  <TableHead className="font-semibold text-[#162032] py-3 px-4 text-xs">
                    Dates
                  </TableHead>
                  <TableHead className="font-semibold text-[#162032] text-center py-3 px-4 text-xs">
                    Days
                  </TableHead>
                  <TableHead className="font-semibold text-[#162032] py-3 px-4 text-xs">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-[#162032] py-3 px-4 text-xs">
                    Reason
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.slice(0, 10).map((application) => (
                  <TableRow key={application.id} className="hover:bg-[#f7f7fb]/50">
                    <TableCell className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="font-medium text-[#162032] text-xs">
                          {getLeaveTypeName(application.leave_type)}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getCategoryColor(getLeaveTypeCategory(application.leave_type))} text-xs px-2 py-0.5`}
                        >
                          {getLeaveTypeCategory(application.leave_type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="text-xs text-[#162032]">
                        <div>{new Date(application.start_date).toLocaleDateString()}</div>
                        <div className="text-[#848496]">
                          to {new Date(application.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3 px-4">
                      <span className="text-xs font-medium text-[#162032]">
                        {calculateDaysBetween(application.start_date, application.end_date)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(application.status)} flex items-center gap-1 w-fit text-xs px-2 py-0.5`}
                      >
                        {getStatusIcon(application.status)}
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="max-w-xs">
                        <p
                          className="text-xs text-[#162032] line-clamp-2 truncate"
                          title={application.reason}
                        >
                          {application.reason}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {applications.length > 10 && (
            <div className="px-4 py-3 bg-[#f7f7fb] border-t border-[#e8e8f2]">
              <p className="text-xs text-[#848496] text-center">
                Showing 10 of {applications.length} applications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveApplications;
