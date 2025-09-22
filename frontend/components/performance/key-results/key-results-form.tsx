"use client";

import { forwardRef, useState } from "react";
import type { IKeyResult, IKeyResultFormData, IProgressType } from "@/types/types.utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FormatNumberInput from "@/components/format-number-input";

interface KeyResultFormProps {
	initialData?: IKeyResult;
	onSubmit: (data: IKeyResultFormData) => void;
	isLoading?: boolean;
}

export const KeyResultForm = forwardRef<HTMLFormElement, KeyResultFormProps>(
	({ initialData, onSubmit, isLoading }, ref) => {
		const currentInstitution = useSelector(selectSelectedInstitution);
		const [formData, setFormData] = useState<Record<string, any>>(() => {
			if (!initialData) {
				return {
					title: "",
					progress_type: "percentage",
					description: "",
					target_value: "",
					current_value: "",
				};
			}

			return {
				title: initialData.title || "",
				progress_type: initialData.progress_type || "percentage",
				description: initialData.description || "",
				target_value: initialData.target_value || "",
			};
		});
		const [errors, setErrors] = useState<Record<string, string>>({});

		const progressTypeOptions = [
			{ value: "percentage", label: "Percentage" },
			{ value: "number", label: "Number" },
		];

		const handleChange = (name: string, value: any) => {
			setFormData((prev) => ({ ...prev, [name]: value }));

			// Clear error when user starts typing
			if (errors[name]) {
				setErrors((prev) => ({ ...prev, [name]: "" }));
			}
		};

		const validateForm = () => {
			const newErrors: Record<string, string> = {};

			// Title validation
			if (!formData.title || formData.title.length < 5) {
				newErrors.title = "Title must be at least 5 characters";
			}

			// Description validation
			if (!formData.description || formData.description.length < 10) {
				newErrors.description = "Description must be at least 10 characters";
			}

			// Progress type validation
			if (!formData.progress_type) {
				newErrors.progress_type = "Progress type is required";
			}

			// Target value validation
			if (!formData.target_value || isNaN(Number.parseFloat(formData.target_value))) {
				newErrors.target_value = "Target value must be a valid number";
			} else {
				const num = Number.parseFloat(formData.target_value);
				if (num <= 0) {
					newErrors.target_value = "Target value must be greater than 0";
				}
			}

			// Current value validation
			if (formData.current_value && isNaN(Number.parseFloat(formData.current_value))) {
				newErrors.current_value = "Current value must be a valid number";
			}

			setErrors(newErrors);
			return Object.keys(newErrors).length === 0;
		};

		const handleSubmit = (e: React.FormEvent) => {
			e.preventDefault();
			if (!currentInstitution || !validateForm()) return;

			const keyResultData: IKeyResultFormData = {
				institution: currentInstitution.id,
				title: formData.title,
				description: formData.description,
				progress_type: formData.progress_type as IProgressType,
				target_value: Number.parseFloat(formData.target_value),
				duration: "0", // Placeholder, as duration is not part of this form
			};

			onSubmit(keyResultData);
		};

		return (
			<form ref={ref} onSubmit={handleSubmit} className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
					{/* Title */}
					<div className="space-y-2">
						<Label htmlFor="title" className="text-sm font-medium text-slate-700">
							Key Result Title <span className="text-red-500">*</span>
						</Label>
						<Input
							id="title"
							type="text"
							value={formData.title}
							onChange={(e) => handleChange("title", e.target.value)}
							placeholder="e.g., Increase customer satisfaction to 95%"
							disabled={isLoading}
							className={cn("rounded-xl", errors.title && "border-red-500")}
						/>
						{errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
					</div>

					{/* Progress Type */}
					<div className="space-y-2">
						<Label htmlFor="progress_type" className="text-sm font-medium text-slate-700">
							Progress Type <span className="text-red-500">*</span>
						</Label>
						<Select
							value={formData.progress_type}
							onValueChange={(value) => handleChange("progress_type", value)}
							disabled={isLoading}
						>
							<SelectTrigger
								className={cn("!rounded-2xl", errors.progress_type && "border-red-500")}
							>
								<SelectValue placeholder="Select progress type" />
							</SelectTrigger>
							<SelectContent>
								{progressTypeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.progress_type && <p className="text-sm text-red-600">{errors.progress_type}</p>}
					</div>

					{/* Target Value */}
					<div className="space-y-2">
						<Label htmlFor="target_value" className="text-sm font-medium text-slate-700">
							Target Value <span className="text-red-500">*</span>
						</Label>
						<FormatNumberInput
							id="target_value"
							value={formData.target_value?.toString() || ""}
							onChange={(formatted, numeric) => handleChange("target_value", numeric.toString())}
							placeholder="e.g., 95"
							disabled={isLoading}
							className={cn("rounded-xl", errors.target_value && "border-red-500")}
						/>
						{errors.target_value && <p className="text-sm text-red-600">{errors.target_value}</p>}
					</div>
				</div>

				{/* Description */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="description" className="text-sm font-medium text-slate-700">
						Description <span className="text-red-500">*</span>
					</Label>
					<Textarea
						id="description"
						value={formData.description}
						onChange={(e) => handleChange("description", e.target.value)}
						placeholder="Describe what success looks like..."
						disabled={isLoading}
						className={cn(
							"min-h-[100px] rounded-xl resize-none",
							errors.description && "border-red-500",
						)}
						rows={3}
					/>
					{errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
				</div>

				{/* Form Actions */}
				<div className="flex justify-end gap-3 pt-4 border-t">
					<Button type="submit" disabled={isLoading} className="px-8 w-full rounded-full">
						{isLoading ? "Saving..." : initialData ? "Update Key Result" : "Create Key Result"}
					</Button>
				</div>
			</form>
		);
	},
);

KeyResultForm.displayName = "KeyResultForm";
