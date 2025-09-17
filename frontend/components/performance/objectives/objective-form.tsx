"use client";

import { useState, useEffect, forwardRef, useMemo } from "react";
import type {
	IObjective,
	IObjectiveFormData,
	IDurationUnit,
	IKeyResult,
	IKeyResultFormData,
} from "@/types/types.utils";

import { useSelector } from "react-redux";
import { Plus } from "lucide-react";

import { KeyResultModal } from "../key-results/key-results-modal";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { KEY_RESULTS_API } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ObjectiveFormProps {
	initialData?: IObjective;
	onSubmit: (data: IObjectiveFormData) => void;
	isLoading?: boolean;
}

export const ObjectiveForm = forwardRef<HTMLFormElement, ObjectiveFormProps>(
	({ initialData, onSubmit, isLoading }, ref) => {
		const currentInstitution = useSelector(selectSelectedInstitution);
		const [keyResults, setKeyResults] = useState<IKeyResult[]>([]);
		const [managersValue, setManagersValue] = useState<(string | number)[]>([]);
		const [assigneesValue, setAssigneesValue] = useState<(string | number)[]>([]);
		const [isKeyResultModalOpen, setIsKeyResultModalOpen] = useState(false);
		const [isCreatingKeyResult, setIsCreatingKeyResult] = useState(false);
		const [formData, setFormData] = useState<Record<string, any>>(() => {
			const today = new Date().toISOString().split("T")[0]; // Current date in YYYY-MM-DD
			if (!initialData) {
				return {
					name: "",
					description: "",
					duration: "",
					duration_unit: "months",
					key_result: "",
					self_employee_progress_update: false,
					creation_date: today,
				};
			}

			return {
				name: initialData.name || "",
				description: initialData.description || "",
				duration: initialData.duration || "",
				duration_unit: initialData.duration_unit || "months",
				key_result: initialData.key_result?.id || "",
				self_employee_progress_update: initialData.self_employee_progress_update || false,
				creation_date: initialData.creation_date?.split("T")[0] || today,
			};
		});
		const [errors, setErrors] = useState<Record<string, string>>({});

		const fetchKeyResults = async () => {
			try {
				const response = await KEY_RESULTS_API.getPaginated({});

				setKeyResults(response.results);
			} catch (error) {
				console.error("Failed to fetch key results:", error);
			}
		};

		useEffect(() => {
			fetchKeyResults();

			if (initialData) {
				if (initialData.managers) {
					setManagersValue([initialData.managers.id]);
				}
				if (initialData.assignees) {
					setAssigneesValue(initialData.assignees.map((assignee) => assignee.id));
				}
			}
		}, [initialData]);

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
			if (!formData.name || formData.name.length < 5) {
				newErrors.name = "Objective name must be at least 5 characters";
			}

			// Duration validation
			if (!formData.duration || Number(formData.duration) <= 0) {
				newErrors.duration = "Duration must be greater than 0";
			}

			// Description validation
			if (formData.description && formData.description.length < 10) {
				newErrors.description = "Description must be at least 10 characters";
			}

			// Creation date validation
			if (!formData.creation_date) {
				newErrors.creation_date = "Creation date is required";
			} else {
				const creationDate = new Date(formData.creation_date);
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				if (isNaN(creationDate.getTime())) {
					newErrors.creation_date = "Invalid date format";
				} else if (creationDate > today) {
					newErrors.creation_date = "Creation date cannot be in the future";
				}
			}

			setErrors(newErrors);
			return Object.keys(newErrors).length === 0;
		};

		const handleSubmit = (e: React.FormEvent) => {
			e.preventDefault();
			if (!currentInstitution || !validateForm()) return;

			const objectiveData: IObjectiveFormData = {
				institution: currentInstitution.id,
				name: formData.name,
				description: formData.description || undefined,
				duration: formData.duration,
				duration_unit: formData.duration_unit as IDurationUnit,
				key_result: formData.key_result ? Number(formData.key_result) : undefined,
				self_employee_progress_update: formData.self_employee_progress_update || false,
				managers_id: managersValue.length > 0 ? Number(managersValue[0]) : undefined,
				assignees_id: assigneesValue.map((id) => Number(id)),
				creation_date: formData.creation_date,
			};

			onSubmit(objectiveData);
		};

		const handleCreateKeyResult = async (data: IKeyResultFormData) => {
			console.log("Creating key result with data:", data);
			setIsCreatingKeyResult(true);
			try {
				await KEY_RESULTS_API.create({ data });
				await fetchKeyResults(); // Refresh the list
				setIsKeyResultModalOpen(false);
			} catch (error) {
				console.error("Failed to create key result:", error);
			} finally {
				setIsCreatingKeyResult(false);
			}
		};

		const durationUnitOptions = [
			{ value: "days", label: "Days" },
			{ value: "months", label: "Months" },
			{ value: "years", label: "Years" },
		];

		const keyResultOptions = keyResults.map((kr) => ({
			value: kr.id,
			label: `${kr.title} (${kr.progress_type})`,
		}));

		const memoizedManagersSearchableSelect = useMemo(
			() => (
				<EmployeeSearchableSelect
					value={managersValue}
					onValueChange={setManagersValue}
					placeholder="Select manager"
					multiple={false}
					disabled={isLoading}
				/>
			),
			[managersValue, isLoading],
		);

		const memoizedAssigneeSearchableSelect = useMemo(
			() => (
				<EmployeeSearchableSelect
					value={assigneesValue}
					onValueChange={setAssigneesValue}
					placeholder="Select assignee"
					multiple={false}
					disabled={isLoading}
				/>
			),
			[assigneesValue, isLoading],
		);

		return (
			<form ref={ref} onSubmit={handleSubmit} className="space-y-6">
				{/* Objective Fields */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
					{/* Name */}
					<div className="space-y-2">
						<Label htmlFor="name" className="text-sm font-medium text-slate-700">
							Objective Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="name"
							type="text"
							value={formData.name}
							onChange={(e) => handleChange("name", e.target.value)}
							placeholder="e.g., Increase team productivity"
							disabled={isLoading}
							className={cn("rounded-xl", errors.name && "border-red-500")}
						/>
						{errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
					</div>

					{/* Duration */}
					<div className="space-y-2">
						<Label htmlFor="duration" className="text-sm font-medium text-slate-700">
							Duration <span className="text-red-500">*</span>
						</Label>
						<div className="flex gap-2">
							<Input
								id="duration"
								type="number"
								value={formData.duration}
								onChange={(e) => handleChange("duration", e.target.value)}
								placeholder="e.g., 6"
								disabled={isLoading}
								className={cn("rounded-xl", errors.duration && "border-red-500")}
							/>
							<Select
								value={formData.duration_unit}
								onValueChange={(value) => handleChange("duration_unit", value)}
								disabled={isLoading}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{durationUnitOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{errors.duration && <p className="text-sm text-red-600">{errors.duration}</p>}
					</div>

					{/* Creation Date */}
					<div className="space-y-2">
						<Label htmlFor="creation_date" className="text-sm font-medium text-slate-700">
							Creation Date <span className="text-red-500">*</span>
						</Label>
						<Input
							id="creation_date"
							type="date"
							value={formData.creation_date}
							onChange={(e) => handleChange("creation_date", e.target.value)}
							disabled={isLoading}
							className={cn("rounded-xl", errors.creation_date && "border-red-500")}
						/>
						{errors.creation_date && <p className="text-sm text-red-600">{errors.creation_date}</p>}
					</div>

					{/* Key Result */}
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-8">
							<Label htmlFor="key_result" className="text-sm font-medium text-slate-700">
								Key Result (Optional)
							</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setIsKeyResultModalOpen(true)}
								disabled={isLoading}
								className="flex items-center gap-2 rounded-xl"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<Select
							value={formData.key_result}
							onValueChange={(value) => handleChange("key_result", value)}
							disabled={isLoading}
						>
							<SelectTrigger className="rounded-xl">
								<SelectValue placeholder="Select a key result" />
							</SelectTrigger>
							<SelectContent>
								{keyResultOptions.map((option) => (
									<SelectItem key={option.value} value={String(option.value)}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Self Employee Progress Update */}
					<div className="space-y-2">
						<Label
							htmlFor="self_employee_progress_update"
							className="text-sm font-medium text-slate-700"
						>
							Self Employee Progress Update
						</Label>
						<div className="flex items-center space-x-2">
							<Switch
								id="self_employee_progress_update"
								checked={formData.self_employee_progress_update}
								onCheckedChange={(checked) =>
									handleChange("self_employee_progress_update", checked)
								}
								disabled={isLoading}
							/>
							<Label className="text-sm text-slate-600">Allow self progress updates</Label>
						</div>
					</div>
				</div>

				{/* Description */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="description" className="text-sm font-medium text-slate-700">
						Description
					</Label>
					<Textarea
						id="description"
						value={formData.description}
						onChange={(e) => handleChange("description", e.target.value)}
						placeholder="Describe the objective in detail..."
						disabled={isLoading}
						className={cn(
							"min-h-[100px] rounded-xl resize-none",
							errors.description && "border-red-500",
						)}
						rows={3}
					/>
					{errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
				</div>

				<div className="border-t pt-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Assignment</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-700">Manager (Optional)</label>
							{memoizedManagersSearchableSelect}
							<p className="text-xs text-slate-500">Manager responsible for this objective</p>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-700">Assignee (Optional)</label>
							{memoizedAssigneeSearchableSelect}
							<p className="text-xs text-slate-500">Employee assigned to achieve this objective</p>
						</div>
					</div>
				</div>

				{/* Form Actions */}
				{/* <div className="flex justify-end gap-3 pt-4 border-t">
					<Button type="submit" disabled={isLoading} className="px-8 w-full rounded-full">
						{isLoading ? "Saving..." : initialData ? "Update Objective" : "Create Objective"}
					</Button>
				</div> */}

				<KeyResultModal
					isOpen={isKeyResultModalOpen}
					onClose={() => setIsKeyResultModalOpen(false)}
					onSubmit={handleCreateKeyResult}
					isLoading={isCreatingKeyResult}
				/>
			</form>
		);
	},
);

ObjectiveForm.displayName = "ObjectiveForm";
