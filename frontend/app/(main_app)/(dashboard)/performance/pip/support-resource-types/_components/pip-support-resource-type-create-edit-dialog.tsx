"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PIP_SUPPORT_RESOURCE_TYPE_API } from "@/lib/api/performance.utils";
import type {
	IPIPSupportResourceType,
	IPIPSupportResourceTypeFormData,
} from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface PIPSupportResourceTypeCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedResourceType: IPIPSupportResourceType | null;
	onSuccess: (createdTypeId?: number) => void;
}

export function PIPSupportResourceTypeCreateEditDialog({
	open,
	onOpenChange,
	selectedResourceType,
	onSuccess,
}: PIPSupportResourceTypeCreateEditDialogProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPIPSupportResourceTypeFormData>({
		name: "",
		description: "",
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (selectedResourceType) {
			setFormData({
				name: selectedResourceType.name,
				description: selectedResourceType.description,
			});
		} else {
			setFormData({ name: "", description: "" });
		}
	}, [selectedResourceType]);

	const handleSubmit = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.name.trim()) {
			showErrorToast({ error: null, defaultMessage: "Name is required" });
			return;
		}
		try {
			setSaving(true);
			if (selectedResourceType) {
				await PIP_SUPPORT_RESOURCE_TYPE_API.update({
					resourceTypeId: selectedResourceType.id,
					data: formData,
				});
				showSuccessToast("Support resource type updated successfully!");
				onSuccess();
			} else {
				const createdType = await PIP_SUPPORT_RESOURCE_TYPE_API.create({
					data: { ...formData, institution: currentInstitution.id },
				});
				showSuccessToast("Support resource type created successfully!");
				onSuccess(createdType.id);
			}
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: selectedResourceType
					? "Failed to update support resource type"
					: "Failed to create support resource type",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{selectedResourceType ? "Edit Support Resource Type" : "Create Support Resource Type"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Name *</Label>
						<Input
							placeholder="e.g., Training Material"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							className="h-10 rounded-2xl text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label>Description</Label>
						<Textarea
							placeholder="Describe the resource type..."
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							className="rounded-2xl"
							rows={4}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							className="rounded-full"
							onClick={() => onOpenChange(false)}
							disabled={saving}
						>
							Cancel
						</Button>
						<Button className="rounded-full" onClick={handleSubmit} disabled={saving}>
							{saving
								? selectedResourceType
									? "Updating..."
									: "Creating..."
								: selectedResourceType
									? "Update"
									: "Create"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
