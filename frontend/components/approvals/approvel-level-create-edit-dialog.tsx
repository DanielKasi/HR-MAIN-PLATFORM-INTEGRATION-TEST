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
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";
import ApproverGroupSearchableSelect from "@/components/selects/approver-groups-searchable-select";
import { ApprovalDocumentLevel, ApprovalDocumentLevelFormData } from "@/types/approvals.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { APPROVAL_DOCUMENT_LEVELS_API } from "@/lib/api/approvals/utils";
import { ApproverGroupCreateEditDialog } from "./approver-group-create-dialog";

interface ApprovalLevelDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	approvalDocumentId: number;
	level?: ApprovalDocumentLevel | null;
	onSave: () => void;
}

export function ApprovalLevelCreateEditDialog({
	open,
	onOpenChange,
	approvalDocumentId,
	level,
	onSave,
}: ApprovalLevelDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [approverGroupIds, setApproverGroupIds] = useState<number[]>([]);
	const [overriderGroupIds, setOverriderGroupIds] = useState<number[]>([]);
	const [particularApprovers, setParticularApprovers] = useState<number[]>([]);
	const [particularOverriders, setParticularOverriders] = useState<number[]>([]);
	const [saving, setSaving] = useState(false);
	const [approverGroupDialogOpen, setApproverGroupDialogOpen] = useState(false);

	useEffect(() => {
		if (open && level) {
			setName(level.name || "");
			setDescription(level.description || "");
			setApproverGroupIds(
				level.approvers_detail
					?.map((a) => a.approver_group?.id)
					.filter((id): id is number => id !== undefined) || [],
			);
			setOverriderGroupIds(
				level.overriders_detail
					?.map((o) => o.approver_group?.id)
					.filter((id): id is number => id !== undefined) || [],
			);
			// Note: particular users not currently in level data in your example,
			// but you can extend if your API supports it
		} else if (open && !level) {
			// reset for new level
			setName("");
			setDescription("");
			setApproverGroupIds([]);
			setOverriderGroupIds([]);
			setParticularApprovers([]);
			setParticularOverriders([]);
		}
	}, [open, level]);

	const handleSave = async () => {
		if (!name.trim()) {
			showErrorToast({ error: null, defaultMessage: "Level name is required" });
			return;
		}
		if (approverGroupIds.length === 0) {
			showErrorToast({ error: null, defaultMessage: "Select at least one approver group" });
			return;
		}

		try {
			setSaving(true);
			const payload: ApprovalDocumentLevelFormData = {
				name,
				description,
				approvers: approverGroupIds,
				overriders: overriderGroupIds,
				approval_document: approvalDocumentId,
				approver_users: particularApprovers,
				overrider_users: particularOverriders,
			};

			if (level?.id) {
				await APPROVAL_DOCUMENT_LEVELS_API.update({ id: level.id, payload });
				showSuccessToast("Approval level updated!");
			} else {
				await APPROVAL_DOCUMENT_LEVELS_API.create(payload);
				showSuccessToast("Approval level created!");
			}

			onSave();
			onOpenChange(false);
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to save approval level" });
		} finally {
			setSaving(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
	};

	return (
		<>
			<Dialog open={open} onOpenChange={handleClose}>
				<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
					<DialogHeader>
						<DialogTitle>{level ? "Edit Approval Level" : "Create Approval Level"}</DialogTitle>
					</DialogHeader>
					<div className="space-y-6 py-4 overflow-y-auto max-h-[70vh] px-1">
						{/* Basic Info */}
						<div className="space-y-4 mx-1">
							<div>
								<label className="block text-sm font-medium mb-2">
									Level Name <span className="text-destructive">*</span>
								</label>
								<Input value={name} onChange={(e) => setName(e.target.value)} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Description</label>
								<Textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={3}
									className="rounded-xl"
								/>
							</div>
						</div>

						<Separator />

						{/* Approver Groups */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="font-medium">Approver Groups</span>
									<Badge variant="secondary" className="text-xs">
										Required
									</Badge>
								</div>
								<Button
									variant="outline"
									className="rounded-xl"
									size="sm"
									onClick={() => setApproverGroupDialogOpen(true)}
								>
									<Plus className="h-4 w-4 mr-1" /> Create Group
								</Button>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Select Approver Groups</label>
								<ApproverGroupSearchableSelect
									value={approverGroupIds}
									onValueChange={(vals) => setApproverGroupIds(vals.map(Number))}
									placeholder="Select groups..."
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Particular Approver Users</label>
								<UserProfileSearchableSelect
									value={particularApprovers}
									onValueChange={(vals) => setParticularApprovers(vals.map(Number))}
									multiple
									placeholder="Select users..."
								/>
							</div>
						</div>

						<Separator />

						{/* Overrider Groups */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<span className="font-medium">Overrider Groups</span>
								<Badge variant="outline" className="text-xs">
									Optional
								</Badge>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Select Overrider Groups</label>
								<ApproverGroupSearchableSelect
									value={overriderGroupIds}
									onValueChange={(vals) => setOverriderGroupIds(vals.map(Number))}
									placeholder="Select groups..."
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">Particular Overrider Users</label>
								<UserProfileSearchableSelect
									value={particularOverriders}
									onValueChange={(vals) => setParticularOverriders(vals.map(Number))}
									multiple
									placeholder="Select users..."
								/>
							</div>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button className="w-full rounded-full" onClick={handleSave} disabled={saving}>
							{saving ? "Saving..." : level ? "Update Level" : "Create Level"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ApproverGroupCreateEditDialog
				open={approverGroupDialogOpen}
				onOpenChange={setApproverGroupDialogOpen}
			/>
		</>
	);
}
