"use client";

import type { IPeriod } from "@/types/types.utils";

import { Edit, Trash2, Calendar } from "lucide-react";

import { PerformanceTable, type TableColumn, type TableAction } from "../common/performance-table";
import { StatusBadge } from "../common/status-badge";

interface PeriodsTableProps {
	periods: IPeriod[];
	onEdit: (period: IPeriod) => void;
	onDelete: (period: IPeriod) => void;
	onAdd: () => void;
	onSearch?: (query: string) => void;
	isLoading?: boolean;
}

export function PeriodsTable({
	periods,
	onEdit,
	onDelete,
	onAdd,
	onSearch,
	isLoading,
}: PeriodsTableProps) {
	const columns: TableColumn<IPeriod>[] = [
		{
			key: "name",
			label: "Period Name",
			render: (period) => <div className="font-medium text-slate-900">{period.name}</div>,
		},
		{
			key: "start_date",
			label: "Start Date",
			render: (period) => (
				<div className="flex items-center gap-2 text-slate-600">
					<Calendar className="h-4 w-4" />
					{new Date(period.start_date).toLocaleDateString()}
				</div>
			),
		},
		{
			key: "end_date",
			label: "End Date",
			render: (period) => (
				<div className="flex items-center gap-2 text-slate-600">
					<Calendar className="h-4 w-4" />
					{new Date(period.end_date).toLocaleDateString()}
				</div>
			),
		},
		{
			key: "duration",
			label: "Duration",
			render: (period) => {
				const start = new Date(period.start_date);
				const end = new Date(period.end_date);
				const diffTime = Math.abs(end.getTime() - start.getTime());
				const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				return <span className="text-slate-600">{diffDays} days</span>;
			},
		},
		{
			key: "is_closed",
			label: "Status",
			render: (period) => <StatusBadge status={period.is_closed ? "closed" : "open"} />,
		},
	];

	const actions: TableAction<IPeriod>[] = [
		{
			label: "Edit",
			icon: <Edit className="h-4 w-4" />,
			onClick: onEdit,
			// show: (period) => !period.is_closed,
		},
		{
			label: "Delete",
			icon: <Trash2 className="h-4 w-4" />,
			onClick: onDelete,
			variant: "destructive",
			show: (period) => !period.is_closed,
		},
	];

	return (
		<PerformanceTable
			data={periods}
			columns={columns}
			actions={actions}
			onAdd={onAdd}
			addLabel="Create Period"
			searchPlaceholder="Search periods..."
			onSearch={onSearch}
			isLoading={isLoading}
			emptyMessage="No performance periods found"
		/>
	);
}
