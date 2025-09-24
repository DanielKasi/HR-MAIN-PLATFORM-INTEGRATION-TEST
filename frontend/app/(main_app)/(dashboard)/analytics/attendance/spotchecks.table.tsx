import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
}

interface Employee {
	employee: string;
	department: string;
	time: string;
	status: string;
}

export default function SpotchecksTable({ className = "" }: Props) {
	const columns: ColumnDef<Employee>[] = [
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
			key: "time",
			header: <span>Time</span>,
			cell: (props) => <span>{props.time}</span>,
		},
		{
			key: "status",
			header: <span>Status</span>,
			cell: (props) => (
				<span className="bg-red-100 text-red-500 rounded-xl px-2.5 py-1">{props.status}</span>
			),
		},
	];
	return (
		<Card className={`shadow-none border ${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Failed Spotchecks Today</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<Employee>> {
						return Promise.resolve({
							count: 20,
							next: "21",
							previous: "0",
							results: new Array(5).fill(null).map(() => ({
								employee: "John Doe",
								department: "Finance",
								time: "9:12 am",
								status: "Missed",
							})),
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
