"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TableSkeleton } from "@/components/common/table-skeleton"
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
} from "lucide-react"
import { toast } from "sonner"
import { useSelector } from "react-redux"
import {
  deletePayslip,
  markPayslipAsPaid,
  createBulkPayslips,
  downloadPayrollDocument,
  updatePayslip,
  getPayrollPeriod,
  getDepartments,
} from "@/lib/utils"
import type { IDepartment, IPayrollPeriod, IPayslip } from "@/app/types/types.utils"
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu"
import { formatCurrency } from "@/lib/helpers"
import { payrollAPI } from "@/lib/utils"

export default function PayrollPeriodDetails() {
  const router = useRouter()
  const [payslips, setPayslips] = useState<IPayslip[]>([])
  const [payrollPeriod, setPayrollPeriod] = useState<IPayrollPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [bulkPaymentModalOpen, setBulkPaymentModalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [departments, setDepartments] = useState<IDepartment[]>([])

  const accessToken = useSelector(selectAccessToken)
  const [editingPayslip, setEditingPayslip] = useState<IPayslip | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    basic_salary: 0,
    total_allowances: 0,
    total_deductions: 0,
    days_worked: 0,
  })
  const [isUpdating, setIsUpdating] = useState(false)

  // Add these state variables after the existing ones
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const params = useParams()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const payrollPeriodId = params.id as string

  useEffect(() => {
    if (selectedInstitution && payrollPeriodId) {
      fetchData(currentPage, itemsPerPage)
      fetchDepartments()
    }
  }, [selectedInstitution, payrollPeriodId, currentPage, itemsPerPage, filterStatus])

  const handleErrorToast = (error: any, defaultMessage: string) => {
    toast.error(error?.message || error?.detail || defaultMessage)
  }

  const fetchDepartments = async () => {
    if (!selectedInstitution) {
      return
    }
    try {
      const depts = await getDepartments({ institutionId: selectedInstitution.id })
      setDepartments(depts)
    } catch (error: any) {
      handleErrorToast(error, "Failed to fetch departments")
    }
  }

  const fetchData = async (page = 1, pageSize: number = itemsPerPage) => {
    if (!selectedInstitution?.id || !payrollPeriodId) {
      return
    }

    try {
      setIsLoading(true)

      // Fetch payroll period info
      const fetchedPeriod = await getPayrollPeriod({ payrollPeriodId })
      setPayrollPeriod(fetchedPeriod)

      // Build API parameters for pagination and filters
      const apiParams: {
        page: number
        page_size: number
        is_paid?: boolean
      } = {
        page,
        page_size: pageSize,
      }

      // Add filter parameters
      if (filterStatus === "paid") {
        apiParams.is_paid = true
      } else if (filterStatus === "unpaid") {
        apiParams.is_paid = false
      }

      // Fetch paginated payslips
      const response = await payrollAPI.getPayslipsByPayrollPeriod({
        payrollId: payrollPeriodId,
        params: apiParams,
      })


      setPayslips(response.results)
      setTotalItems(response.count || 0)
      setTotalPages(Math.ceil((response.count || 0) / pageSize))
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data", { duration: 5000 })
    } finally {
      setIsLoading(false)
    }
  }

  // Remove the filteredPayslips calculation and replace with:
  const displayedPayslips = payslips // Data is already filtered and paginated from server

  // Update pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // fetchData will be called by useEffect
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
    // fetchData will be called by useEffect
  }

  const resetPagination = () => {
    setCurrentPage(1)
    // fetchData will be called by useEffect
  }

  const handleDowloadPayroll = async () => {
    if (!payrollPeriodId) {
      return
    }
    try {
      await downloadPayrollDocument({ accessToken, payrollId: payrollPeriodId })
    } catch (error) {}
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2)
      let startPage = Math.max(1, currentPage - halfVisible)
      let endPage = Math.min(totalPages, currentPage + halfVisible)

      if (currentPage <= halfVisible) {
        endPage = Math.min(totalPages, maxVisiblePages)
      }
      if (currentPage > totalPages - halfVisible) {
        startPage = Math.max(1, totalPages - maxVisiblePages + 1)
      }

      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) {
          pages.push("...")
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push("...")
        }
        pages.push(totalPages)
      }
    }

    return pages
  }

  const getUnpaidPayslipsByDepartment = (department: string) => {
    return displayedPayslips.filter(
      (payslip) =>
        !payslip.is_paid && (department === "all" || payslip.employee.department.id.toString() === department),
    )
  }

  const handleBulkMarkAsPaid = async () => {
    const unpaidPayslips = getUnpaidPayslipsByDepartment(selectedDepartment)

    if (unpaidPayslips.length === 0) {
      toast.info("No unpaid payslips found for the selected criteria")
      return
    }

    setBulkProcessing(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const payslip of unpaidPayslips) {
        try {
          const success = await markPayslipAsPaid(payslip.id)
          if (success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      }

      if (successCount > 0) {
        setPayslips((prev) =>
          prev.map((p) => {
            const wasMarked = unpaidPayslips.find((up) => up.id === p.id)
            return wasMarked && !p.is_paid ? { ...p, is_paid: true, paid_date: new Date().toISOString() } : p
          }),
        )
      }

      if (successCount > 0 && errorCount > 0) {
        toast.warning(`Processed payments for ${successCount} payslips, ${errorCount} failed`)
      } else if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully processed payment for ${successCount} payslips`)
      } else {
        toast.error("Failed to mark any payslips as paid")
      }

      setBulkPaymentModalOpen(false)
      setSelectedDepartment("all")
    } catch (error: any) {
      toast.error("An error occurred during bulk payment processing")
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleMarkAsPaid = async (payslip: IPayslip) => {
    if (payslip.is_paid) {
      toast.info("This payslip is already marked as paid")
      return
    }

    try {
      setIsLoading(true)
      const success = await markPayslipAsPaid(payslip.id)

      if (success) {
        setPayslips((prev) =>
          prev.map((p) => (p.id === payslip.id ? { ...p, is_paid: true, paid_date: new Date().toISOString() } : p)),
        )
        toast.success(`Payslip for ${payslip.employee.user?.fullname} marked as paid`)
      } else {
        toast.error("Failed to mark payslip as paid")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while marking payslip as paid")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deletePayslip(id)
      if (success) {
        setPayslips((prev) => prev.filter((p) => p.id !== id))
        toast.success("Payslip deleted successfully")
        setDeleteConfirmId(null)
      } else {
        toast.error("Failed to delete payslip")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the payslip")
    }
  }

  const navigateToPayslipItems = (payslipId: number) => {
    router.push(`/payroll/payroll-period/payslip/${payslipId}/items`)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Add debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        // For now, we'll handle search client-side since the API doesn't support it
        // You may want to add search support to your API later
        fetchData(1, itemsPerPage)
      } else {
        fetchData(currentPage, itemsPerPage)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, currentPage, itemsPerPage])

  if (!selectedInstitution || !payrollPeriodId) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution or payroll period selected...</span>
      </div>
    )
  }

  if (!payrollPeriod) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">Payroll period not found.</span>
      </div>
    )
  }

  const handleEditPayslip = (payslip: IPayslip) => {
    setEditingPayslip(payslip)
    setEditFormData({
      basic_salary: Number(payslip.basic_salary || 0),
      total_allowances: Number(payslip.total_allowances || 0),
      total_deductions: Number(payslip.total_deductions || 0),
      days_worked: payslip.days_worked,
    })
    setEditModalOpen(true)
  }

  const handleUpdatePayslip = async () => {
    if (!editingPayslip) return

    setIsUpdating(true)
    try {
      const basicSalary = Number(editFormData.basic_salary || 0)
      const totalAllowances = Number(editFormData.total_allowances || 0)
      const totalDeductions = Number(editFormData.total_deductions || 0)
      const daysWorked = Number(editFormData.days_worked || 0)

      // Match the exact types expected by IPayslipFormData
      const updatedData = {
        basic_salary: basicSalary.toString(), // string
        total_allowances: totalAllowances.toString(), // string
        total_deductions: totalDeductions.toString(), // string
        days_worked: daysWorked, // number (keep as number)
        gross_salary: (basicSalary + totalAllowances).toString(), // string
        net_salary: (basicSalary + totalAllowances - totalDeductions).toString(), // string
      }

      const updatedPayslip = await updatePayslip({
        id: editingPayslip.id,
        payslipData: updatedData, // Now matches IPayslipFormData types
      })
      setPayslips((prev) => [...prev.map((slip) => (slip.id === updatedPayslip.id ? updatedPayslip : slip))])

      toast.success("Payslip updated successfully")
      setEditModalOpen(false)
      setEditingPayslip(null)
    } catch (error: any) {
      toast.error(error?.message || error?.detail || "Failed to update payslip")
    } finally {
      setIsUpdating(false)
    }
  }

  const resetEditForm = () => {
    setEditFormData({
      basic_salary: 0,
      total_allowances: 0,
      total_deductions: 0,
      days_worked: 0,
    })
    setEditingPayslip(null)
  }

  const handleGeneratePayslips = async () => {
    if (!selectedInstitution) {
      toast.error("No institution found")
      return
    }

    setIsGenerating(true)
    try {
      await createBulkPayslips({
        institutionId: selectedInstitution.id,
        payrollPeriodId: Number(payrollPeriodId),
      })
      toast.success(`Successfully generated payslips`)
      await fetchData(currentPage, itemsPerPage)
    } catch (error: any) {
      toast.error(error?.message || error?.detail || "An error occurred while processing payslips")
    } finally {
      setIsGenerating(false)
    }
  }

  // Show skeleton loading state
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

  const startIndex = (currentPage - 1) * itemsPerPage

  return (
    <div className="p-2 space-y-6">
      <Card className="h-[calc(100vh-2rem)] shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between gap-8 items-center">
            <div className="flex items-center justify-start gap-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex items-center gap-2 rounded-full aspect-square"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Payslips for {payrollPeriod.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  Manage payslips for {formatDate(payrollPeriod.start_date)} - {formatDate(payrollPeriod.end_date)}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={bulkPaymentModalOpen} onOpenChange={setBulkPaymentModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-green-600 hover:bg-green-700 shadow-md"
                    disabled={!selectedInstitution || displayedPayslips.filter((p) => !p.is_paid).length === 0}
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
                            {departments.map((dept, idx) => (
                              <SelectItem key={idx} value={dept.toString()}>
                                {dept.name}
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
                          setBulkPaymentModalOpen(false)
                          setSelectedDepartment("all")
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
                onClick={handleGeneratePayslips}
                className="bg-green-600 hover:bg-green-700 shadow-md disabled:bg-gray-400"
                disabled={!selectedInstitution || !payrollPeriodId}
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Payslips
              </Button>

              <Button
                onClick={handleDowloadPayroll}
                className="bg-orange-600 hover:bg-orange-700 shadow-md"
                disabled={!selectedInstitution?.id}
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
                  setSearchTerm(e.target.value)
                  resetPagination()
                }}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onValueChange={(value: "all" | "paid" | "unpaid") => {
                  setFilterStatus(value)
                  resetPagination()
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
                onValueChange={(value: string) => handleItemsPerPageChange(Number.parseInt(value))}
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
                  <span className="text-sm font-normal text-gray-500 ml-2">({totalItems} total records)</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {totalItems > 0 ? startIndex + 1 : 0} to {startIndex + displayedPayslips.length} of{" "}
                  {totalItems} records
                </p>
              </div>
              {totalItems > 0 && (
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
          </div>

          {displayedPayslips.length === 0 ? (
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
                    setSearchTerm("")
                    setFilterStatus("all")
                    resetPagination()
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
                  {displayedPayslips.map((payslip, index) => (
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
                              {getInitials(payslip.employee.user?.fullname || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-gray-900">{payslip.employee.user?.fullname || ""}</div>
                            <div className="text-sm text-gray-500">{payslip.employee.department.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">UGX {formatCurrency(payslip.basic_salary)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">
                          UGX {formatCurrency(payslip.total_allowances)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-red-600">UGX {formatCurrency(payslip.total_deductions)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-700">UGX {formatCurrency(payslip.net_salary)}</div>
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
                            <DropdownMenuContent align="end" className="bg-white rounded-lg shadow-lg p-3">
                              {/* Add Edit button as first option */}
                              <DropdownMenuItem className="flex justify-start">
                                <Button
                                  variant={"ghost"}
                                  className="!w-full !justify-start flex"
                                  onClick={() => handleEditPayslip(payslip)}
                                >
                                  <Edit className="w-4 h-4 mr-2 text-blue-600" />
                                  Edit Payslip
                                </Button>
                              </DropdownMenuItem>

                              <DropdownMenuItem className="flex justify-start">
                                <Button
                                  variant={"ghost"}
                                  className="!w-full !justify-start flex"
                                  onClick={() => navigateToPayslipItems(payslip.id)}
                                >
                                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                  View Payslip Items
                                </Button>
                              </DropdownMenuItem>

                              {/* Rest of your existing menu items */}
                              {!payslip.is_paid && (
                                <DropdownMenuItem className="!justify-start !items-start flex">
                                  <Button
                                    variant={"ghost"}
                                    className="!w-full !items-start justify-start flex"
                                    onClick={() => handleMarkAsPaid(payslip)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                    Mark as Paid
                                  </Button>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem className="flex !justify-start items-center text-red-600 focus:text-red-700">
                                <Button
                                  variant={"ghost"}
                                  className="!w-full !items-start justify-start"
                                  onClick={() => setDeleteConfirmId(payslip.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
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
                                  Are you sure you want to delete the payslip for{" "}
                                  {payslip.employee.user?.fullname || ""} in {payslip.payroll_period.name}? This action
                                  cannot be undone.
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
                          {/* Add this Edit Modal Dialog after the delete confirmation dialog */}
                          <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Edit Payslip</DialogTitle>
                                <DialogDescription>
                                  Update payslip details for {editingPayslip?.employee.user?.fullname || ""} in{" "}
                                  {editingPayslip?.payroll_period.name}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="grid grid-cols-2 gap-4 py-4">
                                <div className="space-y-2">
                                  <label htmlFor="basic_salary" className="text-sm font-medium">
                                    Basic Salary (UGX)
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
                                  <label htmlFor="total_allowances" className="text-sm font-medium">
                                    Total Allowances (UGX)
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
                                  <label htmlFor="total_deductions" className="text-sm font-medium">
                                    Total Deductions (UGX)
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
                                      UGX{" "}
                                      {formatCurrency(
                                        Number(editFormData.basic_salary || 0) +
                                          Number(editFormData.total_allowances || 0),
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Net Salary:</span>
                                    <span className="ml-2 font-medium text-green-600">
                                      UGX{" "}
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
                                    setEditModalOpen(false)
                                    resetEditForm()
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{" "}
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
  )
}
