"use client";


    import React, {useState, useRef} from "react";
    import {Search} from "lucide-react";
    import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
    import {TableSkeleton} from "@/components/common/table-skeleton";
    import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
    import {Input} from "@/components/ui/input";
    import Link from "next/link";
    import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
    import {getAllEmployees, getPaginatedEmployeesFromUrl, AttendanceAPI} from "@/lib/utils";
    import {IAttendance, IEmployee} from "@/types/types.utils";
    import {toast} from "sonner";
    import {CheckInModal} from "@/components/checkin-modal";
    import {CheckOutModal} from "@/components/checkout-modal";
    import {getCurrentUserLocation} from "@/lib/helpers";

    interface EmployeeAttendanceProps {
      selectedInstitution: {id: number} | null;
      selectedDate: string;
      setSelectedDate: (date: string) => void;
    }

    const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({
      selectedInstitution,
      selectedDate,
      setSelectedDate,
    }) => {
      const [search, setSearch] = useState("");
      const [checkInModalOpen, setCheckInModalOpen] = useState(false);
      const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
      const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);
      const [currentUserlocation, setCurrentUserLocation] = useState<GeolocationPosition | null>(null);
      const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<IAttendance | null>(null);

      const attendanceRefreshRef = useRef<(() => Promise<void>) | null>(null);
      const attendanceRef = useRef<IAttendance[]>([]);

      const handlePositionChange = (position: GeolocationPosition) => {
        setCurrentUserLocation(position);
      };

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

      const handleCheckIn = async (_date: string, checkInTime: string) => {
        if (!selectedEmployee) return;
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

          await attendanceRefreshRef.current?.();
        } catch (error: any) {
          const errorMessage = error?.detail || error?.message || "Failed to record check-in!";
          toast.error(errorMessage);
        }
      };

      const handleCheckOut = async (_date: string, checkOutTime: string) => {
        if (!selectedAttendanceRecord) return;
        const record = attendanceRef.current.find((r) => r.id === selectedAttendanceRecord.id);
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

          await attendanceRefreshRef.current?.();
        } catch (error: any) {
          const errorMessage = error?.detail || error?.message || "Failed to record check-out!";
          toast.error(errorMessage);
        }
      };

      return (
        <PaginatedTableWrapper<IEmployee>
          fetchFirstPage={async () => {
            if (!selectedInstitution) throw new Error("No institution selected");
            return await getAllEmployees({institutionId: selectedInstitution.id, page: 1, search: search || undefined});
          }}
          fetchFromUrl={getPaginatedEmployeesFromUrl}
          deps={[selectedInstitution?.id, search]}
          className=""
          footerClassName="pt-4"
        >
          {({data: employeesData, loading: employeesLoading, refresh: refreshEmployees}) => {
            const employees = employeesData?.results || [];

            return (
              <PaginatedTableWrapper<IAttendance>
                fetchFirstPage={async () =>
                  AttendanceAPI.fetchAttendanceRecords({date: selectedDate, search, page: 1})
                }
                fetchFromUrl={({url}) => AttendanceAPI.fetchAttendanceRecordsFromUrl(url)}
                deps={[selectedDate, search]}
                className=""
                footerClassName="hidden"
              >
                {({data: attendanceData, loading: attendanceLoading, refresh: refreshAttendance}) => {
                  attendanceRefreshRef.current = refreshAttendance;
                  attendanceRef.current = attendanceData?.results || [];

                  const stats = [
                    {label: "Total Employees", value: employeesData?.count || 0, icon: null},
                    {label: "Checked In", value: (attendanceRef.current || []).filter((a) => a.check_in_time).length, icon: null},
                    {label: "Checked Out", value: (attendanceRef.current || []).filter((a) => a.check_out_time).length, icon: null},
                    {label: "Absent", value: employees.length - (attendanceRef.current || []).filter((a) => a.check_in_time).length, icon: null},
                  ];

                  return (
                    <>
                      <div className="">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="mb-2">Attendance ({employees.length})</span>
                          </CardTitle>

                          <div className="grid grid-cols-1 md:flex flex-wrap gap-4 mb-16">
                            {stats.map((stat, idx) => (
                              <div
                                key={idx}
                                className="w-full md:flex-1 md:min-w-[14rem] md:max-w-[20rem] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 px-6 py-4"
                              >
                                <div className="text-xl">{stat.icon}</div>
                                <div>
                                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                                  <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col gap-4 py-4">
                            <div className="grid grid-cols-1  md:flex flex-col md:flex-row gap-4 w-full items-center justify-start">
                              <div className="relative md:w-full md:max-w-lg lg:max-w-xl">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  type="text"
                                  placeholder="Search employees..."
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                              <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded-lg px-3 py-2 text-gray-700 md:max-w-[8rem] w-full"
                                style={{minWidth: 140}}
                                max={new Date().toISOString().slice(0, 10)}
                                title="Filter by date"
                              />
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          {(employeesLoading || attendanceLoading) ? (
                            <TableSkeleton rows={10} columns={6} />
                          ) : (
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
                                    const record = (attendanceData?.results || []).find((r) => r.employee.id === emp.id);
                                    return (
                                      <TableRow key={emp.id} className="hover:bg-gray-50">
                                        <TableCell>{selectedDate}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-col">
                                            <Link
                                              href={`/employees/attendance/${emp.id}`}
                                              className="font-semibold text-blue-600 hover:underline"
                                            >
                                              {emp.user?.fullname || "Unknown"}
                                            </Link>
                                            <span className="text-xs text-gray-400"></span>
                                          </div>
                                        </TableCell>
                                        <TableCell>{emp.email || ""}</TableCell>
                                        <TableCell className="min-w-[6rem]">
                                          {record?.check_in_time ? (
                                            <span className="text-sm text-gray-700">{record.check_in_time}</span>
                                          ) : isToday(selectedDate) ? (
                                            <button
                                              onClick={() => openCheckInModal(emp)}
                                              className="text-sm text-blue-600"
                                            >
                                              Check In
                                            </button>
                                          ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="min-w-[6rem]">
                                          {record ? (
                                            record?.check_out_time ? (
                                              <span className="text-sm text-gray-700">{record.check_out_time}</span>
                                            ) : isToday(selectedDate) ? (
                                              <button
                                                onClick={() => openCheckOutModal(record)}
                                                className="text-sm text-blue-600"
                                              >
                                                Check Out
                                              </button>
                                            ) : (
                                              <span className="text-sm text-gray-400">-</span>
                                            )
                                          ) : null}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </div>

                      <CheckInModal
                        isOpen={checkInModalOpen}
                        onClose={() => setCheckInModalOpen(false)}
                        onConfirm={handleCheckIn}
                        employeeName={selectedEmployee?.user?.fullname || ""}
                      />

                      <CheckOutModal
                        isOpen={checkOutModalOpen}
                        onClose={() => setCheckOutModalOpen(false)}
                        onConfirm={handleCheckOut}
                        employeeName={selectedEmployee?.user?.fullname || ""}
                        checkInTime={
                          attendanceRef.current.find((r) => r.employee.id === selectedEmployee?.id)?.check_in_time || null
                        }
                      />
                    </>
                  );
                }}
              </PaginatedTableWrapper>
            );
          }}
        </PaginatedTableWrapper>
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
