"use client";

import {useState, useEffect} from "react";
import {useParams} from "next/navigation";
import {useSelector} from "react-redux";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Separator} from "@/components/ui/separator";
import {Button} from "@/components/ui/button";
import {DocumentGenerationDialog} from "@/components/document-generation-dialog";
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
  FileText,
} from "lucide-react";
import Link from "next/link";
import {getAllEmployees} from "@/lib/utils";
import apiRequest from "@/lib/apiRequest";
import {selectSelectedInstitution, selectAttachedInstitutions} from "@/store/auth/selectors";
import {IUserInstitution} from "@/app/types";
import {EmployeeFormData} from "@/app/types/types.utils";

interface EmployeeFromAPI {
  id: number;
  user: {
    id: number;
    email: string;
    fullname: string;
    is_active: boolean;
    is_email_verified: boolean;
    is_password_verified: boolean;
    is_staff: boolean;
    roles: string;
    branches: string;
    permissions: string;
  } | null;
  email: string;
  phone_number: string;
  position: {
    id: number;
    name: string;
    department_id?: number;
  };
  department: {
    id: number;
    name: string;
    institution_id: number;
  };
  roles: Array<{
    id: number;
    name: string;
  }>;
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  is_active: boolean;
  experience: number;
  qualifications: string;
  skills: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  marital_status: string;
  children_count: number;
  employee_profile_picture: string;
  created_at: string;
  updated_at: string;
}

// Union type to handle both data structures
type EmployeeData = EmployeeFromAPI | EmployeeFormData;

const formatDate = (dateString: string) => {
  if (!dateString) return "Not provided";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getMaritalStatusLabel = (status: string) => {
  const statusMap: {[key: string]: string} = {
    single: "Single",
    married: "Married",
    divorced: "Divorced",
    widowed: "Widowed",
  };
  return statusMap[status] || status;
};

// Helper function to check if data is from getAllEmployees API (has expanded objects)
const isEmployeeFromAPI = (data: EmployeeData): data is EmployeeFromAPI => {
  return typeof data.position === "object" && data.position !== null && "name" in data.position;
};

// Helper function to get employee name
const getEmployeeName = (employee: EmployeeData) => {
  if (employee.user?.fullname) {
    return employee.user.fullname;
  }
  return employee.email || "Unknown Employee";
};

// Helper function to get profile picture URL
const getProfilePictureUrl = (employee: EmployeeData) => {
  const picture = employee.employee_profile_picture;

  if (!picture || picture instanceof File) {
    return null;
  }

  const pictureStr = picture as string;

  if (pictureStr.startsWith("http://") || pictureStr.startsWith("https://")) {
    return pictureStr;
  }

  if (pictureStr.startsWith("/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return `${baseUrl}${pictureStr}`;
  }

  if (pictureStr.includes(".")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return `${baseUrl}/media/${pictureStr}`;
  }

  return null;
};

// Helper function to get initials for avatar
const getEmployeeInitials = (employee: EmployeeData) => {
  if (employee.user?.fullname) {
    const names = employee.user.fullname.split(" ").filter((name) => name.length > 0);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    } else if (names.length === 1) {
      return names[0][0]?.toUpperCase() || "E";
    }
  }
  return employee.email?.[0]?.toUpperCase() || "E";
};

// Helper function to get position name
const getPositionName = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee)) {
    return employee.position?.name || "Position not assigned";
  }
  return "Position not assigned";
};

// Helper function to get department name
const getDepartmentName = (employee: EmployeeData) => {
  if (isEmployeeFromAPI(employee)) {
    return employee.department?.name || "Department not assigned";
  }
  return "Department not assigned";
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];
  const [institutionId, setInstitutionId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id);
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id);
    }
  }, [selectedInstitution, institutionsAttached]);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!institutionId || !employeeId) {
        return;
      }

      try {
        setError(null);

        let data = null;

        try {
          const allEmployees = await getAllEmployees({institutionId: institutionId});
          if (allEmployees && Array.isArray(allEmployees)) {
            data = allEmployees.find((emp) => emp.id === parseInt(employeeId));
          }
        } catch (getAllError) {
          try {
            const response = await apiRequest.get(
              `/employee/employee/${employeeId}/${institutionId}/`,
            );
            data = response.data;
          } catch (apiError) {
            console.error("API request failed:", apiError);
          }
        }

        // Final fallback to localStorage
        if (!data) {
          try {
            const localData = localStorage.getItem(`employee_${employeeId}`);
            if (localData) {
              data = JSON.parse(localData);
            }
          } catch (localError) {
            console.error("localStorage failed:", localError);
          }
        }

        if (data) {
          setEmployee(data);
        } else {
          setError(`Employee with ID ${employeeId} not found`);
        }
      } catch (err) {
        console.error("Error fetching employee:", err);
        setError("Failed to load employee details");
      }
    };

    fetchEmployee();
  }, [institutionId, employeeId]);

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || "Employee not found"}</p>
          <div className="space-y-2">
            <Link href="/employees/employee-list">
              <Button>Back to Employees</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      {/* <div className="w-full py-8 px-4 sm:px-6 lg:px-8"> */}
        <Card className="w-full bg-gray-50 !rounded-lg">
          <CardHeader className="border-b bg-white !rounded-xl !rounded-b-none">
            <CardTitle className="text-2xl text-gray-800">Employee Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative">
                <Avatar className="w-32 h-32 shadow-lg">
                  <AvatarImage
                    src={getProfilePictureUrl(employee) || "/placeholder.svg"}
                    alt="Profile picture"
                    className="object-cover w-full h-full rounded-full"
                  />
                  <AvatarFallback className="text-2xl bg-orange-100 text-orange-700">
                    {getEmployeeInitials(employee)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                      {getEmployeeName(employee)}
                    </h1>
                    <p className="text-xl text-orange-600 font-semibold mb-1">
                      {getPositionName(employee)}
                    </p>
                    <p className="text-lg text-gray-600">{getDepartmentName(employee)}</p>
                  </div>
                  <div className="flex items-center space-x-3 mt-6 md:mt-0">
                    <Badge
                      variant={employee.is_active ? "default" : "secondary"}
                      className={
                        employee.is_active ? "bg-orange-100 text-orange-800 border-orange-200" : ""
                      }
                    >
                      {employee.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/employees/update-employee/${employee.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.setItem(
                            `employee_${employee.id}`,
                            JSON.stringify(employee),
                          );
                        }}
                      >
                        <Button className="bg-primary hover:bg-primary-hover text-white">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        onClick={() => setShowDocumentDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Generate Document
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Mail className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700">{employee.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Phone className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700">{employee.phone_number || "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700">
                      Joined {formatDate(employee.date_of_joining)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Briefcase className="w-4 h-4 text-orange-600" />
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
                <div className="p-2 bg-orange-100 rounded-full">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Date of Birth
                  </label>
                  <p className="text-gray-900 font-medium">{formatDate(employee.date_of_birth)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Marital Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-900 font-medium">
                      {getMaritalStatusLabel(employee.marital_status)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Children
                  </label>
                  <div className="flex items-center space-x-2">
                    <Baby className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-900 font-medium">{employee.children_count}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Address
                </label>
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border">
                  <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                  <p className="text-gray-900 leading-relaxed">
                    {employee.address || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Work Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Building className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Work Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Position
                  </label>
                  <p className="text-gray-900 font-medium">{getPositionName(employee)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Department
                  </label>
                  <p className="text-gray-900 font-medium">{getDepartmentName(employee)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Experience
                  </label>
                  <p className="text-gray-900 font-medium">{employee.experience} years</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Date of Joining
                  </label>
                  <p className="text-gray-900 font-medium">
                    {formatDate(employee.date_of_joining)}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Status
                  </label>
                  <div className="inline-flex">
                    <Badge
                      variant={employee.is_active ? "default" : "secondary"}
                      className={`px-4 py-2 text-sm ${employee.is_active ? "bg-orange-100 text-orange-800 border-orange-200" : ""}`}
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
                <div className="p-2 bg-orange-100 rounded-full">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Emergency Contact</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Contact Name
                  </label>
                  <p className="text-gray-900 font-medium">
                    {employee.emergency_contact_name || "Not provided"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-orange-600" />
                    <span className="text-gray-900 font-medium">
                      {employee.emergency_contact_phone || "Not provided"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Relationship
                  </label>
                  <p className="text-gray-900 font-medium">
                    {employee.emergency_contact_relationship || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Professional Details */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <GraduationCap className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Professional Details</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-2">
                    <Award className="w-4 h-4 text-orange-600" />
                    <span>Qualifications</span>
                  </label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-900 leading-relaxed">
                      {employee.qualifications || "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Skills
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills ? (
                      employee.skills.split(", ").map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="px-3 py-1 text-xs bg-orange-50 text-orange-700 border-orange-200"
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
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Account Created
                  </label>
                  <p className="text-gray-900 font-medium">
                    {isEmployeeFromAPI(employee) && employee.created_at
                      ? formatDate(employee.created_at)
                      : "Not available"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Last Updated
                  </label>
                  <p className="text-gray-900 font-medium">
                    {isEmployeeFromAPI(employee) && employee.updated_at
                      ? formatDate(employee.updated_at)
                      : "Not available"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        <DocumentGenerationDialog
          open={showDocumentDialog}
          onOpenChange={setShowDocumentDialog}
          contextId={parseInt(employeeId)}
          context="employee"
        />
    </div>
  );
}
