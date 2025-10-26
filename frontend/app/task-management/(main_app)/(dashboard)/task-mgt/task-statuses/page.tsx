"use client";

import type { ITaskStatus, ITaskStandAloneStatuses } from "@/types/project.type";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Tag, Edit, Trash2, Search, MoreVertical, Eye } from "lucide-react";

import { selectSelectedInstitution } from "@/store/auth/selectors-context-aware";
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
import { TASK_STATUS_API } from "@/lib/utils";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { TaskStatusDialog } from "@/components/common/dialogs/task-statuses-dialog";
import { PERMISSION_CODES } from "@/constants";
import { ProtectedComponent } from "@/platform/v1/components";
import { hasPermission } from "@/lib/helpers";
import RichTextDisplay from "@/components/common/rich-text-display";

const transformTaskStandAloneToTaskStatus = (item: ITaskStandAloneStatuses): ITaskStatus => ({
	id: item.id,
	created_at: item.created_at,
	updated_at: item.updated_at,
	deleted_at: item.deleted_at,
	is_active: item.is_active === "true" || item.is_active === "1",
	approval_status: item.approval_status,
	name: item.name,
	description: item.description,
	weight: item.weight,
	color_code: item.color_code,
	created_by: item.created_by,
	updated_by: item.updated_by,
	institution: item.institution || 0,
	task: item.task || 0,
});

export default function TaskStatusPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [searchTerm, setSearchTerm] = useState("");
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [editingStatus, setEditingStatus] = useState<ITaskStatus | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [statusToDelete, setStatusToDelete] = useState<ITaskStatus | null>(null);
	const router = useModuleNavigation();

	const openCreateDialog = () => {
		setEditingStatus(null);
		setOpenDialog(true);
	};

	const openEditDialog = (status: ITaskStatus) => {
		setEditingStatus(status);
		setOpenDialog(true);
	};

	const closeDialog = () => {
		setOpenDialog(false);
		setEditingStatus(null);
	};

	const handleSaveComplete = () => {
		tableRefreshRef.current?.();
		closeDialog();
	};

	const openViewDetails = (status: ITaskStatus) => {
		router.push(`/task-mgt/task-statuses/${status.id}`);
	};

	const handleDeleteClick = (status: ITaskStatus) => {
		setStatusToDelete(status);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!statusToDelete) return;

		try {
			setDeleting(true);
			await TASK_STATUS_API.delete({ task_status_id: statusToDelete.id });
			tableRefreshRef.current?.();
			showSuccessToast("Task status deleted successfully!");
		} catch (e: any) {
			showErrorToast({
				error: e,
				defaultMessage: "Failed to delete task status",
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
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
				<div className="space-y-1 sm:space-y-2">
					<h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight ml-0 sm:ml-4">
						Task Statuses
					</h1>
					<p className="text-muted-foreground text-xs sm:text-sm ml-0 sm:ml-4">
						Manage task status types for your organization
					</p>
				</div>
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_TASK_STATUSES}>
					<Button onClick={openCreateDialog} className="w-full sm:w-auto text-xs sm:text-sm">
						<Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
						Create Task Status
					</Button>
				</ProtectedComponent>
			</div>

			{/* Search */}
			<div className="mb-4 sm:mb-6">
				<div className="relative w-full sm:max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search task statuses..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
					/>
				</div>
			</div>

			{/* Statuses Table */}
			<PaginatedTable<ITaskStatus>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");

					const response = await TASK_STATUS_API.getPaginatedTaskStatuses({
						search: searchTerm || undefined,
					});

					return {
						...response,
						results: response.results.map(transformTaskStandAloneToTaskStatus),
					};
				}}
				fetchFromUrl={async ({ url }: { url: string }) => {
					const response = await TASK_STATUS_API.getPaginatedTaskStatusesFromUrl({ url });

					return {
						...response,
						results: response.results.map(transformTaskStandAloneToTaskStatus),
					};
				}}
				deps={[currentInstitution?.id, searchTerm]}
				className="w-full max-w-full overflow-x-auto bg-white"
				tableClassName="min-w-[600px] sm:min-w-[800px] [&_th]:border-0 [&_td]:border-0"
				columns={[
					{
						key: "name",
						header: <span className="text-xs sm:text-sm">Name</span>,
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
									{status.name}
								</Badge>
							);
						},
					},
					{
						key: "description",
						header: <span className="text-xs sm:text-sm">Description</span>,
						cell: (status) => (
							<div className="text-xs sm:text-sm text-muted-foreground max-w-xs truncate">
								<RichTextDisplay
									htmlContent={status.description || ""}
									className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3"
								/>
							</div>
						),
					},
					{
						key: "weight",
						header: <span className="text-xs sm:text-sm">Weight</span>,
						cell: (status) => (
							<Badge variant="outline" className="text-xs sm:text-sm">
								{status.weight || "—"}
							</Badge>
						),
					},
					{
						key: "is_active",
						header: <span className="text-xs sm:text-sm">Status</span>,
						cell: (status) => (
							<Badge
								variant={status.is_active ? "default" : "secondary"}
								className="text-xs sm:text-sm"
							>
								{status.is_active ? "Active" : "Inactive"}
							</Badge>
						),
					},
					{
						key: "created_at",
						header: <span className="text-xs sm:text-sm">Created</span>,
						cell: (status) => (
							<div className="text-xs sm:text-sm text-muted-foreground">
								{new Date(status.created_at).toLocaleDateString()}
							</div>
						),
					},
					{
						key: "actions",
						header: <span className="text-xs sm:text-sm">Actions</span>,
						className: "w-[50px] sm:w-[60px]",
						cell: (status) => {
							const canView = hasPermission(PERMISSION_CODES.CAN_VIEW_TASK_STATUSES);
							const canEdit = hasPermission(PERMISSION_CODES.CAN_EDIT_TASK_STATUSES);
							const canDelete = hasPermission(PERMISSION_CODES.CAN_DELETE_TASK_STATUSES);

							const hasAnyPermission = canView || canEdit || canDelete;
							if (!hasAnyPermission) return null;

							return (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{canView && (
											<DropdownMenuItem
												onClick={() => openViewDetails(status)}
												className="text-xs sm:text-sm"
											>
												<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
												View Details
											</DropdownMenuItem>
										)}
										{canEdit && (
											<DropdownMenuItem
												onClick={() => openEditDialog(status)}
												className="text-xs sm:text-sm"
											>
												<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
												Edit
											</DropdownMenuItem>
										)}
										{canDelete && (
											<DropdownMenuItem
												onClick={() => handleDeleteClick(status)}
												className="text-destructive focus:text-destructive text-xs sm:text-sm"
											>
												<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
												Delete
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							);
						},
					},
				]}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-8 sm:py-12">
						<Tag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
						<h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
							{searchTerm ? "No statuses found" : "No task statuses yet"}
						</h3>
						<p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
							{searchTerm
								? "Try adjusting your search terms"
								: "Create your first task status to get started"}
						</p>
						{!searchTerm && (
							<Button onClick={openCreateDialog} className="text-xs sm:text-sm">
								<Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
								Create Status
							</Button>
						)}
					</div>
				}
			/>

			{/* Create/Edit Dialog */}
			<TaskStatusDialog
				open={openDialog}
				onOpenChange={closeDialog}
				onSave={handleSaveComplete}
				initialData={editingStatus}
			/>

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDelete}
				onConfirm={confirmDelete}
				title="Delete Task Status"
				description={`Are you sure you want to delete "${statusToDelete?.name}"? This action cannot be undone and may affect existing tasks.`}
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
