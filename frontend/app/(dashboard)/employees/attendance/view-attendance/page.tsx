"use client";

import {
  useState,
  useMemo,
  useEffect,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
} from "react";
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
import {Download, Users, Building, Search, Info, Loader2} from "lucide-react";
import {fetchAttendanceData} from "@/lib/utils";
import type {AttendanceResponse} from "@/types/types.utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";

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
  department: string;
  position: string;
}

interface DownloadFilters {
  searchTerm: string;
  department: string;
  position: string;
  scope: string;
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
          {isExpanded ? "Hide" : "Show"} Legend
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(attendanceCodes).map(([code, {label, color}]) => (
            <div key={code} className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
              <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{code}</span>
              <span className="text-xs text-gray-600">{label}</span>
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

  const [filters, setFilters] = useState<AttendanceFilters>({
    startDate: "2025-07-20",
    endDate: "2025-08-19",
    department: "all",
    position: "all",
  });

  const [tempFilters, setTempFilters] = useState<AttendanceFilters>({
    startDate: "2025-07-20",
    endDate: "2025-08-19",
    department: "all",
    position: "all",
  });

  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadFilters, setDownloadFilters] = useState<DownloadFilters>({
    searchTerm: "",
    department: "all",
    position: "all",
    scope: "all",
  });

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

  const departments = useMemo(() => {
    const actualData = (attendanceData as any)?.data || attendanceData;
    if (!actualData?.employees) return [];
    const depts = [
      ...new Set(actualData.employees.map((emp: any) => emp.employee.department)),
    ] as string[];
    return depts;
  }, [attendanceData]);

  const positions = useMemo(() => {
    const actualData = (attendanceData as any)?.data || attendanceData;
    if (!actualData?.employees) return [];
    const pos = [
      ...new Set(actualData.employees.map((emp: any) => emp.employee.position)),
    ] as string[];
    return pos;
  }, [attendanceData]);

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
    return employeesWithAttendance.filter(
      (emp: {employee: {department: string; position: string}}) => {
        const deptMatch =
          tempFilters.department === "all" || emp.employee.department === tempFilters.department;
        const posMatch =
          tempFilters.position === "all" || emp.employee.position === tempFilters.position;
        return deptMatch && posMatch;
      },
    );
  }, [tempFilters, employeesWithAttendance]);

  const downloadFilteredEmployees = useMemo(() => {
    return employeesWithAttendance.filter(
      (emp: {
        employee: {
          full_name: string;
          id: {toString: () => string | string[]};
          department: string;
          position: string;
        };
      }) => {
        const searchMatch =
          downloadFilters.searchTerm === "" ||
          emp.employee.full_name.toLowerCase().includes(downloadFilters.searchTerm.toLowerCase()) ||
          emp.employee.id.toString().includes(downloadFilters.searchTerm);

        const deptMatch =
          downloadFilters.department === "all" ||
          emp.employee.department === downloadFilters.department;
        const posMatch =
          downloadFilters.position === "all" || emp.employee.position === downloadFilters.position;

        return searchMatch && deptMatch && posMatch;
      },
    );
  }, [downloadFilters, employeesWithAttendance]);

  const handleFilterChange = (key: keyof AttendanceFilters, value: string) => {
    setTempFilters((prev) => ({...prev, [key]: value}));
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
  };

  // Check if filters have changed
  const hasFilterChanges =
    tempFilters.startDate !== filters.startDate ||
    tempFilters.endDate !== filters.endDate ||
    tempFilters.department !== filters.department ||
    tempFilters.position !== filters.position;

  const handleDownloadFilterChange = (key: keyof DownloadFilters, value: string) => {
    setDownloadFilters((prev) => ({...prev, [key]: value}));
  };

  const handleDownload = () => {
    const dataToDownload = downloadFilteredEmployees;

    const legendData = Object.entries(attendanceCodes).map(([code, {label}]) => `${code},${label}`);

    const headers = ["Full Name", "Present", "Absent", "Late", "Leave", "Total Days"];
    const employeeData = dataToDownload.map(
      (emp: {
        employee: {full_name: any};
        summary: {present: any; absent: any; late: any; leave: any; total_working_days: any};
      }) => [
        emp.employee.full_name,
        emp.summary.present,
        emp.summary.absent,
        emp.summary.late,
        emp.summary.leave,
        emp.summary.total_working_days,
      ],
    );

    const excelContent = [
      "ATTENDANCE CODES",
      "Code,Description",
      ...legendData,
      "",
      "",
      "ATTENDANCE REPORT",
      `Period: ${filters.startDate} to ${filters.endDate}`,
      "",
      headers.join(","),
      ...employeeData.map((row: any[]) => row.join(",")),
    ].join("\n");

    const blob = new Blob([excelContent], {type: "application/vnd.ms-excel"});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${filters.startDate}-to-${filters.endDate}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setDownloadModalOpen(false);
    setDownloadFilters({
      searchTerm: "",
      department: "all",
      position: "all",
      scope: "all",
    });
  };

  const handleModalOpen = (open: boolean) => {
    setDownloadModalOpen(open);
    if (open) {
      setDownloadFilters({
        searchTerm: "",
        department: "all",
        position: "all",
        scope: "all",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading attendance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <AttendanceLegend />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <Label htmlFor="end-date" className="text-sm font-medium text-gray-700">
            End Date
          </Label>
          <Input
            id="end-date"
            type="date"
            value={tempFilters.endDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Department</Label>
          <Select
            value={tempFilters.department}
            onValueChange={(value) => handleFilterChange("department", value)}
          >
            <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Position</Label>
          <Select
            value={tempFilters.position}
            onValueChange={(value) => handleFilterChange("position", value)}
          >
            <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 invisible">Apply</Label>
          <Button
            onClick={handleApplyFilters}
            disabled={!hasFilterChanges || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Apply Filters"
            )}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border">
        <div className="flex flex-row items-center justify-between p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            Attendance Records ({filteredEmployees.length} employees)
          </h3>
          <Dialog open={downloadModalOpen} onOpenChange={handleModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Download Attendance Report</DialogTitle>
                <DialogDescription>
                  Filter and search employees to customize your download (
                  {downloadFilteredEmployees.length} employees selected)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="search" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Employees
                  </Label>
                  <Input
                    id="search"
                    placeholder="Search by name or employee ID..."
                    value={downloadFilters.searchTerm}
                    onChange={(e) => handleDownloadFilterChange("searchTerm", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Filter by Department
                    </Label>
                    <Select
                      value={downloadFilters.department}
                      onValueChange={(value) => handleDownloadFilterChange("department", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Filter by Position
                    </Label>
                    <Select
                      value={downloadFilters.position}
                      onValueChange={(value) => handleDownloadFilterChange("position", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDownloadModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDownload}
                    disabled={downloadFilteredEmployees.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel ({downloadFilteredEmployees.length} employees)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold text-gray-900 sticky left-0 bg-white z-10">
                    Full Name
                  </TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 sticky left-[150px] bg-white z-10">
                    Present
                  </TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 sticky left-[220px] bg-white z-10">
                    Absent
                  </TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 sticky left-[290px] bg-white z-10">
                    Late
                  </TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 sticky left-[360px] bg-white z-10">
                    Leave
                  </TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 sticky left-[430px] bg-white z-10">
                    Total Days
                  </TableHead>
                  {dateRange.map((date) => (
                    <TableHead
                      key={date}
                      className="text-center font-semibold text-gray-900 min-w-[80px]"
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
                {filteredEmployees.map(
                  (emp: {
                    employee: {
                      id: Key | null | undefined;
                      full_name:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<unknown, string | JSXElementConstructor<any>>
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<unknown, string | JSXElementConstructor<any>>
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                    };
                    summary: {
                      present:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<unknown, string | JSXElementConstructor<any>>
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<unknown, string | JSXElementConstructor<any>>
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                      absent:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<unknown, string | JSXElementConstructor<any>>
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<unknown, string | JSXElementConstructor<any>>
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                      late:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<unknown, string | JSXElementConstructor<any>>
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<unknown, string | JSXElementConstructor<any>>
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                      leave:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<unknown, string | JSXElementConstructor<any>>
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<unknown, string | JSXElementConstructor<any>>
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                      total_working_days:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<unknown, string | JSXElementConstructor<any>>
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<unknown, string | JSXElementConstructor<any>>
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                    };
                    daily_statuses: {[x: string]: string};
                  }) => (
                    <TableRow key={emp.employee.id} className="border-b hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900 sticky left-0 bg-white z-10 w-[150px] min-w-[150px]">
                        {emp.employee.full_name}
                      </TableCell>
                      <TableCell className="text-center sticky left-[150px] bg-white z-10 w-[70px] min-w-[70px]">
                        {emp.summary.present}
                      </TableCell>
                      <TableCell className="text-center sticky left-[220px] bg-white z-10 w-[70px] min-w-[70px]">
                        {emp.summary.absent}
                      </TableCell>
                      <TableCell className="text-center sticky left-[290px] bg-white z-10 w-[70px] min-w-[70px]">
                        {emp.summary.late}
                      </TableCell>
                      <TableCell className="text-center sticky left-[360px] bg-white z-10 w-[70px] min-w-[70px]">
                        {emp.summary.leave}
                      </TableCell>
                      <TableCell className="text-center font-medium text-gray-900 sticky left-[430px] bg-white z-10 w-[100px] min-w-[100px]">
                        {emp.summary.total_working_days}
                      </TableCell>
                      {dateRange.map((date) => {
                        const status = emp.daily_statuses[date] || "N/A";
                        const statusConfig =
                          attendanceCodes[status as keyof typeof attendanceCodes] ||
                          attendanceCodes["ERR"];

                        return (
                          <TableCell key={date} className="text-center p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}
                              title={statusConfig.label}
                            >
                              {status}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
