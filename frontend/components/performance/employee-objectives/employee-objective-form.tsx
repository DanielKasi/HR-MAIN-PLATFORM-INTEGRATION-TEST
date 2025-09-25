"use client";

import type {
	IEmployeeObjective,
	IEmployeeObjectiveFormData,
	IObjectiveStatus,
} from "@/types/types.utils";
import type { IKeyResult } from "@/types/types.utils";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { ObjectiveSearchableSelect } from "@/components/selects/objective-select";
import { KEY_RESULTS_API } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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

interface EmployeeObjectiveFormProps {
	initialData?: IEmployeeObjective;
	onSubmit: (data: IEmployeeObjectiveFormData) => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export function EmployeeObjectiveForm({
	initialData,
	onSubmit,
	onCancel,
	isLoading,
}: EmployeeObjectiveFormProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [keyResults, setKeyResults] = useState<IKeyResult[]>([]);
	const [employeeValue, setEmployeeValue] = useState<(string | number)[]>([]);
	const [objectiveValue, setObjectiveValue] = useState<number>(0);
	const [formData, setFormData] = useState<Record<string, any>>(() => {
		if (!initialData) {
			return {
				status: "not_started",
				start_date: "",
				end_date: "",
				key_result: "",
			};
		}

		return {
			status: initialData.status || "not_started",
			start_date: initialData.start_date || "",
			end_date: initialData.end_date || "",
			key_result: initialData.key_result?.id || "",
		};
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		// Fetch key results for selection
		const fetchKeyResults = async () => {
			try {
				const response = await KEY_RESULTS_API.getPaginated({});

				setKeyResults(response.results);
			} catch (error) {
				console.error("Failed to fetch key results:", error);
			}
		};

		fetchKeyResults();

		// Set initial values
		if (initialData) {
			setEmployeeValue([initialData.employee.id]);
			setObjectiveValue(Number(initialData.objective.id));
		}
	}, [initialData]);

	const statusOptions = [
		{ value: "not_started", label: "Not Started" },
		{ value: "on_track", label: "On Track" },
		{ value: "at_risk", label: "At Risk" },
		{ value: "behind", label: "Behind" },
		{ value: "closed", label: "Closed" },
	];

	const keyResultOptions = keyResults.map((kr) => ({
		value: kr.id,
		label: `${kr.title} (${kr.progress_type})`,
	}));

	const handleChange = (name: string, value: any) => {
		setFormData((prev) => ({ ...prev, [name]: value }));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		// Status validation
		if (!formData.status) {
			newErrors.status = "Status is required";
		}

		// Start date validation
		if (!formData.start_date) {
			newErrors.start_date = "Start date is required";
		} else {
			const startDate = new Date(formData.start_date);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// Allow past dates for existing objectives
			if (!initialData && startDate < today) {
				newErrors.start_date = "Start date cannot be in the past";
			}
		}

		// End date validation
		if (!formData.end_date) {
			newErrors.end_date = "End date is required";
		} else if (formData.start_date) {
			const startDate = new Date(formData.start_date);
			const endDate = new Date(formData.end_date);

			if (endDate <= startDate) {
				newErrors.end_date = "End date must be after start date";
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentInstitution || employeeValue.length === 0 || !objectiveValue || !validateForm())
			return;

		const employeeObjectiveData: IEmployeeObjectiveFormData = {
			employee_id: Number(employeeValue[0]),
			objective_id: Number(objectiveValue),
			status: formData.status as IObjectiveStatus,
			start_date: formData.start_date,
			end_date: formData.end_date,
			key_result: formData.key_result ? Number(formData.key_result) : undefined,
		};

		onSubmit(employeeObjectiveData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Employee and Objective Selection */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
				<div className="space-y-2">
					<label className="text-sm font-medium text-slate-700">
						Employee <span className="text-red-500">*</span>
					</label>
					<EmployeeSearchableSelect
						value={employeeValue}
						onValueChange={setEmployeeValue}
						placeholder="Select employee"
						multiple={false}
						disabled={isLoading || !!initialData}
					/>
					{!!initialData && (
						<p className="text-xs text-slate-500">Employee cannot be changed after creation</p>
					)}
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium text-slate-700">
						Objective <span className="text-red-500">*</span>
					</label>
					<ObjectiveSearchableSelect
						value={[objectiveValue]}
						onValueChange={(values) => {
							if (values.length) {
								setObjectiveValue(Number(values[0]));
							}
						}}
						placeholder="Select objective"
						disabled={isLoading || !!initialData}
						multiple={false}
					/>
					{!!initialData && (
						<p className="text-xs text-slate-500">Objective cannot be changed after creation</p>
					)}
				</div>
			</div>

			{/* Form Fields */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
				{/* Status */}
				<div className="space-y-2">
					<Label htmlFor="status" className="text-sm font-medium text-slate-700">
						Status <span className="text-red-500">*</span>
					</Label>
					<Select
						value={formData.status}
						onValueChange={(value) => handleChange("status", value)}
						disabled={isLoading}
					>
						<SelectTrigger className={cn("!rounded-2xl", errors.status && "border-red-500")}>
							<SelectValue placeholder="Select status" />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.status && <p className="text-sm text-red-600">{errors.status}</p>}
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

				{/* Key Result */}
				<div className="space-y-2">
					<Label htmlFor="key_result" className="text-sm font-medium text-slate-700">
						Key Result (Optional)
					</Label>
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
			</div>

			{/* Form Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="submit" disabled={isLoading} className="px-8 w-full rounded-full">
					{isLoading ? "Saving..." : initialData ? "Update Assignment" : "Create Assignment"}
				</Button>
			</div>
		</form>
	);
}
