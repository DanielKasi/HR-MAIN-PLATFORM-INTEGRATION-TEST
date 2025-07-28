"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Briefcase, ArrowLeft, Check, Upload, X, FileText, Loader2, Users, Coins, AlertCircle, Search, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getDepartments, getJobPositions, getJobPosition, updateJobPosition } from "@/lib/utils"
import type { JobPositionFormData, IDepartment, IJobPosition, CreateJobPositionData, IEmployee } from "@/app/types/types.utils"
import { toast } from "sonner"



// Virtual scrolling component for performance with large lists
const VirtualizedEmployeeList: React.FC<{
  employees: IEmployee[]
  selectedEmployees: Set<number>
  onEmployeeToggle: (employee: IEmployee, checked: boolean) => void
  searchTerm: string
  containerHeight: number
}> = ({ employees, selectedEmployees, onEmployeeToggle, searchTerm, containerHeight }) => {
  const [startIndex, setStartIndex] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const ITEM_HEIGHT = 60 // Height of each employee item
  const BUFFER_SIZE = 5 // Extra items to render for smooth scrolling

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees

    const searchLower = searchTerm.toLowerCase()
    return employees.filter(employee =>
      employee.user?.fullname.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.department.name.toLowerCase().includes(searchLower)
    )
  }, [employees, searchTerm])

  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT)
  const endIndex = Math.min(startIndex + visibleCount + BUFFER_SIZE, filteredEmployees.length)
  const visibleEmployees = filteredEmployees.slice(Math.max(0, startIndex - BUFFER_SIZE), endIndex)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    const newStartIndex = Math.floor(scrollTop / ITEM_HEIGHT)
    setStartIndex(newStartIndex)
  }, [])

  const totalHeight = filteredEmployees.length * ITEM_HEIGHT
  const offsetY = Math.max(0, startIndex - BUFFER_SIZE) * ITEM_HEIGHT

  return (
    <div
      ref={scrollElementRef}
      className="relative overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleEmployees.map((employee, index) => {
            const actualIndex = Math.max(0, startIndex - BUFFER_SIZE) + index
            const isSelected = selectedEmployees.has(employee.id)

            return (
              <div
                key={employee.id}
                className={`flex items-center space-x-3 p-3 border-b hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5 border-primary/20' : 'border-border'
                  }`}
                style={{ height: ITEM_HEIGHT }}
                onClick={() => onEmployeeToggle(employee, !isSelected)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onEmployeeToggle(employee, checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Label className="font-medium cursor-pointer block truncate text-sm">
                        {employee.user?.fullname}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">
                        {employee.department.name} • {employee.email}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// IEmployee Selection Modal Component
const EmployeeSelectionModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  employees: IEmployee[]
  selectedEmployees: { id: number; name: string }[]
  onConfirm: (selectedEmployees: { id: number; name: string }[]) => void
  isLoading?: boolean
}> = ({ isOpen, onClose, employees, selectedEmployees: initialSelectedEmployees, onConfirm, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(
    new Set(initialSelectedEmployees.map(emp => emp.id))
  )
  const [isSelectMode, setIsSelectMode] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployees(new Set(initialSelectedEmployees.map(emp => emp.id)))
      setSearchTerm("")
      setIsSelectMode(false)
    }
  }, [isOpen, initialSelectedEmployees])

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees

    const searchLower = searchTerm.toLowerCase()
    return employees.filter(employee =>
      employee.user?.fullname.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.department.name.toLowerCase().includes(searchLower)
    )
  }, [employees, searchTerm])

  // Group employees by department for better organization
  const employeesByDepartment = useMemo(() => {
    const groups: Record<string, IEmployee[]> = {}
    filteredEmployees.forEach(employee => {
      const deptName = employee.department.name
      if (!groups[deptName]) {
        groups[deptName] = []
      }
      groups[deptName].push(employee)
    })
    return groups
  }, [filteredEmployees])

  const handleEmployeeToggle = useCallback((employee: IEmployee, checked: boolean) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(employee.id)
      } else {
        newSet.delete(employee.id)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0) {
      // Deselect all filtered employees
      setSelectedEmployees(prev => {
        const newSet = new Set(prev)
        filteredEmployees.forEach(emp => newSet.delete(emp.id))
        return newSet
      })
    } else {
      // Select all filtered employees
      setSelectedEmployees(prev => {
        const newSet = new Set(prev)
        filteredEmployees.forEach(emp => newSet.add(emp.id))
        return newSet
      })
    }
  }, [filteredEmployees, selectedEmployees.size])

  const handleDepartmentSelect = useCallback((departmentEmployees: IEmployee[], select: boolean) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev)
      departmentEmployees.forEach(emp => {
        if (select) {
          newSet.add(emp.id)
        } else {
          newSet.delete(emp.id)
        }
      })
      return newSet
    })
  }, [])

  const handleConfirm = () => {
    const selectedEmployeesList = employees
      .filter(emp => selectedEmployees.has(emp.id))
      .map(emp => ({
        id: emp.id,
        name: emp.user?.fullname || ""
      }))

    onConfirm(selectedEmployeesList)
  }

  const selectedCount = selectedEmployees.size
  const allFilteredSelected = filteredEmployees.length > 0 &&
    filteredEmployees.every(emp => selectedEmployees.has(emp.id))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Employees for Salary Update
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose employees who will receive the new salary. You can search and select multiple employees.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Controls */}
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={filteredEmployees.length === 0}
                  />
                  <Label
                    className="text-sm cursor-pointer"
                    onClick={handleSelectAll}
                  >
                    Select All {searchTerm ? 'Filtered' : ''} ({filteredEmployees.length})
                  </Label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className="text-xs"
                >
                  {isSelectMode ? 'List View' : 'Bulk Select'}
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedCount} selected
                </Badge>
                {selectedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEmployees(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* IEmployee List */}
          <div className="flex-1 overflow-hidden border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading employees...</p>
                </div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    {searchTerm ? "No employees found" : "No employees available"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms" : "No employees are available for selection."}
                  </p>
                </div>
              </div>
            ) : isSelectMode ? (
              // Department-grouped view for bulk selection
              <ScrollArea className="h-96">
                <div className="p-4 space-y-4">
                  {Object.entries(employeesByDepartment).map(([deptName, deptEmployees]) => {
                    const deptSelectedCount = deptEmployees.filter(emp => selectedEmployees.has(emp.id)).length
                    const allDeptSelected = deptSelectedCount === deptEmployees.length

                    return (
                      <div key={deptName} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={allDeptSelected}
                              onCheckedChange={(checked) =>
                                handleDepartmentSelect(deptEmployees, checked as boolean)
                              }
                            />
                            <Label className="font-medium cursor-pointer">
                              {deptName}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {deptSelectedCount}/{deptEmployees.length}
                            </Badge>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="pl-6 space-y-2">
                          {deptEmployees.map(employee => (
                            <div key={employee.id} className="flex items-center space-x-2 py-1">
                              <Checkbox
                                checked={selectedEmployees.has(employee.id)}
                                onCheckedChange={(checked) =>
                                  handleEmployeeToggle(employee, checked as boolean)
                                }
                              />
                              <Label className="text-sm cursor-pointer flex-1">
                                {employee.user?.fullname}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              // Virtualized list view for performance
              <VirtualizedEmployeeList
                employees={filteredEmployees}
                selectedEmployees={selectedEmployees}
                onEmployeeToggle={handleEmployeeToggle}
                searchTerm={searchTerm}
                containerHeight={384} // 96 * 4 = 384px
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <div className="flex items-center text-sm text-muted-foreground mr-auto">
            {selectedCount > 0 && (
              <span>
                {selectedCount} employee{selectedCount !== 1 ? 's' : ''} selected
                {searchTerm && ` (${filteredEmployees.length} shown)`}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="w-full sm:w-auto"
          >
            <Check className="h-4 w-4 mr-2" />
            Select ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EditJobPositionPage() {
  const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null)
  const [formData, setFormData] = useState<JobPositionFormData>({
    name: "",
    description: "",
    department: null,
    reportsTo: null,
    contractTemplate: null,
    offerLetterTemplate: null,
    salary: "",
  })
  const [departments, setDepartments] = useState<IDepartment[]>([])
  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof JobPositionFormData, string>>>({})

  // IEmployee selection state
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<{ id: number; name: string }[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [employeesSelected, setEmployeesSelected] = useState(false)
  const [originalSalary, setOriginalSalary] = useState("")
  const [isSalaryChanged, setIsSalaryChanged] = useState(false)

  const router = useRouter()
  const params = useParams()
  const jobPositionId = Number.parseInt(params.id as string)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    if (isNaN(jobPositionId)) {
      toast.error("Invalid job position ID")
      router.push("/job-positions")
      return
    }

    fetchInitialData()
  }, [selectedInstitution, selectedBranch, jobPositionId, router])

  const fetchInitialData = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)
      const [fetchedJobPosition, fetchedDepartments, fetchedJobPositions] = await Promise.all([
        getJobPosition({ jobPositionId }),
        getDepartments({ institutionId: selectedInstitution.id }),
        getJobPositions({ institutionId: selectedInstitution.id }),
      ])

      if (fetchedJobPosition) {
        setJobPosition(fetchedJobPosition)
        const salaryValue = fetchedJobPosition.salary.toString()
        setOriginalSalary(salaryValue)
        setFormData({
          name: fetchedJobPosition.name,
          description: fetchedJobPosition.description || "",
          department: fetchedJobPosition.department,
          reportsTo: fetchedJobPosition.reportsTo || null,
          contractTemplate: null,
          offerLetterTemplate: null,
          salary: salaryValue,
        })
      } else {
        toast.error("Job position not found")
        router.push("/job-positions")
        return
      }

      if (fetchedDepartments) {
        setDepartments(fetchedDepartments)
      }
      if (fetchedJobPositions) {
        setJobPositions(fetchedJobPositions.filter((pos) => pos.id !== jobPositionId))
      }
    } catch (error) {
      console.error("Error fetching initial data:", error)
      toast.error("Failed to load job position data")
      router.push("/job-positions")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployeesForPosition = async () => {
    if (!jobPosition || !selectedInstitution) return

    setIsLoadingEmployees(true)
    try {
      let allEmployees: IEmployee[] = []

      if (jobPosition.employees && jobPosition.employees.length > 0) {
        // Use existing employees from job position
        allEmployees = jobPosition.employees
      } else {
        // Mock API call for fetching all employees in the institution
        // In reality, you'd want to implement server-side filtering and pagination
        try {
          const response = await fetch(`/api/institutions/${selectedInstitution.id}/employees`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            allEmployees = await response.json()
          } else {
            // Fallback to job position employees if API fails
            allEmployees = jobPosition.employees || []
          }
        } catch (apiError) {
          console.warn("API call failed, using job position employees:", apiError)
          allEmployees = jobPosition.employees || []
        }
      }

      setEmployees(allEmployees)
    } catch (error) {
      console.error("Error fetching employees:", error)
      toast.error("Failed to load employees")
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  const handleSalaryFieldClick = () => {
    setShowEmployeeModal(true)
    fetchEmployeesForPosition()
  }

  const handleReopenEmployeeSelection = () => {
    setShowEmployeeModal(true)
    fetchEmployeesForPosition()
  }

  const handleConfirmEmployeeSelection = (newSelectedEmployees: { id: number; name: string }[]) => {
    setSelectedEmployees(newSelectedEmployees)
    setEmployeesSelected(newSelectedEmployees.length > 0)
    setShowEmployeeModal(false)

    if (newSelectedEmployees.length > 0) {
      toast.success(`${newSelectedEmployees.length} employee(s) selected for salary update`)
    }
  }

  const updateFormData = (field: keyof JobPositionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Track salary changes
    if (field === "salary") {
      const salaryChanged = value !== originalSalary
      setIsSalaryChanged(salaryChanged)

      // Reset employee selection state when salary changes back to original
      if (!salaryChanged) {
        setEmployeesSelected(false)
        setSelectedEmployees([])
      }
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleFileChange = (field: "contractTemplate" | "offerLetterTemplate", file: File | null) => {
    updateFormData(field, file)
  }

  const removeFile = (field: "contractTemplate" | "offerLetterTemplate") => {
    updateFormData(field, null)
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Job position name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Job position name must be at least 2 characters"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Job description is required"
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters"
    }

    if (!formData.department) {
      newErrors.department = "Please select a department"
    }

    if (!formData.salary.trim()) {
      newErrors.salary = "Salary is required"
    } else if (isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
      newErrors.salary = "Please enter a valid salary amount"
    }

    // Only require employee selection if salary has changed and no employees selected
    if (isSalaryChanged && selectedEmployees.length === 0) {
      newErrors.salary = "Please select employees who will be affected by this salary change"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution || !selectedBranch || !jobPosition) {
      toast.error("Missing required information")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    setIsSubmitting(true)

    try {
      const updateData: CreateJobPositionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        department: formData.department!,
        salary: Number(formData.salary),
        affected_employees: []
      }

      // Only include affected employees if salary has changed
      if (isSalaryChanged && selectedEmployees.length > 0) {
        updateData.affected_employees = selectedEmployees.map(emp => emp.id)
      }

      if (formData.reportsTo) {
        updateData.reports_to = formData.reportsTo
      }

      if (formData.contractTemplate) {
        updateData.contract_template = formData.contractTemplate
      }

      if (formData.offerLetterTemplate) {
        updateData.offer_letter_template = formData.offerLetterTemplate
      }

      const updatedJobPosition = await updateJobPosition({
        jobPositionId,
        jobPositionData: updateData,
      })

      if (updatedJobPosition) {
        const message = isSalaryChanged && selectedEmployees.length > 0
          ? `Job position updated successfully! Salary changes applied to ${selectedEmployees.length} employee(s).`
          : "Job position updated successfully!"
        toast.success(message)
        router.push(`/job-positions/`)
      } else {
        toast.error("Failed to update job position. Please try again.")
      }
    } catch (error) {
      console.error("Error updating job position:", error)
      toast.error("Failed to update job position. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-6">
        <div className="w-full space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-32" />
          </div>
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Position
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Edit Job Position</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update job position details for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* IEmployee Selection Alert */}
              {isSalaryChanged && !employeesSelected && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Salary Change Detected:</strong> You have modified the salary amount. Please select which employees will be affected by this change.
                  </AlertDescription>
                </Alert>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Position Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Job Position Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Software Engineer, HR Manager, Sales Representative"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                {/* Salary with IEmployee Selection */}
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-medium">
                    Salary * {isSalaryChanged && <span className="text-xs text-amber-600">(Changed - Select employees)</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="salary"
                      type="number"
                      placeholder="50000"
                      value={formData.salary}
                      onChange={(e) => updateFormData("salary", e.target.value)}
                      className={`pr-10 ${errors.salary ? "border-destructive" : ""} ${isSalaryChanged ? "border-amber-300 bg-amber-50" : ""
                        }`}
                    />
                    <Coins className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Show employee selection UI only when salary is changed */}
                  {isSalaryChanged && (
                    <>
                      {employeesSelected && selectedEmployees.length > 0 ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {selectedEmployees.length} employee(s) selected for salary update
                            </Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleReopenEmployeeSelection}
                              className="text-xs"
                            >
                              Change Selection
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSalaryFieldClick}
                            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Select Employees for Salary Update
                          </Button>
                          <p className="text-xs text-amber-600">
                            You must select employees before updating the salary
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Show original salary info when not changed */}
                  {!isSalaryChanged && originalSalary && (
                    <p className="text-xs text-muted-foreground">
                      Current salary: ${Number(originalSalary).toLocaleString()}
                    </p>
                  )}

                  {errors.salary && <p className="text-sm text-destructive">{errors.salary}</p>}
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">
                    Department *
                  </Label>
                  <Select
                    value={formData.department?.toString() || ""}
                    onValueChange={(value) => updateFormData("department", Number(value))}
                  >
                    <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="text-sm text-destructive">{errors.department}</p>}
                </div>

                {/* Reports To */}
                <div className="space-y-2">
                  <Label htmlFor="reportsTo" className="text-sm font-medium">
                    Reports To (Optional)
                  </Label>
                  <Select
                    value={formData.reportsTo?.toString() || "0"}
                    onValueChange={(value) => updateFormData("reportsTo", value === "0" ? null : Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a position (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {jobPositions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name} - {position.department_details?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Job Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the job responsibilities, requirements, and qualifications..."
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  rows={4}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              {/* Current Files Display */}
              {(jobPosition?.contractTemplate || jobPosition?.offerLetterTemplate) && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Current Templates</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {jobPosition.contractTemplate && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Current Contract Template</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Upload a new file to replace</p>
                      </div>
                    )}
                    {jobPosition.offerLetterTemplate && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Current Offer Letter Template</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Upload a new file to replace</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File Uploads */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contract Template */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Contract Template (Optional)</Label>
                  {formData.contractTemplate ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{formData.contractTemplate.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFile("contractTemplate")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(formData.contractTemplate.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <Label htmlFor="contractTemplate" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary/80">
                            Click to upload new contract template
                          </span>
                          <Input
                            id="contractTemplate"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleFileChange("contractTemplate", e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 10MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Offer Letter Template */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Offer Letter Template (Optional)</Label>
                  {formData.offerLetterTemplate ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{formData.offerLetterTemplate.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile("offerLetterTemplate")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(formData.offerLetterTemplate.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <Label htmlFor="offerLetterTemplate" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary/80">
                            Click to upload new offer letter template
                          </span>
                          <Input
                            id="offerLetterTemplate"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleFileChange("offerLetterTemplate", e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (isSalaryChanged && selectedEmployees.length === 0)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Update Job Position
                      {isSalaryChanged && selectedEmployees.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          +{selectedEmployees.length} salary updates
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* IEmployee Selection Modal */}
        <EmployeeSelectionModal
          isOpen={showEmployeeModal}
          onClose={() => setShowEmployeeModal(false)}
          employees={employees}
          selectedEmployees={selectedEmployees}
          onConfirm={handleConfirmEmployeeSelection}
          isLoading={isLoadingEmployees}
        />
      </div>
    </div>
  )
}