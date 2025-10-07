import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/helpers";
import { IPaginatedResponse, IRecentHire } from "@/types/types.utils";

interface IRecentHireProps {
	className?: string;
	data: IRecentHire[];
}

export default function RecentHiresTable({ className = "", data }: IRecentHireProps) {
	const columns: ColumnDef<IRecentHire>[] = [
		{
			key: "name",
			header: <span>Name</span>,
			cell: (props) => <span>{props.name}</span>,
		},
		{
			key: "role",
			header: <span>Position</span>,
			cell: (props) => <span>{props.position}</span>,
		},
		{
			key: "department",
			header: <span>Department</span>,
			cell: (props) => <span>{props.department}</span>,
		},
		{
			key: "status",
			header: <span>Status</span>,
			cell: (props) => (
				<span className="bg-green-100 text-green-500 rounded-xl px-4 py-2">
					{props.status[0].toLocaleUpperCase() + props.status.slice(1)}
				</span>
			),
		},
		{
			key: "date",
			header: <span>Date</span>,
			cell: (props) => <span>{formatDate(props.date_of_joining)}</span>,
		},
	];
	return (
		<Card className={`${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Recent Hires</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					paginated={false}
					skeletonRows={5}
					columns={columns}
					emptyState={"No recent hires"}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<IRecentHire>> {
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
