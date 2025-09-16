"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PROJECTS_TASKS_API, showErrorToast } from "@/lib/utils";
import { UserProfileSearchableSelect } from "@/components/selects/user-profile-searchable-select";
import { toast } from "sonner";
import { IProjectTaskFormData, IProjectTaskStatus } from "@/types/types.utils";
import FixedLoader from "@/components/fixed-loader";

export default function EditTaskPage() {
	const router = useRouter();
	const params = useParams();
	const task_id = params.id;
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(true);
	const [projectId, setProjectId] = useState<number | null>(null);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const currentInstitution = useSelector(selectSelectedInstitution);

	const [formData, setFormData] = useState<IProjectTaskFormData>({
		task_name: "",
		description: "",
		start_date: "",
		end_date: "",
		task_status: "not_started",
		priority: "medium",
		project: 0,
		managers: [],
		assigned_to: [],
	});

	useEffect(() => {
		if (currentInstitution) {
			setFormData((prev) => ({ ...prev, institution: currentInstitution.id }));
		}
	}, [currentInstitution]);

	useEffect(() => {
		fetchTask();
	}, [task_id, currentInstitution, router]);

	const fetchTask = async () => {
		if (!task_id || !currentInstitution) return;
		setFetching(true);
		try {
			const task = await PROJECTS_TASKS_API.getByTaskId({ taskId: Number(task_id) });
			setProjectId(task.project);
			setFormData({
				task_name: task.task_name,
				description: task.description,
				start_date: task.start_date.split("T")[0],
				end_date: task.end_date.split("T")[0],
				task_status: task.task_status,
				priority: task.priority,
				project: task.project,
				managers: task.managers.map((leader) => leader.id),
				assigned_to: task.assigned_to.map((assignee) => assignee.id),
			});
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error fetching task details" });
			router.push("/projects");
		} finally {
			setFetching(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentInstitution || !task_id) {
			return;
		}

		// Validate required fields
		const newErrors: Record<string, string[]> = {};
		if (!formData.task_name) {
			newErrors.task_name = ["Task name is required."];
		}
		if (!formData.description) {
			newErrors.description = ["Description is required."];
		}
		if (!formData.start_date) {
			newErrors.start_date = ["Start date is required."];
		}
		if (!formData.end_date) {
			newErrors.end_date = ["Due date is required."];
		}
		if (
			formData.start_date &&
			formData.end_date &&
			new Date(formData.end_date) < new Date(formData.start_date)
		) {
			newErrors.end_date = ["Due date cannot be before start date."];
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		setLoading(true);
		try {
			await PROJECTS_TASKS_API.update({ taskId: Number(task_id), data: formData });
			toast.success("Task updated successfully!");
			router.push(projectId ? `/projects/${projectId}` : "/projects");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error updating task" });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof IProjectTaskFormData, value: string | number[]) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));

		// Clear errors when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({
				...prev,
				[field]: [],
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
							Edit Task
						</h1>
					</div>
					<p className="text-slate-600 text-lg">Update your task with all the necessary details</p>
				</div>

				{/* Form */}
				<div className="">
					{fetching ? (
						<FixedLoader />
					) : (
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
									{errors.task_name && errors.task_name.length > 0 && (
										<p className="text-sm text-red-600">{errors.task_name[0]}</p>
									)}
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
									{errors.description && errors.description.length > 0 && (
										<p className="text-sm text-red-600">{errors.description[0]}</p>
									)}
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
											value={formData.start_date}
											onChange={(e) => handleInputChange("start_date", e.target.value)}
											className="h-12 text-base border-slate-200 focus:border-blue-500"
											required
										/>
										{errors.start_date && errors.start_date.length > 0 && (
											<p className="text-sm text-red-600">{errors.start_date[0]}</p>
										)}
									</div>
									<div className="space-y-3">
										<Label htmlFor="end_date" className="text-base font-medium">
											Due Date *
										</Label>
										<Input
											id="end_date"
											type="date"
											value={formData.end_date}
											onChange={(e) => handleInputChange("end_date", e.target.value)}
											className="h-12 text-base border-slate-200 focus:border-blue-500"
											required
										/>
										{errors.end_date && errors.end_date.length > 0 && (
											<p className="text-sm text-red-600">{errors.end_date[0]}</p>
										)}
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
											Priority *
										</Label>
										<Select
											value={formData.priority}
											onValueChange={(value) =>
												handleInputChange("priority", value as IProjectTaskFormData["priority"])
											}
										>
											<SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
												<SelectValue placeholder="Select priority" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="low">Low</SelectItem>
												<SelectItem value="medium">Medium</SelectItem>
												<SelectItem value="high">High</SelectItem>
												<SelectItem value="urgent">Urgent</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-3">
										<Label htmlFor="task_status" className="text-base font-medium">
											Status *
										</Label>
										<Select
											value={formData.task_status}
											onValueChange={(value) =>
												handleInputChange("task_status", value as IProjectTaskStatus)
											}
										>
											<SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="not_started">Not Started</SelectItem>
												<SelectItem value="in_progress">In Progress</SelectItem>
												<SelectItem value="on_hold">On Hold</SelectItem>
												<SelectItem value="completed">Completed</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
								{/* Leaders Selection */}
								<div className="space-y-3">
									<Label className="text-base font-medium">Task Leaders (Optional)</Label>
									<UserProfileSearchableSelect
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

								{/* Assignees Selection */}
								<div className="space-y-3">
									<Label className="text-base font-medium">Assign To (Optional)</Label>
									<UserProfileSearchableSelect
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

							{/* Navigation Buttons */}
							<div className="flex justify-between pt-6">
								<Button
									type="submit"
									className="px-8 md:px-24 rounded-full"
									disabled={loading || fetching}
								>
									{loading ? "Updating..." : "Update Task"}
								</Button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
