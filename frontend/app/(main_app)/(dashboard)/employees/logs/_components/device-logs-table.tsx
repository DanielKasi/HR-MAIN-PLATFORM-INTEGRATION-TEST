"use client";

import { RefObject, useMemo, useRef } from "react";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { IEmployee } from "@/types/types.utils";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";
import { Icon } from "@iconify/react";
import { EMPLOYEE_DEVICE_LOGS } from "@/lib/api/employee.utils";
import { IEmployeeLog } from "@/types/employee.types";
import { formatDate } from "@/lib/helpers";

interface DevicesLogsTableProps {
	employee?: IEmployee;
	device?: number;
	refreshRef?: RefObject<(() => void) | null>;
	search?: string;
	date?: string;
}

export default function DevicesLogsTable({
	employee,
	device,
	refreshRef,
	search,
	date,
}: DevicesLogsTableProps) {
	const refreshFunctionRef = refreshRef || useRef<(() => void) | null>(null);
	const columns: ColumnDef<IEmployeeLog>[] = [
		...(employee
			? [
					{
						key: "employee",
						header: "Employee",
						cell: (employee_log: IEmployeeLog) => (
							<div className="flex-col items-start justify-start gap-4">
								<p>{employee_log.employee.name}</p>
								<p>
									<span className="text-sm font-semibold line-clamp-1">
										({employee_log.employee.position})
									</span>
								</p>
							</div>
						),
					},
				]
			: []),
		{
			key: "record_reference",
			header: "Record Reference",
			cell: (employee_log) => employee_log.record_reference || "",
		},
		{
			key: "device",
			header: "Device",
			cell: (employee_log) => employee_log.device.name || employee_log.device.serial_number || "",
		},
		{
			key: "date",
			header: "Date",
			cell: (employee_log) => (
				<p className="line-clamp-1">{formatDate(employee_log.date || "Unknown")}</p>
			),
		},
		{
			key: "time",
			header: "Time",
			cell: (employee_log) => employee_log.time,
		},
	];

	const memoizedDeps = useMemo(
		() => [employee, device, search, date],
		[employee, device, search, date],
	);

	return (
		<div>
			<PaginatedTable<IEmployeeLog>
				fetchFirstPage={async () =>
					await EMPLOYEE_DEVICE_LOGS.getPaginated({
						page: 1,
						employee: employee?.id,
						device,
						search,
						date,
					})
				}
				fetchFromUrl={(url) => getPaginatedFromUrl<IEmployeeLog>(url)}
				deps={memoizedDeps}
				refreshRef={refreshFunctionRef}
				columns={columns}
				skeletonRows={5}
				emptyState={
					<div className="flex flex-col items-center justify-center py-12">
						<Icon icon="hugeicons:layers-logo" className="!w-12 !h-12 text-muted-foreground mb-4" />
						<p className="text-muted-foreground mb-4">No logs found</p>
					</div>
				}
			/>
		</div>
	);
}
