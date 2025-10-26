"use client";

import type { IProjectTaskPriority } from "@/types/project.type";
import { useState, useRef, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { Plus, Tag, Edit, Trash2, Search, MoreVertical, Eye } from "lucide-react";
import { debounce } from "lodash";
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
import { PROJECT_TASK_PRIORITY_API } from "@/lib/utils";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { ProjectTaskPriorityDialog } from "@/components/common/dialogs/create-project-task-priority-dilog";
import { hasPermission } from "@/lib/helpers";
import { PERMISSION_CODES } from "@/constants";
import { ProtectedComponent } from "@/platform/v1/components";
import RichTextDisplay from "@/components/common/rich-text-display";

export default function ProjectTaskPriorityPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [searchTerm, setSearchTerm] = useState("");
	const [inputValue, setInputValue] = useState("");
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [deleting, setDeleting] = useState(false);

	const [openDialog, setOpenDialog] = useState(false);
	const [editingStatus, setEditingStatus] = useState<IProjectTaskPriority | null>(null);

	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [statusToDelete, setStatusToDelete] = useState<IProjectTaskPriority | null>(null);

	const debouncedSearch = useMemo(
		() =>
			debounce((value: string) => {
				setSearchTerm(value);
			}, 300),
		[],
	);

	useEffect(() => {
		return () => {
			debouncedSearch.cancel();
		};
	}, [debouncedSearch]);
	const router = useModuleNavigation("/apps/task-management");

	const openCreateDialog = () => {
		setEditingStatus(null);
		setOpenDialog(true);
	};

	const openEditDialog = (status: IProjectTaskPriority) => {
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

	const openViewDetails = (status: IProjectTaskPriority) => {
		router.push(`/task-mgt/task-priority/${status.id}`);
	};

	const handleDeleteClick = (status: IProjectTaskPriority) => {
		setStatusToDelete(status);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!statusToDelete) return;

		try {
			setDeleting(true);
			await PROJECT_TASK_PRIORITY_API.delete({
				task_priority_id: statusToDelete.id,
			});
			tableRefreshRef.current?.();
			showSuccessToast("Task priority deleted successfully!");
		} catch (e: any) {
			showErrorToast({
				error: e,
				defaultMessage: "Failed to delete task priority",
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
		<div className="p-4 sm:p-6 bg-white rounded-xl overflow-x-hidden">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight sm:ml-4">
							Project Task Priority
						</h1>
					</div>
					<p className="text-xs sm:text-sm text-muted-foreground sm:ml-4">
						Manage project task priority types for your organization
					</p>
				</div>
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PROJECT_TASK_PRIORITY}>
					<Button onClick={openCreateDialog} className="w-full sm:w-auto">
						<Plus className="h-4 w-4 mr-2" />
						<span className="hidden sm:inline">Create Project Task Priority</span>
						<span className="sm:hidden">Create Priority</span>
					</Button>
				</ProtectedComponent>
			</div>

			{/* Search */}
			<div className="mb-4 sm:mb-6">
				<div className="relative w-full sm:max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search project task priority..."
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value);
							debouncedSearch(e.target.value);
						}}
						className="pl-10"
					/>
				</div>
			</div>

			{/* Statuses Table */}
			<PaginatedTable<IProjectTaskPriority>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");

					return await PROJECT_TASK_PRIORITY_API.getPaginatedProjectTaskPriority({
						search: searchTerm || undefined,
					});
				}}
				fetchFromUrl={PROJECT_TASK_PRIORITY_API.getPaginatedProjectTaskPriorityFromUrl}
				deps={[currentInstitution?.id, searchTerm]}
				className="w-full max-w-full overflow-x-auto bg-white"
				tableClassName="min-w-[800px] [&_th]:border-0 [&_td]:border-0"
				columns={[
					{
						key: "status_name",
						header: "Priority Name",
						cell: (status) => (
							<Badge
								style={{
									backgroundColor: `${status.color_code}30`,
									color: status.color_code,
									border: `1.5px solid ${status.color_code}`,
								}}
								className="font-medium text-xs sm:text-sm"
							>
								{status.name}
							</Badge>
						),
					},
					{
						key: "description",
						header: "Description",
						cell: (status) => (
							<div className="text-xs sm:text-sm text-muted-foreground max-w-xs truncate">
								<RichTextDisplay
									htmlContent={status.description || "—"}
									className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3"
								/>
							</div>
						),
					},
					{
						key: "weight",
						header: "Weight",
						cell: (status) => (
							<Badge variant="outline" className="text-xs">
								{status.weight || "—"}
							</Badge>
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
							const canView = hasPermission(PERMISSION_CODES.CAN_VIEW_PROJECT_TASK_PRIORITY);
							const canEdit = hasPermission(PERMISSION_CODES.CAN_EDIT_PROJECT_TASK_PRIORITY);
							const canDelete = hasPermission(PERMISSION_CODES.CAN_DELETE_PROJECT_TASK_PRIORITY);

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
										{canView && (
											<DropdownMenuItem onClick={() => openViewDetails(status)}>
												<Eye className="h-4 w-4 mr-2" />
												View Details
											</DropdownMenuItem>
										)}

										{canEdit && (
											<DropdownMenuItem onClick={() => openEditDialog(status)}>
												<Edit className="h-4 w-4 mr-2" />
												Edit
											</DropdownMenuItem>
										)}

										{canDelete && (
											<DropdownMenuItem
												onClick={() => handleDeleteClick(status)}
												className="text-destructive focus:text-destructive"
											>
												<Trash2 className="h-4 w-4 mr-2" />
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
					<div className="text-center py-8 sm:py-12 px-4">
						<Tag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-base sm:text-lg font-semibold mb-2">
							{searchTerm ? "No statuses found" : "No task priority yet"}
						</h3>
						<p className="text-xs sm:text-sm text-muted-foreground mb-4">
							{searchTerm
								? "Try adjusting your search terms"
								: "Create your first task priority to get started"}
						</p>
						{!searchTerm && (
							<Button onClick={openCreateDialog} className="w-full sm:w-auto">
								<Plus className="h-4 w-4 mr-2" />
								Create Project Task Priority
							</Button>
						)}
					</div>
				}
			/>
			<ProjectTaskPriorityDialog
				isOpen={openDialog}
				onClose={closeDialog}
				onSave={handleSaveComplete}
				initialData={editingStatus}
				//institutionId={currentInstitution?.id || 0}
			/>

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDelete}
				onConfirm={confirmDelete}
				title="Delete Task Priority"
				description={`Are you sure you want to delete "${statusToDelete?.name}"? This action cannot be undone and may affect existing priorities.`}
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
