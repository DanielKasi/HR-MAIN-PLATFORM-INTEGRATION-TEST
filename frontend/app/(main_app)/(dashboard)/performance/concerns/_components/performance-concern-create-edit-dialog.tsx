"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PERFORMANCE_CONCERN_TYPE_API } from "@/lib/api/performance.utils";
import { PERFORMANCE_CONCERN_API } from "@/lib/api/performance.utils";
import type {
	IPerformanceConcern,
	IPerformanceConcernFormData,
	IPerformanceConcernType,
} from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import PerformanceConcernTypeSearchableSelect from "../../concern-types/_components/performance-concern-type-searchable-select";

interface PerformanceConcernCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedConcern: IPerformanceConcern | null;
	onSuccess: () => void;
}

export function PerformanceConcernCreateEditDialog({
	open,
	onOpenChange,
	selectedConcern,
	onSuccess,
}: PerformanceConcernCreateEditDialogProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPerformanceConcernFormData>({
		description: "",
		category: 0,
	});
	const [saving, setSaving] = useState(false);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [categories, setCategories] = useState<IPerformanceConcernType[]>([]);

	useEffect(() => {
		if (!currentInstitution) return;
		const fetchCategories = async () => {
			try {
				setLoadingCategories(true);
				const response = await PERFORMANCE_CONCERN_TYPE_API.getPaginated({
					institutionId: currentInstitution.id,
				});
				setCategories(response.results || []);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch concern types" });
			} finally {
				setLoadingCategories(false);
			}
		};
		fetchCategories();
	}, [currentInstitution]);

	useEffect(() => {
		if (selectedConcern) {
			setFormData({
				description: selectedConcern.description,
				category: selectedConcern.category?.id || 0,
			});
		} else {
			setFormData({ description: "", category: 0 });
		}
	}, [selectedConcern]);

	const handleSubmit = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.description.trim()) {
			showErrorToast({ error: null, defaultMessage: "Description is required" });
			return;
		}
		if (!formData.category) {
			showErrorToast({ error: null, defaultMessage: "Category is required" });
			return;
		}
		try {
			setSaving(true);
			if (selectedConcern) {
				await PERFORMANCE_CONCERN_API.update({
					concernId: selectedConcern.id,
					data: formData,
				});
				showSuccessToast("Performance concern updated successfully!");
			} else {
				await PERFORMANCE_CONCERN_API.create({ data: formData });
				showSuccessToast("Performance concern created successfully!");
			}
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: selectedConcern
					? "Failed to update performance concern"
					: "Failed to create performance concern",
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
						{selectedConcern ? "Edit Performance Concern" : "Create Performance Concern"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Category *</Label>
						<PerformanceConcernTypeSearchableSelect
							value={formData.category ? [formData.category] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, category: values[0] ? Number(values[0]) : 0 })
							}
							placeholder="Select category..."
							disabled={loadingCategories}
							triggerClassName="h-10 rounded-2xl text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label>Description *</Label>
						<Textarea
							placeholder="Describe the concern..."
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
								? selectedConcern
									? "Updating..."
									: "Creating..."
								: selectedConcern
									? "Update"
									: "Create"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
