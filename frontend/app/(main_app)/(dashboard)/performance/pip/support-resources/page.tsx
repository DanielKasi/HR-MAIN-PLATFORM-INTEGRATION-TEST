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
import { PIP_SUPPORT_RESOURCE_API } from "@/lib/api/performance.utils";
import type { IPIPSupportResource } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import { PIPSupportResourceCreateEditDialog } from "./_components/pip-support-resource-create-edit-dialog";
import Link from "next/link";

export default function PIPSupportResourceListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedResource, setSelectedResource] = useState<IPIPSupportResource | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [resourceToDelete, setResourceToDelete] = useState<IPIPSupportResource | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!resourceToDelete) return;
		try {
			setDeleting(true);
			await PIP_SUPPORT_RESOURCE_API.delete({ resourceId: resourceToDelete.id });
			showSuccessToast("Support resource deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete support resource" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setResourceToDelete(null);
		}
	};

	const openEditDialog = (resource: IPIPSupportResource) => {
		setSelectedResource(resource);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (resource: IPIPSupportResource) => {
		setSelectedResource(resource);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<IPIPSupportResource>[] = [
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
			cell: (resource) => resource.name,
		},
		{
			key: "type",
			header: "Resource Type",
			cell: (resource) => resource.type?.name || "Unknown",
		},
		{
			key: "description",
			header: "Description",
			cell: (resource) =>
				resource.description?.substring(0, 50) +
					(resource.description && resource.description.length > 50 ? "..." : "") || "Unknown",
		},
		{
			key: "approval_status",
			header: "Approval Status",
			cell: (resource) => (
				<Badge variant={resource.approval_status === "active" ? "default" : "secondary"}>
					{resource.approval_status || "Unknown"}
				</Badge>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (resource) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(resource)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(resource)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setResourceToDelete(resource);
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
				<h1 className="text-2xl font-bold">Support Resources</h1>
				<div className="flex items-center justify-end gap-4">
					<Button onClick={() => setOpenCreateEditDialog(true)} className="rounded-xl">
						<Plus className="h-4 w-4 mr-2" />
						Create Resource
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search resources..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<IPIPSupportResource>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await PIP_SUPPORT_RESOURCE_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
						institutionId: currentInstitution.id,
					});
				}}
				fetchFromUrl={PIP_SUPPORT_RESOURCE_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch support resources" })
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No support resources found</p>
					</div>
				}
			/>

			{selectedResource && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedResource(null);
					}}
					title={`Resource Details: ${selectedResource.name}`}
					description="View the details for this support resource."
					onRefresh={() => tableRefreshRef.current?.()}
				>
					<div className="space-y-4 overflow-y-auto max-h-[60svh]">
						<div>
							<label className="text-sm font-medium">Name</label>
							<p>{selectedResource.name}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Resource Type</label>
							<p>{selectedResource.type?.name || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Description</label>
							<p>{selectedResource.description || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Approval Status</label>
							<p>{selectedResource.approval_status || "Unknown"}</p>
						</div>
					</div>
				</ApprovableDialog>
			)}

			<PIPSupportResourceCreateEditDialog
				open={openCreateEditDialog}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedResource(null);
					}
					setOpenCreateEditDialog(open);
				}}
				selectedResource={selectedResource}
				onSuccess={() => {
					if (tableRefreshRef.current) tableRefreshRef.current();
					setSelectedResource(null);
				}}
			/>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Support Resource"
				description="Are you sure you want to delete this support resource? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
