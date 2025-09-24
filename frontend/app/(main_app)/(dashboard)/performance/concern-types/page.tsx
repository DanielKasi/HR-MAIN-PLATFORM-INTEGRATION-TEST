"use client";

import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Search, Plus } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { PERFORMANCE_CONCERN_TYPE_API } from "@/lib/api/performance.utils";
import type { IPerformanceConcernType } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import { PerformanceConcernTypeCreateEditDialog } from "./_components/performance-concern-type-create-edit-dialog";

export default function PerformanceConcernTypeListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedConcernType, setSelectedConcernType] = useState<IPerformanceConcernType | null>(
		null,
	);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [concernTypeToDelete, setConcernTypeToDelete] = useState<IPerformanceConcernType | null>(
		null,
	);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!concernTypeToDelete) return;
		try {
			setDeleting(true);
			await PERFORMANCE_CONCERN_TYPE_API.delete({ concernTypeId: concernTypeToDelete.id });
			showSuccessToast("Performance concern type deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete performance concern type" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setConcernTypeToDelete(null);
		}
	};

	const openEditDialog = (concernType: IPerformanceConcernType) => {
		setSelectedConcernType(concernType);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (concernType: IPerformanceConcernType) => {
		setSelectedConcernType(concernType);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<IPerformanceConcernType>[] = [
		{
			key: "name",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Name</span>
					<Button
						onClick={() => setOrdering((prev) => (prev === "name" ? "-name" : "name"))}
						size="sm"
						variant={ordering.includes("name") ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (concernType) => concernType.name,
		},
		{
			key: "description",
			header: "Description",
			cell: (concernType) =>
				concernType.description?.substring(0, 50) +
					(concernType.description && concernType.description.length > 50 ? "..." : "") ||
				"Unknown",
		},
		{
			key: "approval_status",
			header: "Approval Status",
			cell: (concernType) => (
				<Badge variant={concernType.approval_status === "active" ? "default" : "secondary"}>
					{concernType.approval_status || "Unknown"}
				</Badge>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (concernType) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(concernType)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(concernType)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setConcernTypeToDelete(concernType);
								setDeleteConfirmOpen(true);
							}}
							className="text-red-600"
						>
							<Trash2 className="h-4 w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Performance Concern Types</h1>
				<div className="flex items-center justify-end gap-4">
					<Button onClick={() => setOpenCreateEditDialog(true)} className="rounded-xl">
						<Plus className="h-4 w-4 mr-2" />
						Create Concern Type
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search concern types..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<IPerformanceConcernType>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await PERFORMANCE_CONCERN_TYPE_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
						institutionId: currentInstitution.id,
					});
				}}
				fetchFromUrl={PERFORMANCE_CONCERN_TYPE_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({
						error: err,
						defaultMessage: "Failed to fetch performance concern types",
					})
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No performance concern types found</p>
					</div>
				}
			/>

			{selectedConcernType && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedConcernType(null);
					}}
					title={`Concern Type Details: ${selectedConcernType.name}`}
					description="View the details for this performance concern type."
					onRefresh={() => tableRefreshRef.current?.()}
				>
					<div className="space-y-4 overflow-y-auto max-h-[60svh]">
						<div>
							<label className="text-sm font-medium">Name</label>
							<p>{selectedConcernType.name}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Description</label>
							<p>{selectedConcernType.description || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Approval Status</label>
							<p>{selectedConcernType.approval_status || "Unknown"}</p>
						</div>
					</div>
				</ApprovableDialog>
			)}

			<PerformanceConcernTypeCreateEditDialog
				open={openCreateEditDialog}
				onOpenChange={setOpenCreateEditDialog}
				selectedConcernType={selectedConcernType}
				onSuccess={() => {
					if (tableRefreshRef.current) tableRefreshRef.current();
					setSelectedConcernType(null);
				}}
			/>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Performance Concern Type"
				description="Are you sure you want to delete this performance concern type? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
