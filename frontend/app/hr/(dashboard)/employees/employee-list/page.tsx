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
import {useSelector} from "react-redux";
import {selectAttachedInstitutions} from "@/store/auth/selectors";
import {
  selectSelectedInstitution,
} from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types"
import { User, EmployeeFormData } from "@/app/types/types.utils"
import Link from "next/link"

// Interface for getAllEmployees API response with additional nested objects
interface EmployeeFromAPI {
  id: number
  user: {
    id: number
    email: string
    fullname: string
    is_active: boolean
    is_email_verified: boolean
    is_password_verified: boolean
    is_staff: boolean
    roles: string
    branches: string
    permissions: string
  } | null
  email: string
  phone_number: string
  position: {
    id: number
    name: string
    department_id?: number
  }
  department: {
    id: number
    name: string
    institution_id: number
  }
  roles: Array<{
    id: number
    name: string
  }>
  date_of_birth: string
  date_of_joining: string
  address: string
  is_active: boolean
  experience: number
  qualifications: string
  skills: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  marital_status: string
  children_count: number
  employee_profile_picture: string
  created_at: string
  updated_at: string
}

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Employee Management ({filteredEmployees.length} employees)</span>
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
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <div className="w-full">
            <div className="bg-gray-50 border-b">
              <div className="grid grid-cols-6 gap-4 p-4 font-medium">
                <div>Name</div>
                <div>Department</div>
                <div>Email</div>
                <div>Job Position</div>
                <div>Status</div>
                <div className="w-[150px]">Actions</div>
              </div>
            </div>
            <div>
              {paginatedEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No employees found matching your criteria
                </div>
              ) : (
                paginatedEmployees.map((employee) => (
                  <div key={employee.id || Math.random()} className="grid grid-cols-6 gap-4 p-4 border-b hover:bg-gray-50">
                    <Link
                      href={`/employees/profile/${employee.id || 'unknown'}`}
                      className="font-medium cursor-pointer hover:text-orange-600 hover:underline transition-colors"
                      onClick={() => {
                        console.log('Navigating to employee profile:', employee.id);
                        // Store employee data in localStorage as backup
                        localStorage.setItem(`employee_${employee.id || 'unknown'}`, JSON.stringify(employee));
                      }}
                    >
                      {getFullName(employee)}
                    </Link>
                    <div>
                      <Badge variant="outline" className={getDepartmentColor(getDepartmentName(employee))}>
                        {getDepartmentName(employee)}
                      </Badge>
                    </div>
                    <div className="text-sm">{employee.email}</div>
                    <div>{getPositionName(employee)}</div>
                    <div>{getStatusBadge(employee.is_active)}</div>
                    <div>
                      <div className="flex items-center gap-1">
                        {/* View Button */}
                        <Link href={`/employees/profile/${employee.id || 'unknown'}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        {/* Update Button - Now navigates to update page */}
                        <Link 
                          href={`/employees/update-employee/${employee.id || 'unknown'}`}
                          onClick={() => {
                            // Store employee data in localStorage for the update page
                            localStorage.setItem(`employee_${employee.id || 'unknown'}`, JSON.stringify(employee));
                          }}
                        >
                          <Button variant="ghost" size="sm" title="Update Employee">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>

                        {/* Delete Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete Employee"
                              className="text-red-600 hover:text-red-700"
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
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{" "}
              {filteredEmployees.length} employees
            </p>
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
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
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
          setError(null); // Clear any previous errors
        } else {
          setError("No employee data available");
        }
      } catch (err) {
        setError("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [InstitutionId, InstitutionsAttached]);

  const handleDelete = async (id: number) => {
    try {
      // TODO: Add your delete API call here
      // await deleteEmployee(id)
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management System</h1>
          <p className="text-muted-foreground">Manage your organization's employees efficiently</p>
        </div>

        <EmployeeTable
          employees={employees}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}