"use client";

import React, { useState, useEffect } from "react";
import { Plus, Save, X } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { IFeedbackField } from "@/types/types.utils";

interface FeedbackFieldsModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	fields: IFeedbackField[];
	onFieldsChange: (fields: IFeedbackField[]) => void;
}

export function FeedbackFieldsModal({
	isOpen,
	onOpenChange,
	fields,
	onFieldsChange,
}: FeedbackFieldsModalProps) {
	const [fieldName, setFieldName] = useState("");
	const [fieldType, setFieldType] = useState<string>("text");
	const [fieldOptions, setFieldOptions] = useState("");
	const [fieldRequired, setFieldRequired] = useState(false);
	const [options, setOptions] = useState<string[]>([""]);
	const [localFields, setLocalFields] = useState<IFeedbackField[]>(fields);
	const [ratingMin, setRatingMin] = useState(1);
	const [ratingMax, setRatingMax] = useState(5);

	useEffect(() => {
		setLocalFields(fields);
	}, [fields]);

	const addOption = () => {
		setOptions([...options, ""]);
	};

	const updateOption = (index: number, value: string) => {
		const newOptions = [...options];
		newOptions[index] = value;
		setOptions(newOptions);
		setFieldOptions(newOptions.filter((opt) => opt.trim()).join("\n"));
	};

	const removeOption = (index: number) => {
		if (options.length > 1) {
			const newOptions = options.filter((_, i) => i !== index);
			setOptions(newOptions);
			setFieldOptions(newOptions.filter((opt) => opt.trim()).join("\n"));
		}
	};

	const clearForm = () => {
		setFieldName("");
		setFieldType("text");
		setFieldOptions("");
		setOptions([""]);
		setFieldRequired(false);
		setRatingMin(1);
		setRatingMax(5);
	};

	const addField = () => {
		if (!fieldName.trim()) {
			return;
		}

		if (fieldType === "checkbox" && !options.some((opt) => opt.trim())) {
			return;
		}

		const newField: IFeedbackField = {
			label: fieldName.trim(),
			type: fieldType as IFeedbackField["type"],
			required: fieldRequired,
		};

		if (fieldType === "rating") {
			const ratingOptions = [];
			for (let i = ratingMin; i <= ratingMax; i++) {
				ratingOptions.push(i);
			}
			newField.options = ratingOptions;
		} else if (fieldType === "checkbox") {
			newField.options = options.filter((opt) => opt.trim()).map((opt) => opt.trim());
		}

		const newFields = [...localFields, newField];
		setLocalFields(newFields);
		clearForm();
	};

	const removeField = (index: number) => {
		setLocalFields(localFields.filter((_, i) => i !== index));
	};

	const handleSave = () => {
		onFieldsChange(localFields);
		onOpenChange(false);
	};

	const handleCancel = () => {
		setLocalFields(fields);
		clearForm();
		onOpenChange(false);
	};

	const handleTypeChange = (newType: string) => {
		setFieldType(newType);
		setFieldOptions("");
		setOptions([""]);
	};

	const isAddButtonEnabled = () => {
		if (!fieldName.trim()) {
			return false;
		}

		if (fieldType === "checkbox" && !options.some((opt) => opt.trim())) {
			return false;
		}

		return true;
	};

	const getFieldTypeLabel = (type: string): string => {
		const typeLabels = {
			text: "Text Input",
			rating: "Rating Scale",
			checkbox: "Checkbox Options",
		};
		return typeLabels[type as keyof typeof typeLabels] || type;
	};

	const renderThirdField = () => {
		switch (fieldType) {
			case "text":
				return (
					<div className="space-y-3">
						<Label>Preview</Label>
						<div className="border-b border-gray-300 pb-2">
							<input
								type="text"
								placeholder="Text input field"
								className="w-full bg-transparent border-none outline-none text-sm"
							/>
						</div>
					</div>
				);

			case "rating":
				return (
					<div className="space-y-3">
						<Label>Rating Scale</Label>
						<div className="space-y-2">
							<label className="text-sm">Scale (1-10, 1-5, etc.)</label>
							<div className="flex gap-2">
								<input
									type="number"
									placeholder="Min (e.g., 1)"
									value={ratingMin}
									onChange={(e) => setRatingMin(Number(e.target.value))}
									className="w-20 p-1 border rounded text-sm"
								/>
								<span>to</span>
								<input
									type="number"
									placeholder="Max (e.g., 5)"
									value={ratingMax}
									onChange={(e) => setRatingMax(Number(e.target.value))}
									className="w-20 p-1 border rounded text-sm"
								/>
							</div>
						</div>
					</div>
				);

			case "checkbox":
				return (
					<div className="space-y-3">
						<Label>Options</Label>
						<div className="space-y-2">
							{options.map((option, index) => (
								<div key={index} className="flex items-center gap-2">
									<div className="w-4 h-4 rounded-sm border-2 border-gray-400 flex-shrink-0"></div>
									<div className="flex-1 border-b border-gray-300 pb-1">
										<input
											type="text"
											placeholder={`Option ${index + 1}`}
											value={option}
											onChange={(e) => updateOption(index, e.target.value)}
											className="w-full bg-transparent border-none outline-none text-sm"
										/>
									</div>
									{options.length > 1 && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => removeOption(index)}
											className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
										>
											<X className="h-3 w-3" />
										</Button>
									)}
								</div>
							))}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={addOption}
								className="text-blue-600 hover:text-blue-700 justify-start p-0"
							>
								Add option
							</Button>
						</div>
					</div>
				);

			default:
				return null;
		}
	};
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[400px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add Feedback Field</DialogTitle>
					<DialogDescription>
						Create a custom field to collect feedback during interviews
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="field-name">Field Name</Label>
							<Input
								id="field-name"
								placeholder="e.g., Communication Skills, Technical Knowledge"
								value={fieldName}
								onChange={(e) => setFieldName(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="field-type">Field Type</Label>
							<Select value={fieldType} onValueChange={handleTypeChange}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="text">Text Input</SelectItem>
									<SelectItem value="rating">Rating Scale</SelectItem>
									<SelectItem value="checkbox">Checkbox Options</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center space-x-2 pt-2">
							<input
								type="checkbox"
								id="field-required"
								checked={fieldRequired}
								onChange={(e) => setFieldRequired(e.target.checked)}
								className="rounded border-gray-300"
							/>
							<Label htmlFor="field-required" className="text-sm">
								Make this field required
							</Label>
						</div>

						<div className="pt-4">{renderThirdField()}</div>
					</div>

					{localFields.length > 0 && (
						<div className="space-y-3">
							<h4 className="font-medium">Added Fields ({localFields.length})</h4>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{localFields.map((field, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
									>
										<div className="flex-1">
											<p className="font-medium text-sm">{field.label}</p>
											<div className="flex items-center gap-2 mt-1">
												<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
													{getFieldTypeLabel(field.type)}
												</span>
												{field.options && (
													<span className="text-xs text-gray-500">
														{field.options.length} options
													</span>
												)}
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => removeField(index)}
											className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
				<div className="flex justify-between items-center gap-3 pt-4">
					<Button onClick={addField} disabled={!isAddButtonEnabled()} size="sm" variant="outline">
						<Plus className="h-4 w-4 mr-2" />
						Add Field
					</Button>
					<div className="flex gap-3">
						<Button variant="outline" onClick={handleCancel}>
							Cancel
						</Button>
						<Button onClick={handleSave}>Save Fields ({localFields.length})</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
