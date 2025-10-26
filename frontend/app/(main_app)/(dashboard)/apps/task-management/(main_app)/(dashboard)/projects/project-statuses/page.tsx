"use client";

import type { IProjectStatus } from "@/types/project.type";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Tag, Edit, Trash2, Search, MoreVertical, Eye, ArrowLeft } from "lucide-react";
import { selectSelectedInstitution } from "@/lib/modules/task-management/selectors";
import { PaginatedTable } from "@/components/PaginatedTable";
import { Input } from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import { PROJECT_STATUS_API } from "@/lib/utils";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { PERMISSION_CODES } from "@/constants";
import { ProtectedComponent } from "@/platform/v1/components";
import { hasPermission } from "@/lib/helpers";
import RichTextDisplay from "@/components/common/rich-text-display";
import { ProjectStatusDialog } from "./_components/project-status-create-edit-dialog";

export default function ProjectStatusPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [searchTerm, setSearchTerm] = useState("");
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [statusToDelete, setStatusToDelete] = useState<IProjectStatus | null>(null);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<IProjectStatus | null>(null);
	const router = useModuleNavigation("/apps/task-management");

	const openCreateDialog = () => {
		setSelectedStatus(null);
		setDialogOpen(true);
	};

	const openEditDialog = (status: IProjectStatus) => {
		setSelectedStatus(status);
		setDialogOpen(true);
	};

	const openViewDetails = (status: IProjectStatus) => {
		router.push(`/projects/project-statuses/${status.id}`);
	};

	const handleDeleteClick = (status: IProjectStatus) => {
		setStatusToDelete(status);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!statusToDelete) return;

		try {
			setDeleting(true);
			await PROJECT_STATUS_API.delete({ project_status_id: statusToDelete.id });
			tableRefreshRef.current?.();
			showSuccessToast("Project status deleted successfully!");
		} catch (e: any) {
			showErrorToast({
				error: e,
				defaultMessage: "Failed to delete project status",
			});
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setStatusToDelete(null);
		}
	};

	const cancelDelete = () => {
		setDeleteConfirmOpen(false);
		setStatusToDelete(null);
	};

	return (
		<div className="p-4 sm:p-6 bg-white rounded-xl">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							className="rounded-full aspect-square"
							onClick={() => router.push("/projects")}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight">Project Statuses</h1>
					</div>
					<p className="text-muted-foreground text-xs sm:text-sm ml-10 sm:ml-14">
						Manage project status types for your organization
					</p>
				</div>
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PROJECT_STATUSES}>
					<Button onClick={openCreateDialog} className="w-full sm:w-auto text-xs sm:text-sm">
						<Plus className="h-4 w-4 mr-2" />
						Create Project Status
					</Button>
				</ProtectedComponent>
			</div>

			{/* Search */}
			<div className="mb-4 sm:mb-6">
				<div className="relative max-w-full sm:max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search project statuses..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10 text-xs sm:text-sm"
					/>
				</div>
			</div>

			{/* Statuses Table */}
			<PaginatedTable<IProjectStatus>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");

					return await PROJECT_STATUS_API.getPaginatedProjectStatuses({
						search: searchTerm || undefined,
					});
				}}
				fetchFromUrl={PROJECT_STATUS_API.getPaginatedProjectStatusesFromUrl}
				deps={[currentInstitution?.id, searchTerm]}
				className="w-full max-w-full overflow-x-auto bg-white"
				tableClassName="min-w-[600px] sm:min-w-[800px] [&_th]:border-0 [&_td]:border-0"
				columns={[
					{
						key: "Status Name",
						header: <span className="text-xs sm:text-sm">Status Name</span>,
						cell: (status) => {
							const backgroundColor = status.color_code?.trim() || "#64748b";
							return (
								<Badge
									style={{
										backgroundColor: `${backgroundColor}30`,
										color: backgroundColor,
										border: `1.5px solid ${backgroundColor}`,
									}}
									className="font-medium text-xs sm:text-sm"
								>
									{status.status_name}
								</Badge>
							);
						},
					},
					{
						key: "description",
						header: "Description",
						cell: (status) => (
							<div className="text-xs sm:text-sm text-muted-foreground max-w-[200px] sm:max-w-xs truncate">
								<RichTextDisplay
									htmlContent={status.description || "—"}
									className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3"
								/>
							</div>
						),
					},
					{
						key: "is_active",
						header: "Status",
						cell: (status) => (
							<Badge
								className={`text-xs ${
									status.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
								}`}
							>
								{status.is_active ? "Active" : "Inactive"}
							</Badge>
						),
					},

					{
						key: "created_at",
						header: "Created",
						cell: (status) => (
							<div className="text-xs sm:text-sm text-muted-foreground">
								{new Date(status.created_at).toLocaleDateString()}
							</div>
						),
					},
					{
						key: "actions",
						header: "Actions",
						className: "w-[50px]",
						cell: (status) => {
							const canView = hasPermission(PERMISSION_CODES.CAN_VIEW_PROJECT_STATUSES);
							const canEdit = hasPermission(PERMISSION_CODES.CAN_EDIT_PROJECT_STATUSES);
							const canDelete = hasPermission(PERMISSION_CODES.CAN_DELETE_PROJECT_STATUSES);

							const hasAnyPermission = canView || canEdit || canDelete;

							if (!hasAnyPermission) return null;

							return (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_PROJECT_STATUSES}>
											<DropdownMenuItem onClick={() => openViewDetails(status)}>
												<Eye className="h-4 w-4 mr-2" />
												View Details
											</DropdownMenuItem>
										</ProtectedComponent>
										<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_PROJECT_STATUSES}>
											<DropdownMenuItem onClick={() => openEditDialog(status)}>
												<Edit className="h-4 w-4 mr-2" />
												Edit
											</DropdownMenuItem>
										</ProtectedComponent>
										<ProtectedComponent
											permissionCode={PERMISSION_CODES.CAN_DELETE_PROJECT_STATUSES}
										>
											<DropdownMenuItem
												onClick={() => handleDeleteClick(status)}
												className="text-destructive focus:text-destructive"
											>
												<Trash2 className="h-4 w-4 mr-2" />
												Delete
											</DropdownMenuItem>
										</ProtectedComponent>
									</DropdownMenuContent>
								</DropdownMenu>
							);
						},
					},
				]}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-8 sm:py-12">
						<Tag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-base sm:text-lg font-semibold mb-2">
							{searchTerm ? "No statuses found" : "No project statuses yet"}
						</h3>
						<p className="text-muted-foreground text-xs sm:text-sm mb-4">
							{searchTerm
								? "Try adjusting your search terms"
								: "Create your first project status to get started"}
						</p>
						{!searchTerm && (
							<Button onClick={openCreateDialog} className="text-xs sm:text-sm">
								<Plus className="h-4 w-4 mr-2" />
								Create Status
							</Button>
						)}
					</div>
				}
			/>

			<ProjectStatusDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				initialData={selectedStatus}
				onSuccess={() => {
					tableRefreshRef.current?.();
				}}
			/>

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDelete}
				onConfirm={confirmDelete}
				title="Delete Project Status"
				description={`Are you sure you want to delete "${statusToDelete?.status_name}"? This action cannot be undone and may affect existing projects.`}
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
