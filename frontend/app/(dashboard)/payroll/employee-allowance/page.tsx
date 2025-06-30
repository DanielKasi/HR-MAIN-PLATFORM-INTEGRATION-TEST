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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

// Import API functions and interfaces
import {
  createEmployeeAllowance,
  getEmployeeAllowances,
  updateEmployeeAllowance,
  deleteEmployeeAllowance,
  getAllEmployees,
  getAllowanceTypes,
} from "@/lib/utils"
import { IEmployeeAllowance, IEmployeeAllowanceFormData, IAllowanceType } from "@/app/types/types.utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"
import { useSelector } from "react-redux"

// API Response interfaces based on actual response
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

interface ApiAllowanceType {
  id: number
  institution: {
    id: number
    institution_name: string
    // ... other institution fields
  }
  name: string
  description: string
  is_taxable: boolean
  is_active: boolean
  created_at: string
}

interface ApiEmployeeAllowance {
  id: number
  employee: ApiEmployee
  allowance_type: ApiAllowanceType
  calculation_method: "fixed" | "percentage"
  amount: string
  percentage: string
  is_active: boolean
  effective_from: string
  effective_to: string | null
  created_at: string
}

// Employee interface for internal use
interface Employee {
  id: string
  name: string
  email: string
  employee_id?: string
  salary?: number
  user?: {
    fullname: string
    email: string
  }
}

// Simplified allowance type interface for display
interface SimpleAllowanceType {
  id: number
  name: string
}

// Display interface for allowances with employee and type details
interface DisplayEmployeeAllowance {
  id: number
  employee: Employee
  allowance_type: SimpleAllowanceType
  calculation_method: "fixed" | "percentage"
  amount: string
  percentage: string
  is_active: boolean
  effective_from: string
  effective_to: string | null
  created_at: string
}

interface EmployeeAllowanceComponentProps {
  institutionId?: number
}

export default function EmployeeAllowanceComponent({ institutionId: propInstitutionId }: EmployeeAllowanceComponentProps) {
  const [allowances, setAllowances] = useState<DisplayEmployeeAllowance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [allowanceTypes, setAllowanceTypes] = useState<SimpleAllowanceType[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [isLoadingAllowanceTypes, setIsLoadingAllowanceTypes] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAllowance, setEditingAllowance] = useState<DisplayEmployeeAllowance | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [methodFilter, setMethodFilter] = useState<"all" | "fixed" | "percentage">("all")
  

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  const [institutionId, setInstitutionId] = useState<number | null>(propInstitutionId || null)

  const [formData, setFormData] = useState({
    employee: "",
    allowance_type: "",
    calculation_method: "fixed" as "fixed" | "percentage",
    amount: "",
    percentage: "",
    is_active: true,
    effective_from: "",
    effective_to: "",
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

  // Load allowance types when institution ID is available
  useEffect(() => {
    const fetchAllowanceTypes = async () => {
      if (!institutionId) {
        setIsLoadingAllowanceTypes(false)
        return
      }
      
      setIsLoadingAllowanceTypes(true)
      
      try {
        const types = await getAllowanceTypes(institutionId)
        
        if (types && Array.isArray(types)) {
          // Only get active types and simplify to just id and name
          const activeTypes = types
            .filter(type => type.is_active !== false)
            .map(type => ({
              id: type.id,
              name: type.name
            }))
          
          setAllowanceTypes(activeTypes)
          
          if (activeTypes.length === 0) {
            toast.error("No active allowance types found for this institution")
          }
        } else {
          setAllowanceTypes([])
          toast.error("Invalid allowance types data received")
        }
      } catch (error) {
        console.error("Error fetching allowance types:", error)
        setAllowanceTypes([])
        toast.error("Failed to load allowance types")
      } finally {
        setIsLoadingAllowanceTypes(false)
      }
    }

    fetchAllowanceTypes()
  }, [institutionId])

  // Load employees when institution ID is available
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!institutionId) {
        setIsLoadingEmployees(false)
        return
      }
      
      setIsLoadingEmployees(true)
      
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
        console.error("Error fetching employees:", error)
        setEmployees([])
        toast.error("Failed to load employees")
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    fetchEmployees()
  }, [institutionId])

  // Load allowances when institution ID is available
  useEffect(() => {
    const fetchAllowances = async () => {
      if (!institutionId) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      
      try {
        const allowancesData = await getEmployeeAllowances(institutionId)
        
        if (allowancesData && Array.isArray(allowancesData)) {
          const displayAllowances = allowancesData.map(convertToDisplayAllowance)
          setAllowances(displayAllowances)
        } else {
          setAllowances([])
        }
      } catch (error) {
        console.error("Error fetching allowances:", error)
        setAllowances([])
        toast.error("Failed to load allowances")
      } finally {
        setLoading(false)
      }
    }
    
    fetchAllowances()
  }, [institutionId, employees])

  // Helper function to convert API data to display data
  const convertToDisplayAllowance = (apiAllowance: any): DisplayEmployeeAllowance => {
  return {
    id: apiAllowance.id,
    employee: {
      id: apiAllowance.employee.id.toString(),
      name: apiAllowance.employee.user.fullname,
      email: apiAllowance.employee.user.email,
      employee_id: apiAllowance.employee.id.toString(),
      salary: 0,
      user: {
        fullname: apiAllowance.employee.user.fullname,
        email: apiAllowance.employee.user.email
      }
    },
    allowance_type: {
      id: apiAllowance.allowance_type.id,
      name: apiAllowance.allowance_type.name
    },
    calculation_method: apiAllowance.calculation_method,
    amount: apiAllowance.amount,
    percentage: apiAllowance.percentage,
    is_active: apiAllowance.is_active,
    effective_from: apiAllowance.effective_from,
    effective_to: apiAllowance.effective_to,
    created_at: apiAllowance.created_at
  }
}
  const getCalculatedAmount = (allowance: DisplayEmployeeAllowance): number => {
    if (allowance.calculation_method === "percentage" && allowance.employee.salary) {
      return (allowance.employee.salary * parseFloat(allowance.percentage)) / 100
    }
    return parseFloat(allowance.amount) || 0
  }

  const getSelectedEmployee = () => {
    if (!formData.employee) return null
    return employees.find(emp => emp.id === formData.employee)
  }

  const validateAllowanceForm = () => {
    const validations = []

    // Basic validations
    if (!formData.employee) {
      validations.push({ type: 'error', message: 'Please select an employee' })
    }
    if (!formData.allowance_type) {
      validations.push({ type: 'error', message: 'Please select an allowance type' })
    }

    // Amount validations
    if (formData.calculation_method === 'fixed') {
      const amount = parseFloat(formData.amount)
      if (!formData.amount || isNaN(amount) || amount <= 0) {
        validations.push({ type: 'error', message: 'Please enter a valid fixed amount' })
      }
    } else {
      const percentage = parseFloat(formData.percentage)
      if (!formData.percentage || isNaN(percentage) || percentage <= 0 || percentage > 100) {
        validations.push({ type: 'error', message: 'Please enter a valid percentage (1-100)' })
      }
    }

    // Date validations
    if (!formData.effective_from) {
      validations.push({ type: 'error', message: 'Please select an effective from date' })
    }

    if (formData.effective_from && formData.effective_to) {
      if (new Date(formData.effective_to) < new Date(formData.effective_from)) {
        validations.push({ type: 'error', message: 'End date cannot be before start date' })
      }
    }

    // Warning for high percentage
    if (formData.calculation_method === 'percentage' && parseFloat(formData.percentage) > 50) {
      validations.push({ 
        type: 'warning', 
        message: 'High percentage allowance detected. Please verify this is correct.' 
      })
    }

    return validations
  }

  const handleSubmit = async () => {
    if (!institutionId) {
      toast.error("Institution ID is required")
      return
    }

    const validations = validateAllowanceForm()
    const errors = validations.filter(v => v.type === 'error')
    
    if (errors.length > 0) {
      toast.error(errors[0].message)
      return
    }

    const warnings = validations.filter(v => v.type === 'warning')
    if (warnings.length > 0) {
      warnings.forEach(warning => toast.warning(warning.message))
    }

    setSaving(true)
    try {
      const formattedData: IEmployeeAllowanceFormData = {
        employee: parseInt(formData.employee),
        allowance_type: parseInt(formData.allowance_type),
        calculation_method: formData.calculation_method,
        amount: formData.amount,
        percentage: formData.percentage,
        is_active: formData.is_active,
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || null,
      }

      if (editingAllowance) {
        const updatedAllowance = await updateEmployeeAllowance({
          id: editingAllowance.id,
          employeeAllowanceData: formattedData
        })
        if (updatedAllowance) {
          // The API should return the full object with employee and allowance_type details
          const displayAllowance = convertToDisplayAllowance(updatedAllowance)
          setAllowances(prev => prev.map(a => a.id === editingAllowance.id ? displayAllowance : a))
          toast.success("Allowance updated successfully")
        }
      } else {
        const newAllowance = await createEmployeeAllowance({
          institutionId,
          employeeAllowanceData: formattedData
        })
        if (newAllowance) {
          const displayAllowance = convertToDisplayAllowance(newAllowance)
          setAllowances(prev => [...prev, displayAllowance])
          toast.success("Allowance created successfully")
        }
      }

      setIsDialogOpen(false)
      setEditingAllowance(null)
      resetForm()
    } catch (error: any) {
      console.error("Failed to save allowance:", error)
      toast.error(error.message || "An error occurred while saving the allowance")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (allowance: DisplayEmployeeAllowance) => {
    setEditingAllowance(allowance)
    setFormData({
      employee: allowance.employee.id,
      allowance_type: allowance.allowance_type.id.toString(),
      calculation_method: allowance.calculation_method,
      amount: allowance.amount,
      percentage: allowance.percentage,
      is_active: allowance.is_active,
      effective_from: allowance.effective_from,
      effective_to: allowance.effective_to || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deleteEmployeeAllowance(id)
      if (success) {
        setAllowances(prev => prev.filter(a => a.id !== id))
        toast.success("Allowance deleted successfully")
      } else {
        toast.error("Failed to delete allowance")
      }
    } catch (error: any) {
      console.error("Failed to delete allowance:", error)
      toast.error(error.message || "An error occurred while deleting the allowance")
    }
  }

  const openNewAllowanceDialog = () => {
    setEditingAllowance(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      employee: "",
      allowance_type: "",
      calculation_method: "fixed",
      amount: "",
      percentage: "",
      is_active: true,
      effective_from: "",
      effective_to: "",
    })
  }

  const filteredAllowances = allowances.filter((allowance) => {
    // Search filter
    const matchesSearch =
      allowance.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allowance.allowance_type.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && allowance.is_active) ||
      (statusFilter === "inactive" && !allowance.is_active)

    // Method filter
    const matchesMethod = methodFilter === "all" || allowance.calculation_method === methodFilter

    return matchesSearch && matchesStatus && matchesMethod
  })

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setMethodFilter("all")
  }

  const exportData = () => {
    const csvContent = [
      [
        "Employee",
        "Allowance Type",
        "Method",
        "Amount",
        "Percentage",
        "Calculated Amount",
        "Status",
        "Effective From",
        "Effective To",
      ],
      ...filteredAllowances.map((allowance) => [
        allowance.employee.name,
        allowance.allowance_type.name,
        allowance.calculation_method,
        allowance.amount,
        allowance.percentage,
        getCalculatedAmount(allowance),
        allowance.is_active ? "Active" : "Inactive",
        format(new Date(allowance.effective_from), "yyyy-MM-dd"),
        allowance.effective_to ? format(new Date(allowance.effective_to), "yyyy-MM-dd") : "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "employee-allowances.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getCategoryColor = () => {
    // Simple blue color for all allowance types
    return "bg-blue-50 text-blue-700 border-blue-200"
  }

  // Render validation messages
  const renderValidationMessages = () => {
    const validations = validateAllowanceForm()
    if (validations.length === 0) return null

    return (
      <div className="space-y-2 md:col-span-2">
        {validations.map((validation, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-3 rounded-lg ${
              validation.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            {validation.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${
              validation.type === 'error' ? 'text-red-800' : 'text-amber-800'
            }`}>
              {validation.message}
            </p>
          </div>
        ))}
      </div>
    )
  }

  if (loading && !institutionId) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading institution data...</span>
      </div>
    )
  }

  if (isLoadingEmployees || isLoadingAllowanceTypes) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <div className="w-full px-2 py-8">
        {/* Header Section */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Allowances</h1>
              <p className="text-gray-600">Manage employee-specific allowances and benefits</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={exportData}
                variant="outline"
                className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
                disabled={filteredAllowances.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={openNewAllowanceDialog} 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                    disabled={!institutionId}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Allowance
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      {editingAllowance ? "Edit Allowance" : "Add New Allowance"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure employee allowance details and calculation method.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee" className="text-sm font-medium">
                        Employee *
                      </Label>
                      <Select 
                        value={formData.employee}
                        onValueChange={(value) => setFormData({ ...formData, employee: value })}
                        disabled={saving || isLoadingEmployees}
                      >
                        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                          <SelectValue placeholder={isLoadingEmployees ? "Loading employees..." : "Select employee"} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingEmployees ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500 flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading employees...
                            </div>
                          ) : employees.length > 0 ? (
                            employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                <div className="flex flex-col">
                                  <span>{emp.name}</span>
                                </div>
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
                      <Label htmlFor="allowance_type" className="text-sm font-medium">
                        Allowance Type *
                      </Label>
                      <Select 
                        value={formData.allowance_type}
                        onValueChange={(value) => setFormData({ ...formData, allowance_type: value })}
                        disabled={saving || isLoadingAllowanceTypes}
                      >
                        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                          <SelectValue placeholder={isLoadingAllowanceTypes ? "Loading allowance types..." : "Select allowance type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingAllowanceTypes ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500 flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading allowance types...
                            </div>
                          ) : allowanceTypes.length > 0 ? (
                            allowanceTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No allowance types available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {!isLoadingAllowanceTypes && allowanceTypes.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          No allowance types found. Please create allowance types first.
                        </p>
                      )}
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
                        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage of Salary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-sm font-medium">
                        Fixed Amount
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        disabled={saving || formData.calculation_method === "percentage"}
                        className="focus:ring-orange-500 focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500">
                        {formData.calculation_method === "percentage"
                          ? "Not used for percentage calculation"
                          : "Fixed allowance amount"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="percentage" className="text-sm font-medium">
                        Percentage
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
                        disabled={saving || formData.calculation_method === "fixed"}
                        className="focus:ring-orange-500 focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500">
                        {formData.calculation_method === "fixed"
                          ? "Not used for fixed calculation"
                          : "Percentage of base salary (0-100)"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="effective_from" className="text-sm font-medium">
                        Effective From *
                      </Label>
                      <Input
                        id="effective_from"
                        type="date"
                        value={formData.effective_from}
                        onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                        className="focus:ring-orange-500 focus:border-orange-500"
                        disabled={saving}
                      />
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
                        className="focus:ring-orange-500 focus:border-orange-500"
                        disabled={saving}
                        min={formData.effective_from}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label className="text-base font-medium">Active Status</Label>
                          <p className="text-sm text-gray-500">Enable or disable this allowance</p>
                        </div>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                          className="data-[state=checked]:bg-orange-600"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    {/* Employee Summary */}
                    {getSelectedEmployee() && (
                      <div className="md:col-span-2 space-y-2">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            Employee Information
                          </h4>
                          <div className="space-y-1 text-xs text-blue-700">
                            <p>• Name: {getSelectedEmployee()?.name}</p>
                            <p>• Email: {getSelectedEmployee()?.email}</p>
                            {getSelectedEmployee()?.salary && getSelectedEmployee()?.salary! > 0 && (
                              <p>• Base Salary: ${getSelectedEmployee()?.salary?.toLocaleString()}</p>
                            )}
                            {formData.calculation_method === 'percentage' && 
                             formData.percentage && 
                             getSelectedEmployee()?.salary && (
                              <p>• Calculated Amount: ${((getSelectedEmployee()?.salary || 0) * parseFloat(formData.percentage) / 100).toLocaleString()}</p>
                            )}
                            {formData.calculation_method === 'fixed' && formData.amount && (
                              <p>• Fixed Amount: ${parseFloat(formData.amount).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {renderValidationMessages()}
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
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      disabled={saving || !employees.length || !allowanceTypes.length || validateAllowanceForm().filter(v => v.type === 'error').length > 0}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {saving ? "Saving..." : editingAllowance ? "Update" : "Create"} Allowance
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
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Allowances</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredAllowances.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active Allowances</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredAllowances.filter((a) => a.is_active).length}
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
                    $
                    {filteredAllowances
                      .filter((a) => a.is_active)
                      .reduce((sum, a) => sum + getCalculatedAmount(a), 0)
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
                    {filteredAllowances.filter((a) => a.calculation_method === "percentage").length}
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
                placeholder="Search by employee name or allowance type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}
              >
                <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
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
                <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
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
                className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading allowances...</span>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Current Allowances
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({filteredAllowances.length} of {allowances.length} records)
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">Overview of all employee allowances and their calculated amounts</p>
              </div>
              
              {filteredAllowances.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No allowances found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {allowances.length === 0 
                      ? "No allowances have been created yet." 
                      : "No allowances match your current filters."}
                  </p>
                  {allowances.length > 0 && (
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
                      <TableHead className="font-semibold text-gray-900">Allowance Type</TableHead>
                      <TableHead className="font-semibold text-gray-900">Method</TableHead>
                      <TableHead className="font-semibold text-gray-900">Calculated Amount</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">Effective Period</TableHead>
                      <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllowances.map((allowance) => (
                      <TableRow key={allowance.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{allowance.employee.name}</div>
                            <div className="text-sm text-gray-500">{allowance.employee.email}</div>
                            
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${getCategoryColor()} border font-medium`}
                          >
                            {allowance.allowance_type.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {allowance.calculation_method === "fixed" ? (
                              <DollarSign className="h-3 w-3 text-green-600" />
                            ) : (
                              <Percent className="h-3 w-3 text-purple-600" />
                            )}
                            {allowance.calculation_method === "fixed" ? "Fixed" : "Percentage"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-lg font-semibold text-orange-600">
                            ${getCalculatedAmount(allowance).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={allowance.is_active ? "default" : "secondary"}
                            className={
                              allowance.is_active
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-gray-200 text-gray-700"
                            }
                          >
                            {allowance.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">From: {format(new Date(allowance.effective_from), "MMM dd, yyyy")}</div>
                            {allowance.effective_to && (
                              <div className="text-gray-500">To: {format(new Date(allowance.effective_to), "MMM dd, yyyy")}</div>
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
                                onClick={() => handleEdit(allowance)}
                                className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                              >
                                <Edit className="h-4 w-4 mr-2 text-orange-600" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(allowance.id)}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}