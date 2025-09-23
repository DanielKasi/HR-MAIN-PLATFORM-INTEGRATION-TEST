"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PERFORMANCE_CONCERN_TYPE_API } from "@/lib/api/performance.utils";
import type {
	IPerformanceConcernType,
	IPerformanceConcernTypeFormData,
} from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface PerformanceConcernTypeCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedConcernType: IPerformanceConcernType | null;
	onSuccess: (createdTypedId?: number) => void;
}

export function PerformanceConcernTypeCreateEditDialog({
	open,
	onOpenChange,
	selectedConcernType,
	onSuccess,
}: PerformanceConcernTypeCreateEditDialogProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPerformanceConcernTypeFormData>({
		name: "",
		description: "",
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (selectedConcernType) {
			setFormData({
				name: selectedConcernType.name,
				description: selectedConcernType.description,
			});
		} else {
			setFormData({ name: "", description: "" });
		}
	}, [selectedConcernType]);

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
			if (selectedConcernType) {
				await PERFORMANCE_CONCERN_TYPE_API.update({
					concernTypeId: selectedConcernType.id,
					data: formData,
				});
				showSuccessToast("Performance concern type updated successfully!");
				onSuccess();
			} else {
				const createdType = await PERFORMANCE_CONCERN_TYPE_API.create({
					data: { ...formData, institution: currentInstitution.id },
				});
				showSuccessToast("Performance concern type created successfully!");
				onSuccess(createdType.id);
			}

			onOpenChange(false);
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: selectedConcernType
					? "Failed to update performance concern type"
					: "Failed to create performance concern type",
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
						{selectedConcernType
							? "Edit Performance Concern Type"
							: "Create Performance Concern Type"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Name *</Label>
						<Input
							placeholder="e.g., Attendance Issues"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							className="h-10 rounded-2xl text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label>Description</Label>
						<Textarea
							placeholder="Describe the concern type..."
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
								? selectedConcernType
									? "Updating..."
									: "Creating..."
								: selectedConcernType
									? "Update"
									: "Create"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
