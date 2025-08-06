"use client";
import React, {useState, useEffect, useMemo} from "react";
import EmployeeAttendance from "../../dashboard/EmployeeAttendance";
import { BarChart2, UserCheck, UserX, Users} from "lucide-react";
import {AttendanceAPI, getAllEmployees} from "@/lib/utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";

import {IAttendance, IEmployee} from "@/app/types/types.utils";
import {toast} from "sonner";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Card, CardHeader } from "@/components/ui/card";

const AttendancePage = () => {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [attendance, setAttendance] = useState<IAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedInstitution = useSelector(selectSelectedInstitution);

  useEffect(() => {
    loadEmployees();
    handleFetchAttendance();
  }, [selectedInstitution]);

  const loadEmployees = async () => {
    if (!selectedInstitution) {
      return;
    }
    try {
      setLoading(true);
      const data = await getAllEmployees({institutionId: selectedInstitution.id});
      setEmployees(data);
    } catch (err: any) {
      setError("Failed to load employees");
      toast.error(err?.message || err?.detail || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAttendance = async () => {
    if (!selectedInstitution) {
      return;
    }
    try {
      setLoading(true);
      const response = await AttendanceAPI.fetchAttendanceRecords();
      setAttendance(response.results);
    } catch (error: any) {
      let errorMessage = error?.message || error?.detail || "Failed to fetch attendance records";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const stats = useMemo(() => {
    const total = employees.length;
    const checkedIn = attendance.filter((a) => a.check_in_time).length;
    const checkedOut = attendance.filter((a) => a.check_out_time).length;
    const absent = total - checkedIn;
    return [
      {label: "Total Employees", value: total, icon: <Users className="text-blue-500 w-5 h-5" />},
      {
        label: "Checked In",
        value: checkedIn,
        icon: <UserCheck className="text-green-500 w-5 h-5" />,
      },
      {
        label: "Checked Out",
        value: checkedOut,
        icon: <UserX className="text-purple-500 w-5 h-5" />,
      },
      {label: "Absent", value: absent, icon: <BarChart2 className="text-red-500 w-5 h-5" />},
    ];
  }, [attendance, employees.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


    if (loading) {
      return (
        <div className="p-2 space-y-6">
          <Card className="h-[calc(100vh-2rem)] shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between gap-8 items-center">
                <div className="flex items-center justify-start gap-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardHeader>
            <TableSkeleton rows={10} columns={8} />
          </Card>
        </div>
      )
    }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Attendance</h1>
          <p className="text-muted-foreground">Manage daily attendance for your organization</p>
        </div>
        <EmployeeAttendance
          employees={employees}
          search={search}
          setSearch={setSearch}
          attendance={attendance}
          setAttendance={setAttendance}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          stats={stats}
        />
      </div>
    </div>
  );
};

export default AttendancePage;
