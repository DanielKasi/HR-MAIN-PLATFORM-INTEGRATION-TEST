"use client";

import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { EMPLOYEE_API, showErrorToast } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { IWorkHourCount } from "@/types/employee.types";

export default function HourCountListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");

	const columns: ColumnDef<IWorkHourCount>[] = [
		{
			key: "employee",
			header: (
				<div className="flex items-center justify-start gap-2 sm:gap-4">
					<span className="text-xs sm:text-sm">Employee</span>
					<Button
						onClick={() => setOrdering((prev) => (prev === "employee" ? "-employee" : "employee"))}
						size="sm"
						variant={ordering.includes("name") ? "default" : "outline"}
						type="button"
						className="h-6 w-6 sm:h-8 sm:w-8 p-0"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-3 !w-3 sm:!h-4 sm:!w-4" />
					</Button>
				</div>
			),
			cell: (resource) => (
				<span className="text-xs sm:text-sm">
					{resource.employee.name || resource.employee.user?.fullname || ""}
				</span>
			),
		},
		{
			key: "year",
			header: <span className="text-xs sm:text-sm">Year</span>,
			cell: (resource) => <span className="text-xs sm:text-sm">{resource.year || "Unknown"}</span>,
		},
		{
			key: "month",
			header: <span className="text-xs sm:text-sm">Month</span>,
			cell: (resource) => <span className="text-xs sm:text-sm">{resource.month || "Unknown"}</span>,
		},
		{
			key: "total_worked_hours",
			header: <span className="text-xs sm:text-sm">Total Worked Hours</span>,
			cell: (resource) => (
				<span className="text-xs sm:text-sm">{resource.total_worked_hours || "0.00"}</span>
			),
		},
		{
			key: "total_overtime_hours",
			header: <span className="text-xs sm:text-sm">Total Overtime Hours</span>,
			cell: (resource) => (
				<span className="text-xs sm:text-sm">{resource.total_overtime_hours || "0.00"}</span>
			),
		},
		{
			key: "total_late_minutes",
			header: <span className="text-xs sm:text-sm">Total Late Minutes</span>,
			cell: (resource) => (
				<span className="text-xs sm:text-sm">{resource.total_late_minutes || "0"}</span>
			),
		},
		{
			key: "total_early_checkout_minutes",
			header: <span className="text-xs sm:text-sm">Total Early Checkout</span>,
			cell: (resource) => (
				<span className="text-xs sm:text-sm">{resource.total_early_checkout_minutes || "0"}</span>
			),
		},
		{
			key: "total_absent_days",
			header: <span className="text-xs sm:text-sm">Total Absent Days</span>,
			cell: (resource) => (
				<span className="text-xs sm:text-sm">{resource.total_absent_days || "0"}</span>
			),
		},
	];

	return (
		<div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
				<h1 className="text-xl sm:text-2xl font-bold">Work Hours Count</h1>
			</div>

			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
				<div className="relative w-full sm:flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
					<Input
						className="pl-8 sm:pl-9 w-full text-xs sm:text-sm"
						placeholder="Search by employee name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<div className="overflow-x-auto">
				<PaginatedTable<IWorkHourCount>
					fetchFirstPage={async () => {
						if (!currentInstitution) throw new Error("No institution selected");
						return await EMPLOYEE_API.hourAccount.getPaginated({
							page: 1,
							search: searchTerm || undefined,
							ordering,
						});
					}}
					fetchFromUrl={EMPLOYEE_API.hourAccount.getPaginatedFromUrl}
					deps={[currentInstitution?.id, searchTerm, ordering]}
					onError={(err) =>
						showErrorToast({ error: err, defaultMessage: "Failed to fetch work hour counts" })
					}
					columns={columns}
					skeletonRows={8}
					refreshRef={tableRefreshRef}
					emptyState={
						<div className="text-center py-8 sm:py-12">
							<p className="text-muted-foreground mb-4 text-sm sm:text-base">
								No work hours count found
							</p>
						</div>
					}
				/>
			</div>
		</div>
	);
}
