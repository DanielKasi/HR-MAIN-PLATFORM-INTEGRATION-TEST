"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, CheckCircle, Clock, Users, Loader2, ChevronLeft, ChevronRight, FileText, MoreVertical, Trash2, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import {
  getPayslips,
  deletePayslip,
  markPayslipAsPaid,
  getAllEmployees,
  getPayrollPeriods,
  createBulkPayslips,
  downloadPayrollDocument,
} from "@/lib/utils";
import { IEmployee, IPayrollPeriod, IPayslip } from "@/app/types/types.utils";
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import router from "next/navigation";

interface DisplayPayslip {
  id: number;
  employee: {
    id: string;
    name: string;
    email: string;
    employee_id?: string;
    salary?: number;
    department?: string;
    user?: {
      fullname: string;
      email: string;
    } | null; // Allow null to match API response
  };
  payroll_period: IPayrollPeriod;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_salary: number;
  net_salary: number;
  days_worked: number;
  is_paid: boolean;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function Payslips() {
  const [payslips, setPayslips] = useState<DisplayPayslip[]>([]);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [payrollPeriod, setPayrollPeriod] = useState<IPayrollPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [bulkPaymentModalOpen, setBulkPaymentModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const accessToken = useSelector(selectAccessToken)

  const params = useParams();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const periodId = params.id as string;
  

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedInstitution?.id || !periodId) {
        setIsLoading(false);
        setPayslips([]);
        setEmployees([]);
        setPayrollPeriod(null);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch payroll period
        const periods = await getPayrollPeriods(selectedInstitution.id);
        const targetPeriod = periods?.find((p) => p.id.toString() === periodId);
        if (!targetPeriod) {
          toast.error("Payroll period not found");
          setIsLoading(false);
          return;
        }
        setPayrollPeriod(targetPeriod);

        // Fetch employees
        const fetchedEmployees = await getAllEmployees({ institutionId: selectedInstitution.id });
        if (fetchedEmployees && Array.isArray(fetchedEmployees)) {
          const formattedEmployees = fetchedEmployees.filter((emp) => emp.id && emp.id.toString() !== "0");
          setEmployees(formattedEmployees);
        } else {
          setEmployees([]);
          toast.error("Invalid employee data received", { duration: 5000 });
        }

        // Fetch payslips and filter by period
        const payslipsData = await getPayslips(selectedInstitution.id);
        if (payslipsData && Array.isArray(payslipsData)) {
          const displayPayslips: DisplayPayslip[] = payslipsData
            .filter((p) => p.payroll_period.id.toString() === periodId)
            .map((apiPayslip) => ({
              id: apiPayslip.id,
              employee: {
                id: apiPayslip.employee.id.toString(),
                name: apiPayslip.employee.user?.fullname || apiPayslip.employee.email,
                email: apiPayslip.employee.user?.email || apiPayslip.employee.email,
                employee_id: apiPayslip.employee.id.toString(),
                salary: Number(apiPayslip.employee.salary),
                department: apiPayslip.employee.department?.name || "",
                user: apiPayslip.employee.user
                  ? {
                      fullname: apiPayslip.employee.user.fullname,
                      email: apiPayslip.employee.user.email,
                    }
                  : null,
              },
              payroll_period: {
                id: apiPayslip.payroll_period.id,
                name: apiPayslip.payroll_period.name,
                start_date: apiPayslip.payroll_period.start_date,
                end_date: apiPayslip.payroll_period.end_date,
                pay_date: apiPayslip.payroll_period.pay_date,
                institution: apiPayslip.payroll_period.institution,
                created_at: apiPayslip.payroll_period.created_at,
                is_processed: apiPayslip.payroll_period.is_processed,
              },
              basic_salary: parseFloat(apiPayslip.basic_salary) || 0,
              total_allowances: parseFloat(apiPayslip.total_allowances) || 0,
              total_deductions: parseFloat(apiPayslip.total_deductions) || 0,
              gross_salary: parseFloat(apiPayslip.gross_salary) || 0,
              net_salary: parseFloat(apiPayslip.net_salary) || 0,
              days_worked: apiPayslip.days_worked || 0,
              is_paid: apiPayslip.is_paid || false,
              paid_date: apiPayslip.paid_date || null,
              created_at: apiPayslip.created_at,
              updated_at: apiPayslip.updated_at,
            }));
          setPayslips(displayPayslips);
        } else {
          setPayslips([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data", { duration: 5000 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedInstitution?.id, periodId]);

  const refreshPayslips = async () => {
    if (!selectedInstitution?.id || !periodId) return;

    try {
      const payslipsData = await getPayslips(selectedInstitution.id);
      if (payslipsData && Array.isArray(payslipsData)) {
        const displayPayslips: DisplayPayslip[] = payslipsData
          .filter((p) => p.payroll_period.id.toString() === periodId)
          .map((apiPayslip) => ({
            id: apiPayslip.id,
            employee: {
              id: apiPayslip.employee.id.toString(),
              name: apiPayslip.employee.user?.fullname || apiPayslip.employee.email,
              email: apiPayslip.employee.user?.email || apiPayslip.employee.email,
              employee_id: apiPayslip.employee.id.toString(),
              salary: Number(apiPayslip.employee.salary),
              department: apiPayslip.employee.department?.name || "",
              user: apiPayslip.employee.user
                ? {
                    fullname: apiPayslip.employee.user.fullname,
                    email: apiPayslip.employee.user.email,
                  }
                : null,
            },
            payroll_period: {
              id: apiPayslip.payroll_period.id,
              name: apiPayslip.payroll_period.name,
              start_date: apiPayslip.payroll_period.start_date,
              end_date: apiPayslip.payroll_period.end_date,
              pay_date: apiPayslip.payroll_period.pay_date,
              institution: apiPayslip.payroll_period.institution,
              created_at: apiPayslip.payroll_period.created_at,
              is_processed: apiPayslip.payroll_period.is_processed,
            },
            basic_salary: parseFloat(apiPayslip.basic_salary) || 0,
            total_allowances: parseFloat(apiPayslip.total_allowances) || 0,
            total_deductions: parseFloat(apiPayslip.total_deductions) || 0,
            gross_salary: parseFloat(apiPayslip.gross_salary) || 0,
            net_salary: parseFloat(apiPayslip.net_salary) || 0,
            days_worked: apiPayslip.days_worked || 0,
            is_paid: apiPayslip.is_paid || false,
            paid_date: apiPayslip.paid_date || null,
            created_at: apiPayslip.created_at,
            updated_at: apiPayslip.updated_at,
          }));
        setPayslips(displayPayslips);
      } else {
        setPayslips([]);
      }
    } catch (error) {
      console.error("Error refreshing payslips:", error);
    }
  };

  const filteredPayslips = payslips.filter((payslip) => {
    const matchesSearch =
      payslip.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payslip.employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "paid" && payslip.is_paid) ||
      (filterStatus === "unpaid" && !payslip.is_paid);
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredPayslips.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayslips = filteredPayslips.slice(startIndex, endIndex);

  const resetPagination = () => {
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleDowloadPayroll = async () =>{
    if(!periodId){return}
    try {
      await downloadPayrollDocument({accessToken, payrollId:periodId})
    } catch (error) {
      
    }
  }

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, currentPage + halfVisible);

      if (currentPage <= halfVisible) {
        endPage = Math.min(totalPages, maxVisiblePages);
      }
      if (currentPage > totalPages - halfVisible) {
        startPage = Math.max(1, totalPages - maxVisiblePages + 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push("...");
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push("...");
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const getDepartments = () => {
  const departments = employees
    .map((emp) => emp.department?.name) // Extract department name (string | undefined)
    .filter((dept): dept is string => !!dept && dept.trim() !== "") // Filter out undefined and empty strings
    .filter((dept, index, arr) => arr.indexOf(dept) === index) // Remove duplicates
    .sort(); // Sort alphabetically
  return departments;
};

  const getUnpaidPayslipsByDepartment = (department: string) => {
    return filteredPayslips.filter(
      (payslip) =>
        !payslip.is_paid &&
        (department === "all" || payslip.employee.department === department)
    );
  };

  const handleBulkMarkAsPaid = async () => {
    const unpaidPayslips = getUnpaidPayslipsByDepartment(selectedDepartment);

    if (unpaidPayslips.length === 0) {
      toast.info("No unpaid payslips found for the selected criteria");
      return;
    }

    setBulkProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const payslip of unpaidPayslips) {
        try {
          const success = await markPayslipAsPaid(payslip.id);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        setPayslips((prev) =>
          prev.map((p) => {
            const wasMarked = unpaidPayslips.find((up) => up.id === p.id);
            return wasMarked && !p.is_paid
              ? { ...p, is_paid: true, paid_date: new Date().toISOString() }
              : p;
          })
        );
      }

      if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully processed payment for ${successCount} payslips`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`Processed payments for ${successCount} payslips, ${errorCount} failed`);
      } else {
        toast.error("Failed to mark any payslips as paid");
      }

      setBulkPaymentModalOpen(false);
      setSelectedDepartment("all");
    } catch (error: any) {
      toast.error("An error occurred during bulk payment processing");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleMarkAsPaid = async (payslip: DisplayPayslip) => {
    if (payslip.is_paid) {
      toast.info("This payslip is already marked as paid");
      return;
    }

    try {
      setIsLoading(true);
      const success = await markPayslipAsPaid(payslip.id);

      if (success) {
        setPayslips((prev) =>
          prev.map((p) =>
            p.id === payslip.id
              ? { ...p, is_paid: true, paid_date: new Date().toISOString() }
              : p
          )
        );
        toast.success(`Payslip for ${payslip.employee.name} marked as paid`);
      } else {
        toast.error("Failed to mark payslip as paid");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while marking payslip as paid");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const success = await deletePayslip(id);
      if (success) {
        setPayslips((prev) => prev.filter((p) => p.id !== id));
        toast.success("Payslip deleted successfully");
        setDeleteConfirmId(null);
      } else {
        toast.error("Failed to delete payslip");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the payslip");
    }
  };

  const navigateToPayslipItems = (payslipId: number) => {
    (useRouter()).push(`/payroll/payroll-period/payslip/${payslipId}/items`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  if (!selectedInstitution || !periodId) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution or payroll period selected...</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading payslips...</span>
      </div>
    );
  }

  if (!payrollPeriod) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">Payroll period not found.</span>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-6">
      <Card className="h-[calc(100vh-2rem)] shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
               onClick={() => window.history.back()}  // ✅ Use hook result
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Payroll Periods
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Payslips for {payrollPeriod.name}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage payslips for {formatDate(payrollPeriod.start_date)} - {formatDate(payrollPeriod.end_date)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={bulkPaymentModalOpen} onOpenChange={setBulkPaymentModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-green-600 hover:bg-green-700 shadow-md"
                    disabled={!selectedInstitution || payslips.filter((p) => !p.is_paid).length === 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Bulk Payments
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Process Payments in Bulk</DialogTitle>
                    <DialogDescription>
                      Select a department to mark all unpaid payslips as paid for this period
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="department" className="text-sm font-medium text-gray-700">
                          Department
                        </label>
                        <Select
                          value={selectedDepartment}
                          onValueChange={setSelectedDepartment}
                          disabled={bulkProcessing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {getDepartments().map((dept, idx) => (
                              <SelectItem key={idx} value={dept.toString()}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedDepartment && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-900 mb-2">
                            {getUnpaidPayslipsByDepartment(selectedDepartment).length} unpaid payslips found
                          </h4>
                          <div className="text-sm text-green-800">
                            {selectedDepartment === "all"
                              ? "This will process payments for all unpaid payslips in this period."
                              : `This will process payments for all unpaid payslips in ${selectedDepartment} department.`}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setBulkPaymentModalOpen(false);
                          setSelectedDepartment("all");
                        }}
                        disabled={bulkProcessing}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleBulkMarkAsPaid}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={
                          bulkProcessing ||
                          !selectedDepartment ||
                          getUnpaidPayslipsByDepartment(selectedDepartment).length === 0
                        }
                      >
                        {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Process {getUnpaidPayslipsByDepartment(selectedDepartment).length} Payments
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                    onClick={handleDowloadPayroll}
                    className="bg-orange-600 hover:bg-orange-700 shadow-md"
                    disabled={!selectedInstitution?.id || employees.length === 0 }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by employee name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetPagination();
                }}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onValueChange={(value: "all" | "paid" | "unpaid") => {
                  setFilterStatus(value);
                  resetPagination();
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value: string) => handleItemsPerPageChange(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-sm  overflow-hidden mx-2">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Payslips for {payrollPeriod.name}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({totalItems} total records)
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(endIndex, totalItems)} of {totalItems} records
                </p>
              </div>
              {totalItems > 0 && (
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
          </div>

          {paginatedPayslips.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payslips found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {payslips.length === 0
                  ? "No payslips have been created for this period."
                  : "No payslips match your current filters."}
              </p>
              {payslips.length > 0 && (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    resetPagination();
                  }}
                  variant="outline"
                  className="mt-4 bg-transparent"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Employee
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Basic Salary</TableHead>
                    <TableHead className="font-semibold text-gray-700">Allowances</TableHead>
                    <TableHead className="font-semibold text-gray-700">Deductions</TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Net Salary
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Days</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayslips.map((payslip, index) => (
                    <TableRow
                      key={payslip.id}
                      className={`hover:bg-orange-50/30 transition-colors border-b ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      }`}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-orange-100">
                            <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
                              {getInitials(payslip.employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-gray-900">{payslip.employee.name}</div>
                            <div className="text-sm text-gray-500">{payslip.employee.department || payslip.employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">{formatCurrency(payslip.basic_salary)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">{formatCurrency(payslip.total_allowances)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-red-600">{formatCurrency(payslip.total_deductions)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-700">{formatCurrency(payslip.net_salary)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center font-medium text-gray-700">{payslip.days_worked}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={payslip.is_paid ? "default" : "secondary"}
                          className={`${
                            payslip.is_paid
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200"
                          } font-medium px-3 py-1`}
                        >
                          <div className="flex items-center gap-1">
                            {payslip.is_paid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {payslip.is_paid ? "Paid" : "Unpaid"}
                          </div>
                        </Badge>
                        {payslip.paid_date && (
                          <div className="text-xs text-gray-500 mt-1">{formatDate(payslip.paid_date)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                title="Actions"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white rounded-lg shadow-lg p-3 w-56 space-y-1"
                            >
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigateToPayslipItems(payslip.id)} className="flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                View Payslip Items
                              </DropdownMenuItem>
                              {!payslip.is_paid && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsPaid(payslip)}
                                  className="flex items-center"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(payslip.id)}
                                className="flex items-center text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Dialog
                            open={deleteConfirmId === payslip.id}
                            onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                          >
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete the payslip for {payslip.employee.name} in{" "}
                                  {payslip.payroll_period.name}? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={() => handleDelete(payslip.id)}>
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{" "}
                      <span className="font-medium">{totalItems}</span> results
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </Button>
                    <div className="flex items-center space-x-1">
                      {getPageNumbers().map((page, index) => (
                        <div key={`page-${index}`}>
                          {page === "..." ? (
                            <span className="px-3 py-1 text-gray-500">...</span>
                          ) : (
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className={`w-8 h-8 p-0 ${
                                currentPage === page
                                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}