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
				<div className="flex items-center justify-start gap-4">
					<span>Employee</span>
					<Button
						onClick={() => setOrdering((prev) => (prev === "employee" ? "-employee" : "employee"))}
						size="sm"
						variant={ordering.includes("name") ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (resource) => resource.employee.name || resource.employee.user?.fullname || "",
		},
		{
			key: "year",
			header: "Year",
			cell: (resource) => resource.year || "Unknown",
		},
		{
			key: "month",
			header: "Month",
			cell: (resource) => resource.month || "Unknown",
		},
		{
			key: "total_worked_hours",
			header: "Total Worked Hours",
			cell: (resource) => resource.total_worked_hours || "Unknown",
		},
		{
			key: "total_overtime_hours",
			header: "Total Overtime Hours",
			cell: (resource) => resource.total_overtime_hours || "Unknown",
		},
		{
			key: "total_late_minutes",
			header: "Total late Minutes",
			cell: (resource) => resource.total_late_minutes || "Unknown",
		},
		{
			key: "total_early_checkout_minutes",
			header: "Total Early Checkout",
			cell: (resource) => resource.total_early_checkout_minutes || "Unknown",
		},
		{
			key: "total_absent_days",
			header: "Total Absent Days",
			cell: (resource) => resource.total_absent_days || "Unknown",
		},
	];

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Work Hours Count</h1>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search resources..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

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
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No work hours count found</p>
					</div>
				}
			/>
		</div>
	);
}
