"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
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
import { Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Mail, Building, User, Briefcase, Plus } from "lucide-react"
import { getAllEmployees } from "@/lib/utils"
import {useSelector} from "react-redux";
import {selectAttachedInstitutions, selectTemporaryPermissions} from "@/store/auth/selectors";
import {
  selectAccessToken,
  selectSelectedInstitution,
  selectUser,
  selectUserLoading,
} from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types"
import Link from "next/link"

// Updated interface to match your API response
interface Employee {
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
  }
  first_name: string
  last_name: string
  email: string
  phone_number: string
  position: {
    id: number
    name: string
  }
  department : number
  department_details: {
    id: number
    name: string
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

// Interfaces for dropdown data
interface Department {
  id: number
  name: string
}

interface Position {
  id: number
  name: string
}

// Helper function to get full name
const getFullName = (employee: Employee) => {
  return `${employee.first_name} ${employee.last_name}`.trim()
}

// Helper function to get department name from API data
const getDepartmentName = (employee: Employee) => {
  if (employee.department_details && employee.department_details.name) {
    return employee.department_details.name;
  }
  return `Department ${employee.department}`
}

// Helper function to get position name from API data
const getPositionName = (employee: Employee) => {
  if (employee.position && employee.position.name) {
    return employee.position.name;
  }
  return `Position ${employee.position?.id || 'Unknown'}`
}

interface EmployeeTableProps {
  employees: Employee[]
  onDelete: (id: number) => void
  onUpdate: (employee: Employee) => void
  departments: Department[]
  positions: Position[]
}

function EmployeeViewModal({ employee }: { employee: Employee }) {
  const fullName = getFullName(employee)
  const departmentName = getDepartmentName(employee)
  const positionName = getPositionName(employee)

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Employee Details - {fullName}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
            <p className="text-lg font-semibold">{fullName}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {employee.email}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
            <p>{employee.phone_number || "Not provided"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Address</Label>
            <p>{employee.address || "Not provided"}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Department</Label>
            <p className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              {departmentName}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Job Position</Label>
            <p className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {positionName}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
            <Badge
              className={employee.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
            >
              {employee.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
            <p>{employee.experience} years</p>
          </div>
        </div>
        <div className="col-span-1 md:col-span-2 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
              <p>{new Date(employee.date_of_birth).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date of Joining</Label>
              <p>{new Date(employee.date_of_joining).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Qualifications</Label>
              <p>{employee.qualifications || "Not provided"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Skills</Label>
              <p>{employee.skills || "Not provided"}</p>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}

function EmployeeUpdateModal({
  employee,
  onUpdate,
  departments,
  positions
}: {
  employee: Employee
  onUpdate: (employee: Employee) => void
  departments: Department[]
  positions: Position[]
}) {
  const [formData, setFormData] = useState<Employee>({
    ...employee,
    position: employee.position || { id: 1, name: "" },
    department: employee.department || 1,
    phone_number: employee.phone_number || "",
    address: employee.address || "",
    qualifications: employee.qualifications || "",
    skills: employee.skills || "",
    emergency_contact_name: employee.emergency_contact_name || "",
    emergency_contact_phone: employee.emergency_contact_phone || "",
    emergency_contact_relationship: employee.emergency_contact_relationship || "",
    marital_status: employee.marital_status || "",
    employee_profile_picture: employee.employee_profile_picture || ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const selectedDepartment = departments.find(d => d.id === formData.department)
    const selectedPosition = positions.find(p => p.id === formData.position.id)

    const updatedEmployee = {
      ...formData,
      department_details: selectedDepartment || formData.department_details,
      position: selectedPosition || formData.position
    }

    onUpdate(updatedEmployee)
  }

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Update Employee - {getFullName(employee)}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone_number">Phone</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Select
              value={formData.department.toString()}
              onValueChange={(value) => setFormData({ ...formData, department: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Select
              value={formData.position.id?.toString() || ""}
              onValueChange={(value) => {
                const selectedPosition = positions.find(p => p.id.toString() === value)
                setFormData({
                  ...formData,
                  position: selectedPosition || { id: parseInt(value), name: "" }
                })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id.toString()}>
                    {pos.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="is_active">Status</Label>
            <Select
              value={formData.is_active.toString()}
              onValueChange={(value) => setFormData({ ...formData, is_active: value === "true" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Update Employee</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function EmployeeTable({ employees, onDelete, onUpdate, departments, positions }: EmployeeTableProps) {
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
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
    )
  }

  const getDepartmentColor = (department: string) => {
    const colors: Record<string, string> = {
      Engineering: "bg-blue-100 text-blue-800",
      Marketing: "bg-purple-100 text-purple-800",
      Sales: "bg-green-100 text-green-800",
      HR: "bg-pink-100 text-pink-800",
      Finance: "bg-yellow-100 text-yellow-800",
      Operations: "bg-orange-100 text-orange-800",
      Design: "bg-indigo-100 text-indigo-800",
      Product: "bg-red-100 text-red-800",
    }
    return colors[department] || "bg-gray-100 text-gray-800"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Employee Management ({filteredEmployees.length} employees)</span>
          <Link href="/employees/add-employee">
            <Button className="flex items-center gap-2">
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
                  <div key={employee.id} className="grid grid-cols-6 gap-4 p-4 border-b hover:bg-gray-50">
                    <div className="font-medium">{getFullName(employee)}</div>
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <EmployeeViewModal employee={employee} />
                        </Dialog>

                        {/* Update Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Update Employee">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <EmployeeUpdateModal
                            employee={employee}
                            onUpdate={onUpdate}
                            departments={departments}
                            positions={positions}
                          />
                        </Dialog>

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
                                onClick={() => onDelete(employee.id)}
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
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
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
        console.log('Loading employees for institution ID:', InstitutionId);

        const institutionIdNumber = parseInt(InstitutionId);
        console.log('Parsed institution ID to number:', institutionIdNumber);

        const data = await getAllEmployees({ institutionId: institutionIdNumber });

        if (data) {
          console.log('Successfully loaded employees:', data);
          setEmployees(data);
          setError(null); // Clear any previous errors
        } else {
          console.log('No employee data returned from API');
          setError("No employee data available");
        }
      } catch (err) {
        console.error("Detailed error loading employees:", err);
        setError("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [InstitutionId, InstitutionsAttached]);

  // TODO: Add these API endpoints
  // Load departments and positions when component mounts
  useEffect(() => {
    const loadDepartmentsAndPositions = async () => {
      if (!InstitutionId) return;

      try {
        // TODO: Replace with your actual API endpoints
        // const departmentsData = await getDepartments({ institutionId: parseInt(InstitutionId) });
        // const positionsData = await getPositions({ institutionId: parseInt(InstitutionId) });

        // setDepartments(departmentsData);
        // setPositions(positionsData);

        // Temporary empty arrays until you add the endpoints
        setDepartments([]);
        setPositions([]);
      } catch (err) {
        console.error("Error loading departments and positions:", err);
      }
    };

    loadDepartmentsAndPositions();
  }, [InstitutionId]);

  const handleDelete = async (id: number) => {
    try {
      // TODO: Add your delete API call here
      // await deleteEmployee(id)
      setEmployees(employees.filter((emp) => emp.id !== id))
    } catch (err) {
      console.error("Error deleting employee:", err)
    }
  }

  const handleUpdate = async (updatedEmployee: Employee) => {
    try {
      // TODO: Add your update API call here
      // await updateEmployee(updatedEmployee)
      setEmployees(employees.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp)))
    } catch (err) {
      console.error("Error updating employee:", err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    )
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
          onUpdate={handleUpdate}
          departments={departments}
          positions={positions}
        />
      </div>
    </div>
  )
}
