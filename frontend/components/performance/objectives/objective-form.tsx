"use client";

import { useState, useEffect, forwardRef, useMemo } from "react"
import { PerformanceForm, type FormField } from "../common/performance-form"
import type {
	IObjective,
	IObjectiveFormData,
	IDurationUnit,
	IKeyResult,
	IKeyResultFormData,
} from "@/types/types.utils";

import { useState, useEffect, forwardRef } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";

import { PerformanceForm, type FormField } from "../common/performance-form";
import { KeyResultModal } from "../key-results/key-results-modal";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { KEY_RESULTS_API } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
		}))

		const fields: FormField[] = [
			{
				name: "name",
				label: "Objective Name",
				type: "text",
				placeholder: "e.g., Increase team productivity",
				required: true,
				validation: (value: string) => {
					if (value.length < 5) return "Objective name must be at least 5 characters"
					return null
				},
			},
			{
				name: "creation_date",
				label: "Creation Date",
				type: "date",
				required: true,
				validation: (value: string) => {
					if (value.length < 5) return "Objective name must be at least 5 characters"
					return null
				},
			},
			{
				name: "description",
				label: "Description",
				type: "textarea",
				placeholder: "Describe the objective in detail...",
				required: true,
				validation: (value: string) => {
					if (value.length < 10) return "Description must be at least 10 characters"
					return null
				},
			},
			{
				name: "duration",
				label: "Duration",
				type: "number",
				placeholder: "e.g., 3",
				required: true,
				validation: (value: string) => {
					const num = Number.parseInt(value)
					if (num < 1) return "Duration must be at least 1"
					if (num > 365) return "Duration cannot exceed 365"
					return null
				},
			},
			{
				name: "duration_unit",
				label: "Duration Unit",
				type: "select",
				options: durationUnitOptions,
				required: true,
			},
			{
				name: "key_result",
				label: "Key Result (Optional)",
				type: "select",
				options: keyResultOptions,
				placeholder: "Select a key result",
			},
			{
				name: "self_employee_progress_update",
				label: "Self Progress Updates",
				type: "switch",
				description: "Allow employees to update their own progress",
			},
		]

		const handleSubmit = (formData: IObjectiveFormData) => {
			if (!currentInstitution) return;

			const objectiveData: IObjectiveFormData = {
				institution: currentInstitution.id,
				name: formData.name,
				description: formData.description,
				duration: formData.duration,
				duration_unit: formData.duration_unit as IDurationUnit,
				managers_id: managersValue.length > 0 ? Number(managersValue[0]) : undefined,
				assignees_id: assigneesValue.map(item => Number(item)),
				key_result: formData.key_result ? Number(formData.key_result) : undefined,
				self_employee_progress_update: formData.self_employee_progress_update || false,
				creation_date: formData.creation_date
			}

			onSubmit(objectiveData);
		};

		const getInitialFormData = () => {
			if (!initialData) return {}

			return {
				name: initialData.name,
				description: initialData.description,
				duration: initialData.duration,
				duration_unit: initialData.duration_unit,
				key_result: initialData.key_result?.id,
				self_employee_progress_update: initialData.self_employee_progress_update,
			}
		}

		return (
			<div className="space-y-6 ">
				<PerformanceForm<IObjectiveFormData>
					ref={ref}
					fields={fields}
					initialData={getInitialFormData()}
					onSubmit={handleSubmit}
					isLoading={isLoading}
					submitLabel={initialData ? "Update Objective" : "Create Objective"}
					showCancel={false}
					showSubmit={false}
				/>

				<div className="border-t pt-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-slate-900">Key Result</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setIsKeyResultModalOpen(true)}
							disabled={isLoading}
							className="flex items-center gap-2"
						>
							<Plus className="h-4 w-4" />
							Add Key Result
						</Button>
					</div>
					<p className="text-sm text-slate-600 mb-4">
						You can select an existing key result or create a new one to link with this objective.
					</p>
				</div>

				<div className="border-t pt-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Assignment</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-700">Manager (Optional)</label>
							<EmployeeSearchableSelect
								value={managersValue}
								onValueChange={setManagersValue}
								placeholder="Select manager"
								multiple={false}
								disabled={isLoading}
							/>
							<p className="text-xs text-slate-500">Manager responsible for this objective</p>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-700">Assignee (Optional)</label>
							<EmployeeSearchableSelect
								value={assigneesValue}
								onValueChange={setAssigneesValue}
								placeholder="Select assignee"
								multiple={false}
								disabled={isLoading}
							/>
							<p className="text-xs text-slate-500">Employee assigned to achieve this objective</p>
						</div>
					</div>
				</div>

				<KeyResultModal
					isOpen={isKeyResultModalOpen}
					onClose={() => setIsKeyResultModalOpen(false)}
					onSubmit={handleCreateKeyResult}
					isLoading={isCreatingKeyResult}
				/>
			</div>
		);
	},
);

ObjectiveForm.displayName = "ObjectiveForm"