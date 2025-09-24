import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
}

interface Leave {
	employee: string;
	department: string;
	total_leave: number;
	leave_taken: number;
	leave_remaining: number;
	percentage: number;
}

export default function LeaveTable({ className = "" }: Props) {
	const columns: ColumnDef<Leave>[] = [
		{
			key: "employee",
			header: <span>Employees</span>,
			cell: (props) => (
				<div className="grid leading-tight">
					<span>{props.employee}</span>
					<span className="opacity-50 text-sm">{props.department}</span>
				</div>
			),
		},
		{
			key: "total_leave",
			header: <span>Total Leave Allocation</span>,
			cell: (props) => <span>{props.total_leave}</span>,
		},
		{
			key: "leave_taken",
			header: <span>Leave Taken</span>,
			cell: (props) => <span>{props.leave_taken}</span>,
		},
		{
			key: "leave_remaining",
			header: <span>Remaining Days</span>,
			cell: (props) => <span>{props.leave_remaining}</span>,
		},
		{
			key: "progress",
			header: <span>Utilization %</span>,
			cell: (props) => <span>{props.percentage}</span>,
		},
	];
	return (
		<Card className={`shadow-none border ${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Leave Employees</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<Leave>> {
						return Promise.resolve({
							count: 20,
							next: "21",
							previous: "0",
							results: new Array(5).fill(null).map(() => ({
								employee: "John Doe",
								department: "Finance",
								total_leave: 20,
								leave_taken: 12,
								leave_remaining: 8,
								percentage: 60,
							})),
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
