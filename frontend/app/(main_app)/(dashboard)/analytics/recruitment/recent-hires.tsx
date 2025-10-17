import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/helpers";
import { IPaginatedResponse, IRecentHire } from "@/types/types.utils";

interface IRecentHireProps {
	className?: string;
	data: IRecentHire[];
}

export default function RecentHiresTable({ className = "", data }: IRecentHireProps) {
	const fullColumns: ColumnDef<IRecentHire>[] = [
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
				<span className="bg-green-100 text-green-500 rounded-xl px-4 py-2 text-sm">
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

	const mobileColumns: ColumnDef<IRecentHire>[] = [
		{
			key: "name",
			header: <span className="text-sm">Employee</span>,
			cell: (props) => (
				<div className="flex flex-col gap-1">
					<span className="font-medium text-slate-900">{props.name}</span>
					<span className="text-xs text-slate-500">{props.position}</span>
					<span className="text-xs text-slate-400">{props.department}</span>
					<span className="bg-green-100 text-green-500 rounded-lg px-2 py-1 text-xs w-fit mt-1">
						{props.status[0].toLocaleUpperCase() + props.status.slice(1)}
					</span>
				</div>
			),
		},
		{
			key: "date",
			header: <span className="text-sm">Joined</span>,
			cell: (props) => (
				<span className="text-sm text-slate-600">{formatDate(props.date_of_joining)}</span>
			),
		},
	];

	const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
	const columns = isMobile ? mobileColumns : fullColumns;

	return (
		<Card className={`${className}`}>
			<CardTitle className="text-lg sm:text-xl flex-grow p-3 sm:p-4">Recent Hires</CardTitle>
			<CardContent className="p-3 sm:p-0">
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
