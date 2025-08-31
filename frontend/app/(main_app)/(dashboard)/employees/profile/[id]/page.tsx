"use client";

import {useState, useEffect, useCallback, useMemo} from "react";
import {useParams} from "next/navigation";
import {useSelector} from "react-redux";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import type {IAttendance} from "@/types/types.utils";
import EmployeeLeaveBalances from "@/components/employee/employee-leave-balances";
import EmployeeLeaveApplications from "@/components/employee/employee-leave-applications";
import EmployeeDiscipline from "@/components/employee/employee-discipline";
import AssetRequests from "@/components/employee/asset-request";
import EmployeeAssetAllocations from "@/components/employee/asset-allocation";
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
  FileText,
} from "lucide-react";
import Link from "next/link";
import {AttendanceAPI, getEmployeeById} from "@/lib/utils";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import type {IEmployee} from "@/types/types.utils";
import {toast} from "sonner";
import {EmployeePayrollTable} from "@/components/employee/employee-payroll";
import ContractsTable from "@/components/contracts/contracts-table";
import EmployeeAttendance from "@/components/attendance/employee-attendance";
import {formatCurrency, getFileUrl} from "@/lib/helpers";
import {useMobile} from "@/hooks/use-mobile";
import SpotchecksTable from "@/components/common/tables/spotchecks/spotcheck-table";
import EmployeeSpotchecks from "@/components/common/tables/spotchecks/employee-spotchecks";
import EmployeeShifts from "@/components/common/tables/shifts/employee-shifts";
import EmployeePenalties from "@/components/common/tables/penalties/employee-penalties";

export default function EmployeeProfile() {
  const params = useParams();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "attendance"
    | "payroll"
    | "assets"
    | "projects"
    | "documents"
    | "discipline"
    | "leave"
    | "spotchecks"
  | "shifts"
  | "penalties"
  >("attendance");
  const [attendanceRecords, setAttendanceRecords] = useState<IAttendance[]>([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [totalAttendanceRecords, setTotalAttendanceRecords] = useState(0);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [leaveSubTab, setLeaveSubTab] = useState<"balances" | "applications">("balances");
  const [documentsSubTab, setDocumentsSubTab] = useState<"contracts">("contracts");
  const [assetSubTab, setAssetSubTab] = useState<"requests" | "allocations">("requests");
  const [statusFilter, setStatusFilter] = useState("all");

  // Cache for tab data to prevent re-fetching
  const [tabDataCache, setTabDataCache] = useState<Record<string, any>>({});

  const isMobile = useMobile();

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Memoized utility functions
  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const getMaritalStatusLabel = useCallback((status: string | null) => {
    if (!status) return null;
    const statusMap: {[key: string]: string} = {
      single: "Single",
      married: "Married",
      divorced: "Divorced",
      widowed: "Widowed",
    };
    return statusMap[status] || status;
  }, []);

  const getEmployeeInitials = useCallback((employee: IEmployee) => {
    if (employee.user?.fullname) {
      const names = employee.user.fullname.split(" ").filter((name) => name.length > 0);
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      } else if (names.length === 1) {
        return names[0][0]?.toUpperCase() || "E";
      }
    }
    return employee.email?.[0]?.toUpperCase() || "E";
  }, []);

  const handleTabChange = useCallback(
    (newTab: typeof activeTab) => {
      if (newTab === activeTab) return;

      setActiveTab(newTab);

      if (newTab === "attendance" && !tabDataCache.attendance) {
        fetchAttendanceRecords();
      }
    },
    [activeTab, tabDataCache],
  );

  const fetchAttendanceRecords = useCallback(async () => {
    if (!employeeId || loadingAttendance) return;

    // Check cache first
    if (tabDataCache.attendance) {
      setAttendanceRecords(tabDataCache.attendance.records);
      setTotalAttendanceRecords(tabDataCache.attendance.total);
      return;
    }

    setLoadingAttendance(true);
    try {
      const response = await AttendanceAPI.fetchEmployeeAttendanceRecords(employeeId);

      if (response) {
        const attendanceData = {
          records: response.results,
          total: response.count,
        };

        setAttendanceRecords(attendanceData.records);
        setTotalAttendanceRecords(attendanceData.total);

        // Cache the data
        setTabDataCache((prev) => ({
          ...prev,
          attendance: attendanceData,
        }));
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
  }, [employeeId, loadingAttendance, tabDataCache.attendance]);

  const fetchEmployee = useCallback(async () => {
    if (!selectedInstitution || !employeeId) {
      return;
    }
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [selectedInstitution, employeeId]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (activeTab === "attendance" && !tabDataCache.attendance) {
      fetchAttendanceRecords();
    }
  }, [activeTab, fetchAttendanceRecords, tabDataCache.attendance]);

  // Tab configuration with lazy loading indicators
  const tabConfig: Array<{id: typeof activeTab; label: string; hasData: boolean}> = useMemo(
    () => [
      {id: "attendance", label: "Attendance", hasData: !!tabDataCache.attendance},
      {id: "discipline", label: "Discipline", hasData: true}, // Component handles own loading
      {id: "leave", label: "Leave", hasData: true}, // Component handles own loading
      {id: "assets", label: "Assets", hasData: true}, // Component handles own loading
      {id: "payroll", label: "Payroll", hasData: true}, // Component handles own loading
      {id: "documents", label: "Documents", hasData: true}, // Component handles own loading
      {id: "spotchecks", label: "Spotchecks", hasData: true}, // Component handles own loading
  {id: "penalties", label: "Penalties", hasData: true}, // Component handles own loading
      {id: "shifts", label: "Shifts", hasData: true}, // Component handles own loading
    ],
    [tabDataCache],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7fb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4426da] mb-4"></div>
          <p className="text-[#848496]">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f7fb] flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <p className="text-[#e21732] mb-4">{error || "Employee not found"}</p>
          <div className="space-y-2">
            <Link href="/employees/employee-list">
              <Button className="text-white w-full md:w-auto">Back to Employees</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                window.location.reload();
              }}
              className="w-full md:w-auto"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg">
      {employee && (
        <div className="w-full md:px-4 md:pb-8">
          {/* Header section with back arrow, name, and action buttons */}
          <div className="flex flex-row md:flex-row md:items-center justify-between py-4 my-6 gap-4">
            <div className="flex items-center">
              <Link href="/employees/employee-list">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#848496] hover:text-gray-800 rounded-full p-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>

              <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center justify-start gap-2 md:gap-3">
                <span>{employee.user?.fullname || "Unknown Employee"}</span>
                <Badge className="bg-[#e1faec] text-[#3cb371] border-[#3cb371] font-medium self-start md:self-auto">
                  {employee.is_active ? "Active" : "Inactive"}
                </Badge>
              </h1>
            </div>
            <div className="flex items-center gap-3 px-3">
              <Link href={`/employees/update-employee/${employee.id}`}>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  className="text-gray-500 hover:text-gray-600 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden md:inline">Edit</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="text-[#e21732] hover:text-[#e21732]/90 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">Delete</span>
              </Button>

              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={() => setShowDocumentDialog(true)}
                className="flex items-center gap-2 shadow-sm"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline">Generate Document</span>
              </Button>
            </div>
          </div>

          {/* Profile card */}
          <div className="bg-white md:rounded-lg md:shadow-sm md:border border-[#e8e8f2] mb-6 -mt-5">
            <div className="p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                {/* Left side - Avatar and basic info */}
                <div className="flex flex-col">
                  <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
                    <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-white shadow-lg flex-shrink-0 self-center md:self-start">
                      <AvatarImage
                        src={
                          employee.employee_profile_picture
                            ? getFileUrl(employee.employee_profile_picture)
                            : "/placeholder.svg"
                        }
                        alt="Profile picture"
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg md:text-xl bg-[#f0f0f6] text-gray-800">
                        {getEmployeeInitials(employee)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col text-center md:text-left">
                      <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">
                        {employee.user?.fullname || "Unknown Employee"}
                        {employee.user?.gender && (
                          <span className="block md:inline text-[#9ca3af] text-sm font-normal md:ml-2">
                            {employee.user.gender}
                          </span>
                        )}
                      </h2>
                      {/* <p className="text-[#9ca3af] text-sm font-medium mb-2">
                        {employee.employee_id}
                      </p> */}

                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Building className="w-4 h-4 text-[#9ca3af]" />
                        <span className="text-gray-800 font-medium">
                          {employee.position?.name || "No Position"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact info - stack vertically on mobile, horizontal on larger screens */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-sm">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Mail className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                      <span className="text-gray-800 break-all">{employee.email}</span>
                    </div>
                    {employee.phone_number && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Phone className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                        <span className="text-gray-800">{employee.phone_number}</span>
                      </div>
                    )}
                    {employee.address && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <MapPin className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                        <span className="text-gray-800 text-center md:text-left">
                          {employee.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side - Job info and badges - show below on mobile, beside on desktop */}
                <div className="flex flex-col min-w-[16rem] items-center lg:items-start gap-4 mt-6 pt-6 border-t border-[#e8e8f2] lg:mt-0 lg:pt-0 lg:border-t-0 lg:flex-row lg:gap-4 lg:flex-shrink-0">
                  {/* Vertical divider line - only on desktop */}
                  <div className="hidden lg:block h-16 w-px bg-[#e8e8f2]"></div>

                  <div className="flex flex-col items-center lg:items-start gap-3 ">
                    <div className="text-center lg:text-left">
                      <div className="font-semibold text-sm text-gray-800">
                        {employee.position?.name || "No Position"}
                      </div>
                      <div className="text-xs text-[#848496]">
                        {employee.department?.name || "No Department"}
                      </div>
                    </div>

                    {/* Salary Information */}
                    {employee.salary && (
                      <div className="text-center lg:text-left">
                        <div className="text-xs text-[#848496] mb-1">Monthly Salary</div>
                        <div className="font-bold text-lg text-gray-800">
                          {formatCurrency(employee.salary)}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {employee.work_type && typeof employee.work_type !== "number" && (
                        <Badge className="bg-[#e1faec] text-[#3cb371] border-[#3cb371] text-xs px-2 py-1">
                          {employee.work_type?.name}
                        </Badge>
                      )}
                      {employee.employee_type && typeof employee.employee_type !== "number" && (
                        <Badge className="bg-[#d7effd] text-[#0ca0f5] border-[#0ca0f5] text-xs px-2 py-1">
                          {employee.employee_type?.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Sidebar - stack on mobile, sidebar on desktop */}
            <div className="xl:col-span-2 order-2 xl:order-1">
              <Card className=" bg-white border-none p-0 shadow-none md:shadow-sm md:border md:border-[#e8e8f2] ">
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Info</h3>
                    <div className="space-y-4">
                      {employee.salary && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">Salary</label>
                          <p className="text-gray-800 font-medium">
                            {formatCurrency(employee.salary)}
                          </p>
                        </div>
                      )}
                      {employee.date_of_joining && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">
                            Date of Joining
                          </label>
                          <p className="text-gray-800 font-medium">
                            {formatDate(employee.date_of_joining)}
                          </p>
                        </div>
                      )}
                      {employee.date_of_birth && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">
                            Date of Birth
                          </label>
                          <p className="text-gray-800 font-medium">
                            {formatDate(employee.date_of_birth)}
                          </p>
                        </div>
                      )}
                      {employee.nin && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">NIN</label>
                          <p className="text-gray-800 font-medium break-all">{employee.nin}</p>
                        </div>
                      )}
                      {employee.tin && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">TIN</label>
                          <p className="text-gray-800 font-medium break-all">{employee.tin}</p>
                        </div>
                      )}
                      {employee.nssf_no && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">NSSF No.</label>
                          <p className="text-gray-800 font-medium break-all">{employee.nssf_no}</p>
                        </div>
                      )}
                      {(employee.marital_status || employee.children_count > 0) && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">
                            Marital Status
                          </label>
                          <p className="text-gray-800 font-medium">
                            {getMaritalStatusLabel(employee.marital_status)}
                            {employee.children_count &&
                              employee.children_count > 0 &&
                              ` (${employee.children_count} ${employee.children_count === 1 ? "Child" : "Children"})`}
                          </p>
                        </div>
                      )}
                      {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">
                            Emergency Contact
                          </label>
                          {employee.emergency_contact_name && (
                            <p className="text-gray-800 font-medium break-words">
                              {employee.emergency_contact_name}{" "}
                              {employee.emergency_contact_relationship && (
                                <span className="text-[#848496]">
                                  ({employee.emergency_contact_relationship})
                                </span>
                              )}
                            </p>
                          )}
                          {employee.emergency_contact_phone && (
                            <p className="text-[#848496] text-sm break-all">
                              {employee.emergency_contact_phone}
                            </p>
                          )}
                        </div>
                      )}
                      {(employee.bank || employee.bank_account_number) && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">Bank Details</label>
                          {employee.bank && (
                            <p className="text-gray-800 font-medium break-words">{employee.bank}</p>
                          )}
                          {employee.bank_account_number && (
                            <p className="text-[#848496] text-sm break-all">
                              A/C: {employee.bank_account_number}
                            </p>
                          )}
                        </div>
                      )}
                      {employee.country && (
                        <div>
                          <label className="text-sm font-medium text-[#848496]">Country</label>
                          <p className="text-gray-800 font-medium">{employee.country}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(employee.qualifications || employee.experience > 0 || employee.skills) && (
                    <div className="border-t border-[#e8e8f2] pt-6">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                        <GraduationCap className="w-5 h-5" />
                        Qualifications & Experience
                      </h3>
                      <div className="space-y-3">
                        {employee.qualifications && (
                          <div>
                            <label className="text-xs text-[#848496]">Education</label>
                            <p className="text-gray-800 font-medium">{employee.qualifications}</p>
                          </div>
                        )}
                        {employee.experience > 0 && (
                          <div>
                            <label className="text-xs text-[#848496]">Years of Experience</label>
                            <p className="text-gray-800 font-medium">{employee.experience} years</p>
                          </div>
                        )}
                        {employee.skills && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                              <Award className="w-5 h-5" />
                              Skills
                            </h4>
                            <p className="text-gray-800">{employee.skills}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main content area */}
            <div className="xl:col-span-2 order-1 xl:order-2">
              <Card className="bg-white border-[#e8e8f2] border-none p-0 shadow-none md:shadow-sm md:border">
                <CardHeader className="border-b border-[#e8e8f2] pb-0">
                  <div className="flex gap-2 md:gap-4 lg:gap-8 relative overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 md:gap-4 lg:gap-8 min-w-max px-8">
                      {tabConfig.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id as any)}
                          className={`pb-4 text-xs md:text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
                            activeTab === tab.id
                              ? "text-gray-800 font-semibold"
                              : "text-[#848496] hover:text-gray-800"
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

                <CardContent className="p-4 md:p-6">
                  {activeTab === "attendance" && (
                    <EmployeeAttendance scope={{type: "employee", employee}} />
                  )}

                  {activeTab === "discipline" && (
                    <EmployeeDiscipline
                      employeeId={employeeId}
                      institutionId={selectedInstitution?.id || 0}
                    />
                  )}

                  {activeTab === "leave" && (
                    <div className="space-y-6">
                      {/* Leave Sub-tabs */}
                      <div className="border-b border-[#e8e8f2]">
                        <div className="flex gap-8">
                          <button
                            onClick={() => setLeaveSubTab("balances")}
                            className={`pb-3 text-sm font-medium transition-colors relative ${
                              leaveSubTab === "balances"
                                ? "text-gray-800 font-semibold"
                                : "text-[#848496] hover:text-gray-800"
                            }`}
                          >
                            Leave Balances
                            {leaveSubTab === "balances" && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
                            )}
                          </button>
                          <button
                            onClick={() => setLeaveSubTab("applications")}
                            className={`pb-3 text-sm font-medium transition-colors relative ${
                              leaveSubTab === "applications"
                                ? "text-gray-800 font-semibold"
                                : "text-[#848496] hover:text-gray-800"
                            }`}
                          >
                            Leave Applications
                            {leaveSubTab === "applications" && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Leave Sub-tab Content */}
                      {leaveSubTab === "balances" && (
                        <EmployeeLeaveBalances
                          employeeId={employeeId}
                          institutionId={selectedInstitution?.id || 0}
                        />
                      )}

                      {leaveSubTab === "applications" && (
                        <EmployeeLeaveApplications
                          employeeId={employeeId}
                          institutionId={selectedInstitution?.id || 0}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === "assets" && (
                    <div className="space-y-6">
                      {/* Asset Sub-tabs */}
                      <div className="border-b border-[#e8e8f2]">
                        <div className="flex gap-8">
                          <button
                            onClick={() => setAssetSubTab("requests")}
                            className={`pb-3 text-sm font-medium transition-colors relative ${
                              assetSubTab === "requests"
                                ? "text-gray-800 font-semibold"
                                : "text-[#848496] hover:text-gray-800"
                            }`}
                          >
                            Asset Requests
                            {assetSubTab === "requests" && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
                            )}
                          </button>
                          <button
                            onClick={() => setAssetSubTab("allocations")}
                            className={`pb-3 text-sm font-medium transition-colors relative ${
                              assetSubTab === "allocations"
                                ? "text-gray-800 font-semibold"
                                : "text-[#848496] hover:text-gray-800"
                            }`}
                          >
                            Asset Allocations
                            {assetSubTab === "allocations" && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Asset Sub-tab Content */}
                      {assetSubTab === "requests" && (
                        <AssetRequests
                          employeeId={employee.employee_id}
                          isEmployeeView={true}
                          showHeader={true}
                          showCreateButton={true}
                          showStats={true}
                          compact={true}
                        />
                      )}

                      {assetSubTab === "allocations" && (
                        <EmployeeAssetAllocations
                          employeeId={employee.employee_id}
                          institutionId={selectedInstitution?.id}
                          showHeader={false}
                          showStats={true}
                          compact={false}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === "payroll" && selectedInstitution && (
                    <EmployeePayrollTable
                      institutionId={selectedInstitution.id}
                      scope={{type: "employee", employeeId: employeeId}}
                      showEmployeeName={false}
                    />
                  )}

                  {activeTab === "documents" && (
                    <div className="space-y-6">
                      {/* Documents Sub-tabs */}
                      <div className="border-b border-[#e8e8f2]">
                        <div className="flex gap-8">
                          <button
                            onClick={() => setDocumentsSubTab("contracts")}
                            className={`pb-3 text-sm font-medium transition-colors relative ${
                              documentsSubTab === "contracts"
                                ? "text-gray-800 font-semibold"
                                : "text-[#848496] hover:text-gray-800"
                            }`}
                          >
                            Contracts
                            {documentsSubTab === "contracts" && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Document Sub-tab Content */}
                      {documentsSubTab === "contracts" && (
                        <ContractsTable
                          searchTerm={searchTerm}
                          scope={{type: "employee", employeeId}}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === "spotchecks" && employee && (
                    <EmployeeSpotchecks employee={employee} />
                  )}

                  {activeTab === "penalties" && employee && (
                    <EmployeePenalties employee={employee} />
                  )}

                  {activeTab === "shifts" && employee && <EmployeeShifts employee={employee} />}
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
      )}
    </div>
  );
}
