"use client";
import React, { useState, useEffect, useMemo } from "react";
import EmployeeAttendance from "../../dashboard/EmployeeAttendance";
import { Search, BarChart2, UserCheck, UserX, Users } from "lucide-react";
import { getAllEmployees } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectAttachedInstitutions, selectSelectedInstitution } from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types";
import ProtectedPage from "@/components/ProtectedPage";
import { PERMISSION_CODES } from "@/app/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent"

const AttendancePage = () => {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{
    employeeId: number;
    checkIn: string | null;
    checkOut: string | null;
  }[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
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

        console.log("Raw employee data:", data);

        if (data) {
          // Handle different response formats
          let employeesData: any[] = [];

          // Check if it's a paginated response with 'results' property
          if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
            employeesData = data.results;
            console.log("Using paginated response format");
          }
          // Check if it's a direct array
          else if (Array.isArray(data)) {
            employeesData = data;
            console.log("Using direct array format");
          }
          // If it's neither, log the structure and set empty array
          else {
            console.error("Unexpected data structure:", typeof data, data);
            setError("Unexpected employee data format");
            setEmployees([]);
            setAttendance([]);
            return;
          }

          const employeesArray = employeesData.map(emp => ({
            id: emp.id,
            name: emp.user?.fullname || emp.email || `Employee ${emp.id}`,
            department: emp.department?.name || "Unknown Department",
            email: emp.email || ""
          }));

          console.log("Processed employees:", employeesArray);

          setEmployees(employeesArray);
          setAttendance(employeesArray.map(emp => ({
            employeeId: emp.id,
            checkIn: null,
            checkOut: null
          })));
          setError(null);
        } else {
          setError("No employee data available");
          setEmployees([]);
          setAttendance([]);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
        setError("Failed to load employees");
        setEmployees([]);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };
    loadEmployees();
  }, [InstitutionId, InstitutionsAttached]);

  // Filter employees by search
  const filteredEmployees = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
    ),
    [employees, search]
  );

  // Compute stats from attendance state
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
          employees={filteredEmployees}
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
