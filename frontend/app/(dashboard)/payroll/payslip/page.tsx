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
import { Plus, Edit, Trash2, DollarSign, User, Calendar, CheckCircle, Clock, Users, Loader2, ChevronLeft, ChevronRight, FileText, } from "lucide-react"
import { toast } from "sonner"
import { useSelector } from "react-redux"

// Import API functions and interfaces
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

interface BulkPayslipData {
  employee_id: number
  basic_salary: number
  total_allowances: number
  total_deductions: number
  days_worked: number
  is_paid: boolean
  paid_date: string
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
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingPayslip, setEditingPayslip] = useState<DisplayPayslip | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all")
  const [filterPeriod, setFilterPeriod] = useState<"all" | string>("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const router = useRouter()

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

 
  const [bulkPayrollPeriod, setBulkPayrollPeriod] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [bulkPayslipData, setBulkPayslipData] = useState<BulkPayslipData[]>([])
  const [bulkDefaults, setBulkDefaults] = useState({
    allowances: "0",
    deductions: "0",
    days_worked: "22",
    is_paid: false,
    paid_date: "",
  })
  const [bulkSelectionMode, setBulkSelectionMode] = useState<"individual" | "department">("individual")
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])

  // Get unique departments from employees
  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean))) as string[]

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

  const navigateToPayslipItems = (payslipId: number) => {
    router.push(`payslip/${payslipId}/items`)
  }

  
  const convertToDisplayPayslip = (apiPayslip: any): DisplayPayslip => {
    const employee: Employee = {
      id: apiPayslip.employee.id.toString(),
      name: apiPayslip.employee.user.fullname,
      email: apiPayslip.employee.user.email || apiPayslip.employee.email,
      employee_id: apiPayslip.employee.id.toString(),
      salary: 0, // Not provided in payslip response
      department: apiPayslip.employee.department?.name || '',
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
      basic_salary: parseFloat(apiPayslip.basic_salary) || 0,
      total_allowances: parseFloat(apiPayslip.total_allowances) || 0,
      total_deductions: parseFloat(apiPayslip.total_deductions) || 0,
      gross_salary: parseFloat(apiPayslip.gross_salary) || 0,
      net_salary: parseFloat(apiPayslip.net_salary) || 0,
      days_worked: apiPayslip.days_worked || 0,
      is_paid: apiPayslip.is_paid || false,
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

  
  const availableEmployees = employees.filter((employee) => {
    if (!bulkPayrollPeriod) return true
    return !payslips.some(
      (payslip) => payslip.employee.id === employee.id && payslip.payroll_period.id.toString() === bulkPayrollPeriod,
    )
  })

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

  const resetBulkForm = () => {
    setBulkPayrollPeriod("")
    setSelectedEmployees([])
    setBulkPayslipData([])
    setBulkSelectionMode("individual")
    setSelectedDepartments([])
    setBulkDefaults({
      allowances: "0",
      deductions: "0",
      days_worked: "22",
      is_paid: false,
      paid_date: "",
    })
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

  const handleDepartmentSelection = (department: string, checked: boolean) => {
    if (checked) {
      setSelectedDepartments((prev) => [...prev, department])
      const deptEmployees = availableEmployees.filter(emp => emp.department === department)
      const newEmployeeIds = deptEmployees.map(emp => parseInt(emp.id))
      
      setSelectedEmployees((prev) => [...new Set([...prev, ...newEmployeeIds])])
      
      const newBulkData = deptEmployees.map(employee => ({
        employee_id: parseInt(employee.id),
        basic_salary: employee.salary || 0,
        total_allowances: Number.parseFloat(bulkDefaults.allowances),
        total_deductions: Number.parseFloat(bulkDefaults.deductions),
        days_worked: Number.parseInt(bulkDefaults.days_worked),
        is_paid: bulkDefaults.is_paid,
        paid_date: bulkDefaults.paid_date,
      }))
      
      setBulkPayslipData((prev) => {
        const existingIds = prev.map(d => d.employee_id)
        const filteredNewData = newBulkData.filter(d => !existingIds.includes(d.employee_id))
        return [...prev, ...filteredNewData]
      })
    } else {
      setSelectedDepartments((prev) => prev.filter((d) => d !== department))
      // Remove all employees from this department
      const deptEmployees = availableEmployees.filter(emp => emp.department === department)
      const deptEmployeeIds = deptEmployees.map(emp => parseInt(emp.id))
      
      setSelectedEmployees((prev) => prev.filter(id => !deptEmployeeIds.includes(id)))
      setBulkPayslipData((prev) => prev.filter(data => !deptEmployeeIds.includes(data.employee_id)))
    }
  }

  const handleBulkEmployeeSelection = (employeeId: number, checked: boolean) => {
    if (checked) {
      setSelectedEmployees((prev) => [...prev, employeeId])
      const employee = employees.find((emp) => parseInt(emp.id) === employeeId)
      if (employee) {
        setBulkPayslipData((prev) => [
          ...prev,
          {
            employee_id: employeeId,
            basic_salary: employee.salary || 0,
            total_allowances: Number.parseFloat(bulkDefaults.allowances),
            total_deductions: Number.parseFloat(bulkDefaults.deductions),
            days_worked: Number.parseInt(bulkDefaults.days_worked),
            is_paid: bulkDefaults.is_paid,
            paid_date: bulkDefaults.paid_date,
          },
        ])
      }
    } else {
      setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId))
      setBulkPayslipData((prev) => prev.filter((data) => data.employee_id !== employeeId))
    }
  }

  const handleBulkDataChange = (employeeId: number, field: keyof BulkPayslipData, value: string | number | boolean) => {
    setBulkPayslipData((prev) =>
      prev.map((data) => (data.employee_id === employeeId ? { ...data, [field]: value } : data)),
    )
  }

  const applyBulkDefaults = () => {
    setBulkPayslipData((prev) =>
      prev.map((data) => ({
        ...data,
        total_allowances: Number.parseFloat(bulkDefaults.allowances),
        total_deductions: Number.parseFloat(bulkDefaults.deductions),
        days_worked: Number.parseInt(bulkDefaults.days_worked),
        is_paid: bulkDefaults.is_paid,
        paid_date: bulkDefaults.paid_date,
      })),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!institutionId) {
      toast.error("Institution ID is required")
      return
    }

    const employee = employees.find((emp) => emp.id === formData.employee_id)
    const payrollPeriod = payrollPeriods.find((period) => period.id === Number.parseInt(formData.payroll_period_id))

    if (!employee || !payrollPeriod) {
      toast.error("Please select valid employee and payroll period")
      return
    }

    // Check if payslip already exists for this employee and period
    const existingPayslip = payslips.find(
      (p) => p.employee.id === formData.employee_id && p.payroll_period.id === Number.parseInt(formData.payroll_period_id)
    )

    if (existingPayslip && !editingPayslip) {
      toast.error(`Payslip already exists for ${employee.name} in ${payrollPeriod.name}`)
      return
    }

    setSaving(true)
    try {
      const payslipData: IPayslipFormData = {
        employee: parseInt(formData.employee_id),
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

      if (editingPayslip) {
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
        const newPayslip = await createPayslip({
          institutionId,
          payslipData: payslipData
        })
        if (newPayslip) {
          const displayPayslip = convertToDisplayPayslip(newPayslip)
          setPayslips((prev) => [...prev, displayPayslip])
          toast.success("Payslip created successfully")
        }
      }

      setIsModalOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Failed to save payslip:", error)
      
      // Handle specific duplicate error
      if (error.response?.data?.non_field_errors) {
        const nonFieldErrors = error.response.data.non_field_errors
        if (nonFieldErrors.some((err: string) => err.includes("unique set"))) {
          toast.error(`Payslip already exists for ${employee.name} in ${payrollPeriod.name}. Please edit the existing payslip instead.`)
        } else {
          toast.error(nonFieldErrors[0] || "Validation error occurred")
        }
      } else {
        toast.error(error.message || "An error occurred while saving the payslip")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!institutionId) {
      toast.error("Institution ID is required")
      return
    }

    const payrollPeriod = payrollPeriods.find((period) => period.id.toString() === bulkPayrollPeriod)
    if (!payrollPeriod || bulkPayslipData.length === 0) {
      toast.error("Please select payroll period and employees")
      return
    }

    setSaving(true)
    try {
      const createdPayslips: DisplayPayslip[] = []
      const skippedEmployees: string[] = []
      const errors: string[] = []
      
      for (const data of bulkPayslipData) {
        try {
          const payslipData: IPayslipFormData = {
            employee: data.employee_id,
            payroll_period: parseInt(bulkPayrollPeriod),
            basic_salary: data.basic_salary.toString(),
            total_allowances: data.total_allowances.toString(),
            total_deductions: data.total_deductions.toString(),
            gross_salary: (data.basic_salary + data.total_allowances).toString(),
            net_salary: (data.basic_salary + data.total_allowances - data.total_deductions).toString(),
            days_worked: data.days_worked,
            is_paid: data.is_paid,
            paid_date: data.paid_date || null,
          }

          const newPayslip = await createPayslip({
            institutionId,
            payslipData: payslipData
          })
          
          if (newPayslip) {
            createdPayslips.push(convertToDisplayPayslip(newPayslip))
          }
        } catch (error: any) {
          const employee = employees.find(emp => parseInt(emp.id) === data.employee_id)
          const employeeName = employee?.name || `Employee ${data.employee_id}`
          
          if (error.response?.data?.non_field_errors) {
            const nonFieldErrors = error.response.data.non_field_errors
            if (nonFieldErrors.some((err: string) => err.includes("unique set"))) {
              skippedEmployees.push(employeeName)
            } else {
              errors.push(`${employeeName}: ${nonFieldErrors[0]}`)
            }
          } else {
            errors.push(`${employeeName}: ${error.message || 'Unknown error'}`)
          }
        }
      }

     
      if (createdPayslips.length > 0) {
        setPayslips((prev) => [...prev, ...createdPayslips])
      }

    
      if (createdPayslips.length > 0) {
        toast.success(`${createdPayslips.length} payslips created successfully`)
      }
      
      if (skippedEmployees.length > 0) {
        toast.warning(`Skipped ${skippedEmployees.length} employees (already have payslips): ${skippedEmployees.join(', ')}`)
      }
      
      if (errors.length > 0) {
        toast.error(`Errors occurred for: ${errors.join('; ')}`)
      }

      if (createdPayslips.length > 0 || skippedEmployees.length > 0) {
        setIsBulkModalOpen(false)
        resetBulkForm()
      }
    } catch (error: any) {
      console.error("Failed to create bulk payslips:", error)
      toast.error("An error occurred while creating payslips")
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
              {/* Bulk Add Payslips Dialog */}
              <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetBulkForm} 
                    variant="outline" 
                    className="shadow-md bg-transparent"
                    disabled={!institutionId || employees.length === 0 || payrollPeriods.length === 0}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Bulk Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Bulk Payslips</DialogTitle>
                    <DialogDescription>Create payslips for multiple employees at once</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBulkSubmit} className="space-y-6">
                    {/* Step 1: Select Payroll Period */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Step 1: Select Payroll Period</h3>
                      <Select value={bulkPayrollPeriod} onValueChange={setBulkPayrollPeriod}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payroll period" />
                        </SelectTrigger>
                        <SelectContent>
                          {payrollPeriods.map((period) => (
                            <SelectItem key={period.id} value={period.id.toString()}>
                              {period.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkPayrollPeriod && (
                      <>
                        {/* Step 2: Set Default Values */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Step 2: Set Default Values</h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-2">
                              <Label>Default Allowances (USh)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={bulkDefaults.allowances}
                                onChange={(e) => setBulkDefaults((prev) => ({ ...prev, allowances: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Default Deductions (USh)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={bulkDefaults.deductions}
                                onChange={(e) => setBulkDefaults((prev) => ({ ...prev, deductions: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Default Days Worked</Label>
                              <Input
                                type="number"
                                min="1"
                                max="31"
                                value={bulkDefaults.days_worked}
                                onChange={(e) => setBulkDefaults((prev) => ({ ...prev, days_worked: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Default Paid Date</Label>
                              <Input
                                type="date"
                                value={bulkDefaults.paid_date}
                                onChange={(e) => setBulkDefaults((prev) => ({ ...prev, paid_date: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="bulk_is_paid"
                              checked={bulkDefaults.is_paid}
                              onCheckedChange={(checked) =>
                                setBulkDefaults((prev) => ({ ...prev, is_paid: checked as boolean }))
                              }
                            />
                            <Label htmlFor="bulk_is_paid">Mark all as Paid by default</Label>
                          </div>
                          <Button type="button" onClick={applyBulkDefaults} variant="outline" size="sm">
                            Apply Defaults to Selected Employees
                          </Button>
                        </div>

                        {/* Step 3: Select Employees */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Step 3: Select Employees</h3>
                            <div className="flex items-center space-x-4">
                              <Label className="text-sm font-medium">Selection Mode:</Label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="individual"
                                  name="selectionMode"
                                  checked={bulkSelectionMode === "individual"}
                                  onChange={() => setBulkSelectionMode("individual")}
                                  className="text-orange-600"
                                />
                                <Label htmlFor="individual" className="text-sm">Individual</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="department"
                                  name="selectionMode"
                                  checked={bulkSelectionMode === "department"}
                                  onChange={() => setBulkSelectionMode("department")}
                                  className="text-orange-600"
                                />
                                <Label htmlFor="department" className="text-sm">By Department</Label>
                              </div>
                            </div>
                          </div>

                          {bulkSelectionMode === "department" ? (
                            // Department selection
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                                {departments.map((dept) => {
                                  const deptEmployees = availableEmployees.filter(emp => emp.department === dept)
                                  return (
                                    <div key={dept} className="flex items-center space-x-3 p-3 border rounded-lg">
                                      <Checkbox
                                        id={`dept-${dept}`}
                                        checked={selectedDepartments.includes(dept)}
                                        onCheckedChange={(checked) =>
                                          handleDepartmentSelection(dept, checked as boolean)
                                        }
                                      />
                                      <div>
                                        <Label htmlFor={`dept-${dept}`} className="font-medium cursor-pointer">
                                          {dept}
                                        </Label>
                                        <div className="text-xs text-gray-500">
                                          {deptEmployees.length} employees
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              {selectedDepartments.length > 0 && (
                                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                                  Selected: {selectedEmployees.length} employees from {selectedDepartments.length} department(s)
                                </div>
                              )}
                            </div>
                          ) : (
                            // Individual employee selection
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                              {availableEmployees.map((employee) => (
                                <div key={employee.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <Checkbox
                                    id={`employee-${employee.id}`}
                                    checked={selectedEmployees.includes(parseInt(employee.id))}
                                    onCheckedChange={(checked) =>
                                      handleBulkEmployeeSelection(parseInt(employee.id), checked as boolean)
                                    }
                                  />
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                                        {getInitials(employee.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <Label htmlFor={`employee-${employee.id}`} className="font-medium cursor-pointer">
                                        {employee.name}
                                      </Label>
                                      <div className="text-xs text-gray-500">
                                        {employee.department} • USh {(employee.salary || 0).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Step 4: Review and Customize */}
                        {selectedEmployees.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Step 4: Review and Customize</h3>
                            <div className="max-h-80 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Basic Salary</TableHead>
                                    <TableHead>Allowances</TableHead>
                                    <TableHead>Deductions</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Net Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {bulkPayslipData.map((data) => {
                                    const employee = employees.find((emp) => parseInt(emp.id) === data.employee_id)!
                                    const netSalary = data.basic_salary + data.total_allowances - data.total_deductions
                                    return (
                                      <TableRow key={data.employee_id}>
                                        <TableCell>
                                          <div className="flex items-center space-x-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                                                {getInitials(employee.name)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{employee.name}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={data.basic_salary}
                                            onChange={(e) =>
                                              handleBulkDataChange(
                                                data.employee_id,
                                                "basic_salary",
                                                Number.parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            className="w-24 h-8"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={data.total_allowances}
                                            onChange={(e) =>
                                              handleBulkDataChange(
                                                data.employee_id,
                                                "total_allowances",
                                                Number.parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            className="w-24 h-8"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={data.total_deductions}
                                            onChange={(e) =>
                                              handleBulkDataChange(
                                                data.employee_id,
                                                "total_deductions",
                                                Number.parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            className="w-24 h-8"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={data.days_worked}
                                            onChange={(e) =>
                                              handleBulkDataChange(
                                                data.employee_id,
                                                "days_worked",
                                                Number.parseInt(e.target.value) || 0,
                                              )
                                            }
                                            className="w-16 h-8"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <span className="font-semibold text-green-700">
                                            {formatCurrency(netSalary)}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <Checkbox
                                            checked={data.is_paid}
                                            onCheckedChange={(checked) =>
                                              handleBulkDataChange(data.employee_id, "is_paid", checked as boolean)
                                            }
                                          />
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-orange-600 hover:bg-orange-700"
                        disabled={!bulkPayrollPeriod || selectedEmployees.length === 0 || saving}
                      >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create {selectedEmployees.length} Payslips
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Single Add Payslip Dialog */}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetForm} 
                    className="bg-orange-600 hover:bg-orange-700 shadow-md"
                    disabled={!institutionId || employees.length === 0 || payrollPeriods.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payslip
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{editingPayslip ? "Edit Payslip" : "Add New Payslip"}</DialogTitle>
                    <DialogDescription>Configure payslip details and salary calculations</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="employee">Employee *</Label>
                        <Select
                          value={formData.employee_id}
                          onValueChange={(value) => handleInputChange("employee_id", value)}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.length > 0 ? (
                              employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name} 
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-gray-500">
                                No employees available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payroll_period">Payroll Period *</Label>
                        <Select
                          value={formData.payroll_period_id}
                          onValueChange={(value) => handleInputChange("payroll_period_id", value)}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payroll period" />
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="basic_salary">Basic Salary (UGX) *</Label>
                        <Input
                          id="basic_salary"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.basic_salary}
                          onChange={(e) => handleInputChange("basic_salary", e.target.value)}
                          disabled={saving}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total_allowances">Total Allowances (UGX)</Label>
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
                        <Label htmlFor="total_deductions">Total Deductions (UGX)</Label>
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
                      <div className="space-y-2">
                        <Label htmlFor="paid_date">Paid Date</Label>
                        <Input
                          id="paid_date"
                          type="date"
                          value={formData.paid_date}
                          onChange={(e) => handleInputChange("paid_date", e.target.value)}
                          disabled={!formData.is_paid || saving}
                        />
                      </div>
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

                    {/* Calculated totals display */}
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

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingPayslip ? "Update Payslip" : "Add Payslip"}
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




