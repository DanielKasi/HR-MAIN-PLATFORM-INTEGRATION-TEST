import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
}

interface IRecentAssets {
	name: string;
	category: string;
	status: "active";
}

export default function RecentAssetsTable({ className = "" }: Props) {
	const columns: ColumnDef<IRecentAssets>[] = [
		{
			key: "name",
			header: <span>Name</span>,
			cell: (props) => <span>{props.name}</span>,
		},
		{
			key: "role",
			header: <span>Category</span>,
			cell: (props) => <span>{props.category}</span>,
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
	];
	return (
		<Card className={`${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Recent Hires</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<IRecentAssets>> {
						return Promise.resolve({
							count: 20,
							next: "21",
							previous: "0",
							results: new Array(5).fill(null).map(() => ({
								name: "John Doe",
								category: "Finance",
								status: "active",
							})),
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
