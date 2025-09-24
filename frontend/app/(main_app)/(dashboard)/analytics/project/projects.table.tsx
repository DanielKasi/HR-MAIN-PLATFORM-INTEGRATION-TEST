import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
}

interface Project {
	name: string;
	start_date: string;
	end_date: string;
	progress: number;
	status: string;
}

export default function ProjectsTable({ className = "" }: Props) {
	const columns: ColumnDef<Project>[] = [
		{
			key: "name",
			header: <span>Name</span>,
			cell: (props) => <span>{props.name}</span>,
		},
		{
			key: "start_date",
			header: <span>Start Date</span>,
			cell: (props) => <span>{props.start_date}</span>,
		},
		{
			key: "end_date",
			header: <span>End Date</span>,
			cell: (props) => <span>{props.end_date}</span>,
		},
		{
			key: "progress",
			header: <span>Progress</span>,
			cell: (props) => <span>{props.progress}%</span>,
		},
		{
			key: "status",
			header: <span>Status</span>,
			cell: (props) => (
				<span className="bg-green-100 text-green-500 rounded-xl px-2.5 py-1">{props.status}</span>
			),
		},
	];
	return (
		<Card className={`shadow-none border ${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Recent Projects</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<Project>> {
						return Promise.resolve({
							count: 20,
							next: "21",
							previous: "0",
							results: new Array(5).fill(null).map(() => ({
								name: "Mobile App Development",
								start_date: "Feb 12, 2025",
								end_date: "Dec 1, 2025",
								progress: 30,
								status: "In Progress",
							})),
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
