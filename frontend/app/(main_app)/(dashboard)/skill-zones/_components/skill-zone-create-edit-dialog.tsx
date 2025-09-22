"use client";

import { useState, useEffect, memo, useMemo } from "react";
import { useSelector } from "react-redux";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ISkillZone, ISkillZoneFormData } from "@/types/recruitment.types";
import { SKILL_ZONE_API } from "@/lib/api/recruitment.utils";
import JobApplicationsSearchableSelect from "@/components/selects/job-applications-select";
import SkillZoneCategoriesSearchableSelect from "./skill-zones-categories-select";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import SkillZoneCategoryCreateEditDialog from "../categories/_components/skill-zone-category-create-edit-dialog";

export interface SkillZoneCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedSkillZone: ISkillZone | null;
	onSuccess: () => void;
}

export const SkillZoneCreateEditDialog = ({
	open,
	onOpenChange,
	selectedSkillZone,
	onSuccess,
}: SkillZoneCreateEditDialogProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<ISkillZoneFormData>({
		candidate: 0,
		category: [],
		notes: "",
		potential_value: "",
	});
	const [saving, setSaving] = useState(false);
	const [openCategoryDialog, setOpenCategoryDialog] = useState(false);

	useEffect(() => {
		if (selectedSkillZone) {
			setFormData({
				candidate: selectedSkillZone.candidate.id,
				category: selectedSkillZone.category.map((cat) => cat.id),
				notes: selectedSkillZone.notes || "",
				potential_value: selectedSkillZone.potential_value || "",
			});
		} else {
			setFormData({
				candidate: 0,
				category: [],
				notes: "",
				potential_value: "",
			});
		}
	}, [selectedSkillZone]);

	const handleCreateOrUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.candidate) {
			showErrorToast({ error: null, defaultMessage: "Please select a candidate" });
			return;
		}
		try {
			setSaving(true);
			if (selectedSkillZone) {
				await SKILL_ZONE_API.update({ skillZoneId: selectedSkillZone.id, data: formData });
				showSuccessToast("Skill Zone updated successfully!");
			} else {
				await SKILL_ZONE_API.create({ data: formData });
				showSuccessToast("Skill Zone created successfully!");
			}
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to save skill zone" });
		} finally {
			setSaving(false);
		}
	};

	const handleCategorySuccess = () => {
		setOpenCategoryDialog(false);
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogTrigger asChild>
					<Button className="rounded-xl">
						<Plus className="h-4 w-4 mr-2" /> Create Skill Zone
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{selectedSkillZone ? "Edit Skill Zone" : "Create Skill Zone"}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium">Candidate</label>
							<JobApplicationsSearchableSelect
								value={[formData.candidate]}
								onValueChange={(ids) =>
									setFormData({ ...formData, candidate: Number(ids[0]) || 0 })
								}
								placeholder="Select candidate..."
								multiple={false}
							/>
						</div>
						<div>
							<div className="flex items-center justify-start gap-8">
								<label className="text-sm font-medium">Categories</label>
								<Button
									size="sm"
									variant="outline"
									className="rounded-xl"
									onClick={() => setOpenCategoryDialog(true)}
								>
									<Plus />
								</Button>
							</div>
							<SkillZoneCategoriesSearchableSelect
								value={formData.category}
								onValueChange={(ids) => setFormData({ ...formData, category: ids.map(Number) })}
								placeholder="Select categories..."
								multiple={true}
							/>
						</div>
						<Textarea
							placeholder="Notes"
							value={formData.notes}
							onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
						/>
						<Textarea
							placeholder="Potential Value"
							value={formData.potential_value}
							onChange={(e) => setFormData({ ...formData, potential_value: e.target.value })}
						/>
					</div>
					<DialogFooter>
						<Button
							className="w-full rounded-full"
							onClick={handleCreateOrUpdate}
							disabled={saving}
						>
							{saving ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<SkillZoneCategoryCreateEditDialog
				open={openCategoryDialog}
				onOpenChange={setOpenCategoryDialog}
				selectedCategory={null}
				onSuccess={handleCategorySuccess}
			/>
		</>
	);
};

export default SkillZoneCreateEditDialog;
