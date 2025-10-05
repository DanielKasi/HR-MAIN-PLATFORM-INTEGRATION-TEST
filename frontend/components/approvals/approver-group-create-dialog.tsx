"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";
import RoleSearchableSelect from "@/components/selects/role-searchable-select";
import { ApproverGroup, ApproverGroupFormData } from "@/types/approvals.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { APPROVER_GROUPS_API } from "@/lib/api/approvals/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface ApproverGroupCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group?: ApproverGroup | null;
	onSave?: () => void;
}

export function ApproverGroupCreateEditDialog({
	open,
	onOpenChange,
	group,
	onSave,
}: ApproverGroupCreateEditDialogProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [userIds, setUserIds] = useState<number[]>([]);
	const [roleIds, setRoleIds] = useState<number[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			if (group) {
				setName(group.name || "");
				setDescription(group.description || "");
				setUserIds(group.users_display.map((u) => u.id));
				setRoleIds(group.roles_display.map((r) => r.id));
			} else {
				setName("");
				setDescription("");
				setUserIds([]);
				setRoleIds([]);
			}
		}
	}, [open, group]);

	const isEditMode = !!group;

	const handleSubmit = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "Missing institution" });
			return;
		}
		if (!name.trim()) {
			showErrorToast({ error: null, defaultMessage: "Group name is required" });
			return;
		}
		if (userIds.length === 0 && roleIds.length === 0) {
			showErrorToast({ error: null, defaultMessage: "Select at least one user or role" });
			return;
		}

		try {
			setSaving(true);
			const payload: ApproverGroupFormData = {
				institution: currentInstitution.id,
				name,
				description,
				users: userIds,
				roles: roleIds,
			};

			if (isEditMode) {
				await APPROVER_GROUPS_API.update({ id: group.id, payload });
				showSuccessToast("Approver group updated successfully!");
			} else {
				await APPROVER_GROUPS_API.create(payload);
				showSuccessToast("Approver group created successfully!");
			}

			onSave?.();
			onOpenChange(false);
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to save approver group" });
		} finally {
			setSaving(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{isEditMode ? "Edit Approver Group" : "Create Approver Group"}</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto">
					<div className="space-y-4 mx-1">
						<div>
							<label className="block text-sm font-medium mb-2">
								Group Name <span className="text-destructive">*</span>
							</label>
							<Input
								placeholder="e.g., Finance Team..."
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-2">Description</label>
							<Textarea
								placeholder="Optional description..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
								className="rounded-xl"
							/>
						</div>
					</div>

					<Separator />

					<div className="grid md:grid-cols-2 gap-4 items-end">
						<div>
							<label className="block text-sm font-medium mb-2">Roles</label>
							<RoleSearchableSelect
								placeholder="Select roles..."
								value={roleIds}
								onValueChange={(vals) => setRoleIds(vals.map(Number))}
								multiple
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-2">Users</label>
							<UserProfileSearchableSelect
								placeholder="Select users..."
								value={userIds}
								onValueChange={(vals) => setUserIds(vals.map(Number))}
								multiple
							/>
						</div>
					</div>
				</div>

				<DialogFooter className="mt-6">
					<Button className="w-full rounded-full" onClick={handleSubmit} disabled={saving}>
						{saving ? "Saving..." : isEditMode ? "Update Group" : "Create Group"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
