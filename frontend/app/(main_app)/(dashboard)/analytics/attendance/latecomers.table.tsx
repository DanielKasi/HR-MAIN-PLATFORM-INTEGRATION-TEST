import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ILatecomer, IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
	data: ILatecomer[];
}

export default function LatecomersTable({ className = "", data }: Props) {
	const columns: ColumnDef<ILatecomer>[] = [
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
			key: "timein",
			header: <span>Time In</span>,
			cell: (props) => (
				<span className="bg-red-100 text-red-500 rounded-xl px-2.5 py-1">{props.timein}</span>
			),
		},
	];
	return (
		<Card className={`shadow-none border ${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Latecomers Today</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<ILatecomer>> {
						return Promise.resolve({
							count: data.length,
							next: null,
							previous: null,
							results: data,
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
