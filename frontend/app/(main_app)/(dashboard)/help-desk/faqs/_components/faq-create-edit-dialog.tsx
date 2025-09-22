"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { FAQ, FAQFormData, FAQCategory } from "@/types/help-desk.types";
import { FAQ_API, FAQ_CATEGORIES_API } from "@/lib/api/help-desk.utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { DialogSkeleton } from "@/components/dialogs/dialog-skeleton";
import { Label } from "@/components/ui/label";
import FAQCategoryCreateEditDialog from "../categories/_components/faq-category-create-edit-dialog";
import FAQCategorySearchableSelect from "../categories/_components/faq-category-searchable-select";

export interface FAQCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedFAQ: FAQ | null;
	onSuccess: () => void;
}

export const FAQCreateEditDialog = ({
	open,
	onOpenChange,
	selectedFAQ,
	onSuccess,
}: FAQCreateEditDialogProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<FAQFormData>({
		question: "",
		answer: "",
		category_id: 0,
	});
	const [saving, setSaving] = useState(false);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [openCategoryDialog, setOpenCategoryDialog] = useState(false);

	useEffect(() => {
		if (selectedFAQ) {
			setFormData({
				question: selectedFAQ.question,
				answer: selectedFAQ.answer || "",
				category_id: selectedFAQ.category.id,
			});
		} else {
			setFormData({
				question: "",
				answer: "",
				category_id: 0,
			});
		}
	}, [selectedFAQ]);

	useEffect(() => {
		if (!currentInstitution) return;
		const fetchCategories = async () => {
			try {
				setLoadingCategories(true);
				const response = await FAQ_CATEGORIES_API.getPaginated({});
				// setCategories(response.results || []);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch FAQ categories" });
			} finally {
				setLoadingCategories(false);
			}
		};
		fetchCategories();
	}, [currentInstitution]);

	const handleCategoryCreated = (newCategory: FAQCategory) => {
		// setCategories((prev) => [...prev, newCategory]);
		setFormData((prev) => ({ ...prev, category_id: newCategory.id }));
		setOpenCategoryDialog(false);
	};

	const handleCreateOrUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.question.trim()) {
			showErrorToast({ error: null, defaultMessage: "Question is required" });
			return;
		}
		if (!formData.category_id) {
			showErrorToast({ error: null, defaultMessage: "Category is required" });
			return;
		}
		try {
			setSaving(true);
			if (selectedFAQ) {
				await FAQ_API.update({ faqId: selectedFAQ.id, data: formData });
				showSuccessToast("FAQ updated successfully!");
			} else {
				await FAQ_API.create({ data: formData });
				showSuccessToast("FAQ created successfully!");
			}
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to save FAQ" });
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
				title={selectedFAQ ? "Edit FAQ" : "Create FAQ"}
				confirmText={saving ? "Saving..." : "Save"}
			>
				<div className="space-y-2 pb-4">
					<div className="space-y-2">
						<Label>Question *</Label>
						<Input
							placeholder="Question"
							value={formData.question}
							onChange={(e) => setFormData({ ...formData, question: e.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Label>Category *</Label>
							<Button
								variant="ghost"
								size="sm"
								className="rounded-xl"
								onClick={() => setOpenCategoryDialog(true)}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<FAQCategorySearchableSelect
							value={formData.category_id ? [formData.category_id] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, category_id: values[0] ? Number(values[0]) : 0 })
							}
							placeholder="Select category..."
							disabled={loadingCategories}
							triggerClassName="h-10 sm:h-12 rounded-xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<Label>Answer</Label>
						<Textarea
							placeholder="Answer"
							className="rounded-2xl"
							value={formData.answer}
							onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
							rows={4}
						/>
					</div>
				</div>
			</DialogSkeleton>

			<FAQCategoryCreateEditDialog
				open={openCategoryDialog}
				onOpenChange={setOpenCategoryDialog}
				selectedCategory={null}
				onSuccess={(createdCategoryId) => {
					if (createdCategoryId) {
						setFormData((prev) => ({ ...prev, category_id: createdCategoryId }));
					}
				}}
			/>
		</>
	);
};

export default FAQCreateEditDialog;
