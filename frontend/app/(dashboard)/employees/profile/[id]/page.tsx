"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building,
  Users,
  Heart,
  Baby,
  GraduationCap,
  Award,
  Edit,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { getEmployeeDetailId } from "@/lib/utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"

// Employee interface (same as in your table)
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
  } | null
  first_name: string
  last_name: string
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

const formatDate = (dateString: string) => {
  if (!dateString) return "Not provided"
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const getMaritalStatusLabel = (status: string) => {
  const statusMap: { [key: string]: string } = {
    single: "Single",
    married: "Married",
    divorced: "Divorced",
    widowed: "Widowed",
  }
  return statusMap[status] || status
}

export default function EmployeeProfilePage() {
  const params = useParams()
  const employeeId = params.id as string
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  const [institutionId, setInstitutionId] = useState<number | null>(null)

  // Set institution ID
  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id)
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id)
    }
  }, [selectedInstitution, institutionsAttached])

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!institutionId || !employeeId) return

      try {
        setLoading(true)
        const data = await getEmployeeDetailId({
          institutionId: institutionId,
          employeeId: parseInt(employeeId),
        })

        if (data) {
          setEmployee(data)
          setError(null)
        } else {
          setError("Employee not found")
        }
      } catch (err) {
        setError("Failed to load employee details")
        console.error("Error fetching employee:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployee()
  }, [institutionId, employeeId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee profile...</p>
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Employee not found"}</p>
          <Link href="/employees">
            <Button>Back to Employees</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/employees">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Employees
            </Button>
          </Link>
        </div>

        <Card className="bg-white shadow-sm border">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-2xl text-gray-800">Employee Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative">
                <Avatar className="w-32 h-32 shadow-lg">
                  <AvatarImage src={employee.employee_profile_picture || "/placeholder.svg"} alt="Profile picture" />
                  <AvatarFallback className="text-2xl bg-green-100 text-green-700">
                    {employee.first_name?.[0]}
                    {employee.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                      {employee.first_name} {employee.last_name}
                    </h1>
                    <p className="text-xl text-green-600 font-semibold mb-1">{employee.position?.name || "Position not assigned"}</p>
                    <p className="text-lg text-gray-600">{employee.department?.name || "Department not assigned"}</p>
                  </div>
                  <div className="flex items-center space-x-3 mt-6 md:mt-0">
                    <Badge
                      variant={employee.is_active ? "default" : "secondary"}
                      className={employee.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}
                    >
                      {employee.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Mail className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{employee.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{employee.phone_number || "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">Joined {formatDate(employee.date_of_joining)}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Briefcase className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{employee.experience} years experience</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Date of Birth</label>
                  <p className="text-gray-900 font-medium">{formatDate(employee.date_of_birth)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Marital Status</label>
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-green-500" />
                    <span className="text-gray-900 font-medium">
                      {getMaritalStatusLabel(employee.marital_status)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Children</label>
                  <div className="flex items-center space-x-2">
                    <Baby className="w-4 h-4 text-green-500" />
                    <span className="text-gray-900 font-medium">{employee.children_count}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Address</label>
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-gray-900 leading-relaxed">{employee.address || "Not provided"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Work Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Building className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Work Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Position</label>
                  <p className="text-gray-900 font-medium">{employee.position?.name || "Not assigned"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Department</label>
                  <p className="text-gray-900 font-medium">{employee.department?.name || "Not assigned"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Experience</label>
                  <p className="text-gray-900 font-medium">{employee.experience} years</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Date of Joining</label>
                  <p className="text-gray-900 font-medium">{formatDate(employee.date_of_joining)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Status</label>
                  <div className="inline-flex">
                    <Badge
                      variant={employee.is_active ? "default" : "secondary"}
                      className={`px-4 py-2 text-sm ${employee.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}`}
                    >
                      {employee.is_active ? "Active Employee" : "Inactive Employee"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Emergency Contact */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Emergency Contact</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Contact Name</label>
                  <p className="text-gray-900 font-medium">{employee.emergency_contact_name || "Not provided"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Phone Number</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-gray-900 font-medium">{employee.emergency_contact_phone || "Not provided"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Relationship</label>
                  <p className="text-gray-900 font-medium">{employee.emergency_contact_relationship || "Not provided"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Professional Details */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Professional Details</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-2">
                    <Award className="w-4 h-4 text-green-600" />
                    <span>Qualifications</span>
                  </label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-900 leading-relaxed">{employee.qualifications || "Not provided"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills ? (
                      employee.skills.split(", ").map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="px-3 py-1 text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          {skill.trim()}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500">No skills listed</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Account Created</label>
                  <p className="text-gray-900 font-medium">{formatDate(employee.created_at)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last Updated</label>
                  <p className="text-gray-900 font-medium">{formatDate(employee.updated_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
