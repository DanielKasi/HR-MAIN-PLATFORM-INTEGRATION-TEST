"use client";

import { Edit, Eye, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IKeyResult } from "@/types/types.utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { KEY_RESULTS_API } from "@/lib/utils";

interface KeyResultsTableProps {
	refreshFunctionRef?: React.RefObject<(() => void) | null>;
	searchTerm: string;
	onView: (keyResult: IKeyResult) => void;
	onEdit: (keyResult: IKeyResult) => void;
	onDelete: (keyResult: IKeyResult) => void;
	onAdd: () => void;
}

export function KeyResultsTable({
	refreshFunctionRef,
	searchTerm,
	onView,
	onEdit,
	onDelete,
	onAdd,
}: KeyResultsTableProps) {
	const columns: ColumnDef<IKeyResult>[] = [
		{
			key: "title",
			header: "Title",
			cell: (keyResult) => keyResult.title,
		},
		{
			key: "description",
			header: "Description",
			cell: (keyResult) => keyResult.description,
		},
		{
			key: "progress_type",
			header: "Progress Type",
			cell: (keyResult) => (
				<Badge variant={keyResult.progress_type === "percentage" ? "default" : "secondary"}>
					{keyResult.progress_type}
				</Badge>
			),
		},
		{
			key: "target_value",
			header: "Target Value",
			cell: (keyResult) => keyResult.target_value,
		},
		{
			key: "actions",
			header: "Actions",
			cell: (keyResult) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" /> 
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={() => onView(keyResult)}>
							<Eye className="h-4 w-4 mr-2" /> View
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onEdit(keyResult)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onDelete(keyResult)} className="text-red-600">
							<Trash2 className="h-4 w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<>
			<PaginatedTable<IKeyResult>
				fetchFirstPage={async () =>
					await KEY_RESULTS_API.getPaginated({ page: 1, search: searchTerm })
				}
				fetchFromUrl={KEY_RESULTS_API.getPaginatedFromUrl}
				deps={[searchTerm]}
				className="space-y-4"
				tableClassName="min-w-[800px]"
				footerClassName="pt-4"
				columns={columns}
				skeletonRows={5}
				refreshRef={refreshFunctionRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No key results found</p>
					</div>
				}
			/>
		</>
	);
}
