"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { InfiniteScrollSelect } from "@/components/infinite-scroll-select";
import {
  Plus,
  CheckCircle,
  Clock,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreVertical,
  Trash2,
  Download,
  ArrowLeft,
  Edit,
  CreditCard,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import {
  deletePayslip,
  markPayslipAsPaid,
  createBulkPayslips,
  downloadPayrollDocument,
  updatePayslip,
  getPayrollPeriod,
  getDepartments,
  downloadSinglePayslip,
  showErrorToast,
} from "@/lib/utils";
import type { IDepartment, IPayrollPeriod, IPayslip, IBankAccount } from "@/types/types.utils";
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/helpers";
import { payrollAPI, bankAccountsAPI } from "@/lib/utils";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";

export default function PayrollPeriodDetails() {
  const router = useRouter();
  const [payrollPeriod, setPayrollPeriod] = useState<IPayrollPeriod | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [bulkPaymentModalOpen, setBulkPaymentModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [departments, setDepartments] = useState<IDepartment[]>([]);

  const accessToken = useSelector(selectAccessToken);
  const [editingPayslip, setEditingPayslip] = useState<IPayslip | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    basic_salary: 0,
    total_allowances: 0,
    total_deductions: 0,
    days_worked: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Add these state variables after the existing ones
  // const [totalItems, setTotalItems] = useState(0);
  // const [totalPages, setTotalPages] = useState(0);

  // Bank account selection modal states
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<IBankAccount[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<IBankAccount | null>(null);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [bankAccountsHasMore, setBankAccountsHasMore] = useState(true);
  const [bankAccountsPage, setBankAccountsPage] = useState(1);
  const [bankAccountsSearch, setBankAccountsSearch] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPayslipDownLoading, setIsPayslipDownloading] = useState(false);
  const [displayedPayslips, setDisplayedPayslips] = useState<IPayslip[]>([]);
  const refreshFunctionRef = useRef<(() => void) | null>(null);

  const params = useParams();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const payrollPeriodId = params.id as string;

  const extractItems = (payslips: IPayslip[]) => {
    const allItems = new Set<string>();

    payslips.forEach((payslip) => {
      if (payslip.items?.allowance) {
        Object.keys(payslip.items.allowance).forEach((key) => allItems.add(key));
      }
      if (payslip.items?.deduction) {
        Object.keys(payslip.items.deduction).forEach((key) => allItems.add(key));
      }
    });

    return Array.from(allItems).sort();
  };

  useEffect(() => {
    if (selectedInstitution && payrollPeriodId) {
      fetchDepartments();
      fetchData()
    }
  }, [selectedInstitution, payrollPeriodId]);

  const handleErrorToast = (error: any, defaultMessage: string) => {
    toast.error(error?.message || error?.detail?.error || defaultMessage);
  };

  const fetchDepartments = async () => {
    if (!selectedInstitution) {
      return;
    }
    try {
      const depts = await getDepartments({ institutionId: selectedInstitution.id });
      setDepartments(depts);
    } catch (error: any) {
      handleErrorToast(error, "Failed to fetch departments");
    }
  };

  const fetchData = async () => {
    if (!selectedInstitution?.id || !payrollPeriodId) {
      return;
    }
    try {
      const fetchedPeriod = await getPayrollPeriod({ payrollPeriodId });
      setPayrollPeriod(fetchedPeriod);
    } catch (error) {
      showErrorToast({ error, defaultMessage: "Failed to load payroll period" })
    }
  };


  // Bank accounts fetching functions
  const fetchBankAccounts = async (page = 1, search = "", reset = false) => {
    try {
      setBankAccountsLoading(true);

      const searchParams = new URLSearchParams();
      searchParams.append("page", page.toString());
      searchParams.append("page_size", "20");
      if (search) {
        searchParams.append("search", search);
      }

      const response = await bankAccountsAPI.getAll(`?${searchParams.toString()}`);

      if (reset) {
        setBankAccounts(response.results);
      } else {
        setBankAccounts((prev) => [...prev, ...response.results]);
      }

      setBankAccountsHasMore(!!response.next);
      setBankAccountsPage(page);
    } catch (error: any) {
      handleErrorToast(error, "Failed to fetch bank accounts");
    } finally {
      setBankAccountsLoading(false);
    }
  };

  const handleBankAccountSearch = (query: string) => {
    setBankAccountsSearch(query);
    setBankAccountsPage(1);
    fetchBankAccounts(1, query, true);
  };

  const handleLoadMoreBankAccounts = () => {
    if (!bankAccountsLoading && bankAccountsHasMore) {
      fetchBankAccounts(bankAccountsPage + 1, bankAccountsSearch, false);
    }
  };

  // Initialize bank accounts when modal opens
  useEffect(() => {
    if (downloadModalOpen && bankAccounts.length === 0) {
      fetchBankAccounts(1, "", true);
    }
  }, [downloadModalOpen]);



  const handleDownloadPayroll = async () => {
    if (!selectedBankAccount) {
      toast.error("Please select a bank account");
      return;
    }

    if (!payrollPeriodId) {
      return;
    }

    try {
      setIsDownloading(true);
      await downloadPayrollDocument({
        accessToken,
        payrollId: payrollPeriodId,
        payingAccountId: selectedBankAccount.id.toString(),
      });
      toast.success("Payroll document download started");
      setDownloadModalOpen(false);
      setSelectedBankAccount(null);
    } catch (error: any) {
      handleErrorToast(error, "Failed to download payroll document");
    } finally {
      setIsDownloading(false);
    }
  };



  const getUnpaidPayslipsByDepartment = (department: string) => {
    return displayedPayslips.filter(
      (payslip) =>
        !payslip.is_paid &&
        (department === "all" || payslip.employee.department.id.toString() === department),
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


      if (successCount > 0 && errorCount > 0) {
        toast.warning(`Processed payments for ${successCount} payslips, ${errorCount} failed`);
      } else if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully processed payment for ${successCount} payslips`);
      } else {
        toast.error("Failed to mark any payslips as paid");
      }

      setBulkPaymentModalOpen(false);
      setSelectedDepartment("all");
      if (refreshFunctionRef.current) {
        refreshFunctionRef.current()
      }
    } catch (error: any) {
      showErrorToast({ error, defaultMessage: "An error occurred during bulk payment processing" })
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleMarkAsPaid = async (payslip: IPayslip) => {
    if (payslip.is_paid) {
      toast.info("This payslip is already marked as paid");
      return;
    }

    try {
      await markPayslipAsPaid(payslip.id);
      toast.success(`Payslip for ${payslip.employee.user?.fullname} marked as paid`);
      if (refreshFunctionRef.current) { refreshFunctionRef.current() }
    } catch (error: any) {
      showErrorToast({ error, defaultMessage: "An error occurred while marking payslip as paid" })
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const success = await deletePayslip(id);
      toast.success("Payslip deleted successfully");
      setDeleteConfirmId(null);
      if (refreshFunctionRef.current) { refreshFunctionRef.current() }

    } catch (error: any) {
      showErrorToast({ error, defaultMessage: "An error occurred while deleting the payslip" })
    } finally {
    }
  };

  const navigateToPayslipItems = (payslipId: number) => {
    router.push(`/payroll/payroll-period/payslip/${payslipId}/items`);
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




  const handleEditPayslip = (payslip: IPayslip) => {
    setEditingPayslip(payslip);
    setEditFormData({
      basic_salary: Number(payslip.basic_salary || 0),
      total_allowances: Number(payslip.total_allowances || 0),
      total_deductions: Number(payslip.total_deductions || 0),
      days_worked: payslip.days_worked,
    });
    setEditModalOpen(true);
  };

  const handleUpdatePayslip = async () => {
    if (!editingPayslip) return;

    setIsUpdating(true);
    try {
      const basicSalary = Number(editFormData.basic_salary || 0);
      const totalAllowances = Number(editFormData.total_allowances || 0);
      const totalDeductions = Number(editFormData.total_deductions || 0);
      const daysWorked = Number(editFormData.days_worked || 0);

      const updatedData = {
        basic_salary: basicSalary.toString(),
        total_allowances: totalAllowances.toString(),
        total_deductions: totalDeductions.toString(),
        days_worked: daysWorked,
        gross_salary: (basicSalary + totalAllowances).toString(),
        net_salary: (basicSalary + totalAllowances - totalDeductions).toString(),
      };

      const updatedPayslip = await updatePayslip({
        id: editingPayslip.id,
        payslipData: updatedData,
      });

      if (refreshFunctionRef.current) { refreshFunctionRef.current() }

      toast.success("Payslip updated successfully");
      setEditModalOpen(false);
      setEditingPayslip(null);
    } catch (error: any) {
      showErrorToast({ error, defaultMessage: "Failed to update payslip" })
    } finally {
      setIsUpdating(false);
    }
  };


  const handlePayslipDownLoad = async (payslipId: number) => {
    setIsPayslipDownloading(true);
    try {
      toast.info("Downloading payroll passlips report...");
      await downloadSinglePayslip({ accessToken, payslipId });
    } catch (error) {
      showErrorToast({ error, defaultMessage: "Failed to download payroll passlips report." });
    } finally {
      setIsPayslipDownloading(false);
    }
  };

  const resetEditForm = () => {
    setEditFormData({
      basic_salary: 0,
      total_allowances: 0,
      total_deductions: 0,
      days_worked: 0,
    });
    setEditingPayslip(null);
  };

  const handleGeneratePayslips = async () => {
    if (!selectedInstitution) {
      toast.error("No institution found");
      return;
    }

    setIsGenerating(true);
    try {
      await createBulkPayslips({
        institutionId: selectedInstitution.id,
        payrollPeriodId: Number(payrollPeriodId),
      });
      toast.success(`Successfully generated payslips`);
      if (refreshFunctionRef.current) { refreshFunctionRef.current() }
    } catch (error: any) {
      showErrorToast({ error, defaultMessage: "An error occurred while processing payslips" })
    } finally {
      setIsGenerating(false);
    }
  };




  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <div>
        <CardHeader className="p-0">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-8 sm:items-center">
            <div className="flex items-center justify-start gap-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                {payrollPeriod && (
                  <>
                    <CardTitle className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                      Payslips for {payrollPeriod.name}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base text-gray-600">
                      Manage payslips for {formatDate(payrollPeriod.start_date)} -{" "}
                      {formatDate(payrollPeriod.end_date)}
                    </CardDescription>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 sm:mt-10">
          {/* Search bar */}
          <div className="relative flex-1 max-w-full sm:max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by employee name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="pl-10 h-12 w-full"
            />
          </div>

          {/* Buttons container */}
          <div className="flex flex-col sm:flex-row gap-2 sm:ml-6">
            {/* Bulk Payments dialog/button */}
            <Dialog open={bulkPaymentModalOpen} onOpenChange={setBulkPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-green-600 hover:bg-green-700 shadow-md w-full sm:w-auto"
                  disabled={
                    !selectedInstitution || displayedPayslips.filter((p) => !p.is_paid).length === 0
                  }
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Bulk Payments</span>
                  <span className="sm:hidden">Bulk Pay</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4">
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
                          {departments.map((dept, idx) => (
                            <SelectItem key={idx} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDepartment && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">
                          {getUnpaidPayslipsByDepartment(selectedDepartment).length} unpaid payslips
                          found
                        </h4>
                        <div className="text-sm text-green-800">
                          {selectedDepartment === "all"
                            ? "This will process payments for all unpaid payslips in this period."
                            : `This will process payments for all unpaid payslips in ${departments.find((dept) => dept.id.toString() === selectedDepartment)?.name || ""}.`}
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

            {/* Generate Payslips button */}
            {payrollPeriod && (
              <Button
                onClick={handleGeneratePayslips}
                className="bg-green-600 hover:bg-green-700 shadow-md disabled:bg-gray-400 w-full sm:w-auto"
                disabled={
                  payrollPeriod.is_processed ||
                  !selectedInstitution ||
                  !payrollPeriodId ||
                  isGenerating
                }
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                <span className="hidden sm:inline">
                  {isGenerating ? "Generating..." : "Generate Payslips"}
                </span>
                <span className="sm:hidden">{isGenerating ? "Generating..." : "Generate"}</span>
              </Button>
            )}

            {payrollPeriod && (
              <Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="shadow-md w-full sm:w-auto"
                    disabled={!selectedInstitution?.id}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download EFT
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Select Payment Account
                    </DialogTitle>
                    <DialogDescription>
                      Choose the bank account from which payslips will be generated for{" "}
                      {payrollPeriod.name}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4">
                    <InfiniteScrollSelect
                      items={bankAccounts}
                      loading={bankAccountsLoading}
                      hasMore={bankAccountsHasMore}
                      onLoadMore={handleLoadMoreBankAccounts}
                      onSearch={handleBankAccountSearch}
                      onSelect={setSelectedBankAccount}
                      selectedItem={selectedBankAccount}
                      getItemId={(account) => account.id}
                      getItemLabel={(account) => account.account_name || account.account_number}
                      getItemDescription={(account) =>
                        `${account.account_name} • ${account.account_number}`
                      }
                      placeholder="Select a bank account..."
                      searchPlaceholder="Search bank accounts..."
                      emptyMessage="No bank accounts found"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDownloadModalOpen(false);
                        setSelectedBankAccount(null);
                      }}
                      disabled={isDownloading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDownloadPayroll}
                      disabled={!selectedBankAccount || isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Payroll
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white mx-0 sm:mx-2">

          <>
            <PaginatedTableWrapper<IPayslip>
              fetchFirstPage={async () => {
                if (!selectedInstitution) throw new Error("No institution selected");
                return await payrollAPI.getPayslipsByPayrollPeriod({
                  payrollId: payrollPeriodId,
                  institutionId: selectedInstitution.id,
                  search: undefined
                });
              }}
              fetchFromUrl={async (args: { url: string }) =>
                payrollAPI.getPaginatedPayslipsByPeriollPeriodFromUrl({ url: args.url })
              }
              deps={[selectedInstitution?.id, searchTerm]}
              className="space-y-4"
              footerClassName="pt-4"
            >
              {({ data, loading, refresh }) => {

                useEffect(() => {
                  setDisplayedPayslips(data?.results || [])
                }, [data])

                refreshFunctionRef.current = refresh

                if (loading) {
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
                  );
                }

                return (
                  <div className="overflow-x-auto mt-6 sm:mt-10">
                    <Table className="min-w-max [&_th]:border-0 [&_td]:border-0">
                      <TableHeader className="bg-gray-50/50">
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700 py-4 min-w-[200px] sm:min-w-0">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Employee
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 min-w-[120px]">
                            Basic Salary
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 min-w-[120px]">
                            Allowances
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 min-w-[120px]">
                            Deductions
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Net Salary
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 min-w-[80px]">
                            Days
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 min-w-[100px]">
                            Status
                          </TableHead>
                          {/* Dynamic item columns */}
                          {extractItems(displayedPayslips).map((itemName, index) => (
                            <TableHead
                              key={itemName}
                              className={`text-center font-semibold text-gray-700 min-w-[100px] ${index === 0 ? "border-l border-gray-200" : ""
                                }`}
                            >
                              {itemName}
                            </TableHead>
                          ))}
                          <TableHead className="font-semibold text-gray-700 text-center sticky right-0 bg-white z-10 border-l min-w-[120px]">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedPayslips.map((payslip, index) => (
                          <TableRow
                            key={payslip.id}
                            className={`hover:bg-orange-50/30 transition-colors border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                              }`}
                          >
                            <TableCell className="py-4 min-w-[200px] sm:min-w-0">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-orange-100 flex-shrink-0">
                                  <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-xs sm:text-sm">
                                    {getInitials(payslip.employee.user?.fullname || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                    {payslip.employee.user?.fullname || ""}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {payslip.employee.department.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(payslip.basic_salary)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(payslip.total_allowances)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-red-600">
                                {formatCurrency(payslip.total_deductions)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-green-700">
                                {formatCurrency(payslip.net_salary)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center font-medium text-gray-700">
                                {payslip.days_worked}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={payslip.is_paid ? "default" : "secondary"}
                                className={`${payslip.is_paid
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  } font-medium px-3 py-1`}
                              >
                                <div className="flex items-center gap-1">
                                  {payslip.is_paid ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {payslip.is_paid ? "Paid" : "Unpaid"}
                                </div>
                              </Badge>
                              {payslip.paid_date && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatDate(payslip.paid_date)}
                                </div>
                              )}
                            </TableCell>
                            {/* Dynamic item cells */}
                            {extractItems(displayedPayslips).map((itemName, index) => {
                              const allowanceItem = payslip.items?.allowance?.[itemName];
                              const deductionItem = payslip.items?.deduction?.[itemName];

                              let totalAmount = 0;
                              let count = 0;
                              let isDeduction = false;

                              if (allowanceItem) {
                                totalAmount = allowanceItem.reduce(
                                  (sum, item) => sum + Number.parseFloat(item.amount),
                                  0,
                                );
                                count = allowanceItem.length;
                              } else if (deductionItem) {
                                totalAmount = deductionItem.reduce(
                                  (sum, item) => sum + Number.parseFloat(item.amount),
                                  0,
                                );
                                count = deductionItem.length;
                                isDeduction = true;
                              }

                              return (
                                <TableCell
                                  key={itemName}
                                  className={`text-center ${index === 0 ? "border-l border-gray-200" : ""}`}
                                >
                                  {totalAmount > 0 ? (
                                    <div className="space-y-1">
                                      <div
                                        className={`font-semibold ${isDeduction ? "text-red-600" : "text-green-600"}`}
                                      >
                                        {formatCurrency(totalAmount)}
                                      </div>
                                      {count > 1 && (
                                        <div className="text-xs text-gray-500">{count}x</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="sticky right-0 bg-white z-10 border-l">
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
                                    className="bg-white rounded-lg shadow-lg p-3"
                                  >
                                    {/* Add Edit button as first option */}
                                    <DropdownMenuItem className="flex justify-start"
                                      onClick={() => handleEditPayslip(payslip)}>

                                      <Edit className="w-4 h-4 mr-2 text-blue-600" />
                                      Edit Payslip
                                    </DropdownMenuItem>

                                    <DropdownMenuItem className="flex justify-start"
                                      onClick={() => navigateToPayslipItems(payslip.id)}>

                                      <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                      View Payslip Items
                                    </DropdownMenuItem>

                                    {/* Rest of your existing menu items */}
                                    {!payslip.is_paid && (
                                      <DropdownMenuItem className="!justify-start !items-start flex"
                                        onClick={() => handleMarkAsPaid(payslip)}>
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem className="flex !justify-start items-center text-red-600 focus:text-red-700"
                                      onClick={() => setDeleteConfirmId(payslip.id)}>

                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handlePayslipDownLoad(payslip.id)}
                                      disabled={isPayslipDownLoading}
                                      className="flex items-center w-full"
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Payslip
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Dialog
                                  open={deleteConfirmId === payslip.id}
                                  onOpenChange={(open: any) => !open && setDeleteConfirmId(null)}
                                >
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Confirm Deletion</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete the payslip for{" "}
                                        {payslip.employee.user?.fullname || ""} in{" "}
                                        {payslip.payroll_period.name}? This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button
                                        variant="outline"
                                        onClick={() => setDeleteConfirmId(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleDelete(payslip.id)}
                                      >
                                        Delete
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                {/* Add this Edit Modal Dialog after the delete confirmation dialog */}
                                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Edit Payslip</DialogTitle>
                                      <DialogDescription>
                                        Update payslip details for{" "}
                                        {editingPayslip?.employee.user?.fullname || ""} in{" "}
                                        {editingPayslip?.payroll_period.name}
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid grid-cols-2 gap-4 py-4">
                                      <div className="space-y-2">
                                        <label htmlFor="basic_salary" className="text-sm font-medium">
                                          Basic Salary
                                        </label>
                                        <Input
                                          id="basic_salary"
                                          type="number"
                                          value={editFormData.basic_salary}
                                          onChange={(e) =>
                                            setEditFormData((prev) => ({
                                              ...prev,
                                              basic_salary: Number(e.target.value),
                                            }))
                                          }
                                          disabled={isUpdating}
                                          placeholder="Enter basic salary"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label htmlFor="days_worked" className="text-sm font-medium">
                                          Days Worked
                                        </label>
                                        <Input
                                          id="days_worked"
                                          type="number"
                                          value={editFormData.days_worked}
                                          onChange={(e) =>
                                            setEditFormData((prev) => ({
                                              ...prev,
                                              days_worked: Number(e.target.value),
                                            }))
                                          }
                                          disabled={isUpdating}
                                          placeholder="Enter days worked"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label
                                          htmlFor="total_allowances"
                                          className="text-sm font-medium"
                                        >
                                          Total Allowances
                                        </label>
                                        <Input
                                          id="total_allowances"
                                          type="number"
                                          value={editFormData.total_allowances}
                                          onChange={(e) =>
                                            setEditFormData((prev) => ({
                                              ...prev,
                                              total_allowances: Number(e.target.value),
                                            }))
                                          }
                                          disabled={isUpdating}
                                          placeholder="Enter total allowances"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label
                                          htmlFor="total_deductions"
                                          className="text-sm font-medium"
                                        >
                                          Total Deductions
                                        </label>
                                        <Input
                                          id="total_deductions"
                                          type="number"
                                          value={editFormData.total_deductions}
                                          onChange={(e) =>
                                            setEditFormData((prev) => ({
                                              ...prev,
                                              total_deductions: Number(e.target.value),
                                            }))
                                          }
                                          disabled={isUpdating}
                                          placeholder="Enter total deductions"
                                        />
                                      </div>
                                    </div>

                                    {/* Preview calculated values */}
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                      <h4 className="font-medium text-gray-900">Calculated Values</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-gray-600">Gross Salary:</span>
                                          <span className="ml-2 font-medium">
                                            {" "}
                                            {formatCurrency(
                                              Number(editFormData.basic_salary || 0) +
                                              Number(editFormData.total_allowances || 0),
                                            )}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Net Salary:</span>
                                          <span className="ml-2 font-medium text-green-600">
                                            {" "}
                                            {formatCurrency(
                                              Number(editFormData.basic_salary || 0) +
                                              Number(editFormData.total_allowances || 0) -
                                              Number(editFormData.total_deductions || 0),
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <DialogFooter>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setEditModalOpen(false);
                                          resetEditForm();
                                        }}
                                        disabled={isUpdating}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={handleUpdatePayslip}
                                        disabled={isUpdating}
                                        className="bg-orange-600 hover:bg-orange-700"
                                      >
                                        {isUpdating ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                          </>
                                        ) : (
                                          "Update Payslip"
                                        )}
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
                  </div>
                )
              }}

            </PaginatedTableWrapper>


          </>
        </div>
      </div>
    </div>
  );
}
