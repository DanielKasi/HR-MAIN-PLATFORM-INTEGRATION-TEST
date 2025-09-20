"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PROJECTS_TASKS_API, showErrorToast } from "@/lib/utils";
import { IProjectTaskFormData } from "@/types/types.utils";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";

export default function AddTaskPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const projectId = searchParams.get("project");
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<keyof IProjectTaskFormData, string>>>({});
	const currentInstitution = useSelector(selectSelectedInstitution);

	const MAX_DATE_TODAY = new Date().toISOString().split("T")[0];

	const [formData, setFormData] = useState<IProjectTaskFormData>({
		task_name: "",
		description: "",
		start_date: "",
		end_date: "",
		task_status: "not_started",
		priority: "medium",
		project: projectId ? Number(projectId) : 0,
		assigned_to: [],
		managers: [],
	});

	useEffect(() => {
		if (!projectId) {
			setErrors((prev) => ({
				...prev,
				project: "Project ID is required.",
			}));
		}
	}, [projectId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!projectId || !currentInstitution) {
			return;
		}

		const newErrors: Partial<Record<keyof IProjectTaskFormData, string>> = {};

		if (!formData.task_name) {
			newErrors.task_name = "This field is required.";
		}
		if (!formData.description) {
			newErrors.description = "This field is required.";
		}
		if (!formData.start_date) {
			newErrors.start_date = "This field is required.";
		}
		if (!formData.end_date) {
			newErrors.end_date = "This field is required.";
		}
		if (new Date(formData.end_date) < new Date(formData.start_date)) {
			newErrors.end_date = "Due date cannot be before start date.";
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);

			return;
		}

		setLoading(true);
		try {
			await PROJECTS_TASKS_API.create({ projectId: Number(projectId), data: formData });
			toast.success("Task created successfully!");
			router.push(`/projects/${projectId}`);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error creating task" });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof IProjectTaskFormData, value: string | number[]) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));

		if (errors[field]) {
			setErrors((prev) => ({
				...prev,
				[field]: "",
			}));
		}
	};

	return (
		<div className="min-h-screen p-6 bg-white rounded-xl">
			<div className="">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-start gap-4 mb-2">
						<Link href={projectId ? `/projects/${projectId}` : "/projects"}>
							<Button variant="outline" size="sm" className="rounded-full !aspect-square">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
							Create New Task
						</h1>
					</div>
					<p className="text-slate-600 text-lg">Add a new task to your project</p>
				</div>

				{/* Form */}
				<div className="">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="space-y-6">
							<div className="space-y-3">
								<Label htmlFor="task_name" className="text-base font-medium">
									Task Name *
								</Label>
								<Input
									id="task_name"
									value={formData.task_name}
									onChange={(e) => handleInputChange("task_name", e.target.value)}
									placeholder="Enter a clear, actionable task name"
									className="h-12 text-base border-slate-200 focus:border-blue-500"
									required
								/>
								{errors.task_name && <p className="text-sm text-red-600">{errors.task_name}</p>}
							</div>
							<div className="space-y-3">
								<Label htmlFor="description" className="text-base font-medium">
									Task Description *
								</Label>
								<Textarea
									id="description"
									value={formData.description}
									onChange={(e) => handleInputChange("description", e.target.value)}
									placeholder="Describe what needs to be done, acceptance criteria, and any important details..."
									rows={4}
									className="rounded-xl resize-none"
									required
								/>
								{errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
							</div>
						</div>

						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-3">
									<Label htmlFor="start_date" className="text-base font-medium">
										Start Date *
									</Label>
									<Input
										id="start_date"
										type="date"
										max={MAX_DATE_TODAY}
										value={formData.start_date}
										onChange={(e) => handleInputChange("start_date", e.target.value)}
										className="h-12 text-base border-slate-200 focus:border-blue-500"
										required
									/>
									{errors.start_date && <p className="text-sm text-red-600">{errors.start_date}</p>}
								</div>
								<div className="space-y-3">
									<Label htmlFor="end_date" className="text-base font-medium">
										Due Date *
									</Label>
									<Input
										id="end_date"
										type="date"
										min={formData.start_date || MAX_DATE_TODAY}
										value={formData.end_date}
										onChange={(e) => handleInputChange("end_date", e.target.value)}
										className="h-12 text-base border-slate-200 focus:border-blue-500"
										required
									/>
									{errors.end_date && <p className="text-sm text-red-600">{errors.end_date}</p>}
								</div>
							</div>

							{formData.start_date && formData.end_date && (
								<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
									<div className="flex items-center gap-2 text-blue-800">
										<Calendar className="h-5 w-5" />
										<span className="font-medium">Task Duration</span>
									</div>
									<p className="text-blue-700 mt-1">
										{Math.ceil(
											(new Date(formData.end_date).getTime() -
												new Date(formData.start_date).getTime()) /
												(1000 * 60 * 60 * 24),
										)}{" "}
										days
									</p>
								</div>
							)}
						</div>

						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-3">
									<Label htmlFor="priority" className="text-base font-medium">
										Priority Level *
									</Label>
									<Select
										value={formData.priority}
										onValueChange={(value) =>
											handleInputChange("priority", value as IProjectTaskFormData["priority"])
										}
									>
										<SelectTrigger className="h-12 rounded-2xl">
											<SelectValue placeholder="Select priority" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="low">Low Priority</SelectItem>
											<SelectItem value="medium">Medium Priority</SelectItem>
											<SelectItem value="high">High Priority</SelectItem>
											<SelectItem value="urgent">Urgent</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
							<div className="space-y-3">
								<Label className="text-base font-medium">Task Leaders (Optional)</Label>
								<EmployeeSearchableSelect
									value={formData.managers}
									onValueChange={(values) => {
										handleInputChange(
											"managers",
											values.map((val) => Number(val)),
										);
									}}
									placeholder="Select task managers"
									showEmployeeId={false}
									showDepartment={true}
									multiple={true}
								/>
							</div>
							<div className="space-y-3">
								<Label className="text-base font-medium">Assign To (Optional)</Label>
								<EmployeeSearchableSelect
									value={formData.assigned_to}
									onValueChange={(values) => {
										handleInputChange(
											"assigned_to",
											values.map((val) => Number(val)),
										);
									}}
									placeholder="Select assignees"
									showEmployeeId={false}
									showDepartment={true}
									multiple={true}
								/>
							</div>
						</div>

						<div className="flex justify-between pt-6">
							<Button
								type="submit"
								className="px-8 md:px-24 rounded-full"
								disabled={loading || !projectId}
							>
								{loading ? "Creating..." : "Create Task"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
