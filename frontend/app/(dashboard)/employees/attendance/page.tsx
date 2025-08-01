"use client";
import React, {useState, useEffect, useMemo} from "react";
import EmployeeAttendance from "../../dashboard/EmployeeAttendance";
import { BarChart2, UserCheck, UserX, Users} from "lucide-react";
import {AttendanceAPI, getAllEmployees} from "@/lib/utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";

import {IAttendance, IEmployee} from "@/app/types/types.utils";
import {toast} from "sonner";

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
