"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Coins, Percent, MoreVertical } from "lucide-react"
import {
  Search,
  Download,
  Users,
  Coins as Coins2,
  CalendarPlus2Icon as CalendarIcon2,
  Loader2,
  MoreHorizontal,
  Info,
  AlertTriangle,
  FileSpreadsheet,
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"


import {
  createEmployeeAllowance,
  getEmployeeAllowances,
  updateEmployeeAllowance,
  deleteEmployeeAllowance,
  getAllEmployees,
  getAllowanceTypes,
  createAllowanceType,
} from "@/lib/utils"
import { IEmployeeAllowance, IEmployeeAllowanceFormData, IAllowanceType, IEmployee } from "@/app/types/types.utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"
import { useSelector } from "react-redux"
import { EmployeeSearchableSelect } from "@/components/ui/employee-searchable-select"
import { formatCurrency } from "@/lib/helpers"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { Card, CardHeader } from "@/components/ui/card"




interface SimpleAllowanceType {
  id: number
  name: string
}


interface DisplayEmployeeAllowance {
  id: number
  employee: IEmployee
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

interface ValidationResult {
  employee?: string
  allowance_type?: string
  amount?: string
  percentage?: string
  effective_from?: string
  effective_to?: string
  warning?: string
}

export default function EmployeeAllowanceComponent() {
  const [allowances, setAllowances] = useState<IEmployeeAllowance[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [allowanceTypes, setAllowanceTypes] = useState<SimpleAllowanceType[]>([])
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAllowance, setEditingAllowance] = useState<DisplayEmployeeAllowance | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [methodFilter, setMethodFilter] = useState<"all" | "fixed" | "percentage">("all")
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({})
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [ isLoading, setIsLoading] = useState(true)


  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  const [isAddAllowanceTypeDialogOpen, setIsAddAllowanceTypeDialogOpen] = useState(false)
  const [isCreatingAllowanceType, setIsCreatingAllowanceType] = useState(false)
  const [newAllowanceTypeForm, setNewAllowanceTypeForm] = useState({
    name: "",
    description: "",
    is_taxable: true,
    is_active: true,
  })
  const [paginationInfo, setPaginationInfo] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
    totalPages: 1
  });


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

  useEffect(() => {
    const fetchAllowanceTypes = async () => {
      if (!selectedInstitution?.id) {
        return
      }

      try {
        const types = await getAllowanceTypes(selectedInstitution.id)

        if (types && Array.isArray(types)) {
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

        setAllowanceTypes([])
        toast.error("Failed to load allowance types")
      }
    }

    fetchAllowanceTypes()
  }, [selectedInstitution?.id])

  useEffect(() => {

    fetchEmployees()
  }, [selectedInstitution]);

      const fetchEmployees = async () => {
      if (!selectedInstitution?.id) {
        return
      }

      setIsLoadingEmployees(true)
      try {
        const fetchedEmployees = await getAllEmployees({ institutionId: selectedInstitution.id })
          setEmployees(fetchedEmployees)
      } catch (error:any) {
        setEmployees([])
        toast.error(error?.message || error?.detail ||  "Failed to load employees")
      } finally {
        setIsLoadingEmployees(false)
        setIsLoading(false)
      }
    }

  useEffect(() => {
    const fetchAllowances = async () => {
      if (!selectedInstitution) {
        return
      }

      try {
        const allowancesData = await getEmployeeAllowances(selectedInstitution.id)
          setAllowances(allowancesData)

      } catch (error) {
        setAllowances([])
        toast.error("Failed to load allowances")
      }
    }

    fetchAllowances()
  }, [selectedInstitution])


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
          errors.warning = 'High percentage allowance detected. Please verify this is correct.'
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


  // const convertToDisplayAllowance = (apiAllowance: any): DisplayEmployeeAllowance => {
  //   return {
  //     id: apiAllowance.id,
  //     employee: {
  //       id: apiAllowance.employee.id.toString(),
  //       name: apiAllowance.employee.user.fullname,
  //       email: apiAllowance.employee.user.email,
  //       employee_id: apiAllowance.employee.id.toString(),
  //       salary: 0,
  //       user: {
  //         fullname: apiAllowance.employee.user.fullname,
  //         email: apiAllowance.employee.user.email
  //       }
  //     },
  //     allowance_type: {
  //       id: apiAllowance.allowance_type.id,
  //       name: apiAllowance.allowance_type.name
  //     },
  //     calculation_method: apiAllowance.calculation_method,
  //     amount: apiAllowance.amount,
  //     percentage: apiAllowance.percentage,
  //     is_active: apiAllowance.is_active,
  //     effective_from: apiAllowance.effective_from,
  //     effective_to: apiAllowance.effective_to,
  //     created_at: apiAllowance.created_at
  //   }
  // }
  const getCalculatedAmount = (allowance: DisplayEmployeeAllowance): number => {
    if (allowance.calculation_method === "percentage" && allowance.employee.salary) {
      return (Number(allowance.employee.salary|| 0)* parseFloat(allowance.percentage)) / 100
    }
    return parseFloat(allowance.amount) || 0
  }



  const handleCreateAllowanceType = async () => {
    if (!newAllowanceTypeForm.name || !newAllowanceTypeForm.description) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreatingAllowanceType(true)
    try {
      const allowanceTypeData = {
        name: newAllowanceTypeForm.name,
        description: newAllowanceTypeForm.description,
        is_taxable: newAllowanceTypeForm.is_taxable,
        is_active: newAllowanceTypeForm.is_active,
      }

      const newAllowanceType = await createAllowanceType({
        institutionId: selectedInstitution!.id,
        allowanceTypeData,
      })

      if (newAllowanceType) {
        // Add to the allowanceTypes list
        setAllowanceTypes(prev => [...prev, {
          id: newAllowanceType.id,
          name: newAllowanceType.name
        }])

        // Select the newly created allowance type
        setFormData({ ...formData, allowance_type: newAllowanceType.id.toString() })

        // Reset and close dialog
        setNewAllowanceTypeForm({
          name: "",
          description: "",
          is_taxable: true,
          is_active: true,
        })
        setIsAddAllowanceTypeDialogOpen(false)
        toast.success("Allowance type created successfully")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create allowance type")
    } finally {
      setIsCreatingAllowanceType(false)
    }
  }

  const hasValidationErrors = () => {
    // Check for missing required fields
    if (!formData.employee || !formData.allowance_type || !formData.effective_from) {
      return true
    }

    // Check for calculation method specific requirements
    if (formData.calculation_method === 'fixed' && !formData.amount) {
      return true
    }

    if (formData.calculation_method === 'percentage' && !formData.percentage) {
      return true
    }

    const errorKeys = Object.keys(validationErrors).filter(key => key !== 'warning')
    return errorKeys.length > 0
  }

  const handleSubmit = async () => {
    if (!formData.employee) {
      toast.error("Employee is required")
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
          const displayAllowance = updatedAllowance
          setAllowances(prev => prev.map(a => a.id === editingAllowance.id ? displayAllowance : a))
          toast.success("Allowance updated successfully")
        }
      } else {
        const newAllowance = await createEmployeeAllowance({
          institutionId: selectedInstitution!.id,
          employeeAllowanceData: formattedData
        })
        if (newAllowance) {
          const displayAllowance = newAllowance
          setAllowances(prev => [...prev, displayAllowance])
          toast.success("Allowance created successfully")
        }
      }

      setIsDialogOpen(false)
      setEditingAllowance(null)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || "An error occurred while saving the allowance")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (allowance: DisplayEmployeeAllowance) => {
    setEditingAllowance(allowance)
    setFormData({
      employee: allowance.employee.id.toString(),
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
    setValidationErrors({})
  }

  const filteredAllowances = allowances.filter((allowance) => {
    // Search filter
    const matchesSearch =
      allowance.employee.user?.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Export to CSV function
  const exportToCSV = () => {
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
        allowance.employee.user?.fullname||"",
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

  const exportToExcel = () => {
    try {
      const excelData = filteredAllowances.map((allowance) => ({
        "Employee Name": allowance.employee.user?.fullname||"",
        "Employee Email": allowance.employee.email,
        "Allowance Type": allowance.allowance_type.name,
        "Calculation Method": allowance.calculation_method === "fixed" ? "Fixed Amount" : "Percentage",
        "Fixed Amount": allowance.calculation_method === "fixed" ? parseFloat(allowance.amount) : "",
        "Percentage": allowance.calculation_method === "percentage" ? parseFloat(allowance.percentage) : "",
        "Calculated Amount": getCalculatedAmount(allowance),
        "Status": allowance.is_active ? "Active" : "Inactive",
        "Effective From": format(new Date(allowance.effective_from), "yyyy-MM-dd"),
        "Effective To": allowance.effective_to ? format(new Date(allowance.effective_to), "yyyy-MM-dd") : "",
        "Created Date": format(new Date(allowance.created_at), "yyyy-MM-dd"),
      }))

      const headers = Object.keys(excelData[0] || {})
      let htmlTable = '<table border="1"><thead><tr>'

      headers.forEach(header => {
        htmlTable += `<th>${header}</th>`
      })
      htmlTable += '</tr></thead><tbody>'

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
                  <x:Name>Employee Allowances</x:Name>
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


      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employee-allowances-${format(new Date(), "yyyy-MM-dd")}.xls`
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
    return "bg-blue-50 text-blue-700 border-blue-200"
  }

  if (!selectedInstitution || !selectedInstitution.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution selected...</span>
      </div>
    )
  }


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

  return (
    <div>
      <div className="w-full px-2 py-8">
        {/* Header Section */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xlm font-bold text-gray-900 mb-2">Employee Allowances</h1>
              <p className="text-gray-600">Manage employee-specific allowances and benefits</p>
            </div>
            <div className="flex gap-3">
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
                    disabled={filteredAllowances.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={exportToCSV}
                    className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                  >
                    <Download className="h-4 w-4 mr-2 text-orange-600" />
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
              {/* Create Allowance Type Dialog */}
              <Dialog open={isAddAllowanceTypeDialogOpen} onOpenChange={setIsAddAllowanceTypeDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New Allowance Type</DialogTitle>
                    <DialogDescription>
                      Add a new allowance type that can be used for employee allowances.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-name">Name *</Label>
                      <Input
                        id="new-name"
                        value={newAllowanceTypeForm.name}
                        onChange={(e) => setNewAllowanceTypeForm({ ...newAllowanceTypeForm, name: e.target.value })}
                        placeholder="e.g., Housing Allowance, Transportation"
                        disabled={isCreatingAllowanceType}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-description">Description *</Label>
                      <Textarea
                        id="new-description"
                        value={newAllowanceTypeForm.description}
                        onChange={(e) => setNewAllowanceTypeForm({ ...newAllowanceTypeForm, description: e.target.value })}
                        placeholder="Describe this allowance type..."
                        disabled={isCreatingAllowanceType}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="new-taxable"
                          checked={newAllowanceTypeForm.is_taxable}
                          onChange={(e) => setNewAllowanceTypeForm({ ...newAllowanceTypeForm, is_taxable: e.target.checked })}
                          disabled={isCreatingAllowanceType}
                        />
                        <Label htmlFor="new-taxable">Taxable</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="new-active"
                          checked={newAllowanceTypeForm.is_active}
                          onChange={(e) => setNewAllowanceTypeForm({ ...newAllowanceTypeForm, is_active: e.target.checked })}
                          disabled={isCreatingAllowanceType}
                        />
                        <Label htmlFor="new-active">Active</Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddAllowanceTypeDialogOpen(false)}
                      disabled={isCreatingAllowanceType}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateAllowanceType}
                      disabled={isCreatingAllowanceType}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    >
                      {isCreatingAllowanceType && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Allowance Type
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={openNewAllowanceDialog}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                    disabled={!selectedInstitution.id}
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
                      <div className="flex items-center justify-between h-8">
                        <Label htmlFor="employee" className="text-sm font-medium">
                          Employee *
                        </Label>
                      </div>
                      <EmployeeSearchableSelect
                        employees={employees}
                        value={[formData.employee]}
                        onValueChange={(value) => setFormData({ ...formData, employee: value.toString() })}
                        disabled={saving || isLoadingEmployees}
                        placeholder="Search and select employee"
                        isLoading={isLoadingEmployees}
                        showEmployeeId={false}
                        showDepartment={false}
                      />
                      {validationErrors.employee && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.employee}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between h-8">
                        <Label htmlFor="allowance_type" className="text-sm font-medium">
                          Allowance Type *
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsAddAllowanceTypeDialogOpen(true)}
                          disabled={saving}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Select
                        value={formData.allowance_type}
                        onValueChange={(value) => setFormData({ ...formData, allowance_type: value })}
                        disabled={saving}
                      >
                        <SelectTrigger className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.allowance_type ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                          }`}>
                          <SelectValue placeholder="Please select an allowance type" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowanceTypes.length > 0 ? (
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
                      {validationErrors.allowance_type ? (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.allowance_type}
                        </p>
                      ) : allowanceTypes.length === 0 ? (
                        <p className="text-xs text-red-500 mt-1">
                          No allowance types found. Please create allowance types first.
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
                        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
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
                          className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                            }`}
                        />
                        {validationErrors.amount ? (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.amount}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Enter the fixed allowance amount
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
                          className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.percentage ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
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
                    {/* Conditionally render amount or percentage field based on calculation method */}
                    {formData.calculation_method === "fixed" ? (
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-sm font-medium">
                          Fixed Amount *
                        </Label>
                        <Input
                          id="amount"
                          type="text"  // Changed from "number" to "text"
                          placeholder="0.00"
                          value={formData.amount ? formatCurrency(formData.amount) : ''}  // Format the display value
                          onChange={(e) => {
                            // Remove formatting to get raw number
                            const rawValue = e.target.value.replace(/[,$]/g, '');

                            // Only update if it's a valid number or empty
                            if (rawValue === '' || (!isNaN(parseFloat(rawValue)) && isFinite(parseFloat(rawValue)))) {
                              setFormData({
                                ...formData,
                                amount: rawValue, // Store the raw number value
                              });
                            }
                          }}
                          disabled={saving}
                          className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.amount
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : ''
                            }`}
                        />
                        {validationErrors.amount ? (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {validationErrors.amount}
                          </p>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500">Enter the fixed allowance amount</p>
                          </>
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
                          className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.percentage ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
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
                        className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.effective_from ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                        disabled={saving}
                        placeholder="Please select an effective from date"
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
                        className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.effective_to ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
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
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      disabled={saving || !employees.length || !allowanceTypes.length || hasValidationErrors()}
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
                  <Coins2 className="h-5 w-5 text-green-600" />
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
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or allowance type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Filter Row */}
            <div className="flex items-center justify-start gap-4">
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}
              >
                <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500 w-24 lg:w-36">
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
                <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500 w-24 lg:w-36">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>

              {(methodFilter !== "all" || statusFilter !== "all") ? (

                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
                >
                  Clear Filters
                </Button>
              ) : <></>
              }
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
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
                        <div className="font-medium text-gray-900">{allowance.employee.user?.fullname}</div>
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
                        {allowance.calculation_method === "fixed" ? "Fixed" : "Percentage"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-semibold text-orange-600">
                        {getCalculatedAmount(allowance).toLocaleString()}
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
                            <MoreVertical className="h-4 w-4 text-gray-600" />
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
        </div>
      </div>
    </div>
  )
}
