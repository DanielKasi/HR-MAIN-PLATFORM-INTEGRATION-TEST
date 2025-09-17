"use client";

import type {
	IEmployeeObjective,
	IEmployeeObjectiveFormData,
	IObjectiveStatus,
} from "@/types/types.utils";
import type { IKeyResult } from "@/types/types.utils";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import { PerformanceForm, type FormField } from "../common/performance-form";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { ObjectiveSelect } from "@/components/selects/objective-select";
import { KEY_RESULTS_API } from "@/lib/utils";

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
	const [objectiveValue, setObjectiveValue] = useState<string>("");

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
			setObjectiveValue(String(initialData.objective.id));
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

	const fields: FormField[] = [
		{
			name: "status",
			label: "Status",
			type: "select",
			options: statusOptions,
			required: true,
		},
		{
			name: "start_date",
			label: "Start Date",
			type: "date",
			required: true,
			validation: (value: string) => {
				const startDate = new Date(value);
				const today = new Date();

				today.setHours(0, 0, 0, 0);

				// Allow past dates for existing objectives
				if (!initialData && startDate < today) {
					return "Start date cannot be in the past";
				}

				return null;
			},
		},
		{
			name: "end_date",
			label: "End Date",
			type: "date",
			required: true,
			validation: (value: string, formData?: Record<string, any>) => {
				if (!formData?.start_date) return null;

				const startDate = new Date(formData.start_date);
				const endDate = new Date(value);

				if (endDate <= startDate) {
					return "End date must be after start date";
				}

				return null;
			},
		},
		{
			name: "key_result",
			label: "Key Result (Optional)",
			type: "select",
			options: keyResultOptions,
			placeholder: "Select a key result",
		},
	];

	const handleSubmit = (formData: Record<string, any>) => {
		if (!currentInstitution || employeeValue.length === 0 || !objectiveValue) return;

		const employeeObjectiveData: IEmployeeObjectiveFormData = {
			employee: Number(employeeValue[0]),
			objective: Number(objectiveValue),
			status: formData.status as IObjectiveStatus,
			start_date: formData.start_date,
			end_date: formData.end_date,
			key_result: formData.key_result ? Number(formData.key_result) : undefined,
		};

		onSubmit(employeeObjectiveData);
	};

	// const getInitialFormData = () => {
	// 	if (!initialData) return { status: "not_started" };

	// 	return {
	// 		status: initialData.status,
	// 		start_date: initialData.start_date,
	// 		end_date: initialData.end_date,
	// 		key_result: initialData.key_result?.id,
	// 	};
	// };

	// const memoizedPerformanceForm = useMemo(
	// 	() => (

	// 	),
	// 	[initialData, isLoading],
	// );

	return (
		<div className="space-y-6">
			{/* Employee and Objective Selection */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
					<ObjectiveSelect
						value={objectiveValue}
						onValueChange={setObjectiveValue}
						placeholder="Select objective"
						disabled={isLoading || !!initialData}
					/>
					{!!initialData && (
						<p className="text-xs text-slate-500">Objective cannot be changed after creation</p>
					)}
				</div>
			</div>

			{/* Form Fields */}
			{
				<PerformanceForm<IEmployeeObjective>
					fields={fields}
					initialData={initialData}
					onSubmit={handleSubmit}
					onCancel={onCancel}
					isLoading={isLoading}
					submitLabel={initialData ? "Update Assignment" : "Create Assignment"}
					showCancel={false}
				/>
			}
		</div>
	);
}
