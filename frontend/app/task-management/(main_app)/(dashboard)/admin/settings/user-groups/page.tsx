"use client";

import type { IUserGroup, IUserGroupFormData } from "@/types/approvals.types";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import {
	Plus,
	Users,
	Shield,
	Edit,
	Trash2,
	Search,
	MoreVertical,
	Eye,
	ArrowLeft,
} from "lucide-react";

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
import { USER_GROUPS_API } from "@/lib/api/approvals/utils";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { UserGroupDialog } from "@/components/common/dialogs/create-staff-groups-dialog";
import { ProtectedComponent } from "@/platform/v1/components";
import { PERMISSION_CODES } from "@/constants";
import RichTextDisplay from "@/components/common/rich-text-display";

export default function UserGroupsPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [searchTerm, setSearchTerm] = useState("");
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [editingGroup, setEditingGroup] = useState<IUserGroup | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [groupToDelete, setGroupToDelete] = useState<IUserGroup | null>(null);
	const router = useModuleNavigation();

	const openCreateDialog = () => {
		setEditingGroup(null);
		setOpenDialog(true);
	};

	const openEditDialog = (group: IUserGroup) => {
		setEditingGroup(group);
		setOpenDialog(true);
	};

	const closeDialog = () => {
		setOpenDialog(false);
		setEditingGroup(null);
	};

	const handleSaveComplete = () => {
		tableRefreshRef.current?.();
		closeDialog();
	};

	const openViewDetails = (group: IUserGroup) => {
		router.push(`/admin/settings/user-groups/${group.id}`);
	};

	const handleDeleteClick = (group: IUserGroup) => {
		setGroupToDelete(group);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!groupToDelete) return;

		try {
			setDeleting(true);
			await USER_GROUPS_API.delete({ id: groupToDelete.id });
			tableRefreshRef.current?.();
			showSuccessToast("User group deleted successfully!");
		} catch (e: any) {
			showErrorToast({
				error: e,
				defaultMessage: "Failed to delete user group",
			});
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setGroupToDelete(null);
		}
	};

	const cancelDelete = () => {
		setDeleteConfirmOpen(false);
		setGroupToDelete(null);
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
							onClick={() => router.push("/admin")}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight ml-2 sm:ml-4">
							Staff Groups
						</h1>
					</div>
					<p className="text-muted-foreground text-xs sm:text-sm ml-10 sm:ml-16">
						Manage groups of staffs and roles for approval workflows
					</p>
				</div>
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_STAFF_GROUPS}>
					<Button onClick={openCreateDialog} className="w-full sm:w-auto text-xs sm:text-sm">
						<Plus className="h-4 w-4 mr-2" />
						Create Group
					</Button>
				</ProtectedComponent>
			</div>

			{/* Search */}
			<div className="mb-4 sm:mb-6">
				<div className="relative max-w-full sm:max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search staff groups..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10 text-xs sm:text-sm"
					/>
				</div>
			</div>

			{/* Groups Table */}
			<PaginatedTable<IUserGroup>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");

					return await USER_GROUPS_API.fetchAll({
						search: searchTerm || undefined,
					});
				}}
				fetchFromUrl={USER_GROUPS_API.fetchFromUrl}
				deps={[currentInstitution?.id, searchTerm]}
				className="w-full max-w-full overflow-x-auto bg-white"
				tableClassName="min-w-[600px] sm:min-w-[800px] [&_th]:border-0 [&_td]:border-0"
				columns={[
					{
						key: "name",
						header: "Name & Description",
						cell: (group) => (
							<div>
								<div className="font-medium text-sm sm:text-base">{group.name}</div>
								{group.description && (
									<div className="text-xs sm:text-sm text-muted-foreground mt-1">
										<RichTextDisplay
											htmlContent={group.description}
											className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3"
										/>
									</div>
								)}
							</div>
						),
					},
					{
						key: "users",
						header: "Users",
						cell: (group) => (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Users className="h-4 w-4 text-blue-600" />
									<Badge variant="secondary" className="text-xs">
										{group.users.length}
									</Badge>
								</div>
								{group.users.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										<Badge variant="outline" className="text-xs">
											{group.users.length} user
											{group.users.length !== 1 ? "s" : ""} assigned
										</Badge>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">No users assigned</p>
								)}
							</div>
						),
					},
					{
						key: "roles",
						header: "Roles",
						cell: (group) => (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Shield className="h-4 w-4 text-orange-600" />
									<Badge variant="secondary" className="text-xs">
										{group.roles.length}
									</Badge>
								</div>
								{group.roles.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										<Badge variant="outline" className="text-xs">
											{group.roles.length} role
											{group.roles.length !== 1 ? "s" : ""} assigned
										</Badge>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">No roles assigned</p>
								)}
							</div>
						),
					},
					{
						key: "actions",
						header: "Actions",
						className: "w-[50px]",
						cell: (group) => (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_STAFF_GROUPS}>
										<DropdownMenuItem onClick={() => openViewDetails(group)}>
											<Eye className="h-4 w-4 mr-2" />
											View Details
										</DropdownMenuItem>
									</ProtectedComponent>
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_STAFF_GROUPS}>
										<DropdownMenuItem onClick={() => openEditDialog(group)}>
											<Edit className="h-4 w-4 mr-2" />
											Edit
										</DropdownMenuItem>
									</ProtectedComponent>
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_STAFF_GROUPS}>
										<DropdownMenuItem
											onClick={() => handleDeleteClick(group)}
											className="text-destructive focus:text-destructive"
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Delete
										</DropdownMenuItem>
									</ProtectedComponent>
								</DropdownMenuContent>
							</DropdownMenu>
						),
					},
				]}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-8 sm:py-12">
						<Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-base sm:text-lg font-semibold mb-2">
							{searchTerm ? "No groups found" : "No user groups yet"}
						</h3>
						<p className="text-muted-foreground text-xs sm:text-sm mb-4">
							{searchTerm
								? "Try adjusting your search terms"
								: "Create your first user group to get started"}
						</p>
						{!searchTerm && (
							<Button onClick={openCreateDialog} className="text-xs sm:text-sm">
								<Plus className="h-4 w-4 mr-2" />
								Create Group
							</Button>
						)}
					</div>
				}
			/>

			<UserGroupDialog
				isOpen={openDialog}
				onClose={closeDialog}
				onSave={handleSaveComplete}
				initialData={editingGroup}
			/>

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDelete}
				onConfirm={confirmDelete}
				title="Delete User Group"
				description={`Are you sure you want to delete "${groupToDelete?.name}"? This action cannot be undone and may affect existing approval workflows.`}
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
