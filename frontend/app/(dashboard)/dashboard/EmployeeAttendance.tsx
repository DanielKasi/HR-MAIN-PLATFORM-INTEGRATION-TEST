"use client";
import React, { useState } from "react";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {createAttendanceRecord} from "@/lib/utils.attendance";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Search, X, Clock, Calendar} from "lucide-react";
import ProtectedComponent from "@/components/ProtectedComponent"
import { PERMISSION_CODES } from "@/app/types/types.utils"

interface Employee {
  id: number;
  name: string;
  department: string;
  email?: string;
}

interface AttendanceRecord {
  employeeId: number;
  checkIn: string | null;
  checkOut: string | null;
}

const getCurrentTime = () => {
  const now = new Date();
  // Format as hh:mm:ss
  return now.toTimeString().split(" ")[0]; // "14:15:02"
};

const getCurrentDateTime = () => {
  const now = new Date();
  // Format as YYYY-MM-DD for date input
  const date = now.toISOString().split('T')[0];
  // Format as HH:MM for time input
  const time = now.toTimeString().slice(0, 5);
  return { date, time };
};

interface Stat {
  label: string;
  value: number;
  icon: React.ReactNode;
}

interface EmployeeAttendanceProps {
  employees: Employee[];
  search: string;
  setSearch: (val: string) => void;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  stats: Stat[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

// Check-in Modal Component
interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  employeeName: string;
}

const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, onConfirm, employeeName }) => {
  const { date: currentDate, time: currentTime } = getCurrentDateTime();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedTime, setSelectedTime] = useState(currentTime);

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Combine date and time to create the check-in time string
    const checkInTime = `${selectedTime}:00`; // Add seconds
    onConfirm(selectedDate, checkInTime);
    onClose();
  };

  const handleUseCurrentTime = () => {
    const { date, time } = getCurrentDateTime();
    setSelectedDate(date);
    setSelectedTime(time);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Check In - {employeeName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Select the check-in date and time or use the current time.
          </div>

          {/* Date Input */}
          {/* <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={currentDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div> */}

          {/* Time Input */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4 mr-2" />
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Use Current Time Button */}
          <button
            onClick={handleUseCurrentTime}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center"
          >
            <Clock className="w-4 h-4 mr-2" />
            Use Current Time
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Confirm Check In
          </button>
        </div>
      </div>
    </div>
  );
};

// Check-out Modal Component
interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  employeeName: string;
  checkInTime: string | null;
}

const CheckOutModal: React.FC<CheckOutModalProps> = ({ isOpen, onClose, onConfirm, employeeName, checkInTime }) => {
  const { date: currentDate, time: currentTime } = getCurrentDateTime();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedTime, setSelectedTime] = useState(currentTime);

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Combine date and time to create the check-out time string
    const checkOutTime = `${selectedTime}:00`; // Add seconds
    onConfirm(selectedDate, checkOutTime);
    onClose();
  };

  const handleUseCurrentTime = () => {
    const { date, time } = getCurrentDateTime();
    setSelectedDate(date);
    setSelectedTime(time);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Check Out - {employeeName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Select the check-out date and time or use the current time.
            {checkInTime && (
              <div className="mt-2 text-xs text-gray-500">
                Check-in time: <span className="font-medium">{checkInTime}</span>
              </div>
            )}
          </div>

          {/* Date Input */}
          {/* <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={currentDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div> */}

          {/* Time Input */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4 mr-2" />
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Use Current Time Button */}
          <button
            onClick={handleUseCurrentTime}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center"
          >
            <Clock className="w-4 h-4 mr-2" />
            Use Current Time
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Confirm Check Out
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const processAttendanceData = (rawData: any): any[] => {

    let records: any[] = [];

    // Handle different response formats
    if (rawData && typeof rawData === 'object' && 'results' in rawData && Array.isArray(rawData.results)) {
      records = rawData.results;
    }
    else if (Array.isArray(rawData)) {
      records = rawData;
      console.log("✅ Using direct array format");
    }
    else if (!rawData) {
      records = [];
      console.log("⚠️ No attendance data found, using empty array");
    }
    else {
      console.error("❌ Unexpected attendance data structure:", typeof rawData, rawData);
      records = [];
    }

    console.log("📋 Processed attendance records:", records);
    return records;
  };

  // Fetch attendance from backend on mount and when employees or selectedDate change
  React.useEffect(() => {
    async function fetchAttendance() {
      try {
        console.log("⏳ Fetching attendance for date:", selectedDate);
        const rawData = await import("@/lib/utils.attendance").then((mod) =>
          mod.fetchAttendanceRecords(selectedDate),
        );
        console.log("📥 Raw attendance fetch response:", rawData);

        // Safely process the attendance data
        const records = processAttendanceData(rawData);

        const attendanceMap = new Map<number, {checkIn: string | null; checkOut: string | null}>();

        // Now safely iterate over the records array
        records.forEach((rec: any) => {
          console.log("🔁 Mapping record:", rec);
          attendanceMap.set(rec.employee.id, {
            checkIn: rec.check_in_time || null,
            checkOut: rec.check_out_time || null,
          });
        });

        const newAttendance = employees.map((emp) => ({
          employeeId: emp.id,
          checkIn: attendanceMap.get(emp.id)?.checkIn || null,
          checkOut: attendanceMap.get(emp.id)?.checkOut || null,
        }));

        console.log("🧩 Final attendance state to set:", newAttendance);
        setAttendance(newAttendance);
      } catch (err) {
        console.error("❌ Error fetching attendance:", err);
        setAttendance(
          employees.map((emp) => ({employeeId: emp.id, checkIn: null, checkOut: null})),
        );
      }
    }

    if (employees.length > 0 && selectedDate) {
      console.log("📆 Triggering fetchAttendance due to selectedDate or employees change");
      fetchAttendance();
    }
  }, [employees, selectedDate, setAttendance]);

  const openCheckInModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setCheckInModalOpen(true);
  };

  const openCheckOutModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setCheckOutModalOpen(true);
  };

  const handleCheckIn = async (date: string, checkInTime: string) => {
    if (!selectedEmployee) return;
    
    console.log(`🟢 Check-in triggered for employee ${selectedEmployee.id} at ${checkInTime} on ${date}`);
    try {
      await import("@/lib/utils.attendance").then((mod) =>
        mod.createAttendanceRecord({
          employee: selectedEmployee.id,
          check_in_time: checkInTime,
          status: "approved",
        }),
      );
      console.log("✅ Check-in API call succeeded");

      const rawData = await import("@/lib/utils.attendance").then((mod) =>
        mod.fetchAttendanceRecords(selectedDate),
      );

      // Safely process the refreshed attendance data
      const records = processAttendanceData(rawData);
      console.log("📥 Attendance refreshed after check-in:", records);

      const attendanceMap = new Map<number, {checkIn: string | null; checkOut: string | null}>();
      records.forEach((rec: any) => {
        attendanceMap.set(rec.employee.id, {
          checkIn: rec.check_in_time || null,
          checkOut: rec.check_out_time || null,
        });
      });

      setAttendance(
        employees.map((emp) => ({
          employeeId: emp.id,
          checkIn: attendanceMap.get(emp.id)?.checkIn || null,
          checkOut: attendanceMap.get(emp.id)?.checkOut || null,
        })),
      );
    } catch (err) {
      console.error("❌ Check-in failed for employee:", selectedEmployee.id, err);
      alert("Failed to record check-in!");
    }
  };

  const handleCheckOut = async (date: string, checkOutTime: string) => {
    if (!selectedEmployee) return;
    
    const record = attendance.find((r) => r.employeeId === selectedEmployee.id);
    const checkInTime = record?.checkIn || "";
    console.log(
      `🔴 Check-out triggered for employee ${selectedEmployee.id} at ${checkOutTime} on ${date}, check-in was: ${checkInTime}`,
    );

    try {
      await import("@/lib/utils.attendance").then((mod) =>
        mod.createAttendanceRecord({
          employee: selectedEmployee.id,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          status: "approved",
        }),
      );
      console.log("✅ Check-out API call succeeded");

      const rawData = await import("@/lib/utils.attendance").then((mod) =>
        mod.fetchAttendanceRecords(selectedDate),
      );

      // Safely process the refreshed attendance data
      const records = processAttendanceData(rawData);
      console.log("📥 Attendance refreshed after check-out:", records);

      const attendanceMap = new Map<number, {checkIn: string | null; checkOut: string | null}>();
      records.forEach((rec: any) => {
        attendanceMap.set(rec.employee.id, {
          checkIn: rec.check_in_time || null,
          checkOut: rec.check_out_time || null,
        });
      });

      setAttendance(
        employees.map((emp) => ({
          employeeId: emp.id,
          checkIn: attendanceMap.get(emp.id)?.checkIn || null,
          checkOut: attendanceMap.get(emp.id)?.checkOut || null,
        })),
      );
    } catch (err) {
      console.error("❌ Check-out failed for employee:", selectedEmployee.id, err);
      alert("Failed to record check-out!");
    }
  };

  return (
    <>
      <Card>
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
          <div className="rounded-md border">
            <div className="bg-gray-50 border-b">
              <div className="grid grid-cols-6 gap-4 p-4 font-medium">
                <div>Date</div>
                <div>Name</div>
                <div>Email</div>
                <div>Check In</div>
                <div>Check Out</div>
              </div>
            </div>
            <div>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No employees found matching your criteria
                </div>
              ) : (
                employees.map((emp) => {
                  const record = attendance.find((r) => r.employeeId === emp.id);
                  return (
                    <div
                      key={emp.id}
                      className="grid grid-cols-6 gap-4 p-4 border-b hover:bg-gray-50 items-center"
                    >
                      <div>{selectedDate}</div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">
                          <a
                            href={`/employees/attendance/${emp.id}`}
                            className="hover:underline text-blue-600"
                          >
                            {emp.name}
                          </a>
                        </span>
                        <span className="text-xs text-gray-400 font-normal">{emp.department}</span>
                      </div>
                      <div className="text-sm text-blue-600 underline underline-offset-2">
                        {emp.email ? (
                          <a
                            href={`mailto:${emp.email}`}
                            className="hover:text-blue-800 transition-colors"
                          >
                            {emp.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                      <div>
                        {record?.checkIn ? (
                          <Badge className="bg-green-100 text-green-800">{record.checkIn}</Badge>
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
                      </div>
                      <div>
                        {record?.checkOut ? (
                          <Badge className="bg-purple-100 text-purple-800">{record.checkOut}</Badge>
                        ) : isToday(selectedDate) ? (
                          <button
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold"
                            onClick={() => openCheckOutModal(emp)}
                            disabled={!record?.checkIn}
                            style={{opacity: record?.checkIn ? 1 : 0.5}}
                          >
                            Check Out
                          </button>
                        ) : (
                          <span className="text-gray-400 text-lg">–</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        onConfirm={handleCheckIn}
        employeeName={selectedEmployee?.name || ''}
      />

      {/* Check-out Modal */}
      <CheckOutModal
        isOpen={checkOutModalOpen}
        onClose={() => setCheckOutModalOpen(false)}
        onConfirm={handleCheckOut}
        employeeName={selectedEmployee?.name || ''}
        checkInTime={attendance.find(r => r.employeeId === selectedEmployee?.id)?.checkIn || null}
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