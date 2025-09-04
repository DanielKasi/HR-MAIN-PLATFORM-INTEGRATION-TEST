"use client";
import React, {useState, useEffect} from "react";
import {useParams, useRouter} from "next/navigation";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ArrowLeft, Search, Filter, Upload, CalendarDays, Clock, User} from "lucide-react";

import {AttendanceAPI, getEmployeeById} from "@/lib/utils";

import Link from "next/link";
import {IAttendance, IEmployee} from "@/types/types.utils";

const EmployeeAttendanceHistory = () => {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<IAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Fetch employee details
  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    if (!employeeId) {
      return;
    }
    try {
      const data = await getEmployeeById({employeeId});
      setEmployee(data);
    } catch (err) {
      setError("Failed to load employee details");
    }
  };

  // Fetch attendance records
  useEffect(() => {
    loadAttendanceRecords();
  }, [employeeId, startDate, endDate]);

  const loadAttendanceRecords = async () => {
    if (!employeeId) {
      return;
    }
    try {
      setLoading(true);
      const response = await AttendanceAPI.fetchEmployeeAttendanceRecords(
        parseInt(employeeId),
        startDate,
        endDate,
      );
      setAttendanceRecords(response.results);
      setError(null);
    } catch (err) {
      setError("Failed to load attendance records");
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter records by search
  const filteredRecords = attendanceRecords.filter(
    (record) =>
      record.date.toLowerCase().includes(search.toLowerCase()) ||
      record.status.toLowerCase().includes(search.toLowerCase()),
  );

  // Calculate statistics
  const stats = {
    totalDays: attendanceRecords.length,
    presentDays: attendanceRecords.filter((r) => r.check_in_time).length,
    absentDays: attendanceRecords.filter((r) => !r.check_in_time).length,
    averageHours:
      attendanceRecords
        .filter((r) => r.check_in_time && r.check_out_time)
        .reduce((acc, r) => {
          const checkIn = new Date(`2000-01-01T${r.check_in_time}`);
          const checkOut = new Date(`2000-01-01T${r.check_out_time}`);
          const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          return acc + hours;
        }, 0) /
      Math.max(attendanceRecords.filter((r) => r.check_in_time && r.check_out_time).length, 1),
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    return timeString;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getStatusBadge = (record: IAttendance) => {
    if (!record.check_in_time) {
      return <Badge variant="destructive">Absent</Badge>;
    }
    if (!record.check_out_time) {
      return <Badge className="bg-yellow-100 text-yellow-800">Checked In</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
  };

  const calculateWorkHours = (checkIn: string, checkOut: string | null) => {
    if (!checkIn || !checkOut) return "N/A";

    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const hours = Math.floor(diffHours);
    const minutes = Math.floor((diffHours - hours) * 60);

    return `${hours}h ${minutes}m`;
  };

  // Helper to set both dates to today
  const setToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
  };

  // Helper to format duration in h m s
  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + "h " : ""}${m > 0 ? m + "m " : ""}${s}s`;
  }

  // Helper to calculate work hours in seconds
  function calculateWorkSeconds(checkIn: string | null, checkOut: string | null) {
    if (!checkIn || !checkOut) return null;
    const inTime = new Date(`2000-01-01T${checkIn}`);
    const outTime = new Date(`2000-01-01T${checkOut}`);
    return Math.max(0, Math.floor((outTime.getTime() - inTime.getTime()) / 1000));
  }

  // Helper to calculate overtime in seconds
  function calculateOvertimeSeconds(
    checkOut: string | null,
    branchClosingTime: string | null,
    date: string,
  ) {
    if (!checkOut || !branchClosingTime) return 0;
    const checkOutDate = new Date(`${date}T${checkOut}`);
    const closingDate = new Date(`${date}T${branchClosingTime}`);
    if (checkOutDate > closingDate) {
      return Math.floor((checkOutDate.getTime() - closingDate.getTime()) / 1000);
    }
    return 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w">
        {/* Header */}
        <div className="mb-8 ">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-full aspect-square"
              variant="outline"
              onClick={() => router.push("/employees/attendance")}
            >
              <ArrowLeft />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 mt-3 ml-2">Attendance History</h1>
          </div>
          {employee && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-lg font-semibold text-gray-700">
                  {employee.user?.fullname || ""}
                </span>
              </div>
              <Badge variant="outline">{employee.department.name}</Badge>
              <span className="text-gray-500">{employee.email}</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Days</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Present Days</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.presentDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">Absent Days</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.absentDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Avg. Hours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.averageHours.toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().slice(0, 10)}
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                <Button onClick={setToday} variant="outline" className="w-full h-11 font-semibold">
                  Today
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Attendance Records ({filteredRecords.length})</span>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="bg-gray-50 border-b">
                <div className="grid grid-cols-7 gap-4 p-4 font-medium text-sm">
                  <div>Date</div>
                  <div>Status</div>
                  <div>Check In</div>
                  <div>Check Out</div>
                  <div>Work Hours</div>
                  <div>Overtime</div>
                </div>
              </div>
              <div>
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found for the selected period
                  </div>
                ) : (
                  filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="grid grid-cols-7 gap-4 p-4 border-b hover:bg-gray-50 items-center"
                    >
                      <div className="font-medium">{formatDate(record.date)}</div>
                      <div>{getStatusBadge(record)}</div>
                      <div>
                        {record.check_in_time ? (
                          <Badge className="bg-green-100 text-green-800">
                            {formatTime(record.check_in_time)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Not checked in</span>
                        )}
                      </div>
                      <div>
                        {record.check_out_time ? (
                          <Badge className="bg-purple-100 text-purple-800">
                            {formatTime(record.check_out_time)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Not checked out</span>
                        )}
                      </div>
                      <div className="font-medium">
                        {(() => {
                          const secs = calculateWorkSeconds(
                            record.check_in_time,
                            record.check_out_time,
                          );
                          return secs !== null ? formatDuration(secs) : "N/A";
                        })()}
                      </div>
                      <div className="font-medium">
                        {(() => {
                          const branchClosingTime =
                            record.employee.user?.branches?.[0]?.branch_closing_time || null;
                          const overtimeSecs = calculateOvertimeSeconds(
                            record.check_out_time,
                            branchClosingTime,
                            record.date,
                          );
                          return overtimeSecs > 0 ? formatDuration(overtimeSecs) : "—";
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeAttendanceHistory;
