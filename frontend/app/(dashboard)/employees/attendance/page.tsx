"use client";
import React, { useState, useEffect, useMemo } from "react";
import EmployeeAttendance from "../../dashboard/EmployeeAttendance";
import { Search, BarChart2, UserCheck, UserX, Users } from "lucide-react";
import { getAllEmployees } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectAttachedInstitutions, selectSelectedInstitution } from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types";

const AttendancePage = () => {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{
    employeeId: number;
    checkIn: string | null;
    checkOut: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [InstitutionId, setInstitutionId] = useState<string | null>(null);
  const InstitutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id.toString());
    } else if (InstitutionsAttached && InstitutionsAttached.length > 0) {
      setInstitutionId(String(InstitutionsAttached[0].id));
    }
  }, [InstitutionsAttached, selectedInstitution]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!InstitutionId) {
        if (InstitutionsAttached && InstitutionsAttached.length > 0) {
          setInstitutionId(String(InstitutionsAttached[0].id));
        }
        return;
      }
      try {
        setLoading(true);
        const institutionIdNumber = parseInt(InstitutionId);
        const data = await getAllEmployees({ institutionId: institutionIdNumber });
        if (data) {
          const employeesArray = (data as any[]).map(emp => ({
            id: emp.id,
            name: emp.user?.fullname || "",
            department: emp.department?.name || "",
            email: emp.email || ""
          }));
          setEmployees(employeesArray);
          setAttendance(employeesArray.map(emp => ({ employeeId: emp.id, checkIn: null, checkOut: null })));
          setError(null);
        } else {
          setError("No employee data available");
        }
      } catch (err) {
        setError("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };
    loadEmployees();
  }, [InstitutionId, InstitutionsAttached]);

  // Filter employees by search
  const filteredEmployees = useMemo(() =>
    employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase())),
    [employees, search]
  );

  // Compute stats
  const stats = useMemo(() => {
    const total = employees.length;
    const checkedIn = attendance.filter(a => a.checkIn).length;
    const checkedOut = attendance.filter(a => a.checkOut).length;
    const absent = total - checkedIn;
    return [
      { label: "Total Employees", value: total, icon: <Users className="text-blue-500 w-5 h-5" /> },
      { label: "Checked In", value: checkedIn, icon: <UserCheck className="text-green-500 w-5 h-5" /> },
      { label: "Checked Out", value: checkedOut, icon: <UserX className="text-purple-500 w-5 h-5" /> },
      { label: "Absent", value: absent, icon: <BarChart2 className="text-red-500 w-5 h-5" /> },
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
          <p className="text-red-600">{error}</p>
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
          employees={filteredEmployees}
          attendance={attendance}
          setAttendance={setAttendance}
          search={search}
          setSearch={setSearch}
          stats={stats}
        />
      </div>
    </div>
  );
};

export default AttendancePage;
