import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
	data: IRecentAssets[];
}

interface IRecentAssets {
	id: number;
	asset_name: string;
	serial_number: string;
	batch_number: string;
	category: {
		category_name: string;
	} | null;
	status: string;
	description: string | null;
	created_at: string;
}

export default function RecentAssetsTable({ className = "", data }: Props) {
	const columns: ColumnDef<IRecentAssets>[] = [
		{
			key: "asset_name",
			header: <span>Asset Name</span>,
			cell: (props) => <span>{props.asset_name}</span>,
		},
		{
			key: "category",
			header: <span>Category</span>,
			cell: (props) => <span>{props.category?.category_name || "Unknown"}</span>,
		},
		{
			key: "status",
			header: <span>Status</span>,
			cell: (props) => (
				<span className="bg-green-100 text-green-500 rounded-xl px-4 py-2">
					{props.status.charAt(0).toUpperCase() + props.status.slice(1)}
				</span>
			),
		},
		{
			key: "serial_number",
			header: <span>Serial Number</span>,
			cell: (props) => <span>{props.serial_number}</span>,
		},
	];
	return (
		<Card className={`${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Recent Assets</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={() => {
						return Promise.resolve({
							count: data.length,
							next: null,
							previous: null,
							results: data,
						});
					}}
				/>
			</CardContent>
		</Card>
	);
}
