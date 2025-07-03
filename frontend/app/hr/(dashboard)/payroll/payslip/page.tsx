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
  const [editingPayslip, setEditingPayslip] = useState<DisplayPayslip | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all")
  const [filterPeriod, setFilterPeriod] = useState<"all" | string>("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const router = useRouter()

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  const [institutionId, setInstitutionId] = useState<number | null>(propInstitutionId || null)

  const [formData, setFormData] = useState({
    employee_id: "",
    payroll_period_id: "",
    basic_salary: "",
    total_allowances: "",
    total_deductions: "",
    days_worked: "30",
    is_paid: false,
    paid_date: "",
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
      employee_id: "",
      payroll_period_id: "",
      basic_salary: "",
      total_allowances: "",
      total_deductions: "",
      days_worked: "30",
      is_paid: false,
      paid_date: "",
    })
    setEditingPayslip(null)
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Auto-calculate totals when relevant fields change
    if (field === "basic_salary" || field === "total_allowances" || field === "total_deductions") {
      const basicSalary =
        field === "basic_salary"
          ? Number.parseFloat(value as string) || 0
          : Number.parseFloat(formData.basic_salary) || 0
      const allowances =
        field === "total_allowances"
          ? Number.parseFloat(value as string) || 0
          : Number.parseFloat(formData.total_allowances) || 0
      const deductions =
        field === "total_deductions"
          ? Number.parseFloat(value as string) || 0
          : Number.parseFloat(formData.total_deductions) || 0

      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          gross_salary: (basicSalary + allowances).toString(),
          net_salary: (basicSalary + allowances - deductions).toString(),
        }))
      }, 0)
    }

    if (field === "employee_id") {
      const selectedEmployee = employees.find((emp) => emp.id === value)
      if (selectedEmployee && selectedEmployee.salary) {
        setFormData((prev) => ({
          ...prev,
          basic_salary: selectedEmployee.salary!.toString(),
        }))
      }
    }
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
      if (editingPayslip) {
        // Handle editing existing payslip
        const payslipData: IPayslipFormData = {
          employee: parseInt(editingPayslip.employee.id),
          payroll_period: parseInt(formData.payroll_period_id),
          basic_salary: formData.basic_salary,
          total_allowances: formData.total_allowances,
          total_deductions: formData.total_deductions,
          gross_salary: (parseFloat(formData.basic_salary) + parseFloat(formData.total_allowances)).toString(),
          net_salary: (parseFloat(formData.basic_salary) + parseFloat(formData.total_allowances) - parseFloat(formData.total_deductions)).toString(),
          days_worked: parseInt(formData.days_worked),
          is_paid: formData.is_paid,
          paid_date: formData.paid_date || null,
        }

        const updatedPayslip = await updatePayslip({
          id: editingPayslip.id,
          payslipData: payslipData
        })
        
        if (updatedPayslip) {
          const displayPayslip = convertToDisplayPayslip(updatedPayslip)
          setPayslips((prev) => prev.map((p) => (p.id === editingPayslip.id ? displayPayslip : p)))
          toast.success("Payslip updated successfully")
        }
      } else {
        // Handle generating new payslips for all employees in the payroll period
        const createdPayslips: DisplayPayslip[] = []
        const skippedEmployees: string[] = []
        const errors: string[] = []

        try {
          // Call the API to generate payslips for the payroll period
          const requestData = {
            payroll_period: parseInt(formData.payroll_period_id)
          }

          console.log("Sending payslip generation request:", requestData)

          // Make direct API call using the correct endpoint from your helper function
          // Based on your createPayslip function, the endpoint is: payroll/${institutionId}/payslips/
          const response = await fetch(`/api/payroll/${institutionId}/payslips/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          })

          if (!response.ok) {
            const errorData = await response.text()
            console.error("API response error:", response.status, errorData)
            throw new Error(`API error: ${response.status} - ${errorData}`)
          }

          const newPayslips = await response.json()
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
          toast.success("Payslips generated successfully")
          
          // Only show additional messages if there were actual issues
          if (skippedEmployees.length > 0) {
            console.log(`Skipped employees: ${skippedEmployees.join(', ')}`)
          }
          
          if (errors.length > 0) {
            console.log(`Errors for some employees: ${errors.join('; ')}`)
            toast.warning("Some payslips had issues - check console for details")
          }
        } else {
          // Only show error messages if no payslips were created at all
          if (skippedEmployees.length > 0) {
            toast.warning("All employees already have payslips for this period")
          } else if (errors.length > 0) {
            toast.error("Failed to generate payslips")
          } else {
            toast.error("No payslips were generated")
          }
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

  const handleEdit = (payslip: DisplayPayslip) => {
    setEditingPayslip(payslip)
    setFormData({
      employee_id: payslip.employee.id,
      payroll_period_id: payslip.payroll_period.id.toString(),
      basic_salary: payslip.basic_salary.toString(),
      total_allowances: payslip.total_allowances.toString(),
      total_deductions: payslip.total_deductions.toString(),
      days_worked: payslip.days_worked.toString(),
      is_paid: payslip.is_paid,
      paid_date: payslip.paid_date || "",
    })
    setIsModalOpen(true)
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
              {/* Single Add Payslip Dialog */}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetForm} 
                    className="bg-orange-600 hover:bg-orange-700 shadow-md"
                    disabled={!institutionId || employees.length === 0 || payrollPeriods.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Payslip
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{editingPayslip ? "Edit Payslip" : "Generate New Payslip"}</DialogTitle>
                    <DialogDescription>Configure payslip details and salary calculations</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {!editingPayslip ? (
                      /* Generate New Payslip - Only Payroll Period Required */
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
                        

                      </div>
                    ) : (
                      /* Edit Existing Payslip - Show All Fields */
                      <>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-yellow-900 mb-2">Editing Payslip</h4>
                          <p className="text-sm text-yellow-800">
                            Employee: <span className="font-medium">{editingPayslip.employee.name}</span> | 
                            Period: <span className="font-medium">{editingPayslip.payroll_period.name}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="basic_salary">Basic Salary (USh) *</Label>
                            <Input
                              id="basic_salary"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={formData.basic_salary}
                              onChange={(e) => handleInputChange("basic_salary", e.target.value)}
                              required
                              disabled={saving}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="total_allowances">Total Allowances (USh)</Label>
                            <Input
                              id="total_allowances"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={formData.total_allowances}
                              onChange={(e) => handleInputChange("total_allowances", e.target.value)}
                              disabled={saving}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="total_deductions">Total Deductions (USh)</Label>
                            <Input
                              id="total_deductions"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={formData.total_deductions}
                              onChange={(e) => handleInputChange("total_deductions", e.target.value)}
                              disabled={saving}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="days_worked">Days Worked</Label>
                            <Input
                              id="days_worked"
                              type="number"
                              min="1"
                              max="31"
                              value={formData.days_worked}
                              onChange={(e) => handleInputChange("days_worked", e.target.value)}
                              disabled={saving}
                            />
                          </div>
                          {formData.is_paid && (
                            <div className="space-y-2">
                              <Label htmlFor="paid_date">Paid Date</Label>
                              <Input
                                id="paid_date"
                                type="date"
                                value={formData.paid_date}
                                onChange={(e) => handleInputChange("paid_date", e.target.value)}
                                disabled={saving}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is_paid"
                            checked={formData.is_paid}
                            onCheckedChange={(checked) => handleInputChange("is_paid", checked as boolean)}
                            disabled={saving}
                          />
                          <Label htmlFor="is_paid">Mark as Paid</Label>
                        </div>

                        {/* Calculated totals display for editing */}
                        {(formData.basic_salary || formData.total_allowances || formData.total_deductions) && (
                          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <h4 className="font-semibold text-gray-900">Calculated Totals</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Gross Salary:</span>
                                <span className="font-semibold ml-2">
                                  USh 
                                  {(
                                    (Number.parseFloat(formData.basic_salary) || 0) +
                                    (Number.parseFloat(formData.total_allowances) || 0)
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Net Salary:</span>
                                <span className="font-semibold ml-2 text-green-600">
                                  USh 
                                  {(
                                    (Number.parseFloat(formData.basic_salary) || 0) +
                                    (Number.parseFloat(formData.total_allowances) || 0) -
                                    (Number.parseFloat(formData.total_deductions) || 0)
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={saving || (!editingPayslip && !formData.payroll_period_id)}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingPayslip ? "Update Payslip" : `Generate Payslips for All Employees`}
                      </Button>
                    </DialogFooter>
                  </form>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(payslip)}
                            className="h-8 w-8 p-0 hover:bg-orange-100 rounded-full"
                            title="Edit payslip"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
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