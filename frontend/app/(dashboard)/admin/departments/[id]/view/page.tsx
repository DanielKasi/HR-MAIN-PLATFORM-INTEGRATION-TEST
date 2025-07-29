"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Building2,
  UserPlus,
  FileText,
  Calendar,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Coins,
  Filter,
  Briefcase,
  GraduationCap,
  UserCheck,
  UserX,
  Eye,
  RefreshCw,
  Info,
} from "lucide-react"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getDepartments, getAllEmployees, getOnBoardings, getJobPositions } from "@/lib/utils"
import type { IDepartment, IOnBoarding, IJobPosition, IEmployee } from "@/app/types/types.utils"
import { toast } from "sonner"



const getFullName = (employee: IEmployee) => {
  return employee.user?.fullname || employee.email || 'Unknown Employee'
}

const getDepartmentName = (employee: IEmployee) => {
  return employee.department?.name || 'Unknown Department'
}

const getPositionName = (employee: IEmployee) => {
  return employee.position?.name || 'Unknown Position'
}

const getDepartmentId = (employee: IEmployee) => {
  return employee.department?.id || 0
}

const getPositionId = (employee: IEmployee) => {
  return employee.position?.id || 0
}

// Helper function to get application data from onboarding
const getApplicationData = (onboarding: IOnBoarding) => {
  const applicationData = onboarding.application_details

  if (!applicationData) {
    return {
      applicantName: "N/A",
      applicantEmail: "N/A",
      jobDesc: "N/A",
      applicantPhone: "N/A",
      applicantAddress: "N/A",
      applicantPositions: "N/A",
      department: "N/A"
    }
  }

  const jobDetails = applicationData.job_position_advert_job_details
  const jobName = jobDetails?.name || "N/A"
  const jobDescription = jobDetails?.description || "N/A"
  const department = jobDetails?.department || "N/A"

  return {
    applicantName: applicationData.applicant_name || "N/A",
    applicantEmail: applicationData.applicant_email || "N/A",
    jobDesc: jobName !== "N/A" ? jobName : jobDescription,
    applicantPhone: applicationData.applicant_phone || "N/A",
    applicantAddress: applicationData.address || "N/A",
    applicantPositions: applicationData.positions?.toString() || "N/A",
    department: department
  }
}

const matchEmployeeWithRecruitment = (employee: IEmployee, onboardings: IOnBoarding[]) => {
  const matchingOnboarding = onboardings.find(onboarding => {
    const { applicantEmail } = getApplicationData(onboarding)
    return applicantEmail === employee.email && onboarding.status === 'accepted_offer'
  })

  return matchingOnboarding || null
}

export default function DepartmentDetailView() {
  const router = useRouter()
  const params = useParams()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  const departmentId = params?.id ? parseInt(params.id as string) : null

  const [department, setDepartment] = useState<IDepartment | null>(null)
  const [allEmployees, setAllEmployees] = useState<IEmployee[]>([])
  const [departmentEmployees, setDepartmentEmployees] = useState<IEmployee[]>([])
  const [allOnboardings, setAllOnboardings] = useState<IOnBoarding[]>([])
  const [recruitmentHistory, setRecruitmentHistory] = useState<IOnBoarding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [allJobPositions, setJobPositions] = useState<IJobPosition[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)


  // Effects
  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    if (!departmentId) {
      setError("Department ID is required")
      return
    }

    fetchDepartmentData()
  }, [selectedBranch, selectedInstitution, router, departmentId])

  const fetchDepartmentData = async (showRefreshLoader = false) => {
    if (!selectedInstitution || !departmentId) return

    try {
      setIsRefreshing(showRefreshLoader)
      setIsLoading(!showRefreshLoader)
      setError("")
      setDebugInfo("")

      const departments = await getDepartments({ institutionId: selectedInstitution.id })

      const currentDepartment = departments?.find(d => d.id === departmentId)
      if (!currentDepartment) {
        setError(`Department with ID ${departmentId} not found`)
        return
      }

      setDepartment(currentDepartment)

      const allEmployees = await getAllEmployees({ institutionId: selectedInstitution.id })
      const employees = allEmployees ?? []
      setAllEmployees(employees)

      const filteredEmployees = employees.filter((emp: IEmployee) => {
        const empDepartmentId = getDepartmentId(emp)
        const empDepartmentName = getDepartmentName(emp)
        return empDepartmentId === currentDepartment.id
      })

      setDepartmentEmployees(filteredEmployees)

      // Fetch all onboarding records
      const allOnboardings = await getOnBoardings({ institutionId: selectedInstitution.id })
      setAllOnboardings(allOnboardings || [])

      // Filter onboardings that resulted in accepted offers (recruitment history)
      const acceptedOnboardings = allOnboardings?.filter(onboarding => {
        return onboarding.status === 'accepted_offer'
      }) || []
      setRecruitmentHistory(acceptedOnboardings)

      const allJobPositions = await getJobPositions({ institutionId: selectedInstitution.id })
      setJobPositions(allJobPositions || [])

      console.log(allJobPositions)


    } catch (err) {
      setError("Failed to fetch department data")
      toast.error("Failed to load department data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchDepartmentData(true)
  }

  // Filter employees based on search and status
  const filteredEmployees = useMemo(() => {
    return departmentEmployees.filter((employee) => {
      const fullName = getFullName(employee)
      const position = getPositionName(employee)

      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active)

      return matchesSearch && matchesStatus
    })
  }, [departmentEmployees, searchTerm, statusFilter])

  const filteredRecruitmentHistory = useMemo(() => {
    return recruitmentHistory.filter((onboarding) => {
      const { applicantName, applicantEmail, jobDesc, department: jobDepartment } = getApplicationData(onboarding)

      const belongsToCurrentDepartment = jobDepartment.toLowerCase().includes(department?.name.toLowerCase() || '') ||
        department?.name.toLowerCase().includes(jobDepartment.toLowerCase()) ||
        jobDepartment === department?.name


      const matchesCurrentEmployee = departmentEmployees.some(emp => emp.email === applicantEmail)

      const matchesSearch =
        applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobDepartment.toLowerCase().includes(searchTerm.toLowerCase())

      return (belongsToCurrentDepartment || matchesCurrentEmployee) && matchesSearch
    })
  }, [recruitmentHistory, department, departmentEmployees, searchTerm])

  // Filter job positions for current department
  const filteredJobPositions = useMemo(() => {
    return allJobPositions.filter((position) => {
      const positionBelongsToDepartment = position.department === departmentId
      
      const matchesSearch = searchTerm === "" || 
        position.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (position.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      return positionBelongsToDepartment && matchesSearch
    })
  }, [allJobPositions, departmentId, searchTerm])

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEmployees, currentPage, itemsPerPage])

  const paginatedRecruitmentHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredRecruitmentHistory.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredRecruitmentHistory, currentPage, itemsPerPage])

  const paginatedJobPositions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredJobPositions.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredJobPositions, currentPage, itemsPerPage])

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const formatCurrency = (amount: string | number) => {
    if (!amount) return "N/A"
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-UG', { 
      style: 'currency', 
      currency: 'UGX',
      minimumFractionDigits: 0 
    }).format(num)
  }

  const getInitials = (name: string) => {
    if (!name || name === "N/A") return "NA"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Departments
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-1" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchDepartmentData()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!department) {
    return (
      <div className="w-full h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Department not found</p>
          <Button onClick={() => router.push("/admin/departments")} className="mt-4">
            Back to Departments
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => router.push("/admin/departments")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Departments
      </Button>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{department.name}</h1>
              <p className="text-sm text-muted-foreground">{department.description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{debugInfo}</AlertDescription>
        </Alert>
      )}

      {/* Department Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{departmentEmployees.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold">{departmentEmployees.filter(e => e.is_active).length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Job Positions</p>
                <p className="text-2xl font-bold">{filteredJobPositions.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-lg font-semibold">{selectedBranch.branch_name}</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab)
        setCurrentPage(1)
        setSearchTerm("")
        setStatusFilter("all")
      }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="positions">Job Positions</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Department Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Institution</p>
                    <p className="text-sm">{selectedInstitution.institution_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Branch</p>
                    <p className="text-sm">{selectedBranch.branch_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{department.description}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Employees</span>
                    <span className="font-semibold">{departmentEmployees.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Employees</span>
                    <span className="font-semibold">{departmentEmployees.filter(e => e.is_active).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Job Positions</span>
                    <span className="font-semibold">{filteredJobPositions.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Recent Hires (This Year)</span>
                    <span className="font-semibold">
                      {departmentEmployees.filter(e => {
                        const joinDate = new Date(e.date_of_joining)
                        const currentYear = new Date().getFullYear()
                        return joinDate.getFullYear() === currentYear
                      }).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Department Employees</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {paginatedEmployees.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No employees found</h3>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recruitment</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEmployees.map((employee) => {
                        const recruitmentRecord = matchEmployeeWithRecruitment(employee, recruitmentHistory)

                        return (
                          <TableRow key={employee.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={employee.employee_profile_picture || ""} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(getFullName(employee))}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{getFullName(employee)}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{getPositionName(employee)}</p>
                            </TableCell>
                            <TableCell className="text-sm">{employee.email}</TableCell>
                            <TableCell className="text-sm">{employee.phone_number}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(employee.date_of_joining)}
                            </TableCell>
                            <TableCell>
                              {employee.is_active ? (
                                <Badge className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-50 text-gray-700 border-gray-200">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {recruitmentRecord ? (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Recruited
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  External
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  {recruitmentRecord && (
                                    <DropdownMenuItem>
                                      <FileText className="h-4 w-4 mr-2" />
                                      View Recruitment
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Positions Tab */}
        <TabsContent value="positions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Job Positions</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage positions available in this department</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search positions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  {/* <Button size="sm">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Add Position
                  </Button> */}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {paginatedJobPositions.length === 0 ? (
                <div className="p-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No job positions found</h3>
                  <p className="text-muted-foreground">Create job positions for this department to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Current Employees</TableHead>
                        <TableHead>Active Job Ads</TableHead>
                        <TableHead>Reports To</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedJobPositions.map((position) => {
                        const employeesInPosition = departmentEmployees.filter(emp => getPositionId(emp) === position.id)
                        const activeJobAds = position.job_adverts?.filter((ad: { status: string }) => ad.status === 'active').length || 0

                        return (
                          <TableRow key={position.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                  <Briefcase className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{position.name}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                                {position.description || "No description available"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{formatCurrency(position.salary)}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{employeesInPosition.length}</span>
                                {employeesInPosition.length > 0 && (
                                  <span className="text-sm text-muted-foreground">employees</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {activeJobAds > 0 ? (
                                <Badge className="bg-green-50 text-green-700 border-green-200">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {activeJobAds} active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                  No active ads
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">
                                {position.reports_to_details?.name || "No supervisor"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Users className="h-4 w-4 mr-2" />
                                    View Employees
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Job Advertisements
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Edit Position
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Delete Position
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination for Job Positions */}
              {filteredJobPositions.length > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredJobPositions.length)} of{" "}
                    {filteredJobPositions.length} positions
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {Math.ceil(filteredJobPositions.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredJobPositions.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredJobPositions.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recruitment History Tab */}
        <TabsContent value="recruitment" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Recruitment History</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search recruitment history..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {paginatedRecruitmentHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No recruitment history found</h3>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Position Applied</TableHead>
                        <TableHead>Current Employee</TableHead>
                        <TableHead>Recruitment Date</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecruitmentHistory.map((onboarding) => {
                        const {
                          applicantName,
                          applicantEmail,
                          jobDesc,
                          applicantPhone,
                          applicantAddress,
                          department: jobDepartment
                        } = getApplicationData(onboarding)

                        const currentEmployee = departmentEmployees.find(emp => emp.email === applicantEmail)

                        return (
                          <TableRow key={onboarding.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(applicantName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{applicantName}</p>
                                  <p className="text-xs text-muted-foreground">{applicantEmail}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{jobDesc}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {currentEmployee ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <div>
                                    <p className="text-sm font-medium">{getFullName(currentEmployee)}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-sm text-muted-foreground">Not found</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(onboarding.updated_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {applicantPhone}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[100px]">{applicantAddress}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm max-w-[150px] truncate">
                                {onboarding.remarks || "Successfully recruited"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {currentEmployee && (
                                    <DropdownMenuItem>
                                      <Users className="h-4 w-4 mr-2" />
                                      View Employee Profile
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export Record
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination for Recruitment History */}
              {filteredRecruitmentHistory.length > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredRecruitmentHistory.length)} of{" "}
                    {filteredRecruitmentHistory.length} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {Math.ceil(filteredRecruitmentHistory.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredRecruitmentHistory.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredRecruitmentHistory.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination for Employees Tab */}
      {activeTab === "employees" && filteredEmployees.length > itemsPerPage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of{" "}
            {filteredEmployees.length} employees
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {Math.ceil(filteredEmployees.length / itemsPerPage)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredEmployees.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredEmployees.length / itemsPerPage)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Pagination for Job Positions Tab */}
      {activeTab === "positions" && filteredJobPositions.length > itemsPerPage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredJobPositions.length)} of{" "}
            {filteredJobPositions.length} positions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {Math.ceil(filteredJobPositions.length / itemsPerPage)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredJobPositions.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredJobPositions.length / itemsPerPage)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}