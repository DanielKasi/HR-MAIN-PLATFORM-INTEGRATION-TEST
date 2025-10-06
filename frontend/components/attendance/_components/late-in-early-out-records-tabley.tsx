import Link from "next/link";
import React, { useRef, RefObject } from "react";

import { AttendanceAPI } from "@/lib/utils";

import { IAttendance, IEmployee } from "@/types/types.utils";
import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { formatDate } from "@/lib/helpers";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface LateInEarlyOutRecordsTableProps {
	selectedDate?: string;
	setSelectedDate?: (date: string) => void;
	searchTerm?: string;
	scope: { type: "default" } | { type: "employee"; employee: IEmployee };
	attendanceRefreshRef?: RefObject<() => void | null>;
	showingOnDashboard?: boolean;
}

export function LateInEarlyOutRecordsTable({
	searchTerm,
	scope,
	attendanceRefreshRef: attendanceRef,
	selectedDate,
}: LateInEarlyOutRecordsTableProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const attendanceRefreshRef = attendanceRef || useRef<(() => Promise<void>) | null>(null);
	const colums: ColumnDef<IAttendance>[] = [
		{
			header: "Date",
			key: "date",
			cell: (record) => formatDate(record.date),
		},
		{
			header: "Name",
			key: "employee_name",
			cell: (record) => {
				return (
					<div className="flex flex-col">
						<Link
							href={`/employees-list/profile/${record.employee.id}`}
							className="font-semibold text-blue-600 hover:underline"
						>
							{record.employee.name || record.employee.user?.fullname || "Unknown"}
						</Link>
						<span className="text-xs text-gray-400" />
					</div>
				);
			},
		},
		{
			header: "Email",
			key: "employee_email",
			cell: (record) =>
				record.employee.company_email?.email || record.employee.user?.email || "Unknown",
		},
		{
			header: "Early checkout",
			key: "early_checkout_minutes",
			cell: (record) => (
				<span className="min-w-[6rem]">
					<span>{record?.early_checkout_minutes || 0} minutes</span>
				</span>
			),
		},
		{
			header: "Late",
			key: "late_minutes",
			cell: (record) => <span className="min-w-[6rem]">{record.late_minutes || 0} minutes</span>,
		},
		{
			header: "Worked hours",
			key: "worked_hours",
			cell: (record) => <span className="min-w-[6rem]">{record.worked_hours || 0} hours</span>,
		},
	];

	return (
		<PaginatedTable<IAttendance>
			fetchFirstPage={async () => {
				if (!currentInstitution) {
					throw new Error("No institution found");
				}
				if (scope.type === "default") {
					return AttendanceAPI.fetchAttendanceRecords({
						date: selectedDate,
						search: searchTerm,
						page: 1,
						institutionId: currentInstitution.id,
					});
				}

				return AttendanceAPI.fetchAttendanceRecordsByEmployee({
					employee_id: scope.employee.id,
					date: selectedDate,
					search: searchTerm,
					page: 1,
					institutionId: currentInstitution.id,
				});
			}}
			fetchFromUrl={({ url }) => AttendanceAPI.fetchAttendanceRecordsFromUrl(url)}
			deps={[selectedDate, searchTerm]}
			className=""
			paginated={scope.type === "default"}
			footerClassName="hidden"
			refreshRef={attendanceRefreshRef}
			columns={colums}
		/>
	);
}
