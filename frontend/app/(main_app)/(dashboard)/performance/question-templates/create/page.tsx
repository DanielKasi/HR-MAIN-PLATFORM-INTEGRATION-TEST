"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import { AddFieldDialog } from "@/components/dialogs/add-field-dialog";
import { EditFieldDialog } from "@/components/dialogs/edit-field-dialog";
import { CustomFieldComponent } from "@/components/forms/custom-field";
import type {
	CustomField,
	CustomFieldFormData,
	IQuestionCategory,
	IQuestionTemplate,
	IQuestionTemplateFormData,
} from "@/types/types.utils";
import { QUESTION_TEMPLATES_API } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useSelector } from "react-redux";
import { toast } from "sonner";

interface QuestionTemplateCreatePageProps {
	initialData?: IQuestionTemplate;
	onSuccess?: () => void;
}

export default function QuestionTemplateCreatePage({
	initialData,
	onSuccess,
}: QuestionTemplateCreatePageProps) {
	const router = useRouter();
	const [templateName, setTemplateName] = useState(initialData?.name || "");
	const [templateDescription, setTemplateDescription] = useState(initialData?.description || "");
	const [templateCategory, setTemplateCategory] = useState<IQuestionCategory>(
		initialData?.category || "general",
	);
	const [customFields, setCustomFields] = useState<CustomField[]>(initialData?.questions || []);
	const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
	const [isEditFieldDialogOpen, setIsEditFieldDialogOpen] = useState(false);
	const [editingField, setEditingField] = useState<CustomField | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const selectedInstitution = useSelector(selectSelectedInstitution);

	useEffect(() => {
		return () => {
			initialData = undefined;
		};
	}, [initialData]);

	const handleAddField = (fieldData: CustomFieldFormData) => {
		const newField: CustomField = {
			id: Date.now().toString(),
			name: fieldData.title,
			description: fieldData.description,
			type: fieldData.question_type,
			value: undefined, // No value for template
			is_required: false, // Default; can be added to dialog if needed
			options: fieldData.options,
		};

		setCustomFields((prev) => [...prev, newField]);
		setIsAddFieldDialogOpen(false);
		toast.success("Question added successfully");
	};

	const handleEditField = (fieldId: string) => {
		const fieldToEdit = customFields.find((field) => field.id === fieldId);
		if (fieldToEdit) {
			setEditingField(fieldToEdit);
			setIsEditFieldDialogOpen(true);
		}
	};

	const handleUpdateField = (fieldId: string, fieldData: CustomFieldFormData) => {
		setCustomFields((prev) =>
			prev.map((field) =>
				field.id === fieldId
					? {
							...field,
							name: fieldData.title,
							description: fieldData.description,
							type: fieldData.question_type,
							options: fieldData.options,
						}
					: field,
			),
		);
		setEditingField(null);
		setIsEditFieldDialogOpen(false);
		toast.success("Question updated successfully");
	};

	const handleDeleteField = (fieldId: string) => {
		setCustomFields((prev) => prev.filter((field) => field.id !== fieldId));
		toast.success("Question deleted successfully");
	};

	const handleFieldValueChange = (fieldId: string, value: any) => {
		// No value change needed for template creation; optional if previewing
		setCustomFields((prev) =>
			prev.map((field) => (field.id === fieldId ? { ...field, value } : field)),
		);
	};

	const handleSubmit = async () => {
		if (!selectedInstitution || !templateName.trim()) {
			toast.error("Institution and template name are required");
			return;
		}

		setSubmitting(true);
		try {
			const templateData: IQuestionTemplateFormData = {
				institution: selectedInstitution.id,
				name: templateName,
				description: templateDescription || undefined,
				category: templateCategory,
				questions: customFields,
			};

			if (initialData) {
				await QUESTION_TEMPLATES_API.update({ templateId: initialData.id, data: templateData });
				toast.success("Question template updated successfully");
			} else {
				await QUESTION_TEMPLATES_API.create({ data: templateData });
				toast.success("Question template created successfully");
			}

			onSuccess?.();
			router.push("/performance/question-templates");
		} catch (error: any) {
			toast.error(error.message || "Failed to save question template");
		} finally {
			setSubmitting(false);
		}
	};

	const categoryOptions = [
		{ value: "interview", label: "Interview" },
		{ value: "performance_review", label: "Performance Review" },
		{ value: "360_feedback", label: "360 Feedback" },
		{ value: "general", label: "General" },
	] as const;

	return (
		<div className="min-h-screen p-6 bg-white">
			<div className="mx-auto">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							onClick={() => router.back()}
							className="!h-12 !w-12 !rounded-full !aspect-square"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="text-2xl font-semibold">
							{initialData ? "Edit Question Template" : "Create Question Template"}
						</h1>
					</div>
				</div>

				{/* Basic Fields */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					<div>
						<Label htmlFor="name" className="text-sm font-medium">
							Template Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="name"
							placeholder="e.g., Interview Questions Template"
							value={templateName}
							onChange={(e) => setTemplateName(e.target.value)}
							className="mt-1 !py-3 rounded-2xl"
							disabled={submitting}
						/>
					</div>
					<div>
						<Label htmlFor="category" className="text-sm font-medium">
							Category <span className="text-red-500">*</span>
						</Label>
						<Select
							value={templateCategory}
							onValueChange={(value) => setTemplateCategory(value as IQuestionCategory)}
							disabled={submitting}
						>
							<SelectTrigger className="mt-1 rounded-2xl">
								<SelectValue placeholder="Select category" />
							</SelectTrigger>
							<SelectContent>
								{categoryOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="md:col-span-2">
						<Label htmlFor="description" className="text-sm font-medium">
							Description
						</Label>
						<Textarea
							id="description"
							placeholder="Brief description of this question template..."
							value={templateDescription}
							onChange={(e) => setTemplateDescription(e.target.value)}
							className="mt-1 rounded-2xl"
							rows={3}
							disabled={submitting}
						/>
					</div>
				</div>

				{/* Questions Section */}
				<div className="mb-8">
					<div className="flex items-center justify-start gap-6 mb-4">
						<h2 className="text-lg font-medium">Questions</h2>
						<Button
							onClick={() => setIsAddFieldDialogOpen(true)}
							variant="outline"
							size="sm"
							className="text-black !bg-gray-50 shadow-sm shadow-black/40 rounded-2xl"
							disabled={submitting}
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>

					<div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start place-items-start place-content-start">
						{customFields.map((field) => (
							<CustomFieldComponent
								key={field.id}
								field={field}
								onEdit={handleEditField}
								onDelete={handleDeleteField}
								onValueChange={handleFieldValueChange}
							/>
						))}
					</div>

					{customFields.length === 0 && (
						<div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
							No questions added yet. Click "Add Question" to get started.
						</div>
					)}
				</div>

				{/* Submit Button */}
				<Button
					onClick={handleSubmit}
					size="lg"
					className="w-full  text-white !rounded-full md:w-fit md:px-24"
					disabled={!templateName.trim() || submitting}
				>
					{submitting ? "Saving..." : initialData ? "Update Template" : "Create Template"}
				</Button>
			</div>

			{/* Add Field Dialog */}
			<AddFieldDialog
				isOpen={isAddFieldDialogOpen}
				onClose={() => setIsAddFieldDialogOpen(false)}
				onAddField={handleAddField}
			/>

			{/* Edit Field Dialog */}
			<EditFieldDialog
				isOpen={isEditFieldDialogOpen}
				onClose={() => {
					setIsEditFieldDialogOpen(false);
					setEditingField(null);
				}}
				onEditField={handleUpdateField}
				field={editingField}
			/>
		</div>
	);
}
