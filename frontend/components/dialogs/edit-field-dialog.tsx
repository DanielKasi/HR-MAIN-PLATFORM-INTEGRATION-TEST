"use client";

import { useState, useEffect } from "react";
import { DialogSkeleton } from "./dialog-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { CustomField, CustomFieldFormData, IQuestionType } from "@/types/types.utils";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";

interface EditFieldDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onEditField: (fieldId: string, field: CustomFieldFormData) => void;
	field: CustomField | null;
}

const fieldTypes: { value: IQuestionType; label: string }[] = [
	{ value: "text", label: "Text" },
	{ value: "rating", label: "Rating" },
	{ value: "multiple_choice", label: "Multiple Choice" },
	{ value: "yes_no", label: "Yes/No" },
];

export function EditFieldDialog({ isOpen, onClose, onEditField, field }: EditFieldDialogProps) {
	const [formData, setFormData] = useState<CustomFieldFormData>({
		title: "",
		description: "",
		question_type: "text",
		options: [],
	});

	const [currentOption, setCurrentOption] = useState("");

	// Populate form when field changes
	useEffect(() => {
		if (field) {
			setFormData({
				title: field.name,
				description: field.description,
				question_type: field.type,
				options: field.options || [],
			});
		}
	}, [field]);

	const addOption = () => {
		if (currentOption.trim() && !formData.options?.includes(currentOption.trim())) {
			setFormData((prev) => ({
				...prev,
				options: [...(prev.options || []), currentOption.trim()],
			}));
			setCurrentOption("");
		}
	};

	const removeOption = (optionToRemove: string) => {
		setFormData((prev) => ({
			...prev,
			options: prev.options?.filter((option) => option !== optionToRemove) || [],
		}));
	};

	const handleConfirm = () => {
		if (formData.title.trim()) {
			// Call onEditField with field.id and formData
			onEditField(field?.id || "", formData);
			setFormData({ title: "", description: "", question_type: "text", options: [] });
			setCurrentOption("");
		}
	};

	const handleCancel = () => {
		setFormData({ title: "", description: "", question_type: "text", options: [] });
		setCurrentOption("");
		onClose();
	};

	const isFormValid = formData.title.trim().length > 0;

	return (
		<DialogSkeleton
			isOpen={isOpen}
			onClose={handleCancel}
			title="Edit Question"
			className="sm:max-w-md"
			onConfirm={handleConfirm}
			confirmText="Update Question"
			cancelText="Cancel"
			confirmDisabled={!isFormValid}
		>
			<div className="space-y-4">
				<div>
					<Label htmlFor="title" className="text-sm font-medium">
						Title <span className="text-red-500">*</span>
					</Label>
					<Input
						id="title"
						placeholder="Enter question title"
						value={formData.title}
						onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
						className="mt-1 rounded-2xl"
					/>
				</div>

				<div>
					<Label htmlFor="description" className="text-sm font-medium">
						Description
					</Label>
					<Textarea
						id="description"
						placeholder="Enter question description (optional)"
						value={formData.description}
						onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
						className="mt-1 rounded-2xl"
						rows={2}
					/>
				</div>

				<div>
					<Label className="text-sm font-medium">
						Question Type <span className="text-red-500">*</span>
					</Label>
					<Select
						value={formData.question_type}
						onValueChange={(value) =>
							setFormData((prev) => ({ ...prev, question_type: value as IQuestionType }))
						}
					>
						<SelectTrigger className="mt-1 rounded-2xl">
							<SelectValue placeholder="Select Question Type" />
						</SelectTrigger>
						<SelectContent>
							{fieldTypes.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{formData.question_type === "multiple_choice" && (
					<div>
						<Label className="text-sm font-medium">Options</Label>

						<div className="space-y-2 mt-1">
							<div className="flex items-start justify-start gap-4">
								<Input
									placeholder="Add option"
									value={currentOption}
									onChange={(e) => setCurrentOption(e.target.value)}
									onKeyPress={(e) => e.key === "Enter" && addOption()}
									className="flex-1 rounded-2xl"
								/>
								<Button
									type="button"
									onClick={addOption}
									variant="outline"
									className="rounded-xl !h-12"
								>
									<Icon icon="hugeicons:add-01" className="h-4 w-4" />
								</Button>
							</div>

							{formData.options && formData.options.length > 0 && (
								<div className="space-y-1">
									{formData.options.map((option, index) => (
										<div
											key={index}
											className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl"
										>
											<span className="text-sm">{option}</span>
											<Button
												type="button"
												onClick={() => removeOption(option)}
												variant="ghost"
												size="sm"
												className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
											>
												<Icon icon="hugeicons:delete-02" className="h-3 w-3" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</DialogSkeleton>
	);
}
