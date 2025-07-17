"use client";
import React from "react";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {createAttendanceRecord} from "@/lib/utils.attendance";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Search} from "lucide-react";

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
  // Fetch attendance from backend on mount and when employees or selectedDate change
  React.useEffect(() => {
    async function fetchAttendance() {
      try {
        console.log("⏳ Fetching attendance for date:", selectedDate);
        const records = await import("@/lib/utils.attendance").then((mod) =>
          mod.fetchAttendanceRecords(selectedDate),
        );
        console.log("✅ Attendance fetch response:", records);

        const attendanceMap = new Map<number, {checkIn: string | null; checkOut: string | null}>();
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

  const handleCheckIn = async (id: number) => {
    const checkInTime = getCurrentTime();
    console.log(`🟢 Check-in triggered for employee ${id} at ${checkInTime}`);
    try {
      await import("@/lib/utils.attendance").then((mod) =>
        mod.createAttendanceRecord({
          employee: id,
          check_in_time: checkInTime,
          status: "approved",
        }),
      );
      console.log("✅ Check-in API call succeeded");

      const raw = await import("@/lib/utils.attendance").then((mod) =>
        mod.fetchAttendanceRecords(selectedDate),
      );
      const records = raw.results || [];
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
      console.error("❌ Check-in failed for employee:", id, err);
      alert("Failed to record check-in!");
    }
  };

  const handleCheckOut = async (id: number) => {
    const checkOutTime = getCurrentTime();
    const record = attendance.find((r) => r.employeeId === id);
    const checkInTime = record?.checkIn || "";
    console.log(
      `🔴 Check-out triggered for employee ${id} at ${checkOutTime}, check-in was: ${checkInTime}`,
    );

    try {
      await import("@/lib/utils.attendance").then((mod) =>
        mod.createAttendanceRecord({
          employee: id,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          status: "approved",
        }),
      );
      console.log("✅ Check-out API call succeeded");

      const raw = await import("@/lib/utils.attendance").then((mod) =>
        mod.fetchAttendanceRecords(selectedDate),
      );
      const records = raw.results || [];

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
      console.error("❌ Check-out failed for employee:", id, err);
      alert("Failed to record check-out!");
    }
  };

  return (
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
                          onClick={() => handleCheckIn(emp.id)}
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
                          onClick={() => handleCheckOut(emp.id)}
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
