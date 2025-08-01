"use client";

import {useState, useEffect} from "react";
import {useParams} from "next/navigation";
import {useSelector} from "react-redux";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Separator} from "@/components/ui/separator";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CustomTabs,
  CustomTabsList,
  CustomTabsTrigger,
  CustomTabsContent,
} from "@/components/employee/custom-tabs";
import type {IAttendance} from "@/app/types/types.utils";

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
  Search,
  Eye,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {AttendanceAPI, getEmployeeById} from "@/lib/utils";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import type {IEmployee} from "@/app/types/types.utils";
import {toast} from "sonner";

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

const getProfilePictureUrl = (employee: IEmployee) => {
  const pictureStr = employee.employee_profile_picture || "";
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
const getEmployeeInitials = (employee: IEmployee) => {
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "UGX",
  }).format(amount);
};

const formatTime = (timeString: string) => {
  if (!timeString) return "N/A";
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    present: {label: "Present", className: "bg-green-100 text-green-800 border-green-200"},
    absent: {label: "Absent", className: "bg-red-100 text-red-800 border-red-200"},
    late: {label: "Late", className: "bg-yellow-100 text-yellow-800 border-yellow-200"},
    "half-day": {label: "Half Day", className: "bg-blue-100 text-blue-800 border-blue-200"},
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "attendance">("overview");
  const [attendanceRecords, setAttendanceRecords] = useState<IAttendance[]>([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [totalAttendanceRecords, setTotalAttendanceRecords] = useState(0);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const ATTENDANCE_PAGE_SIZE = 10;

  const selectedInstitution = useSelector(selectSelectedInstitution);

  useEffect(() => {
    fetchEmployee();
  }, [selectedInstitution, employeeId]);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendanceRecords();
    }
  }, [activeTab, attendancePage, employeeId]);

  const fetchAttendanceRecords = async () => {
    if (!employeeId) return;

    setLoadingAttendance(true);
    try {
      const response = await AttendanceAPI.fetchEmployeeAttendanceRecords(employeeId);

      if (response) {
        setAttendanceRecords(response.results);
        setTotalAttendanceRecords(response.count);
      }
    } catch (error: any) {
      let errorMessage = "Failed to fetch employee attendance records";
      if (error?.message || error?.detail) {
        errorMessage = error.message || error.detail;
      }
      toast.error(`${errorMessage}`);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchEmployee = async () => {
    if (!selectedInstitution || !employeeId) {
      return;
    }
    setError(null);
    try {
      const fetchedEmployee = await getEmployeeById({employeeId});
      setEmployee(fetchedEmployee);
    } catch (error: any) {
      let errorMessage = "Failed to fetch employee";
      if (error?.message || error?.detail) {
        errorMessage = error.message || error.detail;
      }
      toast.error(`${errorMessage}`);
      setError(errorMessage);
    }
  };

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

  const filteredAttendanceRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      searchTerm === "" ||
      formatDate(record.date).toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <Card className="w-full bg-white shadow-sm border-0 rounded-xl">
          <CardHeader className="border-b border-gray-100 bg-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/employees/employee-list">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Employees
                  </Button>
                </Link>
                <div className="h-6 w-px bg-gray-300" />
                <CardTitle className="text-2xl font-bold text-gray-900">Employee Profile</CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <CustomTabs
              defaultValue="overview"
              value={activeTab}
              onValueChange={(value: string) => setActiveTab(value as "overview" | "attendance")}
            >
              <div className="px-8 pt-6">
                <CustomTabsList>
                  <CustomTabsTrigger value="overview">Overview</CustomTabsTrigger>
                  <CustomTabsTrigger value="attendance">Attendance Records</CustomTabsTrigger>
                </CustomTabsList>
              </div>

              <CustomTabsContent value="overview" className="px-8 pb-8">
                {/* Profile Header */}
                <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8 mb-8">
                  <div className="relative">
                    <Avatar className="w-32 h-32 shadow-lg ring-4 ring-white">
                      <AvatarImage
                        src={getProfilePictureUrl(employee) || "/placeholder.svg"}
                        alt="Profile picture"
                        className="object-cover w-full h-full rounded-full"
                      />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {getEmployeeInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                      <div>
                        <div className="flex items-center">
                          <h1 className="text-4xl font-bold text-gray-900 mb-2 mr-4">
                            {employee.user?.fullname || ""}
                          </h1>
                          <Badge
                            variant={employee.is_active ? "default" : "secondary"}
                            className={
                              employee.is_active
                                ? "bg-primary/10 text-primary border-primary/20"
                                : ""
                            }
                          >
                            {employee.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xl text-primary font-semibold mb-1">
                          {employee.position?.name || "Position not assigned"}
                        </p>
                        <p className="text-lg text-gray-600">{employee.department.name}</p>
                      </div>
                      <div className="flex items-center space-x-3 mt-6 lg:mt-0">
                        <div className="flex items-center gap-3">
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
                            <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Profile
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            onClick={() => setShowDocumentDialog(true)}
                            className="flex items-center gap-2 shadow-sm"
                          >
                            <FileText className="h-4 w-4" />
                            Generate Document
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-gray-700 font-medium">{employee.email}</span>
                      </div>
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-gray-700 font-medium">
                          {employee.phone_number || "Not provided"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-gray-700 font-medium">
                          Joined {formatDate(employee.date_of_joining)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-gray-700 font-medium">
                          {employee.experience} years experience
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Personal Information */}
                <div className="space-y-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Date of Birth
                      </label>
                      <p className="text-gray-900 font-medium">
                        {formatDate(employee.date_of_birth)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Marital Status
                      </label>
                      <div className="flex items-center space-x-2">
                        <Heart className="w-4 h-4 text-primary" />
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
                        <Baby className="w-4 h-4 text-primary" />
                        <span className="text-gray-900 font-medium">{employee.children_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Address
                    </label>
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <p className="text-gray-900 leading-relaxed">
                        {employee.address || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Work Information */}
                <div className="space-y-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Work Information</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Position
                      </label>
                      <p className="text-gray-900 font-medium">{employee.position.name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Department
                      </label>
                      <p className="text-gray-900 font-medium">{employee.department.name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Experience
                      </label>
                      <p className="text-gray-900 font-medium">{employee.experience} years</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        SALARY
                      </label>
                      <p className="text-gray-900 font-medium">
                        {formatCurrency(Number(employee.salary || 0))}
                      </p>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Status
                      </label>
                      <div className="inline-flex">
                        <Badge
                          variant={employee.is_active ? "default" : "secondary"}
                          className={`px-4 py-2 text-sm ${employee.is_active ? "bg-primary/10 text-primary border-primary/20" : ""}`}
                        >
                          {employee.is_active ? "Active Employee" : "Inactive Employee"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Emergency Contact */}
                <div className="space-y-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Users className="w-5 h-5 text-primary" />
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
                        <Phone className="w-4 h-4 text-primary" />
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

                <Separator className="my-8" />

                {/* Professional Details */}
                <div className="space-y-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Professional Details</h2>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-2">
                        <Award className="w-4 h-4 text-primary" />
                        <span>Qualifications</span>
                      </label>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
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
                              className="px-3 py-1 text-xs bg-primary/5 text-primary border-primary/20"
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

                <Separator className="my-8" />

                {/* Account Information */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">Account Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Account Created
                      </label>
                      <p className="text-gray-900 font-medium">{formatDate(employee.created_at)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Last Updated
                      </label>
                      <p className="text-gray-900 font-medium">{formatDate(employee.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </CustomTabsContent>

              <CustomTabsContent value="attendance" className="px-8 pb-8">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search attendance records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="half-day">Half Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Attendance Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Date</TableHead>
                        <TableHead className="font-semibold text-gray-900">Check In</TableHead>
                        <TableHead className="font-semibold text-gray-900">Check Out</TableHead>
                        {/* <TableHead className="font-semibold text-gray-900">Hours Worked</TableHead> */}
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        {/* <TableHead className="font-semibold text-gray-900">Actions</TableHead> */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAttendance ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              <span className="text-gray-500">Loading attendance records...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredAttendanceRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="text-gray-500">
                              {searchTerm || statusFilter !== "all"
                                ? "No attendance records match your filters"
                                : "No attendance records found"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAttendanceRecords.map((record, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                            <TableCell>
                              {record.check_in_time ? formatTime(record.check_in_time) : "N/A"}
                            </TableCell>
                            <TableCell>
                              {record.check_out_time ? formatTime(record.check_out_time) : "N/A"}
                            </TableCell>
                            {/* <TableCell>{record.overtime_hours ? `${record.hours_worked}h` : "N/A"}</TableCell> */}
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            {/* <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell> */}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Info */}
                {filteredAttendanceRecords.length > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredAttendanceRecords.length} of {totalAttendanceRecords} records
                  </div>
                )}
              </CustomTabsContent>
            </CustomTabs>
          </CardContent>
        </Card>

        <DocumentGenerationDialog
          open={showDocumentDialog}
          onOpenChange={setShowDocumentDialog}
          contextId={Number.parseInt(employeeId)}
          context="employee"
        />
      </div>
    </div>
  );
}
