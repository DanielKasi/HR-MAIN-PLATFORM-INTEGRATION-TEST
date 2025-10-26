"use client";

import type { ApproverGroup, ApproverGroupFormData } from "@/types/approvals.types";

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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";
import { Textarea } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Separator } from "@/platform/v1/components";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import { APPROVER_GROUPS_API } from "@/lib/api/approvals/utils";
import RoleSearchableSelect from "@/components/selects/role-searchable-select";
import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { ProtectedComponent } from "@/platform/v1/components";
import { PERMISSION_CODES } from "@/constants";
import { RichTextEditor } from "@/components/common/rich-editor";
import RichTextDisplay from "@/components/common/rich-text-display";

export default function ApproverGroupsPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [searchTerm, setSearchTerm] = useState("");
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [openDialog, setOpenDialog] = useState(false);
	const [editingGroup, setEditingGroup] = useState<ApproverGroup | null>(null);
	const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
	const [viewingGroup, setViewingGroup] = useState<ApproverGroup | null>(null);
	const [groupName, setGroupName] = useState("");
	const [groupDescription, setGroupDescription] = useState("");
	const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
	const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
	const router = useModuleNavigation();
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [groupToDelete, setGroupToDelete] = useState<ApproverGroup | null>(null);

	const openCreateDialog = () => {
		setEditingGroup(null);
		resetForm();
		setOpenDialog(true);
	};

	const openEditDialog = (group: ApproverGroup) => {
		setEditingGroup(group);
		setGroupName(group.name);
		setGroupDescription(group.description || "");
		setSelectedUserIds(group.users_display.map((u) => u.id));
		setSelectedRoleIds(group.roles_display.map((r) => r.id));
		setOpenDialog(true);
	};

	const openViewDetails = (group: ApproverGroup) => {
		setViewingGroup(group);
		setViewDetailsOpen(true);
	};

	const resetForm = () => {
		setGroupName("");
		setGroupDescription("");
		setSelectedUserIds([]);
		setSelectedRoleIds([]);
	};

	const closeDialog = () => {
		setOpenDialog(false);
		setEditingGroup(null);
		resetForm();
	};

	const handleSave = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "Missing institution" });
			return;
		}

		if (!groupName.trim()) {
			showErrorToast({ error: null, defaultMessage: "Group name is required" });
			return;
		}

		if (selectedUserIds.length === 0 && selectedRoleIds.length === 0) {
			showErrorToast({
				error: null,
				defaultMessage: "Please select at least one user or role",
			});
			return;
		}

		try {
			setSaving(true);

			const groupData: ApproverGroupFormData = {
				institution: currentInstitution.id,
				name: groupName,
				description: groupDescription,
				users: selectedUserIds,
				roles: selectedRoleIds,
			};

			if (editingGroup) {
				await APPROVER_GROUPS_API.update({
					id: editingGroup.id,
					payload: groupData,
				});
				tableRefreshRef.current?.();
				showSuccessToast("Approver group updated successfully!");
			} else {
				await APPROVER_GROUPS_API.create(groupData);
				tableRefreshRef.current?.();
				showSuccessToast("Approver group created successfully!");
			}

			closeDialog();
		} catch (e: any) {
			showErrorToast({
				error: e,
				defaultMessage: "Failed to save approver group",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteClick = (group: ApproverGroup) => {
		setGroupToDelete(group);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!groupToDelete) return;

		try {
			setDeleting(true);
			await APPROVER_GROUPS_API.delete({ id: groupToDelete.id });
			tableRefreshRef.current?.();
			showSuccessToast("Approver group deleted successfully!");
		} catch (e: any) {
			showErrorToast({
				error: e,
				defaultMessage: "Failed to delete approver group",
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
						<h1 className="text-xl sm:text-2xl font-bold">Approver Groups</h1>
					</div>
					<p className="text-muted-foreground text-xs sm:text-sm ml-4">
						Manage groups of users and roles for approval workflows
					</p>
				</div>
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_APPROVER_GROUPS}>
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
						placeholder="Search approver groups..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10 text-xs sm:text-sm"
					/>
				</div>
			</div>

			{/* Groups Table */}
			<PaginatedTable<ApproverGroup>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");

					return await APPROVER_GROUPS_API.fetchAll({
						search: searchTerm || undefined,
					});
				}}
				fetchFromUrl={APPROVER_GROUPS_API.fetchFromUrl}
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
										{group.users_display.length}
									</Badge>
								</div>
								{group.users_display.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{group.users_display.slice(0, 2).map((user) => (
											<Badge key={user.id} variant="outline" className="text-xs">
												{user.user?.fullname || `User ${user.id}`}
											</Badge>
										))}
										{group.users_display.length > 2 && (
											<Badge variant="outline" className="text-xs">
												+{group.users_display.length - 2} more
											</Badge>
										)}
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
										{group.roles_display.length}
									</Badge>
								</div>
								{group.roles_display.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{group.roles_display.slice(0, 2).map((role) => (
											<Badge key={role.id} variant="outline" className="text-xs">
												{role.name}
											</Badge>
										))}
										{group.roles_display.length > 2 && (
											<Badge variant="outline" className="text-xs">
												+{group.roles_display.length - 2} more
											</Badge>
										)}
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
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_APPROVER_GROUPS}>
										<DropdownMenuItem onClick={() => openViewDetails(group)}>
											<Eye className="h-4 w-4 mr-2" />
											View Details
										</DropdownMenuItem>
									</ProtectedComponent>
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_APPROVER_GROUPS}>
										<DropdownMenuItem onClick={() => openEditDialog(group)}>
											<Edit className="h-4 w-4 mr-2" />
											Edit
										</DropdownMenuItem>
									</ProtectedComponent>
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_APPROVER_GROUPS}>
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
							{searchTerm ? "No groups found" : "No approver groups yet"}
						</h3>
						<p className="text-muted-foreground text-xs sm:text-sm mb-4">
							{searchTerm
								? "Try adjusting your search terms"
								: "Create your first approver group to get started"}
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

			{/* View Details Dialog */}
			<Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
				<DialogContent className="w-[95vw] max-w-[400px] sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="text-base sm:text-lg">Approver Group Details</DialogTitle>
					</DialogHeader>

					{viewingGroup && (
						<div className="space-y-4 sm:space-y-6 py-4 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto">
							<div>
								<h3 className="text-base sm:text-lg font-semibold">{viewingGroup.name}</h3>
								{viewingGroup.description && (
									<p className="text-muted-foreground text-xs sm:text-sm mt-1">
										{viewingGroup.description}
									</p>
								)}
							</div>

							<Separator />

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
								<div>
									<div className="flex items-center gap-2 mb-2 sm:mb-3">
										<Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
										<h4 className="font-medium text-sm sm:text-base">Users</h4>
										<Badge variant="secondary" className="text-xs">
											{viewingGroup.users_display.length}
										</Badge>
									</div>
									{viewingGroup.users_display.length > 0 ? (
										<div className="space-y-2">
											{viewingGroup.users_display.map((user) => (
												<div
													key={user.id}
													className="flex items-center gap-2 p-2 bg-muted/50 rounded"
												>
													<div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
														<Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
													</div>
													<span className="text-xs sm:text-sm">
														{user.user?.fullname || `User ${user.id}`}
													</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground text-xs sm:text-sm">No users assigned</p>
									)}
								</div>

								<div>
									<div className="flex items-center gap-2 mb-2 sm:mb-3">
										<Shield className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
										<h4 className="font-medium text-sm sm:text-base">Roles</h4>
										<Badge variant="secondary" className="text-xs">
											{viewingGroup.roles_display.length}
										</Badge>
									</div>
									{viewingGroup.roles_display.length > 0 ? (
										<div className="space-y-2">
											{viewingGroup.roles_display.map((role) => (
												<div
													key={role.id}
													className="flex items-center gap-2 p-2 bg-muted/50 rounded"
												>
													<div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center">
														<Shield className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
													</div>
													<span className="text-xs sm:text-sm">{role.name}</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground text-xs sm:text-sm">No roles assigned</p>
									)}
								</div>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setViewDetailsOpen(false)}
							className="w-full sm:w-auto text-xs sm:text-sm"
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Create/Edit Dialog */}
			<Dialog
				open={openDialog}
				onOpenChange={(open) => {
					if (!open) {
						closeDialog();
					}
					setOpenDialog(open);
				}}
			>
				<DialogContent className="w-[95vw] max-w-[400px] sm:max-w-xl">
					<DialogHeader>
						<DialogTitle className="text-base sm:text-lg">
							{editingGroup ? "Edit Approver Group" : "Create Approver Group"}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 sm:space-y-6 py-4 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto px-2 sm:px-4">
						<div className="space-y-4">
							<div>
								<label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
									Group Name <span className="text-destructive">*</span>
								</label>
								<Input
									placeholder="e.g., Finance Team, HR Managers..."
									value={groupName}
									onChange={(e) => setGroupName(e.target.value)}
									className="text-xs sm:text-sm"
								/>
							</div>

							<div>
								<label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
									Description
								</label>
								<RichTextEditor
									value={groupDescription || ""}
									onChange={(value) => setGroupDescription(value || "")}
									maxLength={1000}
								/>
							</div>
						</div>

						<Separator />

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
							<div>
								<label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Roles</label>
								<RoleSearchableSelect
									value={selectedRoleIds}
									onValueChange={(values) => setSelectedRoleIds(values.map((val) => Number(val)))}
									placeholder="Select roles..."
									multiple={true}
								/>
							</div>

							<div>
								<label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Users</label>
								<UserProfileSearchableSelect
									value={selectedUserIds}
									onValueChange={(values) => setSelectedUserIds(values.map((val) => Number(val)))}
									placeholder="Select users..."
									multiple={true}
								/>
							</div>
						</div>
					</div>

					<DialogFooter className="space-x-2 mt-4 sm:mt-8">
						<Button
							variant="outline"
							onClick={closeDialog}
							disabled={saving}
							className="w-full sm:w-auto text-xs sm:text-sm"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSave}
							disabled={saving}
							className="w-full sm:w-auto text-xs sm:text-sm"
						>
							{saving ? "Saving..." : editingGroup ? "Update Group" : "Create Group"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDelete}
				onConfirm={confirmDelete}
				title="Delete Approver Group"
				description={`Are you sure you want to delete "${groupToDelete?.name}"? This action cannot be undone and may affect existing approval workflows.`}
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
