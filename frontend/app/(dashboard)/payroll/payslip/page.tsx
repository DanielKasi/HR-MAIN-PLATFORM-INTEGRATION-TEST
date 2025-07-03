"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
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
import { Plus, Edit, Trash2, DollarSign, User, Calendar, CheckCircle, Clock, Users, Loader2, ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { toast } from "sonner"
import { useSelector } from "react-redux"

import {
  createPayslip,
  getPayslips,
  updatePayslip,
  deletePayslip,
  markPayslipAsPaid,
  getPayslipsByEmployee,
  getPayslipsByPayrollPeriod,
  getUnpaidPayslips,
  getAllEmployees,
  getPayrollPeriods,
  createBulkPayslips
} from "@/lib/utils"
import { 
  IPayslip, 
  IPayslipFormData,
  IPayrollPeriod,
} from "@/app/types/types.utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"

interface ApiEmployee {
  id: number
  user: {
    id: number
    email: string
    fullname: string
    is_active: boolean
  }
  email: string
  phone_number: string
  position: {
    id: number
    name: string
    department_id: number
  }
  department: {
    id: number
    name: string
    institution_id: number
  }
  date_of_birth: string
  date_of_joining: string
  address: string
  is_active: boolean
  created_at: string
  updated_at: string
  experience: number
  qualifications: string
  skills: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  marital_status: string
  children_count: number
  employee_profile_picture: string
  salary?: number
  basic_salary?: number
}

interface Employee {
  id: string
  name: string
  email: string
  employee_id?: string
  salary?: number
  department?: string
  user?: {
    fullname: string
    email: string
  }
}

interface DisplayPayslip {
  id: number
  employee: Employee
  payroll_period: IPayrollPeriod
  basic_salary: number
  total_allowances: number
  total_deductions: number
  gross_salary: number
  net_salary: number
  days_worked: number
  is_paid: boolean
  paid_date: string | null
  created_at: string
  updated_at: string
}

interface PayslipComponentProps {
  institutionId?: number
}

export default function Payslips({ institutionId: propInstitutionId }: PayslipComponentProps) {
  const [payslips, setPayslips] = useState<DisplayPayslip[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollPeriods, setPayrollPeriods] = useState<IPayrollPeriod[]>([])
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all")
  const [filterPeriod, setFilterPeriod] = useState<"all" | string>("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [bulkPaymentModalOpen, setBulkPaymentModalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const router = useRouter()

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  const [institutionId, setInstitutionId] = useState<number | null>(propInstitutionId || null)

  const [formData, setFormData] = useState({
    payroll_period_id: "",
  })

  // Set institution ID from Redux state
  useEffect(() => {
    if (propInstitutionId) {
      setInstitutionId(propInstitutionId)
    } else if (selectedInstitution?.id) {
      setInstitutionId(selectedInstitution.id)
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id)
    }
  }, [propInstitutionId, institutionsAttached, selectedInstitution])

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!institutionId) {
        return
      }
      
      try {
        const fetchedEmployees = await getAllEmployees({ institutionId })
        
        if (fetchedEmployees && Array.isArray(fetchedEmployees)) {
          const formattedEmployees: Employee[] = fetchedEmployees.map((emp: any) => {
            return {
              id: emp.id?.toString() || emp.employee_id?.toString() || '',
              name: emp.user?.fullname || emp.fullname || emp.name || emp.email || 'Unknown Employee',
              email: emp.user?.email || emp.email || '',
              employee_id: emp.employee_id || emp.id?.toString() || '',
              salary: emp.salary || emp.basic_salary || 0,
              department: emp.department?.name || emp.position?.name || '',
              user: emp.user || null
            }
          }).filter(emp => emp.id && emp.id !== "0") // Filter out invalid IDs
          
          setEmployees(formattedEmployees)
          
          if (formattedEmployees.length === 0) {
            toast.error("No employees found for this institution")
          }
        } else {
          setEmployees([])
          toast.error("Invalid employee data received")
        }
      } catch (error) {
        console.error("Error fetching employees:", error)
        setEmployees([])
        toast.error("Failed to load employees")
      }
    }

    fetchEmployees()
  }, [institutionId])

  useEffect(() => {
    const fetchPayrollPeriods = async () => {
      if (!institutionId) {
        return
      }
      
      try {
        const periods = await getPayrollPeriods(institutionId)
        
        if (periods && Array.isArray(periods)) {
          setPayrollPeriods(periods)
          
          if (periods.length === 0) {
            toast.error("No payroll periods found for this institution")
          }
        } else {
          setPayrollPeriods([])
          toast.error("Invalid payroll periods data received")
        }
      } catch (error) {
        console.error("Error fetching payroll periods:", error)
        setPayrollPeriods([])
        toast.error("Failed to load payroll periods")
      }
    }

    fetchPayrollPeriods()
  }, [institutionId])

  // Load payslips when institution ID is available
  useEffect(() => {
    const fetchPayslips = async () => {
      if (!institutionId) {
        return
      }
      
      try {
        const payslipsData = await getPayslips(institutionId)
        
        if (payslipsData && Array.isArray(payslipsData)) {
          const displayPayslips = payslipsData.map(convertToDisplayPayslip)
          setPayslips(displayPayslips)
        } else {
          setPayslips([])
        }
      } catch (error) {
        console.error("Error fetching payslips:", error)
        setPayslips([])
        toast.error("Failed to load payslips")
      }
    }
    
    fetchPayslips()
  }, [institutionId, employees, payrollPeriods])

  // Function to fetch and refresh payslips data
  const refreshPayslips = async () => {
    if (!institutionId) return
    
    try {
      const payslipsData = await getPayslips(institutionId)
      
      if (payslipsData && Array.isArray(payslipsData)) {
        const displayPayslips = payslipsData.map(convertToDisplayPayslip)
        setPayslips(displayPayslips)
      } else {
        setPayslips([])
      }
    } catch (error) {
      console.error("Error refreshing payslips:", error)
    }
  }

  const convertToDisplayPayslip = (apiPayslip: any): DisplayPayslip => {
    const employee: Employee = {
      id: apiPayslip.employee.id.toString(),
      name: apiPayslip.employee.user.fullname,
      email: apiPayslip.employee.user.email || apiPayslip.employee.email,
      employee_id: apiPayslip.employee.id.toString(),
      salary: 0, // Not provided in payslip response, will use basic_salary from payslip
      department: apiPayslip.employee.department.name,
      user: apiPayslip.employee.user
    }

    const payrollPeriod = {
      id: apiPayslip.payroll_period.id,
      name: apiPayslip.payroll_period.name,
      start_date: apiPayslip.payroll_period.start_date,
      end_date: apiPayslip.payroll_period.end_date,
      pay_date: apiPayslip.payroll_period.pay_date,
      institution: apiPayslip.payroll_period.institution,
      created_at: apiPayslip.payroll_period.created_at,
      is_processed: apiPayslip.payroll_period.is_processed
    } as IPayrollPeriod

    return {
      id: apiPayslip.id,
      employee,
      payroll_period: payrollPeriod,
      basic_salary: parseFloat(apiPayslip.basic_salary),
      total_allowances: parseFloat(apiPayslip.total_allowances),
      total_deductions: parseFloat(apiPayslip.total_deductions),
      gross_salary: parseFloat(apiPayslip.gross_salary),
      net_salary: parseFloat(apiPayslip.net_salary),
      days_worked: apiPayslip.days_worked,
      is_paid: apiPayslip.is_paid,
      paid_date: apiPayslip.paid_date,
      created_at: apiPayslip.created_at,
      updated_at: apiPayslip.updated_at
    }
  }

  const filteredPayslips = payslips.filter((payslip) => {
    const matchesSearch =
      payslip.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payslip.payroll_period.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "paid" && payslip.is_paid) ||
      (filterStatus === "unpaid" && !payslip.is_paid)
    const matchesPeriod = filterPeriod === "all" || payslip.payroll_period.id.toString() === filterPeriod
    return matchesSearch && matchesStatus && matchesPeriod
  })

  const totalItems = filteredPayslips.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPayslips = filteredPayslips.slice(startIndex, endIndex)

  // Reset to first page when filters change
  const resetPagination = () => {
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle items per page change
  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1) // Reset to first page
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, last page, and pages around current page
      const halfVisible = Math.floor(maxVisiblePages / 2)
      let startPage = Math.max(1, currentPage - halfVisible)
      let endPage = Math.min(totalPages, currentPage + halfVisible)
      
      // Adjust if we're near the beginning or end
      if (currentPage <= halfVisible) {
        endPage = Math.min(totalPages, maxVisiblePages)
      }
      if (currentPage > totalPages - halfVisible) {
        startPage = Math.max(1, totalPages - maxVisiblePages + 1)
      }
      
      // Add first page and ellipsis if needed
      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) {
          pages.push('...')
        }
      }
      
      // Add visible pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
      
      // Add ellipsis and last page if needed
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const resetForm = () => {
    setFormData({
      payroll_period_id: "",
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!institutionId) {
      toast.error("Institution ID is required")
      return
    }

    if (!formData.payroll_period_id) {
      toast.error("Please select a payroll period")
      return
    }

    const payrollPeriod = payrollPeriods.find((period) => period.id === Number.parseInt(formData.payroll_period_id))
    if (!payrollPeriod) {
      toast.error("Invalid payroll period selected")
      return
    }

    setSaving(true)
    
    try {
      // Handle generating new payslips for all employees in the payroll period
      const createdPayslips: DisplayPayslip[] = []
      const errors: string[] = []

      try {
        console.log("Generating payslips for payroll period:", formData.payroll_period_id)
        console.log("Institution ID:", institutionId)
        console.log("Employee IDs:", employees.map(emp => parseInt(emp.id)))

        // Use the createBulkPayslips helper function
        const newPayslips = await createBulkPayslips({
          institutionId,
          payrollPeriodId: parseInt(formData.payroll_period_id),
          employeeIds: employees.map(emp => parseInt(emp.id))
        })

        console.log("API response:", newPayslips)
        
        if (newPayslips && Array.isArray(newPayslips)) {
          // Process the array of created payslips
          newPayslips.forEach(payslip => {
            try {
              const displayPayslip = convertToDisplayPayslip(payslip)
              createdPayslips.push(displayPayslip)
            } catch (conversionError: any) {
              console.error(`Conversion error for payslip ${payslip.id}:`, conversionError)
              errors.push(`Payslip ${payslip.id}: Data conversion failed`)
            }
          })
        } else {
          throw new Error("Failed to generate payslips - invalid response")
        }
      } catch (error: any) {
        console.error("Error creating payslips:", error)
        if (error.message) {
          errors.push(error.message)
        } else {
          errors.push("Unknown error occurred")
        }
      }

      // Refresh payslips data from database to show updated table
      await refreshPayslips()

      // Show results - prioritize success message if payslips were created
      if (createdPayslips.length > 0) {
        toast.success(`Successfully generated ${createdPayslips.length} payslips`)
        
        if (errors.length > 0) {
          console.log(`Errors for some employees: ${errors.join('; ')}`)
          toast.warning("Some payslips had issues - check console for details")
        }
      } else {
        // Only show error messages if no payslips were created at all
        if (errors.length > 0) {
          toast.error(`Failed to generate payslips: ${errors[0]}`)
        } else {
          toast.error("No payslips were generated")
        }
      }

      setIsModalOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Failed to save payslip:", error)
      toast.error(error.message || "An error occurred while processing payslips")
    } finally {
      setSaving(false)
    }
  }

  // Get unique departments from employees
  const getDepartments = () => {
    const departments = employees
      .map(emp => emp.department)
      .filter((dept): dept is string => dept !== undefined && dept !== null && dept.trim() !== '')
      .filter((dept, index, arr) => arr.indexOf(dept) === index)
      .sort()
    return departments
  }

  // Get unpaid payslips for selected department
  const getUnpaidPayslipsByDepartment = (department: string) => {
    return payslips.filter(payslip => 
      !payslip.is_paid && 
      (department === "all" || payslip.employee.department === department)
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
      // Process each payslip
      for (const payslip of unpaidPayslips) {
        try {
          const success = await markPayslipAsPaid(payslip.id)
          if (success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          console.error(`Failed to mark payslip ${payslip.id} as paid:`, error)
          errorCount++
        }
      }

      // Update local state for successful payments
      if (successCount > 0) {
        setPayslips((prev) => 
          prev.map((p) => {
            const wasMarked = unpaidPayslips.find(up => up.id === p.id)
            return wasMarked && !p.is_paid
              ? { ...p, is_paid: true, paid_date: new Date().toISOString() }
              : p
          })
        )
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully marked ${successCount} payslips as paid`)
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`Marked ${successCount} payslips as paid, ${errorCount} failed`)
      } else {
        toast.error("Failed to mark any payslips as paid")
      }

      setBulkPaymentModalOpen(false)
      setSelectedDepartment("all")
    } catch (error: any) {
      console.error("Bulk payment error:", error)
      toast.error("An error occurred during bulk payment processing")
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleMarkAsPaid = async (payslip: DisplayPayslip) => {
    if (payslip.is_paid) {
      toast.info("This payslip is already marked as paid")
      return
    }

    try {
      setSaving(true)
      const success = await markPayslipAsPaid(payslip.id)
      
      if (success) {
        // Update the payslip in local state
        setPayslips((prev) => 
          prev.map((p) => 
            p.id === payslip.id 
              ? { ...p, is_paid: true, paid_date: new Date().toISOString() }
              : p
          )
        )
        toast.success(`Payslip for ${payslip.employee.name} marked as paid`)
      } else {
        toast.error("Failed to mark payslip as paid")
      }
    } catch (error: any) {
      console.error("Failed to mark payslip as paid:", error)
      toast.error(error.message || "An error occurred while marking payslip as paid")
    } finally {
      setSaving(false)
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
      console.error("Failed to delete payslip:", error)
      toast.error(error.message || "An error occurred while deleting the payslip")
    }
  }

  const navigateToPayslipItems = (payslipId: number) => {
    router.push(`payslip/${payslipId}/items`)
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

  const formatCurrency = (amount: number) => {
    // Format as UGX but display as USh (common in Uganda)
    return `USh ${amount.toLocaleString()}`
  }

  if (!institutionId) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution selected...</span>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-6">
      <Card className="h-[calc(100vh-2rem)] shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Employee Payslips</CardTitle>
              <CardDescription className="text-gray-600">
                Manage employee payslips for different payroll periods
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Generate Payslip Dialog */}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetForm} 
                    className="bg-orange-600 hover:bg-orange-700 shadow-md"
                    disabled={!institutionId || employees.length === 0 || payrollPeriods.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Payslips
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Generate Payslips</DialogTitle>
                    <DialogDescription>
                      Select a payroll period to generate payslips for all employees
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="payroll_period">Payroll Period *</Label>
                        <Select
                          value={formData.payroll_period_id}
                          onValueChange={(value) => handleInputChange("payroll_period_id", value)}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payroll period to generate payslips for all employees" />
                          </SelectTrigger>
                          <SelectContent>
                            {payrollPeriods.length > 0 ? (
                              payrollPeriods.map((period) => (
                                <SelectItem key={period.id} value={period.id.toString()}>
                                  {period.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-gray-500">
                                No payroll periods available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {employees.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">
                            Payslips will be generated for {employees.length} employees
                          </h4>
                          <div className="text-sm text-blue-800">
                            This will create payslips for all active employees in the selected payroll period.
                          </div>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-orange-600 hover:bg-orange-700" 
                        disabled={saving || !formData.payroll_period_id}
                      >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Payslips for {employees.length} Employees
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Bulk Payment Dialog */}
              <Dialog open={bulkPaymentModalOpen} onOpenChange={setBulkPaymentModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 shadow-md"
                    disabled={!institutionId || payslips.filter(p => !p.is_paid).length === 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Bulk Payments
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Mark as Paid</DialogTitle>
                    <DialogDescription>
                      Select a department to mark all unpaid payslips as paid
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
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
                            {getDepartments().map((dept) => (
                              <SelectItem key={dept} value={dept}>
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
                              ? "This will mark all unpaid payslips across all departments as paid."
                              : `This will mark all unpaid payslips in ${selectedDepartment} department as paid.`
                            }
                          </div>
                          {getUnpaidPayslipsByDepartment(selectedDepartment).length > 0 && (
                            <div className="mt-3">
                              <div className="text-sm font-medium text-green-900 mb-1">Employees to be marked as paid:</div>
                              <div className="text-sm text-green-800">
                                {getUnpaidPayslipsByDepartment(selectedDepartment)
                                  .map(p => p.employee.name)
                                  .join(", ")
                                }
                              </div>
                            </div>
                          )}
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
                        disabled={bulkProcessing || !selectedDepartment || getUnpaidPayslipsByDepartment(selectedDepartment).length === 0}
                      >
                        {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark {getUnpaidPayslipsByDepartment(selectedDepartment).length} Payslips as Paid
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        {/* Search and Filter Section */}
        <div className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by employee name or period..."
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
                value={filterPeriod} 
                onValueChange={(value: "all" | string) => {
                  setFilterPeriod(value)
                  resetPagination()
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {payrollPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id.toString()}>
                      {period.name}
                    </SelectItem>
                  ))}
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Current Payslips
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
                  ? "No payslips have been created yet." 
                  : "No payslips match your current filters."}
              </p>
              {payslips.length > 0 && (
                <Button 
                  onClick={() => {
                    setSearchTerm("")
                    setFilterStatus("all")
                    setFilterPeriod("all")
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
                        <User className="w-4 h-4" />
                        Employee
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Period
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Basic Salary</TableHead>
                    <TableHead className="font-semibold text-gray-700">Allowances</TableHead>
                    <TableHead className="font-semibold text-gray-700">Deductions</TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
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
                        <div className="font-medium text-gray-900">{payslip.payroll_period.name}</div>
                        <div className="text-sm text-gray-500">{payslip.days_worked} days worked</div>
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
                        <div className="flex justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToPayslipItems(payslip.id)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 rounded-full"
                            title="View payslip items"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                          </Button>
                          {!payslip.is_paid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(payslip)}
                              className="h-8 w-8 p-0 hover:bg-green-100 rounded-full"
                              title="Mark as paid"
                              disabled={saving}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Dialog
                            open={deleteConfirmId === payslip.id}
                            onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(payslip.id)}
                                className="h-8 w-8 p-0 hover:bg-red-100 rounded-full"
                                title="Delete payslip"
                              >
                                <Trash2 className="w-4 h-4 text-gray-600" />
                              </Button>
                            </DialogTrigger>
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

              {/* Pagination Controls */}
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
                    {/* Previous Button */}
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
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {getPageNumbers().map((page, index) => (
                        <div key={`page-${index}`}>
                          {page === '...' ? (
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
                    
                    {/* Next Button */}
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