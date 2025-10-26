import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/platform/v1/components";
import { IPaginatedResponse } from "@/types/types.utils";
import { RecentProject } from "@/types/project.type";
import { formatDate } from "@/lib/helpers";

interface Props {
	className?: string;
	projects: RecentProject[];
}

export default function ProjectsTable({ className = "", projects }: Props) {
	const columns: ColumnDef<RecentProject>[] = [
		{
			key: "name",
			header: <span>Name</span>,
			cell: (props) => <span>{props.name}</span>,
		},
		{
			key: "start_date",
			header: <span>Start Date</span>,
			cell: (props) => <span>{formatDate(props.start_date)}</span>,
		},
		{
			key: "end_date",
			header: <span>End Date</span>,
			cell: (props) => <span>{formatDate(props.end_date)}</span>,
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
					paginated={false}
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={<div className="text-center py-8">No recent projects</div>}
					fetchFirstPage={() =>
						Promise.resolve({
							count: projects.length,
							next: null,
							previous: null,
							results: projects,
						})
					}
				/>
			</CardContent>
		</Card>
	);
}
