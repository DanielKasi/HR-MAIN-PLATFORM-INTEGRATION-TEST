"use client";

import { useSelector } from "react-redux";

import { IPeriod, IPeriodFormData } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PeriodFormProps {
	initialData?: IPeriod;
	onSubmit: (data: IPeriodFormData) => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export function PeriodForm({ initialData, onSubmit, onCancel, isLoading }: PeriodFormProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<Record<string, any>>(() => {
		if (!initialData) {
			return {
				name: "",
				start_date: "",
				end_date: "",
				is_closed: false,
			};
		}

		return {
			name: initialData.name || "",
			start_date: initialData.start_date || "",
			end_date: initialData.end_date || "",
			is_closed: initialData.is_closed || false,
		};
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleChange = (name: string, value: any) => {
		setFormData((prev) => ({ ...prev, [name]: value }));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		// Name validation
		if (!formData.name || formData.name.length < 3) {
			newErrors.name = "Period name must be at least 3 characters";
		}

		// Start date validation
		if (!formData.start_date) {
			newErrors.start_date = "Start date is required";
		} else {
			// const startDate = new Date(formData.start_date);
			// const today = new Date();
			// today.setHours(0, 0, 0, 0);
			// if (startDate < today) {
			//     newErrors.start_date = "Start date cannot be in the past";
			// }
		}

		// End date validation
		if (!formData.end_date) {
			newErrors.end_date = "End date is required";
		} else if (formData.start_date) {
			const startDate = new Date(formData.start_date);
			const endDate = new Date(formData.end_date);

			if (endDate <= startDate) {
				newErrors.end_date = "End date must be after start date";
			} else {
				const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
				const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				if (diffDays < 7) {
					newErrors.end_date = "Period must be at least 7 days long";
				}
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentInstitution || !validateForm()) return;

		const periodData: IPeriodFormData = {
			institution: currentInstitution.id,
			name: formData.name,
			start_date: formData.start_date,
			end_date: formData.end_date,
			is_closed: formData.is_closed || false,
		};

		onSubmit(periodData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
				{/* Name */}
				<div className="space-y-2">
					<Label htmlFor="name" className="text-sm font-medium text-slate-700">
						Period Name <span className="text-red-500">*</span>
					</Label>
					<Input
						id="name"
						type="text"
						value={formData.name}
						onChange={(e) => handleChange("name", e.target.value)}
						placeholder="e.g., Q1 2024 Performance Review"
						disabled={isLoading}
						className={cn("rounded-xl", errors.name && "border-red-500")}
					/>
					{errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
				</div>

				{/* Start Date */}
				<div className="space-y-2">
					<Label htmlFor="start_date" className="text-sm font-medium text-slate-700">
						Start Date <span className="text-red-500">*</span>
					</Label>
					<Input
						id="start_date"
						type="date"
						value={formData.start_date}
						onChange={(e) => handleChange("start_date", e.target.value)}
						disabled={isLoading}
						className={cn("rounded-xl", errors.start_date && "border-red-500")}
					/>
					{errors.start_date && <p className="text-sm text-red-600">{errors.start_date}</p>}
				</div>

				{/* End Date */}
				<div className="space-y-2">
					<Label htmlFor="end_date" className="text-sm font-medium text-slate-700">
						End Date <span className="text-red-500">*</span>
					</Label>
					<Input
						id="end_date"
						type="date"
						value={formData.end_date}
						onChange={(e) => handleChange("end_date", e.target.value)}
						disabled={isLoading}
						className={cn("rounded-xl", errors.end_date && "border-red-500")}
					/>
					{errors.end_date && <p className="text-sm text-red-600">{errors.end_date}</p>}
				</div>

				{/* Is Closed */}
				<div className="space-y-2">
					<Label htmlFor="is_closed" className="text-sm font-medium text-slate-700">
						Period Status
					</Label>
					<div className="flex items-center space-x-2">
						<Switch
							id="is_closed"
							checked={formData.is_closed}
							onCheckedChange={(checked) => handleChange("is_closed", checked)}
							disabled={isLoading}
						/>
						<Label className="text-sm text-slate-600">
							Mark as closed to prevent further modifications
						</Label>
					</div>
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="submit" disabled={isLoading} className="px-8 w-full rounded-full">
					{isLoading ? "Saving..." : initialData ? "Update Period" : "Create Period"}
				</Button>
			</div>
		</form>
	);
}
