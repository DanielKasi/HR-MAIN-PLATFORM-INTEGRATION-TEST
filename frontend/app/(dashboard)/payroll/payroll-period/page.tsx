"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  RefreshCw,
  Settings,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
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
  createBulkPayslips
} from "@/lib/utils";
import { IPayrollPeriod, IPayrollPeriodFormData, IEmployee,IPayslip, } from "@/app/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/app/types/types.utils";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

interface ValidationResult {
  name?: string;
  start_date?: string;
  end_date?: string;
  pay_date?: string;
  warning?: string;
}

export default function PayrollPeriods() {
  // Form state (moved to the top)
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    pay_date: "",
  });

  const [payrollPeriods, setPayrollPeriods] = useState<IPayrollPeriod[]>([]);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<IPayrollPeriod | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "processed" | "pending">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [availablePayrollPeriods, setAvailablePayrollPeriods] = useState<IPayrollPeriod[]>([]);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateFormData, setGenerateFormData] = useState({
    payroll_period_id: "",
  });
  const [generating, setGenerating] = useState(false);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Add these helper functions
  const fetchEmployeesAndPayslips = useCallback(async () => {
  if (!selectedInstitution?.id) {
    setEmployees([]);
    setPayslips([]);
    setAvailablePayrollPeriods([]);
    return;
  }

  try {
    // Fetch employees
    const fetchedEmployees = await getAllEmployees({ institutionId: selectedInstitution.id });
    if (fetchedEmployees && Array.isArray(fetchedEmployees)) {
      const formattedEmployees = fetchedEmployees
        .filter((emp) => emp.id && emp.id.toString() !== "0");
      setEmployees(formattedEmployees);
    } else {
      setEmployees([]);
    }

    // Fetch payslips
    const payslipsData: any = await getPayslips(selectedInstitution.id);
    if (payslipsData && Array.isArray(payslipsData)) {
      setPayslips(payslipsData);
    } else {
      setPayslips([]);
    }

    // Filter available periods for payslip generation
// Filter available periods for payslip generation
const filteredPeriods = payrollPeriods.filter((period) => {
  // Get today's date
  const today = new Date();
  const payDate = new Date(period.pay_date);
  
  // Create date objects with only year, month, day (no time)
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const payDateOnly = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate());
  
  // Allow payslip generation if pay date is today or in the past
  const payDateReached = payDateOnly <= todayOnly;
  
  // Check if there are incomplete payslips for this period
  const periodPayslips = payslipsData.filter(
    (payslip: any) => payslip.payroll_period.id === period.id
  );
  const employeesWithPayslips = new Set(
    periodPayslips.map((payslip: any) => payslip.employee.id.toString())
  );
  
  // Use the correct variable name here
  const formattedEmployeesLength = fetchedEmployees && Array.isArray(fetchedEmployees) 
    ? fetchedEmployees.filter((emp) => emp.id && emp.id.toString() !== "0").length 
    : 0;
  
  const hasIncompletePayslips = employeesWithPayslips.size < formattedEmployeesLength;
  
  console.log('Period:', period.name);
  console.log('Pay Date Reached:', payDateReached);
  console.log('Has Incomplete Payslips:', hasIncompletePayslips);
  console.log('Employees with payslips:', employeesWithPayslips.size);
  console.log('Total formatted employees:', formattedEmployeesLength);
  
  return payDateReached && hasIncompletePayslips;
});
    
    setAvailablePayrollPeriods(filteredPeriods); // ← This was missing!

  } catch (error) {
    console.error("Error fetching employees and payslips:", error);
    setEmployees([]);
    setPayslips([]);
    setAvailablePayrollPeriods([]);
  }
}, [selectedInstitution?.id, payrollPeriods]);

const resetGenerateForm = () => {
  setGenerateFormData({
    payroll_period_id: "",
  });
};

const handleGenerateInputChange = (field: string, value: string) => {
  setGenerateFormData((prev) => ({
    ...prev,
    [field]: value,
  }));
};


const handleGeneratePayslips = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedInstitution) {
    toast.error("Institution ID is required");
    return;
  }

  if (!generateFormData.payroll_period_id) {
    toast.error("Please select a payroll period", { duration: 5000 });
    return;
  }

  const payrollPeriod = availablePayrollPeriods.find(
    (period) => period.id === Number.parseInt(generateFormData.payroll_period_id)
  );
  if (!payrollPeriod) {
    toast.error("Invalid payroll period selected", { duration: 5000 });
    return;
  }

  // Get employees who don't have payslips for this period
  const existingPayslipEmployeeIds = new Set(
    payslips
      .filter((p) => p.payroll_period.id.toString() === generateFormData.payroll_period_id)
      .map((p) => p.employee.id.toString())
  );
  const eligibleEmployeeIds = employees
    .filter((emp) => !existingPayslipEmployeeIds.has(emp.id.toString()))
    .map((emp) => parseInt(emp.id.toString()));

  if (eligibleEmployeeIds.length === 0) {
    toast.info("All employees already have payslips for this period.", {
      duration: 5000,
    });
    setIsGenerateModalOpen(false);
    return;
  }

  setGenerating(true);

  try {
    const newPayslips = await createBulkPayslips({
      institutionId: selectedInstitution.id,
      payrollPeriodId: parseInt(generateFormData.payroll_period_id),
      employeeIds: eligibleEmployeeIds,
    });

    if (newPayslips && Array.isArray(newPayslips)) {
      toast.success(`Successfully generated ${newPayslips.length} payslips`, {
        duration: 5000,
      });
      
      // Update the payroll period status to processed
      const updatedPeriods = payrollPeriods.map((period) => {
        if (period.id.toString() === generateFormData.payroll_period_id) {
          return {
            ...period,
            is_processed: true
          };
        }
        return period;
      });
      
      // Update the payroll periods state
      setPayrollPeriods(updatedPeriods);
      
      // Refresh data to get the latest payslips and update available periods
      await fetchEmployeesAndPayslips();
      
    } else {
      toast.error("Failed to generate payslips", {
        duration: 5000,
      });
    }

    setIsGenerateModalOpen(false);
    resetGenerateForm();
  } catch (error: any) {
    toast.error(error.message || "An error occurred while processing payslips", {
      duration: 5000,
    });
  } finally {
    setGenerating(false);
  }
};
  // Fetch payroll periods
  const fetchPayrollPeriods = useCallback(async () => {
    if (!selectedInstitution?.id) {
      setPayrollPeriods([]);
      return;
    }

    try {
      setIsRefreshing(true);
      const periodsData = await getPayrollPeriods(selectedInstitution.id);
      if (periodsData && Array.isArray(periodsData)) {
        setPayrollPeriods(periodsData);
      } else {
        setPayrollPeriods([]);
        toast.error("No payroll periods found");
      }
    } catch (error: any) {
      console.error("Error fetching payroll periods:", error);
      setPayrollPeriods([]);
      toast.error(error.message || "Failed to load payroll periods");
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedInstitution?.id]);

  useEffect(() => {
    fetchPayrollPeriods();
  }, [fetchPayrollPeriods]);


  useEffect(() => {
  if (payrollPeriods.length > 0) {
    fetchEmployeesAndPayslips();
  }
}, [fetchEmployeesAndPayslips, payrollPeriods]);

  // Auto-generate period name
  useEffect(() => {
    if (formData.start_date && formData.end_date && !editingPeriod) {
      const generatedName = generatePeriodName(formData.start_date, formData.end_date);
      if (formData.name === "" || formData.name === generatePeriodName(formData.start_date, formData.end_date)) {
        setFormData((prev) => ({ ...prev, name: generatedName }));
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
            (1000 * 60 * 60 * 24)
        );
        if (duration > 365) {
          errors.warning = "This period is longer than a year. Please verify the dates are correct.";
        } else if (duration < 1) {
          errors.end_date = "Period must be at least 1 day long";
        }
      }
    }
    setValidationErrors(errors);
  }, [formData, isModalOpen]);

  // Filtered and paginated periods
  const filteredPeriods = useMemo(() => {
    return payrollPeriods.filter((period) => {
      const matchesSearch = period.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "processed" && period.is_processed) ||
        (filterStatus === "pending" && !period.is_processed);
      return matchesSearch && matchesStatus;
    });
  }, [payrollPeriods, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredPeriods.length / pageSize);
  const paginatedPeriods = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredPeriods.slice(start, end);
  }, [filteredPeriods, currentPage, pageSize]);

  // Stats calculations
  const totalPeriods = useMemo(() => filteredPeriods.length, [filteredPeriods]);
  const processedPeriods = useMemo(
    () => filteredPeriods.filter((p) => p.is_processed).length,
    [filteredPeriods]
  );
  const pendingPeriods = useMemo(
    () => filteredPeriods.filter((p) => !p.is_processed).length,
    [filteredPeriods]
  );
  const upcomingPayDays = useMemo(
    () =>
      filteredPeriods.filter((p) => {
        const daysRemaining = Math.ceil(
          (new Date(p.pay_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysRemaining >= 0 && daysRemaining <= 7;
      }).length,
    [filteredPeriods]
  );

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
          setPayrollPeriods((prev) =>
            prev.map((p) => (p.id === editingPeriod.id ? updatedPeriod : p))
          );
          toast.success("Payroll period updated successfully");
        }
      } else {
        const newPeriod = await createPayrollPeriod({
          institutionId: selectedInstitution.id,
          payrollPeriodData: formattedData,
        });
        if (newPeriod) {
          setPayrollPeriods((prev) => [...prev, newPeriod]);
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
        setPayrollPeriods((prev) => prev.filter((p) => p.id !== id));
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchPayrollPeriods();
    setCurrentPage(1);
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
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Payroll Periods</h1>
    <p className="text-muted-foreground">
      Manage payroll periods for {selectedInstitution?.institution_name}
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
    
    {/* Add Period Button */}
    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_PAYROLL_PERIODS}>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={resetForm}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
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
                className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
                  validationErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
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
                className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
                  validationErrors.start_date ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                }`}
              />
              {validationErrors.start_date && (
                <p className="text-xs text-red-500 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationErrors.start_date}
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
                className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
                  validationErrors.end_date ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
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
                className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
                  validationErrors.pay_date ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
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
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
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

    {/* Generate Payslips Button with Popover */}
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative">
          <Button
            onClick={() => {
              resetGenerateForm();
              setIsGenerateModalOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700 shadow-md disabled:bg-gray-400"
            disabled={!selectedInstitution?.id || employees.length === 0 || availablePayrollPeriods.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Payslips
          </Button>
          
          {/* Show info icon when disabled */}
          {(!selectedInstitution?.id || employees.length === 0 || availablePayrollPeriods.length === 0) && (
            <Info className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 cursor-help" />
          )}
        </div>
      </PopoverTrigger>
      
      {(!selectedInstitution?.id || employees.length === 0 || availablePayrollPeriods.length === 0) && (
        <PopoverContent className="w-80" side="bottom" align="end">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Why is this button disabled?</h4>
            <div className="text-xs text-gray-600 space-y-1">
              {!selectedInstitution?.id && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  Please select an institution first
                </div>
              )}
              {selectedInstitution?.id && employees.length === 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  No employees found. Add employees to generate payslips
                </div>
              )}
              {selectedInstitution?.id && employees.length > 0 && availablePayrollPeriods.length === 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  No payroll periods available for payslip generation
                </div>
              )}
            </div>
            
            {selectedInstitution?.id && employees.length > 0 && availablePayrollPeriods.length === 0 && (
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                <strong>Tip:</strong> Payroll periods only appear here when their pay date has been reached and not all employees have payslips yet.
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  </div>
</div>


{/* Generate Payslips Dialog - Place this OUTSIDE the header */}
<Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Generate Payslips</DialogTitle>
      <DialogDescription>
        Select a payroll period to generate payslips for employees without existing payslips
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleGeneratePayslips} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payroll_period">Payroll Period *</Label>
          <Select
            value={generateFormData.payroll_period_id}
            onValueChange={(value) => handleGenerateInputChange("payroll_period_id", value)}
            disabled={generating || availablePayrollPeriods.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payroll period" />
            </SelectTrigger>
            <SelectContent>
              {availablePayrollPeriods.length > 0 ? (
                availablePayrollPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id.toString()}>
                    {period.name}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-gray-500">
                  {payrollPeriods.some(p => new Date(p.pay_date) > new Date()) 
                    ? "No payroll periods with reached pay dates available for payslip generation"
                    : "All payroll periods have payslips generated for all employees"
                  }
                </div>  
              )}
            </SelectContent>
          </Select>
        </div>

        {employees.length > 0 && generateFormData.payroll_period_id && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              Payslips will be generated for{" "}
              {employees.length -
                payslips.filter(
                  (p) => p.payroll_period.id.toString() === generateFormData.payroll_period_id
                ).length}{" "}
              employees
            </h4>
            <div className="text-sm text-blue-800">
              This will create payslips for employees without existing payslips in the selected period.
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setIsGenerateModalOpen(false)} disabled={generating}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-orange-600 hover:bg-orange-700"
          disabled={
            generating ||
            !generateFormData.payroll_period_id ||
            availablePayrollPeriods.length === 0 ||
            (generateFormData.payroll_period_id !== "" &&
              employees.length -
              payslips.filter(
                (p) => p.payroll_period.id.toString() === generateFormData.payroll_period_id
              ).length === 0)
          }
        >
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Payslips for{" "}
          {generateFormData.payroll_period_id
            ? employees.length -
            payslips.filter(
              (p) => p.payroll_period.id.toString() === generateFormData.payroll_period_id
            ).length
            : employees.length}{" "}
          Employees
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by period name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
          />
        </div>
        <div className="flex gap-2 min-w-80">
          <Select
                  value={filterStatus}
                  onValueChange={(value: string) => {
                    if (value === "all" || value === "processed" || value === "pending") {
                      setFilterStatus(value);
                    }
                  }}
                >

            <SelectTrigger className="w-full px-6 h-12 rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rows per Page Selector */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[70px] h-8">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totalPeriods}</div>
            <p className="text-xs text-muted-foreground">Total Periods</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{processedPeriods}</div>
            <p className="text-xs text-muted-foreground">Processed Periods</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingPeriods}</div>
            <p className="text-xs text-muted-foreground">Pending Periods</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{upcomingPayDays}</div>
            <p className="text-xs text-muted-foreground">Upcoming Pay Days (7 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Periods Table */}
      {isRefreshing ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredPeriods.length === 0 ? (
        <div className="p-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No payroll periods found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterStatus !== "all"
              ? "No payroll periods match your filter criteria."
              : "Get started by creating your first payroll period."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-gray-50/80 sticky top-0 z-10">
            <TableRow className="border-b-2 border-gray-200">
              <TableHead className="font-semibold text-gray-700 py-4">Period Name</TableHead>
              <TableHead className="font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Period Dates
                </div>
              </TableHead>
              <TableHead className="font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Pay Date
                </div>
              </TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-gray-700">Days to Pay</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPeriods.map((period, index) => (
              <TableRow
                key={period.id}
                className={`hover:bg-orange-50/30 transition-colors border-b ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                }`}
              >
                <TableCell className="py-4">
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
                    className={`font-medium px-3 py-1 ${
                      period.is_processed
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
      )}

      {/* Clear Filters Button */}
      {(searchTerm || filterStatus !== "all") && (
        <div className="flex justify-end">
          <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2">
            Clear Filters
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {!isRefreshing && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredPeriods.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredPeriods.length)} of {filteredPeriods.length} payroll periods
          {(searchTerm || filterStatus !== "all") && ` (filtered from ${payrollPeriods.length} total)`}
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
          <Select value={currentPage.toString()} onValueChange={(value) => handlePageChange(parseInt(value))}>
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
    </div>
  );
}