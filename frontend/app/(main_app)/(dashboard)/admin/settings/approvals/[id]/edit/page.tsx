"use client";

import type {
	ApprovalDocument,
	ApprovalDocumentLevel,
	ApprovalDocumentFormData,
	ApprovalDocumentLevelFormData,
	Action,
	ApproverGroup,
	ApproverGroupFormData,
} from "@/types/approvals.types";

import { UserProfile, Role } from "@/types/user.types";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
	ArrowLeft,
	Plus,
	CheckCircle2,
	Users,
	Shield,
	FileText,
	Trash2,
	Save,
	Edit,
	MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MultiSelectPopover } from "@/components/common/multi-select-popover";
import FixedLoader from "@/components/fixed-loader";
import { getRoles, PROFILES_API, showErrorToast, showSuccessToast } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
	ACTIONS_API,
	APPROVAL_DOCUMENT_LEVELS_API,
	APPROVAL_DOCUMENTS_API,
	APPROVER_GROUPS_API,
} from "@/lib/api/approvals/utils";
import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";
import ApproverGroupSearchableSelect from "@/components/selects/approver-groups-searchable-select";
import RoleSearchableSelect from "@/components/selects/role-searchable-select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ApprovalEditPage() {
	const params = useParams();
	const router = useRouter();
	const approvalId = params.id as string;
	const currentInstitution = useSelector(selectSelectedInstitution);

	// Data states
	const [approvalDocument, setApprovalDocument] = useState<ApprovalDocument | null>(null);
	const [actions, setActions] = useState<Action[]>([]);

	// Form states
	const [documentDescription, setDocumentDescription] = useState("");
	const [selectedActionIds, setSelectedActionIds] = useState<number[]>([]);

	// Loading states
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [savingLevel, setSavingLevel] = useState(false);
	const [savingApproverGroup, setSavingApproverGroup] = useState(false);

	// Error state
	const [error, setError] = useState<string>("");

	// Level dialog states
	const [openLevelDialog, setOpenLevelDialog] = useState(false);
	const [editingLevel, setEditingLevel] = useState<ApprovalDocumentLevel | null>(null);
	const [newLevelName, setNewLevelName] = useState("");
	const [newLevelDescription, setNewLevelDescription] = useState("");
	const [selectedApproverGroupIds, setSelectedApproverGroupIds] = useState<number[]>([]);
	const [selectedOverriderGroupIds, setSelectedOverriderGroupIds] = useState<number[]>([]);

	const [selectedParticularApproverUsersIds, setSelectedParticularApproverUsersIds] = useState<
		number[]
	>([]);
	const [selectedParticularOverriderUsersIds, setSelectedParticularOverriderUsersIds] = useState<
		number[]
	>([]);
	// ApproverGroup creation dialog states
	const [openApproverGroupDialog, setOpenApproverGroupDialog] = useState(false);
	const [newGroupName, setNewGroupName] = useState("");
	const [newGroupDescription, setNewGroupDescription] = useState("");
	const [selectedGroupUserIds, setSelectedGroupUserIds] = useState<number[]>([]);
	const [selectedGroupRoleIds, setSelectedGroupRoleIds] = useState<number[]>([]);

	// Confirmation dialog states
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [levelToDelete, setLevelToDelete] = useState<number | null>(null);
	const [deletingLevel, setDeletingLevel] = useState(false);

	useEffect(() => {
		loadData();
	}, [approvalId, currentInstitution]);

	const loadData = async () => {
		if (!currentInstitution) {
			return;
		}
		try {
			setLoading(true);
			const [documentRes, actionsRes] = await Promise.all([
				APPROVAL_DOCUMENTS_API.fetchById({ id: Number.parseInt(approvalId) }),
				ACTIONS_API.fetchActions(),
			]);

			const normalizedActions = Array.isArray(actionsRes)
				? actionsRes
				: Array.isArray((actionsRes as any).results)
					? (actionsRes as any).results
					: [];

			setApprovalDocument(documentRes);
			setActions(normalizedActions);
			setDocumentDescription(documentRes.description || "");
			setSelectedActionIds(documentRes.actions?.map((a) => a.id) || []);
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to load approval data" });
			setError(e?.message || "Failed to load approval data");
		} finally {
			setLoading(false);
		}
	};

	const toggleAction = (id: number) => {
		setSelectedActionIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const saveApprovalDocument = async () => {
		if (!approvalDocument || !currentInstitution) {
			return;
		}

		if (selectedActionIds.length === 0) {
			toast.error("Please select at least one action that requires approval");

			return;
		}

		try {
			setSaving(true);

			const documentData: Partial<ApprovalDocumentFormData> = {
				description: documentDescription || null,
				actions: selectedActionIds,
			};

			await APPROVAL_DOCUMENTS_API.update({ id: approvalDocument.id, payload: documentData });
			showSuccessToast("Approval document updated successfully!");
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to update approval document" });
		} finally {
			setSaving(false);
		}
	};

	const createNewApproverGroup = async () => {
		if (!currentInstitution) {
			toast.error("Missing institution");

			return;
		}

		if (!newGroupName.trim()) {
			toast.error("Group name is required");

			return;
		}

		if (selectedGroupUserIds.length === 0 && selectedGroupRoleIds.length === 0) {
			toast.error("Please select at least one user or role for the approver group");

			return;
		}

		try {
			setSavingApproverGroup(true);

			const groupData: ApproverGroupFormData = {
				institution: currentInstitution.id,
				name: newGroupName,
				description: newGroupDescription,
				users: selectedGroupUserIds,
				roles: selectedGroupRoleIds,
			};

			const createdGroup = await APPROVER_GROUPS_API.create(groupData);
			resetApproverGroupDialog();
			showSuccessToast("Approver group created successfully!");
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to create approver group" });
		} finally {
			setSavingApproverGroup(false);
		}
	};

	const resetApproverGroupDialog = () => {
		setOpenApproverGroupDialog(false);
		setNewGroupName("");
		setNewGroupDescription("");
		setSelectedGroupUserIds([]);
		setSelectedGroupRoleIds([]);
	};

	const openEditLevelDialog = (level?: ApprovalDocumentLevel) => {
		if (level) {
			setEditingLevel(level);
			setNewLevelName(level.name || "Unknown ");
			setNewLevelDescription(level.description || "");
			setSelectedApproverGroupIds(
				level.approvers_detail
					?.map((approver) => approver.approver_group?.id)
					.filter((id): id is number => id !== undefined) || [],
			);

			setSelectedOverriderGroupIds(
				level.overriders_detail
					?.map((overrider) => overrider.approver_group?.id)
					.filter((id): id is number => id !== undefined) || [],
			);
		}
		setOpenLevelDialog(true);
	};

	const saveLevel = async () => {
		if (!approvalDocument) {
			toast.error("No approval document found");

			return;
		}

		if (!newLevelName.trim()) {
			toast.error("Level name is required");

			return;
		}

		if (selectedApproverGroupIds.length === 0) {
			toast.error("Please select at least one approver group");

			return;
		}

		try {
			setSavingLevel(true);

			const levelData: ApprovalDocumentLevelFormData = {
				name: newLevelName,
				description: newLevelDescription,
				approvers: selectedApproverGroupIds,
				overriders: selectedOverriderGroupIds,
				approval_document: approvalDocument.id,
				approver_users: selectedParticularApproverUsersIds,
				overrider_users: selectedParticularOverriderUsersIds,
			};

			if (editingLevel) {
				await APPROVAL_DOCUMENT_LEVELS_API.update({ id: editingLevel.id, payload: levelData });
				showSuccessToast("Approval level updated successfully!");
			} else {
				await APPROVAL_DOCUMENT_LEVELS_API.create(levelData);
				showSuccessToast("Approval level created successfully!");
			}
			loadData();
			resetLevelDialog();
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to save approval level" });
		} finally {
			setSavingLevel(false);
		}
	};

	const resetLevelDialog = () => {
		setOpenLevelDialog(false);
		setEditingLevel(null);
		setNewLevelName("");
		setNewLevelDescription("");
		setSelectedApproverGroupIds([]);
		setSelectedOverriderGroupIds([]);
	};

	const handleDeleteLevel = (levelId: number) => {
		setLevelToDelete(levelId);
		setDeleteConfirmOpen(true);
	};

	const confirmDeleteLevel = async () => {
		if (!levelToDelete || !approvalDocument) return;

		try {
			setDeletingLevel(true);
			await APPROVAL_DOCUMENT_LEVELS_API.delete({ id: levelToDelete });
			await loadData();
			showSuccessToast("Approval level deleted successfully!");
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to delete approval level" });
		} finally {
			setDeletingLevel(false);
			setDeleteConfirmOpen(false);
			setLevelToDelete(null);
		}
	};

	const cancelDeleteLevel = () => {
		setDeleteConfirmOpen(false);
		setLevelToDelete(null);
	};

	if (loading) {
		return <FixedLoader />;
	}

	if (error || !approvalDocument) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">Approval Not Found</h3>
					<p className="text-muted-foreground mb-4">
						{error || "The requested approval document could not be found."}
					</p>
					<Link href="/admin/settings/approvals">
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Approvals
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-white rounded-xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div className="space-y-1">
					<div className="flex items-center gap-4">
						<Link href={`/admin/settings/approvals/${approvalId}`}>
							<Button variant="ghost" className="rounded-full aspect-square" size="sm">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-xl lg:text-2xl font-bold">Edit Approval</h1>
					</div>
					<p className="text-muted-foreground ml-8">
						Modify approval workflow for {approvalDocument.content_type_name}
					</p>
				</div>
			</div>

			{error && (
				<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Actions Configuration */}
				<Card className="border-none shadow-none">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5" />
							Actions Requiring Approval
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Select which actions should trigger the approval workflow
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						{actions.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
								<p>No actions available</p>
							</div>
						) : (
							<div className="space-y-3">
								{actions.map((action) => (
									<div
										key={action.id}
										className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
									>
										<div className="flex-1">
											<div className="font-medium">{action.name}</div>
											{action.description && (
												<div className="text-sm text-muted-foreground mt-1">
													{action.description}
												</div>
											)}
										</div>
										<Label className="flex items-center gap-2 cursor-pointer">
											<Checkbox
												className="rounded"
												checked={selectedActionIds.includes(action.id)}
												onCheckedChange={() => toggleAction(action.id)}
											/>
											<span className="text-sm">Require</span>
										</Label>
									</div>
								))}
							</div>
						)}

						{/* Document Description */}
						<div className="pt-4 border-t">
							<label className="block text-sm font-medium mb-2">
								Approval Document Description
							</label>
							<Textarea
								placeholder="Optional description for this approval workflow..."
								value={documentDescription}
								className="resize-none"
								onChange={(e) => setDocumentDescription(e.target.value)}
								rows={3}
							/>
						</div>
						<div className="flex items-center w-full justify-end">
							<Button onClick={saveApprovalDocument} disabled={saving}>
								<Save className="h-4 w-4 mr-2" />
								{saving ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Approval Levels */}
				<Card className="border-none shadow-none">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									Approval Levels
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									Manage sequential approval levels with approver groups
								</p>
							</div>
							<Button size="sm" onClick={() => openEditLevelDialog()}>
								<Plus className="h-4 w-4 mr-2" />
								Add Level
							</Button>
						</div>
					</CardHeader>

					<CardContent>
						{approvalDocument.levels.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
								<p className="mb-2">No approval levels created yet</p>
								<p className="text-sm">Create levels to define your approval workflow</p>
							</div>
						) : (
							<div className="space-y-3">
								{approvalDocument.levels.map((level, index) => (
									<div key={level.id} className="border rounded-lg p-4">
										<div className="flex items-start justify-between mb-3">
											<div>
												<div className="flex items-center gap-2">
													<Badge variant="outline" className="text-xs">
														Level {index + 1}
													</Badge>
													<span className="font-medium">{level.name}</span>
												</div>
												{level.description && (
													<p className="text-sm text-muted-foreground mt-1">{level.description}</p>
												)}
											</div>
											<div className="flex gap-2">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button className="" variant={"ghost"} size={"icon"}>
															<MoreHorizontal />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent>
														<DropdownMenuItem
															className="cursor-pointer"
															onClick={() => openEditLevelDialog(level)}
														>
															<Edit className="h-4 w-4 mr-2" /> Edit
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
															onClick={() => handleDeleteLevel(level.id)}
															disabled={deletingLevel}
														>
															<Trash2 className="h-4 w-4 mr-2" /> Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>

										<div className="grid md:grid-cols-2 gap-4 text-sm">
											<div>
												<div className="flex items-center gap-1 mb-1">
													<CheckCircle2 className="h-3 w-3 text-green-600" />
													<span className="font-medium">Approver Groups</span>
												</div>
												<div className="text-muted-foreground">
													{level.approvers_detail?.length || 0}{" "}
													{`group${level.approvers_detail?.length > 1 ? "s" : ""} assigned`}
												</div>
												{level.approvers_detail && level.approvers_detail.length && (
													<div className="mt-1 flex flex-wrap gap-1">
														{level.approvers_detail.map((approver) => (
															<Badge key={approver.id} variant="secondary" className="text-xs">
																{approver.approver_group?.name || "Unknown group"}
															</Badge>
														))}
													</div>
												)}
											</div>

											<div>
												<div className="flex items-center gap-1 mb-1">
													<Shield className="h-3 w-3 text-orange-600" />
													<span className="font-medium">Overrider Groups</span>
												</div>
												<div className="text-muted-foreground">
													{level.overriders_detail?.length || 0}{" "}
													{`group${level.overriders_detail?.length > 1 ? "s" : ""} assigned`}
												</div>
												{level.overriders_detail && level.overriders_detail.length > 0 && (
													<div className="mt-1 flex flex-wrap gap-1">
														{level.overriders_detail.map((overrider) => (
															<Badge key={overrider.id} variant="outline" className="text-xs">
																{overrider.approver_group?.name || "Unknow group"}
															</Badge>
														))}
													</div>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Level Dialog */}
			<Dialog
				open={openLevelDialog}
				onOpenChange={(open) => {
					if (!open) {
						resetLevelDialog();
					} else {
						setOpenLevelDialog(true);
					}
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{editingLevel ? "Edit Approval Level" : "Create Approval Level"}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6 py-4  max-h-[80vh] overflow-y-auto px-2">
						{/* Basic Info */}
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2">
									Level Name <span className="text-destructive">*</span>
								</label>
								<Input
									placeholder="e.g., Manager Approval, HR Review..."
									value={newLevelName}
									onChange={(e) => setNewLevelName(e.target.value)}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">Description</label>
								<Textarea
									placeholder="Optional description of this approval level..."
									value={newLevelDescription}
									onChange={(e) => setNewLevelDescription(e.target.value)}
									rows={2}
								/>
							</div>
						</div>

						<Separator />

						{/* Approver Groups Section */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-5 w-5 text-green-600" />
									<h4 className="font-medium">Approver Groups</h4>
									<Badge variant="secondary" className="text-xs">
										Required
									</Badge>
								</div>
								<Dialog open={openApproverGroupDialog} onOpenChange={setOpenApproverGroupDialog}>
									<DialogTrigger asChild>
										<Button variant="outline" size="sm">
											<Plus className="h-4 w-4 mr-2" />
											Create Group
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-xl">
										<DialogHeader>
											<DialogTitle>Create Approver Group</DialogTitle>
										</DialogHeader>

										<div className="space-y-4 py-4">
											<div>
												<label className="block text-sm font-medium mb-2">
													Group Name <span className="text-destructive">*</span>
												</label>
												<Input
													placeholder="e.g., Finance Team, HR Managers..."
													value={newGroupName}
													onChange={(e) => setNewGroupName(e.target.value)}
												/>
											</div>

											<div>
												<label className="block text-sm font-medium mb-2">Description</label>
												<Textarea
													placeholder="Optional description of this approver group..."
													value={newGroupDescription}
													onChange={(e) => setNewGroupDescription(e.target.value)}
													rows={2}
												/>
											</div>

											<Separator />

											<div className="grid md:grid-cols-2 gap-4">
												<div>
													<label className="block text-sm font-medium mb-2">Roles</label>

													<RoleSearchableSelect
														placeholder="Select roles..."
														value={selectedGroupRoleIds}
														onValueChange={(values) => {
															if (values.length) {
																setSelectedGroupRoleIds(values.map(Number));
															}
														}}
													/>
												</div>

												<div>
													<label className="block text-sm font-medium mb-2">Users</label>

													<UserProfileSearchableSelect
														placeholder="Select users..."
														value={selectedGroupUserIds}
														onValueChange={(values) => {
															if (values.length) {
																setSelectedGroupUserIds(values.map(Number));
															}
														}}
													/>
												</div>
											</div>
										</div>

										<DialogFooter>
											<Button variant="outline" onClick={resetApproverGroupDialog}>
												Cancel
											</Button>
											<Button onClick={createNewApproverGroup} disabled={savingApproverGroup}>
												{savingApproverGroup ? "Creating..." : "Create Group"}
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">Select Approver Groups</label>

								<ApproverGroupSearchableSelect
									value={selectedApproverGroupIds}
									placeholder="Select approver groups..."
									onValueChange={(values) => {
										if (values.length) {
											setSelectedApproverGroupIds(values.map(Number));
										}
									}}
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">
								Select Particular Approver Users
							</label>
							<UserProfileSearchableSelect
								value={selectedParticularApproverUsersIds}
								onValueChange={(values) =>
									setSelectedParticularApproverUsersIds(values.map((val) => Number(val)))
								}
								placeholder="Select particular approver users..."
								multiple={true}
							/>
						</div>
						<Separator />

						{/* Overrider Groups Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Shield className="h-5 w-5 text-orange-600" />
								<h4 className="font-medium">Overrider Groups</h4>
								<Badge variant="outline" className="text-xs">
									Optional
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">
								Approver groups that can override this approval level
							</p>

							<div>
								<label className="block text-sm font-medium mb-2">Select Overrider Groups</label>

								<ApproverGroupSearchableSelect
									value={selectedOverriderGroupIds}
									placeholder="Select overrider groups..."
									onValueChange={(values) => {
										if (values.length) {
											setSelectedOverriderGroupIds(values.map(Number));
										}
									}}
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium mb-2">
								Select Particular Overrider Users
							</label>
							<UserProfileSearchableSelect
								value={selectedParticularOverriderUsersIds}
								onValueChange={(values) =>
									setSelectedParticularOverriderUsersIds(values.map((val) => Number(val)))
								}
								placeholder="Select particular overrider users..."
								multiple={true}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button onClick={saveLevel} className="w-full rounded-full" disabled={savingLevel}>
							{savingLevel ? "Saving..." : editingLevel ? "Update Level" : "Create Level"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDeleteLevel}
				onConfirm={confirmDeleteLevel}
				title="Delete Approval Level"
				description="Are you sure you want to delete this approval level? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deletingLevel}
			/>
		</div>
	);
}
