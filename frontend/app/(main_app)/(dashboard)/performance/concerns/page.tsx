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
import { PERFORMANCE_CONCERN_API } from "@/lib/api/performance.utils";
import type { IPerformanceConcern } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import { PerformanceConcernCreateEditDialog } from "./_components/performance-concern-create-edit-dialog";

export default function PerformanceConcernListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedConcern, setSelectedConcern] = useState<IPerformanceConcern | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [concernToDelete, setConcernToDelete] = useState<IPerformanceConcern | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!concernToDelete) return;
		try {
			setDeleting(true);
			await PERFORMANCE_CONCERN_API.delete({ concernId: concernToDelete.id });
			showSuccessToast("Performance concern deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete performance concern" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setConcernToDelete(null);
		}
	};

	const openEditDialog = (concern: IPerformanceConcern) => {
		setSelectedConcern(concern);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (concern: IPerformanceConcern) => {
		setSelectedConcern(concern);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<IPerformanceConcern>[] = [
		{
			key: "description",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Description</span>
					<Button
						onClick={() =>
							setOrdering((prev) => (prev === "description" ? "-description" : "description"))
						}
						size="sm"
						variant={ordering.includes("description") ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (concern) =>
				concern.description?.substring(0, 50) +
					(concern.description && concern.description.length > 50 ? "..." : "") || "Unknown",
		},
		{
			key: "category",
			header: "Category",
			cell: (concern) => concern.category?.name || "Unknown",
		},
		{
			key: "approval_status",
			header: "Approval Status",
			cell: (concern) => (
				<Badge variant={concern.approval_status === "active" ? "default" : "secondary"}>
					{concern.approval_status || "Unknown"}
				</Badge>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (concern) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(concern)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(concern)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setConcernToDelete(concern);
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
				<h1 className="text-2xl font-bold">Performance Concerns</h1>
				<div className="flex items-center justify-end gap-4">
					<Button onClick={() => setOpenCreateEditDialog(true)} className="rounded-xl">
						<Plus className="h-4 w-4 mr-2" />
						Create Concern
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search concerns..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<IPerformanceConcern>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await PERFORMANCE_CONCERN_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
						institutionId: currentInstitution.id,
					});
				}}
				fetchFromUrl={PERFORMANCE_CONCERN_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch performance concerns" })
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No performance concerns found</p>
					</div>
				}
			/>

			{selectedConcern && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedConcern(null);
					}}
					title={`Concern Details: ${selectedConcern.description?.substring(0, 30) + (selectedConcern.description?.length > 30 ? "..." : "")}`}
					description="View the details for this performance concern."
					onRefresh={() => tableRefreshRef.current?.()}
				>
					<div className="space-y-4 overflow-y-auto max-h-[60svh]">
						<div>
							<label className="text-sm font-medium">Description</label>
							<p>{selectedConcern.description || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Category</label>
							<p>{selectedConcern.category?.name || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Approval Status</label>
							<p>{selectedConcern.approval_status || "Unknown"}</p>
						</div>
					</div>
				</ApprovableDialog>
			)}

			<PerformanceConcernCreateEditDialog
				open={openCreateEditDialog}
				onOpenChange={setOpenCreateEditDialog}
				selectedConcern={selectedConcern}
				onSuccess={() => {
					if (tableRefreshRef.current) tableRefreshRef.current();
					setSelectedConcern(null);
				}}
			/>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Performance Concern"
				description="Are you sure you want to delete this performance concern? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
