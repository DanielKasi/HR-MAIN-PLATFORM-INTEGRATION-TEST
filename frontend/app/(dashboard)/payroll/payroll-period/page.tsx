"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Loader2,
  Info,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  Filter,
  RefreshCw,
  Settings,
  MoreVertical,
  X
} from "lucide-react";
import {toast} from "sonner";
import Link from "next/link";
import {
  createPayrollPeriod,
  getPayrollPeriods,
  updatePayrollPeriod,
  deletePayrollPeriod,
  generatePeriodName,
  checkPeriodOverlap,
  getAllEmployees,
  getPayslips,
  createBulkPayslips,
  getPaginatedPayrollPeriods,
  getPaginatedPayrollPeriodsFromUrl
} from "@/lib/utils";
import {IPayrollPeriod, IPayrollPeriodFormData, IEmployee, IPayslip} from "@/types/types.utils";
import {selectSelectedInstitution, selectAccessToken} from "@/store/auth/selectors";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/types/types.utils";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";

interface ValidationResult {
  name?: string;
  start_date?: string;
  end_date?: string;
  pay_date?: string;
  warning?: string;
}

export default function PayrollPeriods() {
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    pay_date: "",
  });

  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<IPayrollPeriod | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "processed" | "pending">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Auto-generate period name
  useEffect(() => {
    if (formData.start_date && formData.end_date && !editingPeriod) {
      const generatedName = generatePeriodName(formData.start_date, formData.end_date);
      if (
        formData.name === "" ||
        formData.name === generatePeriodName(formData.start_date, formData.end_date)
      ) {
        setFormData((prev) => ({...prev, name: generatedName}));
      }
    }
  }, [formData.start_date, formData.end_date, editingPeriod]);

  // Validate form
  useEffect(() => {
    const errors: ValidationResult = {};
    if (isModalOpen) {
      if (formData.name && formData.name.trim().length < 3) {
        errors.name = "Period name must be at least 3 characters long";
      }
      if (formData.start_date && formData.end_date) {
        if (new Date(formData.end_date) <= new Date(formData.start_date)) {
          errors.end_date = "End date must be after start date";
        }
      }
      if (formData.pay_date && formData.end_date) {
        if (new Date(formData.pay_date) < new Date(formData.end_date)) {
          errors.pay_date = "Pay date should typically be after the period end date";
        }
      }
      if (formData.start_date && formData.end_date) {
        const duration = Math.ceil(
          (new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (duration > 365) {
          errors.warning =
            "This period is longer than a year. Please verify the dates are correct.";
        } else if (duration < 1) {
          errors.end_date = "Period must be at least 1 day long";
        }
      }
    }
    setValidationErrors(errors);
  }, [formData, isModalOpen]);

  const hasValidationErrors = () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.pay_date) {
      return true;
    }
    const errorKeys = Object.keys(validationErrors).filter((key) => key !== "warning");
    return errorKeys.length > 0;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      pay_date: "",
    });
    setEditingPeriod(null);
    setValidationErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution?.id) {
      toast.error("Institution not selected");
      return;
    }
    if (hasValidationErrors()) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }
    if (validationErrors.warning) {
      toast.warning(validationErrors.warning);
    }

    try {
      const overlapCheck = await checkPeriodOverlap({
        institutionId: selectedInstitution.id,
        startDate: formData.start_date,
        endDate: formData.end_date,
        excludeId: editingPeriod?.id,
      });
      if (overlapCheck.hasOverlap) {
        const overlappingNames = overlapCheck.overlappingPeriods.map((p) => p.name).join(", ");
        toast.error(`Period overlaps with existing periods: ${overlappingNames}`);
        return;
      }
    } catch (error: any) {
      console.error("Error checking overlap:", error);
      toast.warning("Could not verify period overlap. Please check manually.");
    }

    setSaving(true);
    try {
      const formattedData: IPayrollPeriodFormData = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        pay_date: formData.pay_date,
        is_processed: false,
      };
      if (editingPeriod) {
        const updatedPeriod = await updatePayrollPeriod({
          id: editingPeriod.id,
          payrollPeriodData: formattedData,
        });
        if (updatedPeriod) {
          toast.success("Payroll period updated successfully");
        }
      } else {
        const newPeriod = await createPayrollPeriod({
          institutionId: selectedInstitution.id,
          payrollPeriodData: formattedData,
        });
        if (newPeriod) {
          toast.success("Payroll period created successfully");
        }
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to save payroll period:", error);
      toast.error(error.message || "An error occurred while saving the payroll period");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (period: IPayrollPeriod) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      pay_date: period.pay_date,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const success = await deletePayrollPeriod(id);
      if (success) {
        toast.success("Payroll period deleted successfully");
      } else {
        toast.error("Failed to delete payroll period");
      }
    } catch (error: any) {
      console.error("Failed to delete payroll period:", error);
      toast.error(error.message || "An error occurred while deleting the payroll period");
    }
    setDeleteConfirmId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysRemaining = (payDate: string) => {
    const today = new Date();
    const pay = new Date(payDate);
    const diffTime = pay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
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
            <p className="text-gray-600">Please select an institution to manage payroll periods.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll Periods</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search payroll periods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filterStatus} onValueChange={(value: string) => setFilterStatus(value as "all" | "processed" | "pending")}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_PAYROLL_PERIODS}>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Period
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
                    <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
                      <DialogTitle className="text-2xl font-bold text-gray-900">
                        {editingPeriod ? "Edit Payroll Period" : "Add New Payroll Period"}
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 text-base">
                        Configure payroll period details and dates
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-semibold text-gray-800">
                          Period Name *
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter period name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          disabled={saving}
                          className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${validationErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                            }`}
                        />
                        {validationErrors.name && (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="start_date" className="text-sm font-semibold text-gray-800">
                          Start Date *
                        </Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => handleInputChange("start_date", e.target.value)}
                          disabled={saving}
                          className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${validationErrors.start_date ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                            }`}
                        />
                        {validationErrors.start_date && (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="end_date" className="text-sm font-semibold text-gray-800">
                          End Date *
                        </Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => handleInputChange("end_date", e.target.value)}
                          disabled={saving}
                          min={formData.start_date}
                          className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${validationErrors.end_date ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                            }`}
                        />
                        {validationErrors.end_date && (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.end_date}
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="pay_date" className="text-sm font-semibold text-gray-800">
                          Pay Date *
                        </Label>
                        <Input
                          id="pay_date"
                          type="date"
                          value={formData.pay_date}
                          onChange={(e) => handleInputChange("pay_date", e.target.value)}
                          disabled={saving}
                          className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${validationErrors.pay_date ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                            }`}
                        />
                        {validationErrors.pay_date && (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.pay_date}
                          </p>
                        )}
                      </div>
                      {validationErrors.warning && (
                        <div className="md:col-span-2 bg-amber-50 rounded-xl p-4">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-amber-800">{validationErrors.warning}</p>
                          </div>
                        </div>
                      )}
                    </form>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={saving || hasValidationErrors()}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {editingPeriod ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          editingPeriod ? "Update Period" : "Create Period"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ProtectedComponent>
            </div>
          </div>
          
         
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<IPayrollPeriod>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await getPaginatedPayrollPeriods({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={getPaginatedPayrollPeriodsFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              if (loading) {
                return (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
                    ))}
                  </div>
                );
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No payroll periods found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm ? "No payroll periods match your search criteria." : "Get started by creating your first payroll period."}
                    </p>
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data.results.filter((period) => {
                const matchesStatus = filterStatus === "all" || 
                  (filterStatus === "processed" && period.is_processed) ||
                  (filterStatus === "pending" && !period.is_processed);
                
                return matchesStatus;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No payroll periods found</h3>
                    <p className="text-muted-foreground mb-4">
                      No payroll periods match the selected status filter.
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead>Period Name</TableHead>
                        <TableHead>Period Dates</TableHead>
                        <TableHead>Pay Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Days to Pay</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">
                            <div className="font-medium text-gray-900">{period.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {formatDate(period.start_date)} - {formatDate(period.end_date)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {Math.ceil(
                                  (new Date(period.end_date).getTime() - new Date(period.start_date).getTime()) /
                                  (1000 * 60 * 60 * 24)
                                )}{" "}
                                days
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-gray-900">{formatDate(period.pay_date)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`font-medium px-3 py-1 ${period.is_processed
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-yellow-100 text-yellow-800 border-yellow-200"
                                }`}
                            >
                              <div className="flex items-center gap-1">
                                {period.is_processed ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                                {period.is_processed ? "Processed" : "Pending"}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-gray-700">
                              {(() => {
                                const daysRemaining = getDaysRemaining(period.pay_date);
                                return daysRemaining < 0
                                  ? `${Math.abs(daysRemaining)} days ago`
                                  : daysRemaining === 0
                                    ? "Today"
                                    : `${daysRemaining} days`;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
                                  <MoreVertical className="h-5 w-5 text-gray-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Link href={`/payroll/payroll-period/${period.id}`} className="flex items-center w-full">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_PAYROLL_PERIODS}>
                                  <DropdownMenuItem onClick={() => handleEdit(period)} className="flex items-center">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteConfirmId(period.id)}
                                    className="flex items-center text-red-600 focus:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </ProtectedComponent>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Delete Confirmation Dialog */}
                            <Dialog
                              open={deleteConfirmId === period.id}
                              onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                            >
                              <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
                                <DialogHeader className="space-y-4 pb-6">
                                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                                    <Trash2 className="w-8 h-8 text-red-600" />
                                  </div>
                                  <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
                                    Delete Payroll Period
                                  </DialogTitle>
                                  <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
                                    Are you sure you want to delete the payroll period{" "}
                                    <span className="font-semibold text-gray-900">"{period.name}"</span>? This action cannot be
                                    undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={saving}>
                                    Cancel
                                  </Button>
                                  <Button variant="destructive" onClick={() => handleDelete(period.id)} disabled={saving}>
                                    {saving ? (
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
    </div>
  );
}
