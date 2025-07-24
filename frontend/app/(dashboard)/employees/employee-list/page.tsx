"use client"

import type React from "react"

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
import { Icon } from "@iconify/react"
import { Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { getAllEmployees } from "@/lib/utils"
import { useSelector } from "react-redux";
import { selectAttachedInstitutions } from "@/store/auth/selectors";
import {
  selectSelectedInstitution,
} from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types"
import { EmployeeFormData, EmployeeFromAPI, PERMISSION_CODES } from "@/app/types/types.utils"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import ProtectedComponent from "@/components/ProtectedComponent"

// Union type to handle both data structures
type EmployeeData = EmployeeFromAPI | EmployeeFormData

// Helper function to check if data is EmployeeFromAPI type
const isEmployeeFromAPI = (data: EmployeeData): data is EmployeeFromAPI => {
  return 'created_at' in data && typeof data.position === 'object' && data.position !== null && 'name' in data.position;
};

// Helper function to get full name
const getFullName = (employee: EmployeeData) => {
  return employee.user?.fullname || employee.email || 'Unknown Employee'
}

// Updated helper function to get department name from API data
const getDepartmentName = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee) && employee.department && employee.department.name) {
    return employee.department.name;
  }
  // For EmployeeFormData, department is just an ID
  if (!isEmployeeFromAPI(employee)) {
    return `Department ${employee.department || 'Unknown'}`
  }
  return `Department ${isEmployeeFromAPI(employee) ? employee.department?.id : 'Unknown'}`
}

// Helper function to get position name from API data
const getPositionName = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee) && employee.position && employee.position.name) {
    return employee.position.name;
  }
  // For EmployeeFormData, position is just an ID
  if (!isEmployeeFromAPI(employee)) {
    return `Position ${employee.position || 'Unknown'}`
  }
  return `Position ${isEmployeeFromAPI(employee) ? employee.position?.id : 'Unknown'}`
}

// Helper function to get role names
const getRoleNames = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee) && employee.roles && employee.roles.length > 0) {
    return employee.roles.map(role => role.name).join(', ');
  }
  return 'No roles assigned'
}

interface EmployeeTableProps {
  employees: EmployeeData[]
  onDelete: (id: number) => void
}

function EmployeeTable({ employees, onDelete }: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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
      const matchesStatus = statusFilter === "all" ||
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
      "Accounting": "bg-yellow-100 text-yellow-800",
    }
    return colors[department] || "bg-gray-100 text-gray-800"
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDepartmentFilter("all")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Employees ({filteredEmployees.length} employees)</span>
          <Link href="/employees/add-employee">
            <Button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </CardTitle>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search employees, departments, positions, or emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by department" />
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
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || departmentFilter !== "all" || statusFilter !== "all") && (
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Results Summary */}
        {filteredEmployees.length > 0 && (
          <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
            <div>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
              {(searchTerm || departmentFilter !== "all" || statusFilter !== "all") && ` (filtered from ${employees.length} total)`}
            </div>
          </div>
        )}

        {paginatedEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No employees found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || departmentFilter !== "all" || statusFilter !== "all"
                ? "No employees match your current filters."
                : "No employees have been added yet."}
            </p>
            {(searchTerm || departmentFilter !== "all" || statusFilter !== "all") ? (
              <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2">
                Clear Filters
              </Button>
            ) : (
              <Link href="/employees/add-employee">
                <Button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4" />
                  Add First Employee
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((employee) => (
                    <TableRow
                      key={employee.id || Math.random()}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => window.location.href = `/employees/profile/${employee.id || 'unknown'}`}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {getFullName(employee)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getDepartmentColor(getDepartmentName(employee))}>
                          {getDepartmentName(employee)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{employee.email}</TableCell>
                      <TableCell>{getPositionName(employee)}</TableCell>
                      <TableCell>{getStatusBadge(employee.is_active)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/employees/profile/${employee.id || 'unknown'}`}>
                            <Button variant="ghost" size="sm" title="View Details" onClick={(e) => e.stopPropagation()}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link
                            href={`/employees/update-employee/${employee.id || 'unknown'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              localStorage.setItem(`employee_${employee.id || 'unknown'}`, JSON.stringify(employee));
                            }}
                          >
                            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}>
                              <Button variant="ghost" size="sm" title="Update Employee">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </ProtectedComponent>
                            
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete Employee"
                                className="text-red-600 hover:text-red-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {getFullName(employee)}? This action cannot be undone.
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function Component() {
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [InstitutionId, setInstitutionId] = useState<string | null>(null);
  const InstitutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id.toString());
    }
    // Get the first Institution ID from attached Institutions
    else if (InstitutionsAttached && InstitutionsAttached.length > 0) {
      // Convert the numeric ID to a string
      const id = String(InstitutionsAttached[0].id);
      setInstitutionId(id);
    }
  }, [InstitutionsAttached, selectedInstitution]);

  // function to load Employees
  useEffect(() => {
    const loadEmployees = async () => {
      if (!InstitutionId) {
        if (InstitutionsAttached && InstitutionsAttached.length > 0) {
          const testId = String(InstitutionsAttached[0].id);
          setInstitutionId(testId);
        }
        return;
      }

      try {
        setLoading(true);
        const institutionIdNumber = parseInt(InstitutionId);
        const result = await getAllEmployees({ institutionId: institutionIdNumber });

        if (result && Array.isArray(result)) {
          setEmployees(result);
          setError(null);
        } else {
          setError("No employee data available");
          setEmployees([]);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
        setError("Failed to load employees");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [InstitutionId, InstitutionsAttached]);

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
    <div className="w-full h-full p-2 space-y-6">
      <div className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
          </div>
        </div>

        <EmployeeTable
          employees={employees}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
