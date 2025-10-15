import Link from "next/link";
import React, { useState, useRef, RefObject, useEffect } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

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

interface AttendanceRecordsTableProps {
	selectedDate?: string;
	setSelectedDate?: (date: string) => void;
	searchTerm?: string;
	scope: { type: "default" } | { type: "employee"; employee: IEmployee };
	attendanceRefreshRef?: RefObject<(() => Promise<void>) | null>;
	showingOnDashboard?: boolean;
}

export function AttendanceRecordsTable({
	searchTerm,
	scope,
	attendanceRefreshRef: attendanceRef,
	showingOnDashboard,
}: AttendanceRecordsTableProps) {
	const [search, setSearch] = useState(searchTerm);
	const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
	const currentInstitution = useSelector(selectSelectedInstitution);
	useEffect(() => {
		setSearch(searchTerm);
	}, [searchTerm]);

	const attendanceRefreshRef = attendanceRef || useRef<(() => Promise<void>) | null>(null);

	return (
		<PaginatedTableWrapper<IAttendance>
			fetchFirstPage={async () => {
				if (scope.type === "default") {
					return AttendanceAPI.fetchAttendanceRecords({
						date: selectedDate,
						search,
						page: 1,
						institutionId: currentInstitution?.id,
					});
				}

				return AttendanceAPI.fetchAttendanceRecordsByEmployee({
					employee_id: scope.employee.id,
					date: selectedDate,
					search,
					page: 1,
					institutionId: currentInstitution?.id,
				});
			}}
			fetchFromUrl={({ url }) => AttendanceAPI.fetchAttendanceRecordsFromUrl(url)}
			deps={[selectedDate, search]}
			className=""
			paginated={scope.type === "default"}
			footerClassName="hidden"
		>
			{({ data: attendanceData, loading: attendanceLoading, refresh: refreshAttendance }) => {
				attendanceRefreshRef.current = refreshAttendance;
				return (
					<>
						<div className="">
							<CardHeader className="px-2 md:px-4">
								{scope.type === "default" ? (
									<>
										<CardTitle className="flex items-center justify-between">
											<span className="mb-3">
												<h1>Today's Attendance</h1>
											</span>
										</CardTitle>
									</>
								) : (
									<></>
								)}

								<div className="flex flex-col gap-4 py-4">
									<div className="grid grid-cols-1  md:flex flex-col md:flex-row gap-4 w-full items-center justify-start">
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
								</div>
							</CardHeader>

							<CardContent>
								{attendanceLoading ? (
									<TableSkeleton rows={10} columns={6} />
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="min-w-[6rem]">Name</TableHead>
												<TableHead className="min-w-[6rem]">Email</TableHead>
												<TableHead className="min-w-[6rem]">Date</TableHead>
												<TableHead className="min-w-[6rem]">Checkin Time</TableHead>
												<TableHead className="min-w-[6rem]">Checkout Time</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{attendanceData?.results.length === 0 ? (
												<TableRow>
													<TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
														No attendance records found
													</TableCell>
												</TableRow>
											) : (
												attendanceData?.results.map((att, idx) => {
													return (
														<TableRow key={idx} className="hover:bg-gray-50">
															<TableCell className="min-w-[6rem]">
																<div className="flex flex-col">
																	<Link
																		href={`/employees/attendance/${att.employee.id}`}
																		className="font-semibold text-blue-600 hover:underline"
																	>
																		{att.employee.name || att.employee.user?.fullname || "Unknown"}
																	</Link>
																	<span className="text-xs text-gray-400" />
																</div>
															</TableCell>
															<TableCell className="min-w-[6rem]">
																{att.employee.email || ""}
															</TableCell>
															<TableCell className="min-w-[6rem]">{selectedDate}</TableCell>
															<TableCell className="min-w-[6rem]">
																<span>{att?.check_in_time}</span>
															</TableCell>
															<TableCell className="min-w-[6rem]">
																<span>{att?.check_out_time}</span>
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
					</>
				);
			}}
		</PaginatedTableWrapper>
	);
}

function isToday(dateString: string) {
	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, "0");
	const dd = String(today.getDate()).padStart(2, "0");

	return dateString === `${yyyy}-${mm}-${dd}`;
}
