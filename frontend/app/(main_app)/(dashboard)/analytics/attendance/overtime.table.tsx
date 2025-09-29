import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
}

interface Overtime {
	rank: string;
	employee: string;
	department: string;
	hours: string;
	overtime: string;
}

export default function OvertimeTable({ className = "" }: Props) {
	const columns: ColumnDef<Overtime>[] = [
		{
			key: "rank",
			header: <span>Rank</span>,
			cell: (props) => <span>{props.rank}</span>,
		},
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
			key: "hours",
			header: <span>Hours</span>,
			cell: (props) => <span>{props.hours} hrs</span>,
		},
		{
			key: "overtime",
			header: <span>Overtime Days</span>,
			cell: (props) => <span>{props.overtime}</span>,
		},
	];
	return (
		<Card className={`shadow-none border ${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Overtime Employees</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<Overtime>> {
						return Promise.resolve({
							count: 20,
							next: "21",
							previous: "0",
							results: new Array(5).fill(null).map(() => ({
								rank: "1",
								employee: "John Doe",
								department: "Finance",
								hours: "48",
								overtime: "2",
							})),
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
