"use client";

import {useState, useMemo, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Badge} from "@/components/ui/badge";
import {Users, Building, Info, FileSpreadsheet, UserCheck} from "lucide-react";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {fetchAttendanceData} from "@/lib/utils";
import type {AttendanceResponse, IDepartment, IEmployee, IJobPosition} from "@/types/types.utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution, selectAccessToken} from "@/store/auth/selectors";
import {getDepartments, getJobPositions, fetchEmployees} from "@/lib/utils";

const attendanceCodes = {
  "P-onT": {label: "Present on Time", color: "bg-green-100 text-green-800"},
  "P-past-T": {label: "Present but Late", color: "bg-yellow-100 text-yellow-800"},
  absent: {label: "Absent (no check-in)", color: "bg-red-100 text-red-800"},
  "A-L": {label: "Annual Leave", color: "bg-blue-100 text-blue-800"},
  "S-L": {label: "Sick Leave", color: "bg-purple-100 text-purple-800"},
  "M-L": {label: "Maternity Leave", color: "bg-pink-100 text-pink-800"},
  "P-L": {label: "Paternity Leave", color: "bg-indigo-100 text-indigo-800"},
  "C-L": {label: "Compassionate Leave", color: "bg-gray-100 text-gray-800"},
  "Sty-L": {label: "Study Leave", color: "bg-cyan-100 text-cyan-800"},
  "UN-P-L": {label: "Unpaid Leave", color: "bg-orange-100 text-orange-800"},
  "N-W-D": {label: "Not a Working Day", color: "bg-slate-100 text-slate-800"},
  ERR: {label: "Error fetching status", color: "bg-red-200 text-red-900"},
};

interface AttendanceFilters {
  startDate: string;
  endDate: string;
  filterType: "all" | "department" | "position";
  filterValue: string;
}

interface ExcelDownloadFilters {
  startDate: string;
  endDate: string;
  filterType: "employees" | "departments" | "positions";
  selectedEmployees: number[];
  selectedDepartments: number[];
  selectedPositions: number[];
}

function AttendanceLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md border p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Attendance Codes</h3>
        </div>
        <Button variant="ghost" size="sm">
          <span className="hidden sm:inline">{isExpanded ? "Hide" : "Show"} Codes</span>
          <span className="sm:hidden">{isExpanded ? "Hide" : "Show"}</span>
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(attendanceCodes).map(([code, {label, color}]) => (
            <div key={code} className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
              <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{code}</span>
              <span className="text-xs text-gray-600 truncate">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttendanceTable() {
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const accessToken = useSelector(selectAccessToken);
  const [allDepartments, setAllDepartments] = useState<IDepartment[]>([]);
  const [allPositions, setAllPositions] = useState<IJobPosition[]>([]);
  const [allEmployees, setAllEmployees] = useState<IEmployee[]>([]);

  const [filters, setFilters] = useState<AttendanceFilters>({
    startDate: "2025-07-20",
    endDate: "2025-08-19",
    filterType: "all",
    filterValue: "all",
  });

  const [tempFilters, setTempFilters] = useState<AttendanceFilters>({
    startDate: "2025-07-20",
    endDate: "2025-08-19",
    filterType: "all",
    filterValue: "all",
  });

  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelFilters, setExcelFilters] = useState<ExcelDownloadFilters>({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    filterType: "employees",
    selectedEmployees: [],
    selectedDepartments: [],
    selectedPositions: [],
  });
  const [excelDownloading, setExcelDownloading] = useState(false);

  useEffect(() => {
    const loadFiltersData = async () => {
      if (!selectedInstitution) return;

      try {
        const [departments, positions, employees] = await Promise.all([
          getDepartments({institutionId: selectedInstitution.id}),
          getJobPositions({institutionId: selectedInstitution.id}),
          fetchEmployees({institutionId: selectedInstitution.id}),
        ]);

        setAllDepartments(departments || []);
        setAllPositions(positions || []);

        let employeesList = [];
        if (Array.isArray(employees)) {
          employeesList = employees;
        } else if (employees && typeof employees === "object" && "results" in employees) {
          employeesList = (employees as any).results || [];
        } else if (employees && typeof employees === "object" && "data" in employees) {
          employeesList = (employees as any).data || [];
        }

        setAllEmployees(employeesList);
      } catch (err) {
        //console.error("Failed to load filters data:", err);
      }
    };

    loadFiltersData();
  }, [selectedInstitution]);

  useEffect(() => {
    if (selectedInstitution) {
      loadData();
    }
  }, [selectedInstitution, filters.startDate, filters.endDate]);

  const loadData = async () => {
    if (!selectedInstitution) return;

    try {
      setLoading(true);
      setError(null);
      const attendance = await fetchAttendanceData(filters.startDate, filters.endDate);
      setAttendanceData(attendance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const dateRange = useMemo(() => {
    const actualData = (attendanceData as any)?.data || attendanceData;
    if (!actualData) return [];

    const startDate = new Date(actualData.start_date);
    const endDate = new Date(actualData.end_date);
    const dates = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split("T")[0]);
    }

    return dates;
  }, [attendanceData]);

  const employeesWithAttendance = useMemo(() => {
    const actualData = (attendanceData as any)?.data || attendanceData;

    if (!actualData?.employees) {
      return [];
    }

    const result = actualData.employees.map((attendanceRecord: any) => ({
      employee: {
        id: attendanceRecord.employee.id,
        full_name: attendanceRecord.employee.full_name,
        department: attendanceRecord.employee.department,
        position: attendanceRecord.employee.position,
      },
      summary: attendanceRecord.summary,
      daily_statuses: attendanceRecord.daily_statuses,
    }));

    return result;
  }, [attendanceData]);

  const filteredEmployees = useMemo(() => {
    return employeesWithAttendance.filter((emp: any) => {
      if (tempFilters.filterType === "all") return true;

      if (tempFilters.filterType === "department") {
        return (
          tempFilters.filterValue === "all" || emp.employee.department === tempFilters.filterValue
        );
      }

      if (tempFilters.filterType === "position") {
        return (
          tempFilters.filterValue === "all" || emp.employee.position === tempFilters.filterValue
        );
      }

      return true;
    });
  }, [tempFilters, employeesWithAttendance]);

  const handleFilterChange = (key: keyof AttendanceFilters, value: string) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset filterValue when filterType changes
      ...(key === "filterType" && {filterValue: "all"}),
    }));
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
  };

  const hasFilterChanges =
    tempFilters.startDate !== filters.startDate ||
    tempFilters.endDate !== filters.endDate ||
    tempFilters.filterType !== filters.filterType ||
    tempFilters.filterValue !== filters.filterValue;

  const getFilterOptions = () => {
    if (tempFilters.filterType === "department") {
      return allDepartments.map((dept) => ({value: dept.name, label: dept.name, id: dept.id}));
    } else if (tempFilters.filterType === "position") {
      return allPositions.map((pos) => ({value: pos.name, label: pos.name, id: pos.id}));
    }
    return [];
  };

  const handleExcelFilterChange = (key: keyof ExcelDownloadFilters, value: any) => {
    setExcelFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "filterType" && {
        selectedEmployees: [],
        selectedDepartments: [],
        selectedPositions: [],
      }),
    }));
  };

  const handleExcelDownload = async () => {
    setExcelDownloading(true);

    try {
      const payload: any = {
        start_date: excelFilters.startDate,
        end_date: excelFilters.endDate,
      };

      if (excelFilters.filterType === "employees" && excelFilters.selectedEmployees.length > 0) {
        payload.target_employees = excelFilters.selectedEmployees;
      } else if (
        excelFilters.filterType === "departments" &&
        excelFilters.selectedDepartments.length > 0
      ) {
        payload.target_departments = excelFilters.selectedDepartments;
      } else if (
        excelFilters.filterType === "positions" &&
        excelFilters.selectedPositions.length > 0
      ) {
        payload.target_job_positions = excelFilters.selectedPositions;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/employee/attendance2excel/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-report-${excelFilters.startDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setExcelModalOpen(false);
      } else {
        const errorData = await response.json();
      }
    } catch (error) {
      //console.error("Excel download error:", error);
    } finally {
      setExcelDownloading(false);
    }
  };

  const handleExcelModalOpen = (open: boolean) => {
    setExcelModalOpen(open);
    if (open) {
      setExcelFilters({
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        filterType: "employees",
        selectedEmployees: [],
        selectedDepartments: [],
        selectedPositions: [],
      });
    }
  };

  const getAvailableOptions = () => {
    if (excelFilters.filterType === "employees") {
      return allEmployees.map((emp) => ({
        id: emp.id,
        name:
          emp.user?.fullname ||
          `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
          `Employee ${emp.id}`,
      }));
    } else if (excelFilters.filterType === "departments") {
      return allDepartments.map((dept) => ({
        id: dept.id,
        name: dept.name,
      }));
    } else if (excelFilters.filterType === "positions") {
      return allPositions.map((pos) => ({
        id: pos.id,
        name: pos.name,
      }));
    }
    return [];
  };

  const getSelectedItems = () => {
    const options = getAvailableOptions();
    if (excelFilters.filterType === "employees") {
      return options.filter((opt) => excelFilters.selectedEmployees.includes(opt.id));
    } else if (excelFilters.filterType === "departments") {
      return options.filter((opt) => excelFilters.selectedDepartments.includes(opt.id));
    } else if (excelFilters.filterType === "positions") {
      return options.filter((opt) => excelFilters.selectedPositions.includes(opt.id));
    }
    return [];
  };

  const handleSelectionChange = (selectedIds: number[]) => {
    if (excelFilters.filterType === "employees") {
      handleExcelFilterChange("selectedEmployees", selectedIds);
    } else if (excelFilters.filterType === "departments") {
      handleExcelFilterChange("selectedDepartments", selectedIds);
    } else if (excelFilters.filterType === "positions") {
      handleExcelFilterChange("selectedPositions", selectedIds);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-3 sm:p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-md border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-4 sm:gap-0">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <TableSkeleton rows={10} columns={12} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-3 sm:p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-6 bg-gray-50 min-h-screen">
      <AttendanceLegend />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">
            Start Date
          </Label>
          <Input
            id="start-date"
            type="date"
            value={tempFilters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Filter By</Label>
          <Select
            value={tempFilters.filterType}
            onValueChange={(value: "all" | "department" | "position") =>
              handleFilterChange("filterType", value)
            }
          >
            <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">All Employees</span>
                  <span className="sm:hidden">All</span>
                </div>
              </SelectItem>
              <SelectItem value="department">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="hidden sm:inline">By Department</span>
                  <span className="sm:hidden">Department</span>
                </div>
              </SelectItem>
              <SelectItem value="position">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">By Position</span>
                  <span className="sm:hidden">Position</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tempFilters.filterType !== "all" && (
          <div className="space-y-2 sm:col-span-1 lg:col-span-1">
            <Label className="text-sm font-medium text-gray-700">
              Select {tempFilters.filterType === "department" ? "Department" : "Position"}
            </Label>
            <Select
              value={tempFilters.filterValue}
              onValueChange={(value) => handleFilterChange("filterValue", value)}
            >
              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder={`Select ${tempFilters.filterType}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All {tempFilters.filterType === "department" ? "Departments" : "Positions"}
                </SelectItem>
                {getFilterOptions().map((option) => (
                  <SelectItem key={`${tempFilters.filterType}-${option.id}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label className="text-sm font-medium text-gray-700 invisible">Apply</Label>
          <Button
            onClick={handleApplyFilters}
            disabled={!hasFilterChanges || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <span className="hidden sm:inline">Apply Filters</span>
            <span className="sm:hidden">Apply</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-4 sm:gap-0">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
            Attendance Records ({filteredEmployees.length} employees)
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={excelModalOpen} onOpenChange={handleExcelModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-xs sm:text-sm flex-1 sm:flex-none">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Generate Excel Report</span>
                  <span className="sm:hidden">Excel Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    Generate Excel Attendance Report
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Select date range and filter criteria for your Excel report
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="excel-start-date">Date</Label>
                      <Input
                        id="excel-start-date"
                        type="date"
                        value={excelFilters.startDate}
                        onChange={(e) => {
                          handleExcelFilterChange("startDate", e.target.value);
                          handleExcelFilterChange("endDate", e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Filter By</Label>
                    <Select
                      value={excelFilters.filterType}
                      onValueChange={(value: "employees" | "departments" | "positions") =>
                        handleExcelFilterChange("filterType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employees">Specific Employees</SelectItem>
                        <SelectItem value="departments">Departments</SelectItem>
                        <SelectItem value="positions">Job Positions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">
                      Select{" "}
                      {excelFilters.filterType === "employees"
                        ? "Employees"
                        : excelFilters.filterType === "departments"
                          ? "Departments"
                          : "Positions"}{" "}
                      ({getAvailableOptions().length} available)
                    </Label>

                    {getAvailableOptions().length === 0 ? (
                      <div className="border rounded-md p-3 text-center text-gray-500 text-sm">
                        No {excelFilters.filterType} available
                      </div>
                    ) : (
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                        {getAvailableOptions().map((option) => (
                          <div key={option.id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              id={`option-${option.id}`}
                              checked={
                                excelFilters.filterType === "employees"
                                  ? excelFilters.selectedEmployees.includes(option.id)
                                  : excelFilters.filterType === "departments"
                                    ? excelFilters.selectedDepartments.includes(option.id)
                                    : excelFilters.selectedPositions.includes(option.id)
                              }
                              onChange={(e) => {
                                const currentSelection =
                                  excelFilters.filterType === "employees"
                                    ? excelFilters.selectedEmployees
                                    : excelFilters.filterType === "departments"
                                      ? excelFilters.selectedDepartments
                                      : excelFilters.selectedPositions;

                                const newSelection = e.target.checked
                                  ? [...currentSelection, option.id]
                                  : currentSelection.filter((id) => id !== option.id);

                                handleSelectionChange(newSelection);
                              }}
                              className="rounded border-gray-300"
                            />
                            <label
                              htmlFor={`option-${option.id}`}
                              className="text-sm cursor-pointer truncate"
                            >
                              {option.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {getSelectedItems().length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-2">
                          Selected ({getSelectedItems().length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {getSelectedItems().map((item) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className="text-xs truncate max-w-[150px]"
                            >
                              {item.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setExcelModalOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleExcelDownload}
                      disabled={
                        excelDownloading ||
                        !excelFilters.startDate ||
                        !excelFilters.endDate ||
                        getSelectedItems().length === 0
                      }
                      className="w-full sm:w-auto"
                    >
                      {excelDownloading ? (
                        <>
                          <span className="hidden sm:inline">Generating...</span>
                          <span className="sm:hidden">Generating</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">
                            Generate Excel ({getSelectedItems().length} selected)
                          </span>
                          <span className="sm:hidden">Generate ({getSelectedItems().length})</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="p-3 sm:p-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="font-semibold text-gray-900 sticky left-0 bg-white z-10 min-w-[120px] w-[120px] sm:min-w-[150px] sm:w-[150px] text-xs sm:text-sm">
                      Full Name
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-900 sticky left-[120px] sm:left-[150px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                      Present
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-900 sticky left-[180px] sm:left-[220px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                      Absent
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-900 sticky left-[240px] sm:left-[290px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                      Late
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-900 sticky left-[300px] sm:left-[360px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                      Leave
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-900 sticky left-[360px] sm:left-[430px] bg-white z-10 min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px] text-xs sm:text-sm">
                      Total Days
                    </TableHead>
                    {dateRange.map((date) => (
                      <TableHead
                        key={date}
                        className="text-center font-semibold text-gray-900 min-w-[70px] w-[70px] sm:min-w-[80px] sm:w-[80px]"
                      >
                        <div className="text-xs">
                          {new Date(date).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp: any) => (
                    <TableRow key={emp.employee.id} className="border-b hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900 sticky left-0 bg-white z-10 min-w-[120px] w-[120px] sm:min-w-[150px] sm:w-[150px] text-xs sm:text-sm truncate">
                        {emp.employee.full_name}
                      </TableCell>
                      <TableCell className="text-center sticky left-[120px] sm:left-[150px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                        {emp.summary.present}
                      </TableCell>
                      <TableCell className="text-center sticky left-[180px] sm:left-[220px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                        {emp.summary.absent}
                      </TableCell>
                      <TableCell className="text-center sticky left-[240px] sm:left-[290px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                        {emp.summary.late}
                      </TableCell>
                      <TableCell className="text-center sticky left-[300px] sm:left-[360px] bg-white z-10 min-w-[60px] w-[60px] sm:min-w-[70px] sm:w-[70px] text-xs sm:text-sm">
                        {emp.summary.leave}
                      </TableCell>
                      <TableCell className="text-center font-medium text-gray-900 sticky left-[360px] sm:left-[430px] bg-white z-10 min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px] text-xs sm:text-sm">
                        {emp.summary.total_working_days}
                      </TableCell>
                      {dateRange.map((date) => {
                        const status = emp.daily_statuses[date] || "N/A";
                        const statusConfig =
                          attendanceCodes[status as keyof typeof attendanceCodes] ||
                          attendanceCodes["ERR"];

                        return (
                          <TableCell key={date} className="text-center p-1 sm:p-2">
                            <span
                              className={`px-1 sm:px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}
                              title={statusConfig.label}
                            >
                              {status}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
