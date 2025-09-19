import { ColumnDef, PaginatedTable } from "@/components/common/tables/paginated-table";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface IRecentHire {
	name: string;
	role: string;
	department: string;
	status: "active";
	created_at: string;
}

export default function RecentHiresTable() {
	const columns: ColumnDef<IRecentHire>[] = [
		{
			key: "name",
			header: <span>Name</span>,
			cell: (props) => <span>{props.name}</span>,
		},
		{
			key: "role",
			header: <span>Role</span>,
			cell: (props) => <span>{props.role}</span>,
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
			cell: (props) => <span>{props.created_at}</span>,
		},
	];
	return (
		<Card>
			<CardTitle className="text-xl flex-grow p-4">Recent Hires</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<IRecentHire>> {
						return Promise.resolve({
							count: 20,
							next: "21",
							previous: "0",
							results: new Array(5).fill(null).map(() => ({
								name: "Musoke Paul",
								role: "Accountant",
								department: "Finance",
								status: "active",
								created_at: new Date().toDateString(),
							})),
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
