import Link from "next/link";
import React, { useState, useRef, RefObject, useEffect } from "react";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { AttendanceAPI } from "@/lib/utils";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IAttendance, IEmployee } from "@/types/types.utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import moment from "moment";

interface AttendanceRecordsTableProps {
	selectedDate?: string;
	setSelectedDate?: (date: string) => void;
	scope: { type: "default" } | { type: "employee"; employee: IEmployee };
	attendanceRefreshRef?: RefObject<(() => Promise<void>) | null>;
	showingOnDashboard?: boolean;
}

export function AttendanceRecordsTable({
	scope,
	attendanceRefreshRef: attendanceRef,
	showingOnDashboard,
}: AttendanceRecordsTableProps) {
	const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
	const currentInstitution = useSelector(selectSelectedInstitution);

	const attendanceRefreshRef = attendanceRef || useRef<(() => Promise<void>) | null>(null);

	const formatTime = (timeString: string | null) => {
		if (!timeString) return "—";
		try {
			const time = moment(timeString, "HH:mm:ss");
			return time.format("HH:mm:ss");
		} catch {
			return timeString;
		}
	};

	const formatHours = (hours: number) => {
		if (!hours || hours === 0) return "—";
		if (isNaN(hours)) return "—";
		return `${hours.toFixed(2)}h`;
	};

	const getStatusBadgeColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case "present":
				return "bg-green-100 text-green-800";
			case "absent":
				return "bg-red-100 text-red-800";
			case "late":
				return "bg-yellow-100 text-yellow-800";
			case "half_day":
				return "bg-blue-100 text-blue-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<PaginatedTableWrapper<IAttendance>
			fetchFirstPage={async () => {
				if (scope.type === "default") {
					return AttendanceAPI.fetchAttendanceRecords({
						date: selectedDate,
						page: 1,
						institutionId: currentInstitution?.id,
					});
				}

				return AttendanceAPI.fetchAttendanceRecordsByEmployee({
					employee_id: scope.employee.id,
					date: selectedDate,
					page: 1,
					institutionId: currentInstitution?.id,
				});
			}}
			fetchFromUrl={({ url }) => AttendanceAPI.fetchAttendanceRecordsFromUrl(url)}
			deps={[selectedDate]}
			className=""
			paginated={scope.type === "default"}
			footerClassName="hidden"
		>
			{({ data: attendanceData, loading: attendanceLoading, refresh: refreshAttendance }) => {
				attendanceRefreshRef.current = refreshAttendance;
				return (
					<div>
						<CardHeader className="px-2 md:px-4">
							{scope.type === "default" && (
								<CardTitle className="text-lg font-semibold text-slate-900">
									Today's Attendance
								</CardTitle>
							)}

							<div className="flex flex-col gap-4 py-4">
								{!showingOnDashboard && (
									<Input
										type="date"
										value={selectedDate}
										onChange={(e) => setSelectedDate(e.target.value)}
										className="rounded-lg px-3 py-2 text-gray-700 md:max-w-[8rem] w-full"
										style={{ minWidth: 140 }}
										max={new Date().toISOString().slice(0, 10)}
										title="Filter by date"
									/>
								)}
							</div>
						</CardHeader>

						<CardContent>
							{attendanceLoading ? (
								<TableSkeleton rows={10} columns={7} />
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="min-w-[10rem]">Employee</TableHead>
											<TableHead className="min-w-[10rem]">Department</TableHead>
											<TableHead className="min-w-[8rem]">Shift</TableHead>
											<TableHead className="min-w-[8rem]">Check In</TableHead>
											<TableHead className="min-w-[8rem]">Status</TableHead>
											<TableHead className="min-w-[8rem]">Check Out</TableHead>
											<TableHead className="min-w-[8rem]">Hours Worked</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{attendanceData?.results.length === 0 ? (
											<TableRow>
												<TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
													No attendance records found
												</TableCell>
											</TableRow>
										) : (
											attendanceData?.results.map((att) => (
												<TableRow key={att.id} className="hover:bg-gray-50">
													<TableCell className="min-w-[10rem]">
														<div className="flex flex-col">
															<Link
																href={`/employees/attendance/${att.employee.id}`}
																className="font-semibold text-blue-600 hover:underline"
															>
																{att.employee.name || att.employee.user?.fullname || "Unknown"}
															</Link>
															<span className="text-xs text-gray-400">
																{att.employee.email || ""}
															</span>
														</div>
													</TableCell>
													<TableCell className="min-w-[10rem]">
														{att.employee.department?.name || "—"}
													</TableCell>
													<TableCell className="min-w-[8rem]">
														{att.employee.position?.name || "—"}
													</TableCell>
													<TableCell className="min-w-[8rem]">
														<span className="text-sm">{formatTime(att.check_in_time)}</span>
													</TableCell>
													<TableCell className="min-w-[8rem]">
														<span
															className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(att.status)}`}
														>
															{att.status || "—"}
														</span>
													</TableCell>
													<TableCell className="min-w-[8rem]">
														<span className="text-sm">{formatTime(att.check_out_time)}</span>
													</TableCell>
													<TableCell className="min-w-[8rem]">
														{formatHours(att.worked_hours)}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</div>
				);
			}}
		</PaginatedTableWrapper>
	);
}
