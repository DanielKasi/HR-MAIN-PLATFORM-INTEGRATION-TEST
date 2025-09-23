"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ISkillZoneCategory, ISkillZoneCategoryFormData } from "@/types/recruitment.types";
import { SKILL_ZONE_CATEGORIES_API } from "@/lib/api/recruitment.utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { DialogSkeleton } from "@/components/dialogs/dialog-skeleton";
import { Label } from "@/components/ui/label";

export interface SkillZoneCategoryCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedCategory: ISkillZoneCategory | null;
	onSuccess: () => void;
}

export const SkillZoneCategoryCreateEditDialog = ({
	open,
	onOpenChange,
	selectedCategory,
	onSuccess,
}: SkillZoneCategoryCreateEditDialogProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<ISkillZoneCategoryFormData>({
		institution: currentInstitution?.id || 0,
		name: "",
		description: "",
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (selectedCategory) {
			setFormData({
				institution: selectedCategory.institution,
				name: selectedCategory.name,
				description: selectedCategory.description || "",
			});
		} else {
			setFormData({
				institution: currentInstitution?.id || 0,
				name: "",
				description: "",
			});
		}
	}, [selectedCategory, currentInstitution]);

	const handleCreateOrUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.name.trim()) {
			showErrorToast({ error: null, defaultMessage: "Category name is required" });
			return;
		}
		try {
			setSaving(true);
			if (selectedCategory) {
				await SKILL_ZONE_CATEGORIES_API.update({ categoryId: selectedCategory.id, data: formData });
				showSuccessToast("Category updated successfully!");
			} else {
				await SKILL_ZONE_CATEGORIES_API.create({ data: formData });
				showSuccessToast("Category created successfully!");
			}
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to save category" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<DialogSkeleton
				isOpen={open}
				onConfirm={handleCreateOrUpdate}
				onClose={() => onOpenChange(false)}
				title={selectedCategory ? "Edit Skillzone Category" : "Create Skillzone  Category"}
				confirmText={saving ? "Saving..." : "Save"}
			>
				<div className="space-y-2 pb-4">
					<div className="space-y-2">
						<Label>Name *</Label>
						<Input
							placeholder="Name"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						/>
					</div>

					<div className="space-y-2">
						<Label>Description *</Label>
						<Textarea
							placeholder="Description"
							className="rounded-2xl"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						/>
					</div>
				</div>
			</DialogSkeleton>
		</>
	);
};

export default SkillZoneCategoryCreateEditDialog;
