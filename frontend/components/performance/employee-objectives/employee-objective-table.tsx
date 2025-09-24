"use client";

import type { IEmployeeObjective } from "@/types/types.utils";

import { Edit, Trash2, User, Target, Calendar, CheckCircle } from "lucide-react";
import { formatDate, hasPermission } from "@/lib/helpers";
import { PerformanceTable, type TableColumn, type TableAction } from "../common/performance-table";
import { StatusBadge } from "../common/status-badge";
import { PERMISSION_CODES } from "@/constants";

interface EmployeeObjectivesTableProps {
	employeeObjectives: IEmployeeObjective[];
	onEdit: (employeeObjective: IEmployeeObjective) => void;
	onDelete: (employeeObjective: IEmployeeObjective) => void;
	onAdd: () => void;
	onSearch?: (query: string) => void;
	isLoading?: boolean;
}

export function EmployeeObjectivesTable({
	employeeObjectives,
	onEdit,
	onDelete,
	onAdd,
	onSearch,
	isLoading,
}: EmployeeObjectivesTableProps) {
	const columns: TableColumn<IEmployeeObjective>[] = [
		{
			key: "employee",
			label: "Employee",
			render: (item) => (
				<div className="flex items-center gap-2">
					<User className="h-4 w-4 text-slate-400" />
					<div>
						<div className="font-medium text-slate-900">{item.employee?.name || "Unknown"}</div>
						<div className="text-sm text-slate-500">
							{item.employee.department?.name || "No department"}
						</div>
					</div>
				</div>
			),
		},
		{
			key: "objective",
			label: "Objective",
			render: (item) => (
				<div className="flex items-center gap-2">
					<Target className="h-4 w-4 text-blue-500" />
					<div className="max-w-xs">
						<div className="font-medium text-slate-900 truncate">{item.objective.name}</div>
						<div className="text-sm text-slate-500 line-clamp-2">{item.objective.description}</div>
					</div>
				</div>
			),
		},
		{
			key: "status",
			label: "Status",
			render: (item) => <StatusBadge status={item.status} />,
		},
		{
			key: "start_date",
			label: "Start Date",
			render: (item) => (
				<div className="flex items-center gap-2 text-slate-600">
					<Calendar className="h-4 w-4" />
					{formatDate(item.start_date)}
				</div>
			),
		},
		{
			key: "end_date",
			label: "End Date",
			render: (item) => (
				<div className="flex items-center gap-2 text-slate-600">
					<Calendar className="h-4 w-4" />
					{formatDate(item.end_date)}
				</div>
			),
		},
		// {
		// 	key: "progress",
		// 	label: "Progress",
		// 	render: (item) => {
		// 		const now = new Date();
		// 		const start = new Date(item.start_date);
		// 		const end = new Date(item.end_date);
		// 		const total = end.getTime() - start.getTime();
		// 		const elapsed = now.getTime() - start.getTime();
		// 		const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));

		// 		return (
		// 			<div className="flex items-center gap-2">
		// 				<div className="w-16 bg-slate-200 rounded-full h-2">
		// 					<div
		// 						className="bg-blue-500 h-2 rounded-full transition-all"
		// 						style={{ width: `${progress}%` }}
		// 					/>
		// 				</div>
		// 				<span className="text-xs text-slate-600">{Math.round(progress)}%</span>
		// 			</div>
		// 		);
		// 	},
		// },
		{
			key: "key_result",
			label: "Key Result",
			render: (item) => (
				<div>
					{item.key_result ? (
						<div className="flex items-center gap-2">
							<CheckCircle className="h-4 w-4 text-green-500" />
							<span className="text-sm text-slate-600 truncate max-w-xs">
								{item.key_result.title}
							</span>
						</div>
					) : (
						<span className="text-slate-400 italic">No key result</span>
					)}
				</div>
			),
		},
	];

	const actions: TableAction<IEmployeeObjective>[] = [
		{
			label: "Edit",
			icon: <Edit className="h-4 w-4" />,
			onClick: onEdit,
		},
		{
			label: "Delete",
			icon: <Trash2 className="h-4 w-4" />,
			onClick: onDelete,
			variant: "destructive",
		},
	];

	return (
		<PerformanceTable
			data={employeeObjectives}
			columns={columns}
			actions={actions}
			onAdd={hasPermission(PERMISSION_CODES.CAN_GIVE_FEEDBACK) ? onAdd : undefined}
			addLabel="Assign Objective"
			searchPlaceholder="Search by employee or objective..."
			onSearch={onSearch}
			isLoading={isLoading}
			emptyMessage="No objective assignments found"
		/>
	);
}
