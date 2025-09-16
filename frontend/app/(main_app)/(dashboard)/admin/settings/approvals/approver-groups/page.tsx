"use client";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PaginatedTable, ColumnDef } from "@/components/common/tables/paginated-table";
import type { ApproverGroup, ApproverGroupFormData } from "@/types/approvals.types";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Plus, Users, Shield, Edit, Trash2, Search, MoreVertical, Eye } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPROVER_GROUPS_API } from "@/lib/api/approvals/utils";
import RoleSearchableSelect from "@/components/selects/role-searchable-select";
import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";

export default function ApproverGroupsPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);

	// // Data states
	// const [approverGroups, setApproverGroups] = useState<ApproverGroup[]>([]);
	// const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
	// const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
	const [searchTerm, setSearchTerm] = useState("");

	// Loading states
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Dialog states
	const [openDialog, setOpenDialog] = useState(false);
	const [editingGroup, setEditingGroup] = useState<ApproverGroup | null>(null);
	const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
	const [viewingGroup, setViewingGroup] = useState<ApproverGroup | null>(null);
	const [groupName, setGroupName] = useState("");
	const [groupDescription, setGroupDescription] = useState("");
	const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
	const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

	// Delete confirmation states
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [groupToDelete, setGroupToDelete] = useState<ApproverGroup | null>(null);

	// useEffect(() => {
	//   loadUserRoles();
	// }, [currentInstitution]);

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
			showErrorToast({ error: null, defaultMessage: "Please select at least one user or role" });
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
				await APPROVER_GROUPS_API.update({ id: editingGroup.id, payload: groupData });
				tableRefreshRef.current?.();
				showSuccessToast("Approver group updated successfully!");
			} else {
				await APPROVER_GROUPS_API.create(groupData);
				tableRefreshRef.current?.();
				showSuccessToast("Approver group created successfully!");
			}

			closeDialog();
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to save approver group" });
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
			showErrorToast({ error: e, defaultMessage: "Failed to delete approver group" });
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
		<div className="p-6 bg-white rounded-xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div className="space-y-1">
					<h1 className="text-xl lg:text-2xl font-bold">Approver Groups</h1>
					<p className="text-muted-foreground">
						Manage groups of users and roles for approval workflows
					</p>
				</div>
				<Button onClick={openCreateDialog}>
					<Plus className="h-4 w-4 mr-2" />
					Create Group
				</Button>
			</div>

			{/* Search */}
			<div className="mb-6">
				<div className="relative max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search approver groups..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10"
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
				tableClassName="min-w-[800px] [&_th]:border-0 [&_td]:border-0"
				columns={[
					{
						key: "name",
						header: "Name & Description",
						cell: (group) => (
							<div>
								<div className="font-medium">{group.name}</div>
								{group.description && (
									<div className="text-sm text-muted-foreground mt-1">{group.description}</div>
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
									<DropdownMenuItem onClick={() => openViewDetails(group)}>
										<Eye className="h-4 w-4 mr-2" />
										View Details
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => openEditDialog(group)}>
										<Edit className="h-4 w-4 mr-2" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => handleDeleteClick(group)}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						),
					},
				]}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">
							{searchTerm ? "No groups found" : "No approver groups yet"}
						</h3>
						<p className="text-muted-foreground mb-4">
							{searchTerm
								? "Try adjusting your search terms"
								: "Create your first approver group to get started"}
						</p>
						{!searchTerm && (
							<Button onClick={openCreateDialog}>
								<Plus className="h-4 w-4 mr-2" />
								Create Group
							</Button>
						)}
					</div>
				}
			/>

			{/* View Details Dialog */}
			<Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Approver Group Details</DialogTitle>
					</DialogHeader>

					{viewingGroup && (
						<div className="space-y-6 py-4">
							<div>
								<h3 className="text-lg font-semibold">{viewingGroup.name}</h3>
								{viewingGroup.description && (
									<p className="text-muted-foreground mt-1">{viewingGroup.description}</p>
								)}
							</div>

							<Separator />

							<div className="grid md:grid-cols-2 gap-6">
								<div>
									<div className="flex items-center gap-2 mb-3">
										<Users className="h-5 w-5 text-blue-600" />
										<h4 className="font-medium">Users</h4>
										<Badge variant="secondary">{viewingGroup.users_display.length}</Badge>
									</div>
									{viewingGroup.users_display.length > 0 ? (
										<div className="space-y-2">
											{viewingGroup.users_display.map((user) => (
												<div
													key={user.id}
													className="flex items-center gap-2 p-2 bg-muted/50 rounded"
												>
													<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
														<Users className="h-4 w-4 text-blue-600" />
													</div>
													<span className="text-sm">
														{user.user?.fullname || `User ${user.id}`}
													</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground">No users assigned</p>
									)}
								</div>

								<div>
									<div className="flex items-center gap-2 mb-3">
										<Shield className="h-5 w-5 text-orange-600" />
										<h4 className="font-medium">Roles</h4>
										<Badge variant="secondary">{viewingGroup.roles_display.length}</Badge>
									</div>
									{viewingGroup.roles_display.length > 0 ? (
										<div className="space-y-2">
											{viewingGroup.roles_display.map((role) => (
												<div
													key={role.id}
													className="flex items-center gap-2 p-2 bg-muted/50 rounded"
												>
													<div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
														<Shield className="h-4 w-4 text-orange-600" />
													</div>
													<span className="text-sm">{role.name}</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground">No roles assigned</p>
									)}
								</div>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
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
				<DialogContent className="sm:max-w-xl ">
					<DialogHeader>
						<DialogTitle>
							{editingGroup ? "Edit Approver Group" : "Create Approver Group"}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto">
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2">
									Group Name <span className="text-destructive">*</span>
								</label>
								<Input
									placeholder="e.g., Finance Team, HR Managers..."
									value={groupName}
									onChange={(e) => setGroupName(e.target.value)}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">Description</label>
								<Textarea
									placeholder="Optional description of this approver group..."
									value={groupDescription}
									onChange={(e) => setGroupDescription(e.target.value)}
									rows={2}
								/>
							</div>
						</div>

						<Separator />

						<div className="grid md:grid-cols-2 gap-4 items-end">
							<div>
								<label className="block text-sm font-medium mb-2">Roles</label>

								<RoleSearchableSelect
									value={selectedRoleIds}
									onValueChange={(values) => setSelectedRoleIds(values.map((val) => Number(val)))}
									placeholder="Select roles..."
									multiple={true}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">Users</label>

								<UserProfileSearchableSelect
									value={selectedUserIds}
									onValueChange={(values) => setSelectedUserIds(values.map((val) => Number(val)))}
									placeholder="Select users..."
									showEmployeeId={false}
									showDepartment={false}
									multiple={true}
								/>
							</div>
						</div>
					</div>

					<DialogFooter className="space-x-2 mt-8">
						<Button className="w-full rounded-full" onClick={handleSave} disabled={saving}>
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
