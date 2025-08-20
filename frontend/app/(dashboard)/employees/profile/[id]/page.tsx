"use client";

import {useState, useEffect} from "react";
import {useParams} from "next/navigation";
import {useSelector} from "react-redux";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import type {IAttendance} from "@/types/types.utils";

import {DocumentGenerationDialog} from "@/components/document-generation-dialog";
import {
  Mail,
  Phone,
  MapPin,
  Building,
  GraduationCap,
  Award,
  Edit,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {AttendanceAPI, getEmployeeById} from "@/lib/utils";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import type {IEmployee} from "@/types/types.utils";
import {toast} from "sonner";

export default function EmployeeProfileFigma() {
  const params = useParams();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "attendance" | "payroll" | "assets" | "projects" | "documents" | "discipline"
  >("attendance");
  const [attendanceRecords, setAttendanceRecords] = useState<IAttendance[]>([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [totalAttendanceRecords, setTotalAttendanceRecords] = useState(0);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const ATTENDANCE_PAGE_SIZE = 10;

  const selectedInstitution = useSelector(selectSelectedInstitution);

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

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: {label: "Present", className: "bg-[#e1faec] text-[#3cb371] border-[#3cb371]"},
      absent: {label: "Absent", className: "bg-[#fcdee2] text-[#e21732] border-[#e21732]"},
      late: {label: "Late", className: "bg-[#d7effd] text-[#0ca0f5] border-[#0ca0f5]"},
      leave: {label: "Leave", className: "bg-[#ebd4fa] text-[#9c36db] border-[#9c36db]"},
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      className: "bg-[#f0f0f6] text-[#848496] border-[#848496]",
    };

    return (
      <Badge variant="outline" className={`${config.className} font-medium px-3 py-1`}>
        {config.label}
      </Badge>
    );
  };

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
      <div className="min-h-screen bg-[#f7f7fb] flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <p className="text-[#e21732] mb-4">{error || "Employee not found"}</p>
          <div className="space-y-2">
            <Link href="/employees/employee-list">
              <Button className="bg-[#4426da] hover:bg-[#4426da]/90 text-white w-full sm:w-auto">
                Back to Employees
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                window.location.reload();
              }}
              className="w-full sm:w-auto"
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

  const attendanceSummary = {
    totalWorkDays: attendanceRecords.length || 120,
    daysAbsent: attendanceRecords.filter((record) => record.status === "absent").length || 5,
    lateArrivals: attendanceRecords.filter((record) => record.status === "late").length || 32,
    leaveBalance: 43,
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb] -mt-10">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header section with back arrow, name, and action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 mb-6 mt-10 gap-4">
          <div className="flex items-center space-x-4">
            <Link href="/employees/employee-list">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#848496] hover:text-[#162032] rounded-full p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#162032] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span>{employee.user?.fullname || ""}</span>
                <Badge className="bg-[#e1faec] text-[#3cb371] border-[#3cb371] font-medium self-start sm:self-auto">
                  {employee.is_active ? "Active" : "Inactive"}
                </Badge>
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/employees/update-employee/${employee.id}`}
              onClick={(e) => {
                e.stopPropagation();
                localStorage.setItem(`employee_${employee.id}`, JSON.stringify(employee));
              }}
            >
              <Button
                variant="ghost"
                className="text-gray-500 hover:text-gray-600 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="text-[#e21732] hover:text-[#e21732]/90 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-lg shadow-sm border border-[#e8e8f2] mb-6 -mt-5">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              {/* Left side - Avatar and basic info */}
              <div className="flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white shadow-lg flex-shrink-0 self-center sm:self-start">
                    <AvatarImage
                      src={getProfilePictureUrl(employee) || "/placeholder.svg"}
                      alt="Profile picture"
                      className="object-cover"
                    />
                    <AvatarFallback className="text-lg sm:text-xl bg-[#f0f0f6] text-[#162032]">
                      {getEmployeeInitials(employee)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col text-center sm:text-left">
                    <h2 className="text-lg sm:text-xl font-bold text-[#162032] mb-1">
                      {employee.user?.fullname || ""}
                      <span className="block sm:inline text-[#9ca3af] text-sm font-normal sm:ml-2">
                        {employee.gender || "he/him"}
                      </span>
                    </h2>
                    <p className="text-[#9ca3af] text-sm font-medium mb-2">
                      {employee.employee_id || `EMP-${employee.id}`}
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Building className="w-4 h-4 text-[#9ca3af]" />
                      <span className="text-[#162032] font-medium">
                        {employee.position?.name || "Head Office"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact info - stack vertically on mobile, horizontal on larger screens */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Mail className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                    <span className="text-[#162032] break-all">{employee.email}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Phone className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                    <span className="text-[#162032]">
                      {employee.phone_number || "+256 752342991"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <MapPin className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                    <span className="text-[#162032] text-center sm:text-left">
                      {employee.address || "Kireka, Nakawa, Kampala"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side - Job info and badges - show below on mobile, beside on desktop */}
              <div className="flex flex-col items-center lg:items-start gap-4 mt-6 pt-6 border-t border-[#e8e8f2] lg:mt-0 lg:pt-0 lg:border-t-0 lg:flex-row lg:gap-4 lg:flex-shrink-0">
                {/* Vertical divider line - only on desktop */}
                <div className="hidden lg:block h-16 w-px bg-[#e8e8f2]"></div>

                <div className="flex flex-col items-center lg:items-start gap-3">
                  <div className="text-center lg:text-left">
                    <div className="font-semibold text-sm text-[#162032]">
                      {employee.position?.name || "Marketing Manager"}
                    </div>
                    <div className="text-xs text-[#848496]">
                      {employee.department?.name || "Sales"}
                    </div>
                  </div>

                  {/* Salary Information */}
                  <div className="text-center lg:text-left">
                    <div className="text-xs text-[#848496] mb-1">Monthly Salary</div>
                    <div className="font-bold text-lg text-[#162032]">
                      UGX {employee.salary ? Number(employee.salary).toLocaleString() : "800,000"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge className="bg-[#e1faec] text-[#3cb371] border-[#3cb371] text-xs px-2 py-1">
                      On Site
                    </Badge>
                    <Badge className="bg-[#d7effd] text-[#0ca0f5] border-[#0ca0f5] text-xs px-2 py-1">
                      Full-Time
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - stack on mobile, sidebar on desktop */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="bg-white border-[#e8e8f2]">
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#162032] mb-4">Additional Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-[#848496]">Employee ID</label>
                      <p className="text-[#162032] font-medium break-all">
                        {employee.employee_id || "EMP00004"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">Date of Joining</label>
                      <p className="text-[#162032] font-medium">
                        {formatDate(employee.date_of_joining) || "May 12, 1977"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">B.O.D</label>
                      <p className="text-[#162032] font-medium">
                        {formatDate(employee.date_of_birth) || "Apr 24, 1997"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">NIN</label>
                      <p className="text-[#162032] font-medium break-all">
                        {employee.nin || "CM873162848T88N"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">TIN</label>
                      <p className="text-[#162032] font-medium break-all">
                        {employee.tin || "267"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">NSSF No.</label>
                      <p className="text-[#162032] font-medium break-all">
                        {employee.nssf_no || "Dolore perspiciatis"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">Marital Status</label>
                      <p className="text-[#162032] font-medium">
                        {getMaritalStatusLabel(employee.marital_status) || "Married"}
                        {employee.children_count &&
                          employee.children_count > 0 &&
                          ` (${employee.children_count} ${employee.children_count === 1 ? "Child" : "Children"})`}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">
                        Emergency Contact
                      </label>
                      <p className="text-[#162032] font-medium break-words">
                        {employee.emergency_contact_name || "Freya Robbins"}{" "}
                        <span className="text-[#848496]">
                          ({employee.emergency_contact_relationship || "Father"})
                        </span>
                      </p>
                      <p className="text-[#848496] text-sm break-all">
                        {employee.emergency_contact_phone || "+1 (526) 656-4608"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#848496]">Bank Details</label>
                      <p className="text-[#162032] font-medium break-words">
                        {employee.bank || "Nihil omnis in harum"}
                      </p>
                      <p className="text-[#848496] text-sm break-all">
                        A/C: {employee.bank_account_number || "891"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e8e8f2] pt-6">
                  <h3 className="text-lg font-semibold text-[#162032] flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5" />
                    Qualifications & Experience
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-[#848496]">Education</label>
                      <p className="text-[#162032] font-medium">
                        {employee.qualifications || "Postgraduate Diploma in Digital Marketing"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-[#848496]">Years of Experience</label>
                      <p className="text-[#162032] font-medium">
                        {employee.experience
                          ? `${new Date().getFullYear() - employee.experience} years`
                          : "13 years"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e8e8f2] pt-6">
                  <h3 className="text-lg font-semibold text-[#162032] flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5" />
                    Skills
                  </h3>
                  <p className="text-[#162032]">
                    {employee.skills || "Team Leadership, Strategic Planning"}
                  </p>
                  <div className="mt-3 pt-3 border-t border-[#e8e8f2]">
                    <p className="text-[#848496] text-xs">
                      Joined {formatDate(employee.date_of_joining) || "Feb 23, 2025"}
                    </p>
                    <p className="text-[#848496] text-xs">
                      Country: {employee.country || "Uganda"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card className="bg-white border-[#e8e8f2]">
              <CardHeader className="border-b border-[#e8e8f2] pb-0">
                <div className="flex gap-2 sm:gap-4 lg:gap-8 relative overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 sm:gap-4 lg:gap-8 min-w-max">
                    {[
                      {id: "attendance", label: "Attendance"},
                      {id: "payroll", label: "Payroll & Finance"},
                      {id: "assets", label: "Assets Assigned"},
                      {id: "projects", label: "Projects Assigned"},
                      {id: "documents", label: "Documents"},
                      {id: "discipline", label: "Discipline"},
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
                          activeTab === tab.id
                            ? "text-[#162032] font-semibold"
                            : "text-[#848496] hover:text-[#162032]"
                        }`}
                      >
                        {tab.label}
                        {activeTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {activeTab === "attendance" && (
                  <div className="space-y-6">
                    {/* Stats cards - responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
                        <CardContent className="p-3 sm:p-4">
                          <div className="text-xs sm:text-sm text-[#848496] mb-1">
                            Total Work Days
                          </div>
                          <div className="text-lg sm:text-2xl font-bold text-[#162032]">
                            {attendanceSummary.totalWorkDays}{" "}
                            <span className="text-[#848496] font-normal text-xs sm:text-base">
                              Days
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
                        <CardContent className="p-3 sm:p-4">
                          <div className="text-xs sm:text-sm text-[#848496] mb-1">Days Absent</div>
                          <div className="text-lg sm:text-2xl font-bold text-[#e21732]">
                            {attendanceSummary.daysAbsent}{" "}
                            <span className="text-[#848496] font-normal text-xs sm:text-base">
                              Days
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
                        <CardContent className="p-3 sm:p-4">
                          <div className="text-xs sm:text-sm text-[#848496] mb-1">
                            Late Arrivals
                          </div>
                          <div className="text-lg sm:text-2xl font-bold text-[#0ca0f5]">
                            {attendanceSummary.lateArrivals}{" "}
                            <span className="text-[#848496] font-normal text-xs sm:text-base">
                              Times
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
                        <CardContent className="p-3 sm:p-4">
                          <div className="text-xs sm:text-sm text-[#848496] mb-1">
                            Leave Balance
                          </div>
                          <div className="text-lg sm:text-2xl font-bold text-[#3cb371]">
                            {attendanceSummary.leaveBalance}{" "}
                            <span className="text-[#848496] font-normal text-xs sm:text-base">
                              Days
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <h3 className="text-lg sm:text-xl font-semibold text-[#162032] mb-4">
                      Attendance
                    </h3>

                    {/* Mobile-optimized table with horizontal scroll */}
                    <div className="bg-white rounded-lg overflow-hidden border border-[#e8e8f2]">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#f7f7fb] hover:bg-[#f7f7fb]">
                              <TableHead className="font-semibold text-[#162032] py-3 sm:py-4 px-2 sm:px-6 min-w-[100px] text-xs sm:text-sm">
                                Date
                              </TableHead>
                              <TableHead className="font-semibold text-[#162032] px-2 sm:px-6 min-w-[80px] text-xs sm:text-sm">
                                Day
                              </TableHead>
                              <TableHead className="font-semibold text-[#162032] px-2 sm:px-6 min-w-[70px] text-xs sm:text-sm">
                                Time In
                              </TableHead>
                              <TableHead className="font-semibold text-[#162032] px-2 sm:px-6 min-w-[80px] text-xs sm:text-sm">
                                Status
                              </TableHead>
                              <TableHead className="font-semibold text-[#162032] px-2 sm:px-6 min-w-[70px] text-xs sm:text-sm">
                                Time Out
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingAttendance ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                  <div className="flex items-center justify-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4426da]"></div>
                                    <span className="text-[#848496] text-xs sm:text-sm">
                                      Loading attendance records...
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : filteredAttendanceRecords.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                  <div className="text-[#848496] text-xs sm:text-sm">
                                    {searchTerm || statusFilter !== "all"
                                      ? "No attendance records match your filters"
                                      : "No attendance records found"}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredAttendanceRecords.map((record, index) => (
                                <TableRow key={index} className="hover:bg-[#f7f7fb]/50">
                                  <TableCell className="font-medium text-[#162032] py-3 sm:py-4 px-2 sm:px-6 text-xs sm:text-sm">
                                    <div className="min-w-0">
                                      <div className="sm:hidden">
                                        {new Date(record.date).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </div>
                                      <div className="hidden sm:block">
                                        {formatDate(record.date)}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[#162032] px-2 sm:px-6 text-xs sm:text-sm">
                                    <div className="sm:hidden">
                                      {new Date(record.date).toLocaleDateString("en-US", {
                                        weekday: "short",
                                      })}
                                    </div>
                                    <div className="hidden sm:block">
                                      {new Date(record.date).toLocaleDateString("en-US", {
                                        weekday: "long",
                                      })}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[#162032] px-2 sm:px-6 text-xs sm:text-sm">
                                    {record.check_in_time ? formatTime(record.check_in_time) : "-"}
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-6">
                                    <div className="flex justify-center sm:justify-start">
                                      {getStatusBadge(record.status)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[#162032] px-2 sm:px-6 text-xs sm:text-sm">
                                    {record.check_out_time
                                      ? formatTime(record.check_out_time)
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab !== "attendance" && (
                  <div className="text-center py-12">
                    <p className="text-[#848496]">
                      Content for {activeTab} tab will be implemented here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

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
