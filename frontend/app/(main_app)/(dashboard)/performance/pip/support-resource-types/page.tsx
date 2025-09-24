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
import { PIP_SUPPORT_RESOURCE_TYPE_API } from "@/lib/api/performance.utils";
import type { IPIPSupportResourceType } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import { PIPSupportResourceTypeCreateEditDialog } from "./_components/pip-support-resource-type-create-edit-dialog";
import Link from "next/link";

export default function PIPSupportResourceTypeListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedResourceType, setSelectedResourceType] = useState<IPIPSupportResourceType | null>(
		null,
	);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [resourceTypeToDelete, setResourceTypeToDelete] = useState<IPIPSupportResourceType | null>(
		null,
	);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!resourceTypeToDelete) return;
		try {
			setDeleting(true);
			await PIP_SUPPORT_RESOURCE_TYPE_API.delete({ resourceTypeId: resourceTypeToDelete.id });
			showSuccessToast("Support resource type deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete support resource type" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setResourceTypeToDelete(null);
		}
	};

	const openEditDialog = (resourceType: IPIPSupportResourceType) => {
		setSelectedResourceType(resourceType);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (resourceType: IPIPSupportResourceType) => {
		setSelectedResourceType(resourceType);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<IPIPSupportResourceType>[] = [
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
			cell: (resourceType) => resourceType.name,
		},
		{
			key: "description",
			header: "Description",
			cell: (resourceType) =>
				resourceType.description?.substring(0, 50) +
					(resourceType.description && resourceType.description.length > 50 ? "..." : "") ||
				"Unknown",
		},
		{
			key: "approval_status",
			header: "Approval Status",
			cell: (resourceType) => (
				<Badge variant={resourceType.approval_status === "active" ? "default" : "secondary"}>
					{resourceType.approval_status || "Unknown"}
				</Badge>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (resourceType) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(resourceType)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(resourceType)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setResourceTypeToDelete(resourceType);
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
				<h1 className="text-2xl font-bold">Support Resource Types</h1>
				<div className="flex items-center justify-end gap-4">
					<Button onClick={() => setOpenCreateEditDialog(true)} className="rounded-xl">
						<Plus className="h-4 w-4 mr-2" />
						Create Resource Type
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search resource types..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<IPIPSupportResourceType>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await PIP_SUPPORT_RESOURCE_TYPE_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
						institutionId: currentInstitution.id,
					});
				}}
				fetchFromUrl={PIP_SUPPORT_RESOURCE_TYPE_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch support resource types" })
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No support resource types found</p>
					</div>
				}
			/>

			{selectedResourceType && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedResourceType(null);
					}}
					title={`Resource Type Details: ${selectedResourceType.name}`}
					description="View the details for this support resource type."
					onRefresh={() => tableRefreshRef.current?.()}
				>
					<div className="space-y-4 overflow-y-auto max-h-[60svh]">
						<div>
							<label className="text-sm font-medium">Name</label>
							<p>{selectedResourceType.name}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Description</label>
							<p>{selectedResourceType.description || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Approval Status</label>
							<p>{selectedResourceType.approval_status || "Unknown"}</p>
						</div>
					</div>
				</ApprovableDialog>
			)}

			<PIPSupportResourceTypeCreateEditDialog
				open={openCreateEditDialog}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedResourceType(null);
					}
					setOpenCreateEditDialog(open);
				}}
				selectedResourceType={selectedResourceType}
				onSuccess={() => {
					if (tableRefreshRef.current) tableRefreshRef.current();
					setSelectedResourceType(null);
				}}
			/>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Support Resource Type"
				description="Are you sure you want to delete this support resource type? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
