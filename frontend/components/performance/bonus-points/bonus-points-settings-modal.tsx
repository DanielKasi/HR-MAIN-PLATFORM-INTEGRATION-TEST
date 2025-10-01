"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BONUS_POINT_SETTINGS_API, showErrorToast } from "@/lib/utils";
import type { IBonusPointSettings, IBonusPointSettingsFormData } from "@/types/types.utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { APPROVABLE_MODELS_API } from "@/lib/api/approvals/utils";
import { ContentTypeLite } from "@/types/approvals.types";
import FormattedNumberInput from "@/components/common/inputs/formatted-number-input";
import ContentObjectSelect from "./content-object-select";
interface BonusPointSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	bonusPointSetting?: IBonusPointSettings;
	institutionId: number;
	onSubmit: () => void;
}

const contentTypesModels = ["objectives", "task", "project"];

export function BonusPointSettingsModal({
	isOpen,
	onClose,
	bonusPointSetting,
	institutionId,
	onSubmit,
}: BonusPointSettingsModalProps) {
	const [contentTypes, setContentTypes] = useState<ContentTypeLite[]>([]);
	const [formData, setFormData] = useState<IBonusPointSettingsFormData>({
		institution: institutionId,
		object_id: 0,
		content_type: 0,
		applicable_for: "assignees",
		bonus_for: "completing",
		points: 0,
		condition_field: "completion_date",
		condition_operator: "=",
		condition_value: "end_date",
	});
	const [submitting, setSubmitting] = useState(false);

	const loadContentTypes = useCallback(async () => {
		try {
			const c_types = await APPROVABLE_MODELS_API.fetchAll();
			setContentTypes(c_types.filter((ct) => contentTypesModels.includes(ct.model)));
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load content types" });
		}
	}, []);

	useEffect(() => {
		loadContentTypes();
	}, [loadContentTypes]);

	useEffect(() => {
		if (bonusPointSetting) {
			setFormData({
				institution: bonusPointSetting.institution.id,
				object_id: bonusPointSetting.object_id,
				content_type: bonusPointSetting.content_type,
				applicable_for: bonusPointSetting.applicable_for,
				bonus_for: bonusPointSetting.bonus_for,
				points: bonusPointSetting.points,
				condition_field: bonusPointSetting.condition_field,
				condition_operator: bonusPointSetting.condition_operator,
				condition_value: bonusPointSetting.condition_value,
			});
		} else if (formData.institution !== institutionId) {
			setFormData({
				institution: institutionId,
				object_id: 0,
				content_type: 0,
				applicable_for: "assignees",
				bonus_for: "completing",
				points: 0,
				condition_field: "completion_date",
				condition_operator: "=",
				condition_value: "end_date",
			});
		}
	}, [bonusPointSetting, institutionId]);

	const handleInputChange = useCallback(
		(field: keyof IBonusPointSettingsFormData, value: string | number) => {
			setFormData((prev) => {
				if (prev[field] === value) return prev;
				return { ...prev, [field]: value };
			});
		},
		[],
	);

	const handleSubmit = useCallback(async () => {
		if (!formData.condition_field.trim()) {
			toast.error("Condition field is required");
			return;
		}
		if (formData.points <= 0) {
			toast.error("Points must be greater than 0");
			return;
		}
		if (!formData.content_type) {
			toast.error("Content type is required");
			return;
		}
		if (!formData.object_id) {
			toast.error("Content object is required");
			return;
		}

		setSubmitting(true);
		try {
			if (bonusPointSetting) {
				await BONUS_POINT_SETTINGS_API.update({
					settingsId: bonusPointSetting.id,
					data: formData,
				});
				toast.success("Bonus point setting updated successfully");
			} else {
				await BONUS_POINT_SETTINGS_API.create({ data: formData });
				toast.success("Bonus point setting created successfully");
			}
			onSubmit();
			onClose();
		} catch (error: any) {
			toast.error(error.message || "Failed to save bonus point setting");
		} finally {
			setSubmitting(false);
		}
	}, [formData, bonusPointSetting, onSubmit, onClose]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="rounded-2xl border-0 shadow-2xl">
				<DialogHeader>
					<DialogTitle>
						{bonusPointSetting ? "Edit Bonus Point Setting" : "Create Bonus Point Setting"}
					</DialogTitle>
					<DialogDescription>
						{bonusPointSetting
							? "Update bonus point setting for the institution"
							: "Create a new bonus point setting for the institution"}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4 overflow-y-auto max-h-[60svh]">
					<div className="space-y-2">
						<Label htmlFor="bonus_for" className="text-sm font-medium">
							Bonus For *
						</Label>
						<Select
							value={formData.bonus_for}
							onValueChange={(value) => handleInputChange("bonus_for", value)}
							disabled={submitting}
						>
							<SelectTrigger className="rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
								<SelectValue placeholder="Select bonus type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="completing">Completing</SelectItem>
								<SelectItem value="closing">Closing</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="content_type" className="text-sm font-medium">
							Applicable to *
						</Label>
						<Select
							value={formData.content_type.toString()}
							onValueChange={(value) => {
								handleInputChange("content_type", Number(value));
								handleInputChange("object_id", 0); // Reset object_id when content_type changes
							}}
							disabled={submitting}
						>
							<SelectTrigger className="rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
								<SelectValue placeholder="Select resource type" />
							</SelectTrigger>
							<SelectContent>
								{contentTypes.map((ct) => (
									<SelectItem key={ct.id} value={ct.id.toString()}>
										{ct.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="object_id" className="text-sm font-medium">
							Item *
						</Label>
						<ContentObjectSelect
							value={formData.object_id ? [formData.object_id] : []}
							onValueChange={(values) => handleInputChange("object_id", values[0] || 0)}
							contentType={formData.content_type}
							disabled={submitting || !formData.content_type}
							placeholder="Select item"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="points" className="text-sm font-medium">
							Points *
						</Label>
						<FormattedNumberInput
							id="points"
							value={formData.points}
							onValueChange={(val) => handleInputChange("points", val)}
							placeholder="Points"
							className="h-12 rounded-2xl"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="condition_field" className="text-sm font-medium">
							Condition Field *
						</Label>
						<Select
							value={formData.condition_field}
							onValueChange={(value) => handleInputChange("condition_field", value)}
							disabled={submitting}
							required
						>
							<SelectTrigger className="rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
								<SelectValue placeholder="Select condition field" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="completion_date">Completion Date</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="condition_operator" className="text-sm font-medium">
							Condition Operator *
						</Label>
						<Select
							value={formData.condition_operator}
							onValueChange={(value) => handleInputChange("condition_operator", value)}
							disabled={submitting}
						>
							<SelectTrigger className="rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
								<SelectValue placeholder="Select operator" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="=">Equals</SelectItem>
								<SelectItem value=">">Greater Than</SelectItem>
								<SelectItem value=">=">Greater Than or Equal to</SelectItem>
								<SelectItem value="<">Less Than</SelectItem>
								<SelectItem value="<=">Less Than or Equal to</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="condition_value" className="text-sm font-medium">
							Condition Value *
						</Label>
						<Select
							value={formData.condition_value}
							onValueChange={(value) => handleInputChange("condition_value", value)}
							disabled={submitting}
							required
						>
							<SelectTrigger className="rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
								<SelectValue placeholder="Select condition value" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="end_date">End Date</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="applicable_for" className="text-sm font-medium">
							Applicable For *
						</Label>
						<Select
							value={formData.applicable_for}
							onValueChange={(value) => handleInputChange("applicable_for", value)}
							disabled={submitting}
						>
							<SelectTrigger className="rounded-2xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20">
								<SelectValue placeholder="Select applicability" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="managers">Managers</SelectItem>
								<SelectItem value="assignees">Assignees</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button onClick={handleSubmit} disabled={submitting} className="rounded-full w-full">
						{submitting ? "Saving..." : bonusPointSetting ? "Update" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
