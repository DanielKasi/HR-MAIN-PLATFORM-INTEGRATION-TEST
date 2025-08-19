"use client";
import React, {useState} from "react";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Search, X, Clock} from "lucide-react";
import {IAttendance, IEmployee} from "@/types/types.utils";
import {toast} from "sonner";
import Link from "next/link";
import {CheckInModal} from "@/components/checkin-modal";
import {AttendanceAPI} from "@/lib/utils";
import {CheckOutModal} from "@/components/checkout-modal";
import {getCurrentUserLocation} from "@/lib/helpers";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

interface Stat {
  label: string;
  value: number;
  icon: React.ReactNode;
}

interface EmployeeAttendanceProps {
  employees: IEmployee[];
  search: string;
  setSearch: (val: string) => void;
  attendance: IAttendance[];
  setAttendance: React.Dispatch<React.SetStateAction<IAttendance[]>>;
  stats: Stat[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({
  employees,
  search,
  setSearch,
  attendance,
  setAttendance,
  stats,
  selectedDate,
  setSelectedDate,
}) => {
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);
  const [currentUserlocation, setCurrentUserLocation] = useState<GeolocationPosition | null>(null);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<IAttendance | null>(
    null,
  );

  // Fetch attendance from backend on mount and when employees or selectedDate change
  React.useEffect(() => {
    if (employees.length > 0 && selectedDate) {
      fetchAttendance();
    }
  }, [employees, selectedDate]);

  async function fetchAttendance() {
    try {
      const fetchedAttendance = await AttendanceAPI.fetchAttendanceRecords(selectedDate);
      setAttendance(fetchedAttendance.results);
    } catch (err: any) {
      let errorMessage = err?.message || err?.detail || "Failed to fetch attendance records";
      toast.error(errorMessage);
    }
  }

  const openCheckInModal = async (employee: IEmployee) => {
    setSelectedEmployee(employee);
    setCheckInModalOpen(true);
    await getCurrentUserLocation(handlePositionChange);
  };

  const openCheckOutModal = async (attendanceRecord: IAttendance) => {
    setSelectedEmployee(attendanceRecord.employee);
    setSelectedAttendanceRecord(attendanceRecord);
    setCheckOutModalOpen(true);
    await getCurrentUserLocation(handlePositionChange);
  };

  const handlePositionChange = (position: GeolocationPosition) => {
    setCurrentUserLocation(position);
  };

  const handleCheckIn = async (date: string, checkInTime: string) => {
    if (!selectedEmployee) {
      return;
    }
    if (!currentUserlocation) {
      toast.warning("You need to allow access to your location to be able to proceed !");
      return;
    }
    try {
      await AttendanceAPI.createAttendanceRecord({
        employee: selectedEmployee.id,
        check_in_time: checkInTime,
        check_in_latitude: currentUserlocation.coords.latitude,
        check_in_longitude: currentUserlocation.coords.longitude,
        status: "approved",
      });

      fetchAttendance();
    } catch (error: any) {
      let errorMessage = error?.detail || error?.message || "Failed to record check-in!";
      toast.error(errorMessage);
    }
  };

  const handleCheckOut = async (date: string, checkOutTime: string) => {
    if (!selectedAttendanceRecord) {
      return;
    }
    const record = attendance.find((r) => r.id === selectedAttendanceRecord.id);
    const checkInTime = record?.check_in_time || "";
    await getCurrentUserLocation(handlePositionChange);
    if (!currentUserlocation) {
      toast.warning("You need to allow access to your location to be able to proceed !");
      return;
    }

    try {
      await AttendanceAPI.updateAttendanceRecord(selectedAttendanceRecord.id, {
        employee: selectedAttendanceRecord?.employee.id,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        check_out_latitude: currentUserlocation.coords.latitude,
        check_out_longitude: currentUserlocation.coords.longitude,
        status: "approved",
      });

      await fetchAttendance();
    } catch (error: any) {
      let errorMessage = error?.detail || error?.message || "Failed to record check-out!";
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <div className="">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="mb-2">Attendance ({employees.length})</span>
          </CardTitle>
          {/* Stats cards above search */}
          <div className="flex flex-wrap gap-4 mb-16">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="flex-1 min-w-[160px] max-w-[210px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 px-6 py-4"
              >
                <div className="text-xl">{stat.icon}</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Search */}
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-row gap-2 w-full items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{minWidth: 140}}
                max={new Date().toISOString().slice(0, 10)}
                title="Filter by date"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No employees found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => {
                  const record = attendance.find((r) => r.employee.id === emp.id);
                  return (
                    <TableRow key={emp.id} className="hover:bg-gray-50">
                      <TableCell>{selectedDate}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/employees/attendance/${emp.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {emp.user?.fullname || ""}
                          </Link>
                          <span className="text-xs text-gray-400">{emp.department.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.email ? (
                          <a
                            href={`mailto:${emp.email}`}
                            className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
                          >
                            {emp.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record?.check_in_time ? (
                          <Badge className="bg-green-100 text-green-800">
                            {record.check_in_time}
                          </Badge>
                        ) : isToday(selectedDate) ? (
                          <button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold"
                            onClick={() => openCheckInModal(emp)}
                          >
                            Check In
                          </button>
                        ) : (
                          <span className="text-gray-400 text-lg">–</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record ? (
                          record?.check_out_time ? (
                            <Badge className="bg-purple-100 text-purple-800">
                              {record.check_out_time}
                            </Badge>
                          ) : isToday(selectedDate) ? (
                            <button
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold"
                              onClick={() => openCheckOutModal(record)}
                              disabled={!record?.check_in_time}
                              style={{opacity: record?.check_in_time ? 1 : 0.5}}
                            >
                              Check Out
                            </button>
                          ) : (
                            <span className="text-gray-400 text-lg">–</span>
                          )
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </div>

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        onConfirm={handleCheckIn}
        employeeName={selectedEmployee?.user?.fullname || ""}
      />

      {/* Check-out Modal */}
      <CheckOutModal
        isOpen={checkOutModalOpen}
        onClose={() => setCheckOutModalOpen(false)}
        onConfirm={handleCheckOut}
        employeeName={selectedEmployee?.user?.fullname || ""}
        checkInTime={
          attendance.find((r) => r.employee.id === selectedEmployee?.id)?.check_in_time || null
        }
      />
    </>
  );
};

function isToday(dateString: string) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return dateString === `${yyyy}-${mm}-${dd}`;
}

export default EmployeeAttendance;
