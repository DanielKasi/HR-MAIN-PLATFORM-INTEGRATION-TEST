"use client"

import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserPlus,
  Upload,
  ChevronDown,
  MoreVertical,
} from "lucide-react"
import { getAllEmployees } from "@/lib/utils"
import { useSelector } from "react-redux"
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { type EmployeeFormData, type IEmployee, PERMISSION_CODES } from "@/types/types.utils"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import ProtectedComponent from "@/components/ProtectedComponent"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BulkUploadEmployeesDialog } from "@/components/dialogs/bulk-upload-employees-dialog"
import { TableSkeleton } from "@/components/common/table-skeleton"

// Union type to handle both data structures
type EmployeeData = IEmployee | EmployeeFormData

// Helper function to check if data is IEmployee type
const isEmployeeFromAPI = (data: EmployeeData): data is IEmployee => {
  return "created_at" in data && typeof data.position === "object" && data.position !== null && "name" in data.position
}

// Helper function to get full name
const getFullName = (employee: EmployeeData) => {
  return employee.user?.fullname || employee.email || "Unknown Employee"
}

// Updated helper function to get department name from API data
const getDepartmentName = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee) && employee.department && employee.department.name) {
    return employee.department.name
  }
  // For EmployeeFormData, department is just an ID
  if (!isEmployeeFromAPI(employee)) {
    return `Department ${employee.department || "Unknown"}`
  }
  return `Department ${isEmployeeFromAPI(employee) ? employee.department?.id : "Unknown"}`
}

// Helper function to get position name from API data
const getPositionName = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee) && employee.position && employee.position.name) {
    return employee.position.name
  }
  // For EmployeeFormData, position is just an ID
  if (!isEmployeeFromAPI(employee)) {
    return `Position ${employee.position || "Unknown"}`
  }
  return `Position ${isEmployeeFromAPI(employee) ? employee.position?.id : "Unknown"}`
}

// Helper function to get role names
const getRoleNames = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee) && employee.roles && employee.roles.length > 0) {
    return employee.roles.map((role) => role.name).join(", ")
  }
  return "No roles assigned"
}

interface EmployeeTableProps {
  employees: EmployeeData[]
  onDelete: (id: number) => void
  isBulkUploadDialogOpen: boolean
  setIsBulkUploadDialogOpen: (open: boolean) => void
  loadEmployees: () => void
  loading: boolean
}

function EmployeeTable({
  employees,
  onDelete,
  isBulkUploadDialogOpen,
  setIsBulkUploadDialogOpen,
  loadEmployees,
  loading,
}: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, departmentFilter, statusFilter])

  // Get unique departments for filter
  const uniqueDepartments = useMemo(() => {
    const departments = employees.map((employee) => getDepartmentName(employee))
    return Array.from(new Set(departments))
  }, [employees])

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const fullName = getFullName(employee)
      const departmentName = getDepartmentName(employee)
      const positionName = getPositionName(employee)

      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        positionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        departmentName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDepartment = departmentFilter === "all" || departmentName === departmentFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active)

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [employees, searchTerm, departmentFilter, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
    )
  }

  const getDepartmentColor = (department: string) => {
    const colors: Record<string, string> = {
      Engineering: "bg-blue-100 text-blue-800",
      Marketing: "bg-purple-100 text-purple-800",
      Sales: "bg-orange-100 text-orange-800",
      HR: "bg-pink-100 text-pink-800",
      Finance: "bg-yellow-100 text-yellow-800",
      Operations: "bg-orange-100 text-orange-800",
      Design: "bg-indigo-100 text-indigo-800",
      Product: "bg-red-100 text-red-800",
      "IT department": "bg-blue-100 text-blue-800",
      Accounting: "bg-yellow-100 text-yellow-800",
    }
    return colors[department] || "bg-gray-100 text-gray-800"
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDepartmentFilter("all")
    setStatusFilter("all")
    setCurrentPage(1)
  }

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
    )
  }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <CardHeader className="space-y-4">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-2xl font-bold">Employees</span>
          <BulkUploadEmployeesDialog
            isOpen={isBulkUploadDialogOpen}
            onClose={() => setIsBulkUploadDialogOpen(false)}
            onUploadSuccess={() => {
              loadEmployees();
              setIsBulkUploadDialogOpen(false)
            }}
          />
        </CardTitle>

        {/* Responsive Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mt-12">
          {/* Search Bar - Full width on all screens */}
          <div className="relative flex-1 lg:flex-[0.4]">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search employees, departments, positions, or emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>

          {/* Filter Controls - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:flex-[0.4]">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px] text-xs sm:text-sm">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] lg:w-[160px] text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || departmentFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm bg-transparent"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Add Employee Dropdown */}
          <div className="flex-shrink-0 lg:flex-[0.2]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className=" w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Employee</span>
                  <span className="sm:hidden">Add</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/employees/add-employee")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Single Employee
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBulkUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload Employees
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-6">
        {/* Results Summary */}
        {filteredEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm text-muted-foreground mb-4 px-4 sm:px-0 gap-2">
            <div>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{" "}
              {filteredEmployees.length} employees
              {(searchTerm || departmentFilter !== "all" || statusFilter !== "all") &&
                ` (filtered from ${employees.length} total)`}
            </div>
          </div>
        )}

        {paginatedEmployees.length === 0 ? (
          <div className="p-6 sm:p-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No employees found</h3>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">
              {searchTerm || departmentFilter !== "all" || statusFilter !== "all"
                ? "No employees match your current filters."
                : "No employees have been added yet."}
            </p>
            {searchTerm || departmentFilter !== "all" || statusFilter !== "all" ? (
              <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2 bg-transparent">
                Clear Filters
              </Button>
            ) : (
              <></>
            )}
          </div>
        ) : (
          <>
            {/* Responsive Table Container */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="overflow-x-auto mt-6">
                  <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm">Department</TableHead>
                        <TableHead className="text-xs sm:text-sm">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm">Job Position/Title</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                        <TableHead className="w-[100px] sm:w-[150px] text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEmployees.map((employee, idx) => (
                        <TableRow key={idx} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <div className="font-medium text-xs sm:text-sm">{getFullName(employee)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${getDepartmentColor(getDepartmentName(employee))} text-xs`}
                            >
                              {getDepartmentName(employee)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">{employee.email}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{getPositionName(employee)}</TableCell>
                          <TableCell>{getStatusBadge(employee.is_active)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem>
                                  <Link href={`/employees/profile/${employee.id}`}>
                                    <Button variant="ghost" size="sm" title="View Details" className="text-xs">
                                      <Eye className="h-4 w-4 mr-2" /> View Details
                                    </Button>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link
                                    href={`/employees/update-employee/${employee.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      localStorage.setItem(
                                        `employee_${employee.id || "unknown"}`,
                                        JSON.stringify(employee),
                                      )
                                    }}
                                  >
                                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}>
                                      <Button variant="ghost" size="sm" title="Update Employee" className="text-xs">
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                      </Button>
                                    </ProtectedComponent>
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem className="text-red-600">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Delete Employee"
                                        className="text-red-600 hover:text-red-700 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete {getFullName(employee)}? This action cannot be
                                          undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => employee.id && onDelete(employee.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Enhanced Responsive Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-4 sm:px-0 gap-4">
                <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{" "}
                  {filteredEmployees.length} employees
                </div>
                <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 overflow-x-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-xs px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs"
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="text-xs px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </div>
  )
}

export default function InterviewsPage() {
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false)
  const selectedBranch = useSelector(selectSelectedBranch)

  // function to load Employees
  useEffect(() => {
    loadEmployees()
  }, [selectedInstitution])

  const loadEmployees = async () => {
    if (!selectedInstitution) {
      return
    }

    try {
      setLoading(true)
      const result = await getAllEmployees({ institutionId: selectedInstitution.id })

      if (result && Array.isArray(result)) {
        setEmployees(result)
        setError(null)
      } else {
        setError("No employee data available")
        setEmployees([])
      }
    } catch (err) {
      console.error("Error loading employees:", err)
      setError("Failed to load employees")
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setEmployees(employees.filter((emp) => emp.id !== id))
    } catch (err) {
      console.error("Error deleting employee:", err)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <div className="w-full">
        <EmployeeTable
          isBulkUploadDialogOpen={isBulkUploadDialogOpen}
          setIsBulkUploadDialogOpen={setIsBulkUploadDialogOpen}
          employees={employees}
          onDelete={handleDelete}
          loadEmployees={loadEmployees}
          loading={loading}
        />
      </div>
    </div>
  )
}