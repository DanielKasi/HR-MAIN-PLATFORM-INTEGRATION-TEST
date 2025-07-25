"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, DollarSign, Percent } from "lucide-react"
import {
  Search,
  Download,
  Users,
  DollarSignIcon as DollarSign2,
  CalendarPlus2Icon as CalendarIcon2,
  Loader2,
  MoreHorizontal,
  Info,
  AlertTriangle,
  FileSpreadsheet,
  X,
} from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

import {
  createEmployeeDeduction,
  getEmployeeDeductions,
  updateEmployeeDeduction,
  deleteEmployeeDeduction,
  getAllEmployees,
  getDeductionTypes,
} from "@/lib/utils"
import { IEmployeeDeductionFormData } from "@/app/types/types.utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"
import { useSelector } from "react-redux"
import { EmployeeSearchableSelect } from "@/components/ui/employee-searchable-select"
import { select } from "redux-saga/effects"


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
}

interface ApiDeductionType {
  id: number
  institution: {
    id: number
    institution_name: string
  }
  name: string
  description: string
  is_taxable: boolean
  is_active: boolean
  created_at: string
}

interface ApiEmployeeDeduction {
  id: number
  employee: ApiEmployee
  deduction_type: ApiDeductionType
  calculation_method: "fixed" | "percentage"
  amount: string
  percentage: string
  is_active: boolean
  effective_from: string
  effective_to: string | null
  created_at: string
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

interface SimpleDeductionType {
  id: number
  name: string
}

interface DisplayEmployeeDeduction {
  id: number
  employee: Employee
  deduction_type: SimpleDeductionType
  calculation_method: "fixed" | "percentage"
  amount: string
  percentage: string
  is_active: boolean
  effective_from: string
  effective_to: string | null
  created_at: string
}

interface BulkDeductionData {
  employee_id: number
  calculation_method: "fixed" | "percentage"
  amount: string
  percentage: string
  is_active: boolean
  effective_from: string
  effective_to: string
}

interface EmployeeDeductionComponentProps {
  institutionId?: number
}

interface ValidationResult {
  employee?: string
  deduction_type?: string
  amount?: string
  percentage?: string
  effective_from?: string
  effective_to?: string
  warning?: string
}

export default function EmployeeDeductionComponent() {
  const [deductions, setDeductions] = useState<DisplayEmployeeDeduction[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [deductionTypes, setDeductionTypes] = useState<SimpleDeductionType[]>([])
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingDeduction, setEditingDeduction] = useState<DisplayEmployeeDeduction | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [methodFilter, setMethodFilter] = useState<"all" | "fixed" | "percentage">("all")
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({})
  const [selectedDepartment, setSelectedDepartment] = useState<string>("")
  const [isDetailedReview, setIsDetailedReview] = useState(false)

  const [bulkDeductionType, setBulkDeductionType] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [bulkDeductionData, setBulkDeductionData] = useState<BulkDeductionData[]>([])
  const [bulkDefaults, setBulkDefaults] = useState({
    calculation_method: "fixed" as "fixed" | "percentage",
    amount: "0",
    percentage: "0",
    is_active: true,
    effective_from: "",
    effective_to: "",
  })
  const [bulkSelectionMode, setBulkSelectionMode] = useState<"individual" | "department">("individual")
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])


  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean))) as string[]

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]


  const [formData, setFormData] = useState({
    employee: "",
    deduction_type: "",
    calculation_method: "fixed" as "fixed" | "percentage",
    amount: "",
    percentage: "",
    is_active: true,
    effective_from: "",
    effective_to: "",
  })


 useEffect(() => {
  const fetchDeductionTypes = async () => {
    if (!selectedInstitution?.id) {
      return
    }
    
    try {
      const types = await getDeductionTypes(selectedInstitution.id)
      
      if (types && Array.isArray(types)) {
        // Only get active types and simplify to just id and name
        const activeTypes = types
          .filter(type => type.is_active !== false)
          .map(type => ({
            id: type.id,
            name: type.name
          }))
        
        setDeductionTypes(activeTypes)
        
        if (activeTypes.length === 0) {
          toast.error("No active deduction types found for this institution")
        }
      } else {
        setDeductionTypes([])
        toast.error("Invalid deduction types data received")
      }
    } catch (error) {
      console.warn("Error fetching deduction types:", error)
      setDeductionTypes([])
      toast.error("Failed to load deduction types")
    }
  }
  
  // ADD THIS LINE - You're missing the function call!
  fetchDeductionTypes()
}, [selectedInstitution?.id])

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedInstitution?.id) {
        return
      }
      
      try {
        const fetchedEmployees = await getAllEmployees({ institutionId: selectedInstitution.id })
        
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
          }).filter(emp => emp.id && emp.id !== "0") // Filter out invalid IDs including "0"
          
          setEmployees(formattedEmployees)
          
          if (formattedEmployees.length === 0) {
            toast.error("No employees found for this institution")
          }
        } else {
          setEmployees([])
          toast.error("Invalid employee data received")
        }
      } catch (error) {
        setEmployees([])
        toast.error("Failed to load employees")
      }
    }

    fetchEmployees()
  }, [selectedInstitution])

  useEffect(() => {
    const fetchDeductions = async () => {
      if (!selectedInstitution?.id) {
        return
      }
      
      try {
        const deductionsData = await getEmployeeDeductions(selectedInstitution.id)
        
        if (deductionsData && Array.isArray(deductionsData)) {
          const displayDeductions = deductionsData.map(convertToDisplayDeduction)
          setDeductions(displayDeductions)
        } else {
          setDeductions([])
        }
      } catch (error) {
        setDeductions([])
        toast.error("Failed to load deductions")
      }
    }
    
    fetchDeductions()
  }, [selectedInstitution?.id, employees])

  useEffect(() => {
    const errors: ValidationResult = {}

    if (isDialogOpen) {
      if (formData.calculation_method === 'fixed') {
        const amount = parseFloat(formData.amount)
        if (formData.amount && (isNaN(amount) || amount <= 0)) {
          errors.amount = 'Please enter a valid fixed amount'
        }
      } else {
        const percentage = parseFloat(formData.percentage)
        if (formData.percentage && (isNaN(percentage) || percentage <= 0 || percentage > 100)) {
          errors.percentage = 'Please enter a valid percentage (1-100)'
        } else if (formData.percentage && percentage > 50) {
          errors.warning = 'High percentage deduction detected. Please verify this is correct.'
        }
      }

      if (formData.effective_from && formData.effective_to) {
        if (new Date(formData.effective_to) < new Date(formData.effective_from)) {
          errors.effective_to = 'End date cannot be before start date'
        }
      }
    }

    setValidationErrors(errors)
  }, [formData, isDialogOpen])

  const convertToDisplayDeduction = (apiDeduction: any): DisplayEmployeeDeduction => {
    return {
      id: apiDeduction.id,
      employee: {
        id: apiDeduction.employee.id.toString(),
        name: apiDeduction.employee.user.fullname,
        email: apiDeduction.employee.user.email,
        employee_id: apiDeduction.employee.id.toString(),
        salary: 0,
        department: apiDeduction.employee.department?.name || '',
        user: {
          fullname: apiDeduction.employee.user.fullname,
          email: apiDeduction.employee.user.email
        }
      },
      deduction_type: {
        id: apiDeduction.deduction_type.id,
        name: apiDeduction.deduction_type.name
      },
      calculation_method: apiDeduction.calculation_method,
      amount: apiDeduction.amount,
      percentage: apiDeduction.percentage,
      is_active: apiDeduction.is_active,
      effective_from: apiDeduction.effective_from,
      effective_to: apiDeduction.effective_to,
      created_at: apiDeduction.created_at
    }
  }

  const availableEmployees = employees.filter((employee) => {
    if (!bulkDeductionType) return true
    return !deductions.some(
      (deduction) => deduction.employee.id === employee.id && deduction.deduction_type.id.toString() === bulkDeductionType
    )
  })

  const handleDepartmentSelection = (department: string, checked: boolean) => {
    if (checked) {
      setSelectedDepartments((prev) => [...prev, department])
      const deptEmployees = availableEmployees.filter(emp => emp.department === department)
      const newEmployeeIds = deptEmployees.map(emp => parseInt(emp.id))
      
      setSelectedEmployees((prev) => [...new Set([...prev, ...newEmployeeIds])])
      
      const newBulkData = deptEmployees.map(employee => ({
        employee_id: parseInt(employee.id),
        calculation_method: bulkDefaults.calculation_method,
        amount: bulkDefaults.amount,
        percentage: bulkDefaults.percentage,
        is_active: bulkDefaults.is_active,
        effective_from: bulkDefaults.effective_from,
        effective_to: bulkDefaults.effective_to,
      }))
      
      setBulkDeductionData((prev) => {
        const existingIds = prev.map(d => d.employee_id)
        const filteredNewData = newBulkData.filter(d => !existingIds.includes(d.employee_id))
        return [...prev, ...filteredNewData]
      })
    } else {
      setSelectedDepartments((prev) => prev.filter((d) => d !== department))
      const deptEmployees = availableEmployees.filter(emp => emp.department === department)
      const deptEmployeeIds = deptEmployees.map(emp => parseInt(emp.id))
      
      setSelectedEmployees((prev) => prev.filter(id => !deptEmployeeIds.includes(id)))
      setBulkDeductionData((prev) => prev.filter(data => !deptEmployeeIds.includes(data.employee_id)))
    }
  }

  const handleBulkEmployeeSelection = (employeeId: number, checked: boolean) => {
    if (checked) {
      setSelectedEmployees((prev) => [...prev, employeeId])
      const employee = employees.find((emp) => parseInt(emp.id) === employeeId)
      if (employee) {
        setBulkDeductionData((prev) => [
          ...prev,
          {
            employee_id: employeeId,
            calculation_method: bulkDefaults.calculation_method,
            amount: bulkDefaults.amount,
            percentage: bulkDefaults.percentage,
            is_active: bulkDefaults.is_active,
            effective_from: bulkDefaults.effective_from,
            effective_to: bulkDefaults.effective_to,
          },
        ])
      }
    } else {
      setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId))
      setBulkDeductionData((prev) => prev.filter((data) => data.employee_id !== employeeId))
    }
  }

  const handleBulkDataChange = (employeeId: number, field: keyof BulkDeductionData, value: string | boolean) => {
    setBulkDeductionData((prev) =>
      prev.map((data) => (data.employee_id === employeeId ? { ...data, [field]: value } : data))
    )
  }

  const applyBulkDefaults = () => {
    setBulkDeductionData((prev) =>
      prev.map((data) => ({
        ...data,
        calculation_method: bulkDefaults.calculation_method,
        amount: bulkDefaults.amount,
        percentage: bulkDefaults.percentage,
        is_active: bulkDefaults.is_active,
        effective_from: bulkDefaults.effective_from,
        effective_to: bulkDefaults.effective_to,
      }))
    )
  }

  const resetBulkForm = () => {
    setBulkDeductionType("")
    setSelectedEmployees([])
    setBulkDeductionData([])
    setBulkSelectionMode("individual")
    setSelectedDepartments([])
    setBulkDefaults({
      calculation_method: "fixed",
      amount: "0",
      percentage: "0",
      is_active: true,
      effective_from: "",
      effective_to: "",
    })
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required")
      return
    }

    const deductionType = deductionTypes.find((type) => type.id.toString() === bulkDeductionType)
    if (!deductionType || bulkDeductionData.length === 0) {
      toast.error("Please select deduction type and employees")
      return
    }

    setSaving(true)
    try {
      const createdDeductions: DisplayEmployeeDeduction[] = []
      const skippedEmployees: string[] = []
      const errors: string[] = []
      
      for (const data of bulkDeductionData) {
        try {
          const deductionData: IEmployeeDeductionFormData = {
            employee: data.employee_id,
            deduction_type: parseInt(bulkDeductionType),
            calculation_method: data.calculation_method,
            amount: data.amount,
            percentage: data.percentage,
            is_active: data.is_active,
            effective_from: data.effective_from,
            effective_to: data.effective_to || null,
          }

          const newDeduction = await createEmployeeDeduction({
            institutionId: selectedInstitution.id,
            employeeDeductionData: deductionData
          })
          
          if (newDeduction) {
            createdDeductions.push(convertToDisplayDeduction(newDeduction))
          }
        } catch (error: any) {
          const employee = employees.find(emp => parseInt(emp.id) === data.employee_id)
          const employeeName = employee?.name || `Employee ${data.employee_id}`
          
          if (error.response?.data?.non_field_errors) {
            const nonFieldErrors = error.response.data.non_field_errors
            if (nonFieldErrors.some((err: string) => err.includes("unique"))) {
              skippedEmployees.push(employeeName)
            } else {
              errors.push(`${employeeName}: ${nonFieldErrors[0]}`)
            }
          } else {
            errors.push(`${employeeName}: ${error.message || 'Unknown error'}`)
          }
        }
      }

      if (createdDeductions.length > 0) {
        setDeductions((prev) => [...prev, ...createdDeductions])
      }

      if (createdDeductions.length > 0) {
        toast.success(`${createdDeductions.length} deductions created successfully`)
      }
      
      if (skippedEmployees.length > 0) {
        toast.warning(`Skipped ${skippedEmployees.length} employees (already have this deduction): ${skippedEmployees.join(', ')}`)
      }
      
      if (errors.length > 0) {
        toast.error(`Errors occurred for: ${errors.join('; ')}`)
      }

      if (createdDeductions.length > 0 || skippedEmployees.length > 0) {
        setIsBulkModalOpen(false)
        resetBulkForm()
      }
    } catch (error: any) {
      toast.error("An error occurred while creating deductions")
    } finally {
      setSaving(false)
    }
  }

  const getCalculatedAmount = (deduction: DisplayEmployeeDeduction): number => {
    if (deduction.calculation_method === "percentage" && deduction.employee.salary) {
      return (deduction.employee.salary * parseFloat(deduction.percentage)) / 100
    }
    return parseFloat(deduction.amount) || 0
  }

  const getSelectedEmployee = () => {
    if (!formData.employee) return null
    return employees.find(emp => emp.id === formData.employee)
  }

  const hasValidationErrors = () => {
    // Check for missing required fields
    if (!formData.employee || !formData.deduction_type || !formData.effective_from) {
      return true
    }

    // Check for calculation method specific requirements
    if (formData.calculation_method === 'fixed' && !formData.amount) {
      return true
    }
    
    if (formData.calculation_method === 'percentage' && !formData.percentage) {
      return true
    }

    // Check for validation errors in the state
    const errorKeys = Object.keys(validationErrors).filter(key => key !== 'warning')
    return errorKeys.length > 0
  }

  const handleSubmit = async () => {
    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required")
      return
    }

    if (hasValidationErrors()) {
      toast.error("Please fix the validation errors before submitting")
      return
    }

    if (validationErrors.warning) {
      toast.warning(validationErrors.warning)
    }

    setSaving(true)
    try {
      const formattedData: IEmployeeDeductionFormData = {
        employee: parseInt(formData.employee),
        deduction_type: parseInt(formData.deduction_type),
        calculation_method: formData.calculation_method,
        amount: formData.amount,
        percentage: formData.percentage,
        is_active: formData.is_active,
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || null,
      }

      if (editingDeduction) {
        const updatedDeduction = await updateEmployeeDeduction({
          id: editingDeduction.id,
          employeeDeductionData: formattedData
        })
        if (updatedDeduction) {
          const displayDeduction = convertToDisplayDeduction(updatedDeduction)
          setDeductions(prev => prev.map(d => d.id === editingDeduction.id ? displayDeduction : d))
          toast.success("Deduction updated successfully")
        }
      } else {
        const newDeduction = await createEmployeeDeduction({
          institutionId: selectedInstitution.id,
          employeeDeductionData: formattedData
        })
        if (newDeduction) {
          const displayDeduction = convertToDisplayDeduction(newDeduction)
          setDeductions(prev => [...prev, displayDeduction])
          toast.success("Deduction created successfully")
        }
      }

      setIsDialogOpen(false)
      setEditingDeduction(null)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || "An error occurred while saving the deduction")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (deduction: DisplayEmployeeDeduction) => {
    setEditingDeduction(deduction)
    setFormData({
      employee: deduction.employee.id,
      deduction_type: deduction.deduction_type.id.toString(),
      calculation_method: deduction.calculation_method,
      amount: deduction.amount,
      percentage: deduction.percentage,
      is_active: deduction.is_active,
      effective_from: deduction.effective_from,
      effective_to: deduction.effective_to || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deleteEmployeeDeduction(id)
      if (success) {
        setDeductions(prev => prev.filter(d => d.id !== id))
        toast.success("Deduction deleted successfully")
      } else {
        toast.error("Failed to delete deduction")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the deduction")
    }
  }

  const openNewDeductionDialog = () => {
    setEditingDeduction(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      employee: "",
      deduction_type: "",
      calculation_method: "fixed",
      amount: "",
      percentage: "",
      is_active: true,
      effective_from: "",
      effective_to: "",
    })
    setValidationErrors({})
  }

  const filteredDeductions = deductions.filter((deduction) => {
    const matchesSearch =
      deduction.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deduction.deduction_type.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && deduction.is_active) ||
      (statusFilter === "inactive" && !deduction.is_active)

    const matchesMethod = methodFilter === "all" || deduction.calculation_method === methodFilter

    return matchesSearch && matchesStatus && matchesMethod
  })

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setMethodFilter("all")
  }

  // Export to CSV function
  const exportToCSV = () => {
    const csvContent = [
      [
        "Employee",
        "Deduction Type",
        "Method",
        "Amount",
        "Percentage",
        "Calculated Amount",
        "Status",
        "Effective From",
        "Effective To",
      ],
      ...filteredDeductions.map((deduction) => [
        deduction.employee.name,
        deduction.deduction_type.name,
        deduction.calculation_method,
        deduction.amount,
        deduction.percentage,
        getCalculatedAmount(deduction),
        deduction.is_active ? "Active" : "Inactive",
        format(new Date(deduction.effective_from), "yyyy-MM-dd"),
        deduction.effective_to ? format(new Date(deduction.effective_to), "yyyy-MM-dd") : "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "employee-deductions.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Export to Excel function using HTML table method
  const exportToExcel = () => {
    try {
      // Prepare data for Excel
      const excelData = filteredDeductions.map((deduction) => ({
        "Employee Name": deduction.employee.name,
        "Employee Email": deduction.employee.email,
        "Deduction Type": deduction.deduction_type.name,
        "Calculation Method": deduction.calculation_method === "fixed" ? "Fixed Amount" : "Percentage",
        "Fixed Amount": deduction.calculation_method === "fixed" ? parseFloat(deduction.amount) : "",
        "Percentage": deduction.calculation_method === "percentage" ? parseFloat(deduction.percentage) : "",
        "Calculated Amount": getCalculatedAmount(deduction),
        "Status": deduction.is_active ? "Active" : "Inactive",
        "Effective From": format(new Date(deduction.effective_from), "yyyy-MM-dd"),
        "Effective To": deduction.effective_to ? format(new Date(deduction.effective_to), "yyyy-MM-dd") : "",
        "Created Date": format(new Date(deduction.created_at), "yyyy-MM-dd"),
      }))

      // Create HTML table
      const headers = Object.keys(excelData[0] || {})
      let htmlTable = '<table border="1"><thead><tr>'
      
      // Add headers
      headers.forEach(header => {
        htmlTable += `<th>${header}</th>`
      })
      htmlTable += '</tr></thead><tbody>'
      
      // Add data rows
      excelData.forEach(row => {
        htmlTable += '<tr>'
        headers.forEach(header => {
          const value = row[header as keyof typeof row]
          htmlTable += `<td>${value}</td>`
        })
        htmlTable += '</tr>'
      })
      htmlTable += '</tbody></table>'

      // Create Excel file using HTML table method
      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Employee Deductions</x:Name>
                  <x:WorksheetSource HRef="sheet.htm"/>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          ${htmlTable}
        </body>
        </html>
      `

      // Create blob and download
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employee-deductions-${format(new Date(), "yyyy-MM-dd")}.xls`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Excel file downloaded successfully")
    } catch (error) {
      toast.error("Failed to export Excel file")
    }
  }

  const getCategoryColor = () => {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (!selectedInstitution?.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution selected...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30">
      <div className="w-full px-2 py-8">
        {/* Header Section */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Deductions</h1>
              <p className="text-gray-600">Manage employee-specific deductions and their calculation methods</p>
            </div>
            <div className="flex gap-3">
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-orange-200 text-orange-700 hover:bg-red-50 bg-transparent"
                    disabled={filteredDeductions.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={exportToCSV}
                    className="cursor-pointer hover:bg-red-50 focus:bg-red-50"
                  >
                    <Download className="h-4 w-4 mr-2 text-red-600" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={exportToExcel}
                    className="cursor-pointer hover:bg-green-50 focus:bg-green-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Bulk Add Deductions Dialog */}
              <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetBulkForm} 
                    variant="outline" 
                    className="shadow-md bg-transparent"
                    disabled={!selectedInstitution?.id || employees.length === 0 || deductionTypes.length === 0}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Bulk Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Bulk Deductions</DialogTitle>
                    <DialogDescription>Create deductions for multiple employees at once</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBulkSubmit} className="space-y-6">
                    {/* Step 1: Select Deduction Type */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Step 1: Select Deduction Type</h3>
                      <Select value={bulkDeductionType} onValueChange={setBulkDeductionType}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select deduction type" />
                        </SelectTrigger>
                        <SelectContent>
                          {deductionTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkDeductionType && (
                      <>
                        {/* Step 2: Set Default Values */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Step 2: Set Default Values</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-2">
                              <Label>Calculation Method</Label>
                              <Select
                                value={bulkDefaults.calculation_method}
                                onValueChange={(value: "fixed" | "percentage") => 
                                  setBulkDefaults((prev) => ({ ...prev, calculation_method: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                                  <SelectItem value="percentage">Percentage</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
  
                          {/* Conditionally render amount or percentage field based on calculation method */}
                            {bulkDefaults.calculation_method === "fixed" ? (
                              <div className="space-y-2">
                                <Label>Default Amount</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={bulkDefaults.amount}
                                  onChange={(e) => setBulkDefaults((prev) => ({ ...prev, amount: e.target.value }))}
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label>Default Percentage</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="0.00"
                                  value={bulkDefaults.percentage}
                                  onChange={(e) => setBulkDefaults((prev) => ({ ...prev, percentage: e.target.value }))}
                                />
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label>Effective From</Label>
                              <Input
                                type="date"
                                value={bulkDefaults.effective_from}
                                onChange={(e) => setBulkDefaults((prev) => ({ ...prev, effective_from: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-2">
                              <Label>Effective To (Optional)</Label>
                              <Input
                                type="date"
                                value={bulkDefaults.effective_to}
                                onChange={(e) => setBulkDefaults((prev) => ({ ...prev, effective_to: e.target.value }))}
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="bulk_is_active"
                                checked={bulkDefaults.is_active}
                                onCheckedChange={(checked) =>
                                  setBulkDefaults((prev) => ({ ...prev, is_active: checked as boolean }))
                                }
                              />
                              <Label htmlFor="bulk_is_active">Mark all as Active by default</Label>
                            </div>
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
                                className="text-red-600"
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
                                className="text-red-600"
                              />
                              <Label htmlFor="department" className="text-sm">By Department</Label>
                            </div>
                          </div>
                        </div>

                        {bulkSelectionMode === "department" ? (
                          // Department-based selection with employee filtering
                          <div className="space-y-4">
                            {/* Department selection */}
                            <div className="space-y-2">
                              <Label>Select Department</Label>
                             <Select
                                value={selectedDepartment}
                                onValueChange={(value) => {
                                  setSelectedDepartment(value);
                                  // Reset selections when switching departments
                                  setSelectedEmployees([]);
                                  setBulkDeductionData([]);
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose a department..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => {
                                    const deptEmployees = availableEmployees.filter(emp => emp.department === dept);
                                    return (
                                      <SelectItem key={dept} value={dept}>
                                        {dept} ({deptEmployees.length} employees)
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Employee selection within chosen department */}
                              {selectedDepartment && (
                                <div className="space-y-2">
                                  <Label>Select Employees from Department</Label>
                                  <EmployeeSearchableSelect
                                    employees={availableEmployees.filter(emp => 
                                      emp.department === selectedDepartment
                                    )}
                                  value={[""]}
                                   onValueChange={(value) => {
                                      const employeeId = +value;
                                      if (!isNaN(employeeId) && !selectedEmployees.includes(employeeId)) {
                                        handleBulkEmployeeSelection(employeeId, true);
                                      }
                                    }}
                                    placeholder="Search and select employees from department..."
                                    showEmployeeId={false}
                                    showDepartment={false}
                                  />
                                </div>
                              )}

                            {/* Quick actions for department */}
                            {selectedDepartment && (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const deptEmployees = availableEmployees.filter(emp => 
                                      emp.department === selectedDepartment
                                    );
                                    deptEmployees.forEach(emp => {
                                      if (!selectedEmployees.includes(parseInt(emp.id))) {
                                        handleBulkEmployeeSelection(parseInt(emp.id), true);
                                      }
                                    });
                                  }}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  Select All in Department ({availableEmployees.filter(emp => emp.department === selectedDepartment).length})
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const deptEmployees = availableEmployees.filter(emp => 
                                      emp.department === selectedDepartment
                                    );
                                    deptEmployees.forEach(emp => {
                                      handleBulkEmployeeSelection(parseInt(emp.id), false);
                                    });
                                  }}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  Deselect All in Department
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Individual employee selection with searchable dropdown
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Select Employees</Label>
                              <EmployeeSearchableSelect
                                employees={availableEmployees.filter(emp => !selectedEmployees.includes(parseInt(emp.id)))}
                                value={[""]}
                                onValueChange={(value) => {
                                  const employeeId = +value;
                                  if (!isNaN(employeeId) && !selectedEmployees.includes(employeeId)) {
                                    handleBulkEmployeeSelection(employeeId, true);
                                  }
                                }}
                                placeholder="Search and select employees..."
                                showEmployeeId={false}
                                showDepartment={true}
                              />
                            </div>
                          </div>
                        )}

                        {/* Selected employees display - common for both modes */}
                        {selectedEmployees.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Selected Employees ({selectedEmployees.length})</Label>
                            <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                              <div className="space-y-2">
                                {selectedEmployees.map((employeeId) => {
                                  const employee = employees.find(emp => parseInt(emp.id) === employeeId);
                                  if (!employee) return null;
                                  
                                  return (
                                    <div key={employeeId} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{employee.name}</div>
                                        <div className="text-xs text-gray-500">
                                          {employee.department} • ${(employee.salary || 0).toLocaleString()}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-red-100"
                                        onClick={() => handleBulkEmployeeSelection(employeeId, false)}
                                      >
                                        <X className="h-3 w-3 text-red-500" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployees([]);
                                  setBulkDeductionData([]);
                                }}
                                className="text-red-600 hover:bg-red-50"
                              >
                                Clear All
                              </Button>
                              <span className="text-sm text-gray-600">
                                {selectedEmployees.length} of {availableEmployees.length} employees selected
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                        {/* Step 4: Review and Customize */}
                          {/* Step 4: Configure and Review */}
{selectedEmployees.length > 0 && (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Step 4: Configure All Selected Employees</h3>
    
    {/* Bulk Configuration */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-blue-800">Apply Same Settings to All {selectedEmployees.length} Employees</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Calculation Method for All</Label>
          <Select
            value={bulkDefaults.calculation_method}
            onValueChange={(value: "fixed" | "percentage") => {
              setBulkDefaults((prev) => ({ ...prev, calculation_method: value }));
              setBulkDeductionData((prevData) =>
                prevData.map((data) => ({
                  ...data,
                  calculation_method: value,
                }))
              );
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Conditionally render amount or percentage input */}
        {bulkDefaults.calculation_method === "fixed" ? (
          <div className="space-y-2">
            <Label>Fixed Amount for All</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={bulkDefaults.amount}
              onChange={(e) => {
                const newAmount = e.target.value;
                setBulkDefaults((prev) => ({ ...prev, amount: newAmount }));
                setBulkDeductionData((prevData) =>
                  prevData.map((data) => ({
                    ...data,
                    amount: newAmount,
                  }))
                );
              }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Percentage for All</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0.00"
              value={bulkDefaults.percentage}
              onChange={(e) => {
                const newPercentage = e.target.value;
                setBulkDefaults((prev) => ({ ...prev, percentage: newPercentage }));
                setBulkDeductionData((prevData) =>
                  prevData.map((data) => ({
                    ...data,
                    percentage: newPercentage,
                  }))
                );
              }}
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label>Status for All</Label>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="bulk_active_all"
              checked={bulkDefaults.is_active}
              onCheckedChange={(checked) => {
                const isActive = checked as boolean;
                setBulkDefaults((prev) => ({ ...prev, is_active: isActive }));
                setBulkDeductionData((prevData) =>
                  prevData.map((data) => ({
                    ...data,
                    is_active: isActive,
                  }))
                );
              }}
            />
            <Label htmlFor="bulk_active_all" className="text-sm">
              Mark all as Active
            </Label>
          </div>
        </div>
      </div>
      
      {/* Summary */}
      <div className="bg-white rounded p-3 border">
        <div className="text-sm text-gray-600">
          <strong>Summary:</strong> Setting{' '}
          {bulkDefaults.calculation_method === "fixed" 
            ? `fixed amount of $${bulkDefaults.amount || '0'}` 
            : `${bulkDefaults.percentage || '0'}% of salary`
          } for {selectedEmployees.length} employees
        </div>
        {bulkDefaults.calculation_method === "percentage" && (
          <div className="text-xs text-gray-500 mt-1">
            Total estimated deduction: $
            {selectedEmployees.reduce((total, empId) => {
              const emp = employees.find(e => parseInt(e.id) === empId);
              return total + ((emp?.salary || 0) * parseFloat(bulkDefaults.percentage || '0') / 100);
            }, 0).toLocaleString()}
          </div>
        )}
      </div>
    </div>

    {/* Individual Review (Optional) */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Review Individual Employees (Optional)</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsDetailedReview(!isDetailedReview);
          }}
        >
          {isDetailedReview ? 'Show Summary' : 'Show Details'}
        </Button>
      </div>
      
      {isDetailedReview ? (
        <div className="max-h-80 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Calculated Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bulkDeductionData.map((data) => {
                const employee = employees.find((emp) => parseInt(emp.id) === data.employee_id)!;
                const calculatedAmount = data.calculation_method === "percentage" && employee.salary
                  ? (employee.salary * parseFloat(data.percentage)) / 100
                  : parseFloat(data.amount) || 0;
                return (
                  <TableRow key={data.employee_id}>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium">{employee.name}</span>
                        <div className="text-xs text-gray-500">{employee.department}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={data.calculation_method}
                        onValueChange={(value: "fixed" | "percentage") =>
                          handleBulkDataChange(data.employee_id, "calculation_method", value)
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {data.calculation_method === "fixed" ? (
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={data.amount}
                          onChange={(e) =>
                            handleBulkDataChange(data.employee_id, "amount", e.target.value)
                          }
                          className="w-24 h-8"
                        />
                      </TableCell>
                    ) : (
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={data.percentage}
                          onChange={(e) =>
                            handleBulkDataChange(data.employee_id, "percentage", e.target.value)
                          }
                          className="w-20 h-8"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="font-semibold text-red-700">
                        ${calculatedAmount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={data.is_active}
                        onCheckedChange={(checked) =>
                          handleBulkDataChange(data.employee_id, "is_active", checked as boolean)
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Simple summary view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
          {selectedEmployees.map((employeeId) => {
            const employee = employees.find(emp => parseInt(emp.id) === employeeId);
            const data = bulkDeductionData.find(d => d.employee_id === employeeId);
            if (!employee || !data) return null;
            
            const calculatedAmount = data.calculation_method === "percentage" && employee.salary
              ? (employee.salary * parseFloat(data.percentage)) / 100
              : parseFloat(data.amount) || 0;
            
            return (
              <div key={employeeId} className="p-3 border rounded-lg bg-gray-50">
                <div className="font-medium text-sm">{employee.name}</div>
                <div className="text-xs text-gray-500">{employee.department}</div>
                <div className="text-sm mt-1">
                  <span className="font-semibold text-red-600">
                    ${calculatedAmount.toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-1">
                    ({data.calculation_method === "fixed" ? "Fixed" : `${data.percentage}%`})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
                        disabled={!bulkDeductionType || selectedEmployees.length === 0 || saving}
                      >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create {selectedEmployees.length} Deductions
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={openNewDeductionDialog} 
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                    disabled={!selectedInstitution?.id}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Deduction
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      {editingDeduction ? "Edit Deduction" : "Add New Deduction"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure employee deduction details and calculation method.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee" className="text-sm font-medium">
                        Employee *
                      </Label>
                      <EmployeeSearchableSelect
                        employees={employees}
                        value={[formData.employee]}
                        onValueChange={(value) => setFormData({ ...formData, employee: value.toString() })}
                        disabled={saving}
                        placeholder="Search and select employee"
                        showEmployeeId={false}
                        showDepartment={true}
                      />
                      {validationErrors.employee && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.employee}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="deduction_type" className="text-sm font-medium">
                        Deduction Type *
                      </Label>
                      <Select 
                        value={formData.deduction_type}
                        onValueChange={(value) => setFormData({ ...formData, deduction_type: value })}
                        disabled={saving}
                      >
                        <SelectTrigger className={`focus:ring-red-500 focus:border-red-500 ${
                          validationErrors.deduction_type ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Please select a deduction type" />
                        </SelectTrigger>
                        <SelectContent>
                          {deductionTypes.length > 0 ? (
                            deductionTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No deduction types available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {validationErrors.deduction_type ? (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.deduction_type}
                        </p>
                      ) : deductionTypes.length === 0 ? (
                        <p className="text-xs text-red-500 mt-1">
                          No deduction types found. Please create deduction types first.
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="calculation_method" className="text-sm font-medium">
                        Calculation Method *
                      </Label>
                      <Select 
                        value={formData.calculation_method}
                        onValueChange={(value: "fixed" | "percentage") => setFormData({ ...formData, calculation_method: value })}
                        disabled={saving}
                      >
                        <SelectTrigger className="focus:ring-red-500 focus:border-red-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage of Salary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conditionally render amount or percentage field based on calculation method */}
                    {formData.calculation_method === "fixed" ? (
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-sm font-medium">
                          Fixed Amount *
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          disabled={saving}
                          className={`focus:ring-red-500 focus:border-red-500 ${
                            validationErrors.amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                        />
                        {validationErrors.amount ? (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.amount}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Enter the fixed deduction amount
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="percentage" className="text-sm font-medium">
                          Percentage *
                        </Label>
                        <Input
                          id="percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={formData.percentage}
                          onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                          disabled={saving}
                          className={`focus:ring-red-500 focus:border-red-500 ${
                            validationErrors.percentage ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                        />
                        {validationErrors.percentage ? (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.percentage}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Percentage of base salary (0-100)
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="effective_from" className="text-sm font-medium">
                        Effective From *
                      </Label>
                      <Input
                        id="effective_from"
                        type="date"
                        value={formData.effective_from}
                        onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                        className={`focus:ring-red-500 focus:border-red-500 ${
                          validationErrors.effective_from ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        disabled={saving}
                      />
                      {validationErrors.effective_from && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.effective_from}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="effective_to" className="text-sm font-medium">
                        Effective To (Optional)
                      </Label>
                      <Input
                        id="effective_to"
                        type="date"
                        value={formData.effective_to}
                        onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                        className={`focus:ring-red-500 focus:border-red-500 ${
                          validationErrors.effective_to ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        disabled={saving}
                        min={formData.effective_from}
                      />
                      {validationErrors.effective_to && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.effective_to}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label className="text-base font-medium">Active Status</Label>
                          <p className="text-sm text-gray-500">Enable or disable this deduction</p>
                        </div>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                          className="data-[state=checked]:bg-red-600"
                          disabled={saving}
                        />
                      </div>
                    </div>
               
                    {/* Warning message for high percentage */}
                    {validationErrors.warning && (
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-medium text-amber-800">
                            {validationErrors.warning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                      disabled={saving || !employees.length || !deductionTypes.length || hasValidationErrors()}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {saving ? "Saving..." : editingDeduction ? "Update" : "Create"} Deduction
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 px-2">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Users className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredDeductions.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active Deductions</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredDeductions.filter((d) => d.is_active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarIcon2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Monthly Cost</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredDeductions
                      .filter((d) => d.is_active)
                      .reduce((sum, d) => sum + getCalculatedAmount(d), 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Percent className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Percentage Based</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {filteredDeductions.filter((d) => d.calculation_method === "percentage").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 mx-2">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or deduction type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}
              >
                <SelectTrigger className="focus:ring-red-500 focus:border-red-500">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={methodFilter}
                onValueChange={(value: "all" | "fixed" | "percentage") => setMethodFilter(value)}
              >
                <SelectTrigger className="focus:ring-red-500 focus:border-red-500">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>

              <div></div> {/* Empty div for spacing */}

              <Button
                onClick={clearAllFilters}
                variant="outline"
                className="border-orange-200 text-red-700 hover:bg-red-50 bg-transparent"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Current Deductions
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredDeductions.length} of {deductions.length} records)
              </span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">Overview of all employee deductions and their calculated amounts</p>
          </div>
          
          {filteredDeductions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No deductions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {deductions.length === 0 
                  ? "No deductions have been created yet." 
                  : "No deductions match your current filters."}
              </p>
              {deductions.length > 0 && (
                <Button onClick={clearAllFilters} variant="outline" className="mt-4 bg-transparent">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-900">Employee</TableHead>
                  <TableHead className="font-semibold text-gray-900">Deduction Type</TableHead>
                  <TableHead className="font-semibold text-gray-900">Method</TableHead>
                  <TableHead className="font-semibold text-gray-900">Calculated Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Effective Period</TableHead>
                  <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeductions.map((deduction) => (
                  <TableRow key={deduction.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{deduction.employee.name}</div>
                        <div className="text-sm text-gray-500">{deduction.employee.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${getCategoryColor()} border font-medium`}
                      >
                        {deduction.deduction_type.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {deduction.calculation_method === "fixed" ? "Fixed" : "Percentage"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-semibold text-red-600">
                        {getCalculatedAmount(deduction).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={deduction.is_active ? "default" : "secondary"}
                        className={
                          deduction.is_active
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-200 text-gray-700"
                        }
                      >
                        {deduction.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">From: {format(new Date(deduction.effective_from), "MMM dd, yyyy")}</div>
                        {deduction.effective_to && (
                          <div className="text-gray-500">To: {format(new Date(deduction.effective_to), "MMM dd, yyyy")}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <MoreHorizontal className="h-4 w-4 text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleEdit(deduction)}
                            className="cursor-pointer hover:bg-red-50 focus:bg-red-50"
                          >
                            <Edit className="h-4 w-4 mr-2 text-red-600" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(deduction.id)}
                            className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}