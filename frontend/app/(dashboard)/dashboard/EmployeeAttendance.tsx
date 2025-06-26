"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

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
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  stats: Stat[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({ employees, search, setSearch, stats, selectedDate, setSelectedDate }) => {

  // Attendance state (internal)
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([]);
  // Key for localStorage
  const storageKey = `attendance_${selectedDate}`;

  // Load attendance from localStorage on mount and when employees or selectedDate change
  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore if the employee IDs match (prevents mismatch on org switch)
        if (Array.isArray(parsed) && parsed.length === employees.length && parsed.every((r: any) => employees.some(e => e.id === r.employeeId))) {
          setAttendance(parsed);
          return;
        }
      } catch {}
    }
    // Otherwise, initialize to empty attendance for each employee
    setAttendance(employees.map(emp => ({ employeeId: emp.id, checkIn: null, checkOut: null })));
    // eslint-disable-next-line
  }, [employees, storageKey]);

  // Save attendance to localStorage whenever it changes (for selected date)
  React.useEffect(() => {
    if (attendance && attendance.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(attendance));
    }
    // eslint-disable-next-line
  }, [attendance, storageKey]);

  const handleCheckIn = (id: number) => {
    setAttendance(prev => prev.map(record =>
      record.employeeId === id ? { ...record, checkIn: getCurrentTime() } : record
    ));
  };

  const handleCheckOut = (id: number) => {
    setAttendance(prev => prev.map(record =>
      record.employeeId === id ? { ...record, checkOut: getCurrentTime() } : record
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="mb-2">Attendance ({employees.length})</span>
        </CardTitle>
        {/* Search */}
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex flex-row gap-2 w-full items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ minWidth: 140 }}
              max={new Date().toISOString().slice(0, 10)}
              title="Filter by date"
            />
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0013 13v5a1 1 0 01-1.447.894l-2-1A1 1 0 019 17v-4a1 1 0 00-.293-.707L2.293 6.707A1 1 0 012 6V4z" /></svg>
              Filter
            </button>
          </div>
          {/* Stats cards below search */}
          <div className="flex flex-wrap gap-4 mt-2">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex-1 min-w-[160px] max-w-[210px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 px-6 py-4">
                <div className="text-xl">{stat.icon}</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="bg-gray-50 border-b">
            <div className="grid grid-cols-6 gap-4 p-4 font-medium">
              <div>Date</div>
              <div>Name</div>
              <div>Department</div>
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
              employees.map(emp => {
                const record = attendance.find(r => r.employeeId === emp.id);
                return (
                  <div key={emp.id} className="grid grid-cols-6 gap-4 p-4 border-b hover:bg-gray-50 items-center">
                    <div>{selectedDate}</div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{emp.name}</span>
                      <span className="text-xs text-gray-400 font-normal">{emp.department}</span>
                    </div>
                    <div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {emp.department}
                      </Badge>
                    </div>
                    <div className="text-sm text-blue-600 underline underline-offset-2">
                      {emp.email ? (
                        <a href={`mailto:${emp.email}`} className="hover:text-blue-800 transition-colors">{emp.email}</a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                    <div>
                      {record?.checkIn ? (
                        <Badge className="bg-green-100 text-green-800">{record.checkIn}</Badge>
                      ) : (
                        isToday(selectedDate) ? (
                          <button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold"
                            onClick={() => setAttendance(prev => prev.map(record => record.employeeId === emp.id ? { ...record, checkIn: getCurrentTime() } : record))}
                          >
                            Check In
                          </button>
                        ) : (
                          <span className="text-gray-400 text-lg">–</span>
                        )
                      )}
                    </div>
                    <div>
                      {record?.checkOut ? (
                        <Badge className="bg-purple-100 text-purple-800">{record.checkOut}</Badge>
                      ) : (
                        isToday(selectedDate) ? (
                          <button
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold"
                            onClick={() => setAttendance(prev => prev.map(record => record.employeeId === emp.id ? { ...record, checkOut: getCurrentTime() } : record))}
                            disabled={!record?.checkIn}
                            style={{ opacity: record?.checkIn ? 1 : 0.5 }}
                          >
                            Check Out
                          </button>
                        ) : (
                          <span className="text-gray-400 text-lg">–</span>
                        )
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
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return dateString === `${yyyy}-${mm}-${dd}`;
}

export default EmployeeAttendance;
