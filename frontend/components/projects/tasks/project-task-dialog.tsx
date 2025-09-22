"use client";

import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
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
import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";
import { IProjectTask, IProjectTaskFormData } from "@/types/types.utils";
import { toast } from "sonner";
import { PROJECTS_TASKS_API, showErrorToast } from "@/lib/utils";

interface TaskDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: Partial<IProjectTaskFormData>) => Promise<void>;
	projectId: number;
	initialData?: IProjectTask | null;
}

export default function TaskDialog({
	isOpen,
	onClose,
	onSave,
	projectId,
	initialData,
}: TaskDialogProps) {
	const [formData, setFormData] = useState<Partial<IProjectTaskFormData>>({
		project: projectId,
		task_name: initialData?.task_name || "",
		description: initialData?.description || "",
		managers: initialData?.managers.map((manager) => manager.id),
		assigned_to: initialData?.assignees.map((assignee) => assignee.id),
		start_date: initialData?.start_date || "",
		end_date: initialData?.end_date || "",
		task_status: initialData?.task_status || "not_started",
		priority: initialData?.priority || "medium",
	});
	const [errors, setErrors] = useState<Partial<Record<keyof IProjectTaskFormData, string>>>({});
	const [loading, setLoading] = useState(false);
	const maxDateToday = new Date().toISOString().split("T")[0];

	useEffect(() => {
		if (initialData) {
			setFormData({
				project: projectId,
				task_name: initialData?.task_name || "",
				description: initialData?.description || "",
				managers: initialData?.managers.map((manager) => manager.id),
				assigned_to: initialData?.assignees.map((assignee) => assignee.id),
				start_date: initialData?.start_date || "",
				end_date: initialData?.end_date || "",
				task_status: initialData?.task_status || "not_started",
				priority: initialData?.priority || "medium",
			});
		}
	}, [initialData]);

	const handleInputChange = (
		field: keyof IProjectTaskFormData,
		value: string | number[] | undefined,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: undefined }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const newErrors: Partial<Record<keyof IProjectTaskFormData, string>> = {};

		if (!formData.task_name) newErrors.task_name = "Task name is required.";
		if (!formData.description) newErrors.description = "Description is required.";
		if (!formData.start_date) newErrors.start_date = "Start date is required.";
		if (!formData.end_date) newErrors.end_date = "End date is required.";
		if (new Date(formData.start_date || "") > new Date(formData.end_date || "")) {
			newErrors.end_date = "End date must be after start date.";
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		setLoading(true);
		try {
			const dataToSubmit = { ...formData, project: projectId };
			if (!initialData) {
				await PROJECTS_TASKS_API.create({
					projectId,
					data: dataToSubmit,
				});
			} else {
				await PROJECTS_TASKS_API.update({
					taskId: initialData.id,
					data: dataToSubmit,
				});
			}
			toast.success(`Task  ${initialData ? "updated " : "created "} successfully`);
			await onSave(dataToSubmit);
			await onClose();
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: `Failed to ${initialData ? "update " : "create"} task`,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="">
				<DialogHeader>
					<DialogTitle>{initialData ? "Edit Task" : "Add New Task"}</DialogTitle>
					<DialogDescription>
						{initialData ? "Update task details" : "Create a new task for the project"}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-6 ">
					<div className="space-y-4 px-4 overflow-y-auto max-h-[70svh] md:max-h-[60svh]">
						<div className="space-y-2">
							<Label htmlFor="task_name">Task Name *</Label>
							<Input
								id="task_name"
								value={formData.task_name || ""}
								onChange={(e) => handleInputChange("task_name", e.target.value)}
								placeholder="Enter task name"
							/>
							{errors.task_name && <p className="text-red-600 text-sm">{errors.task_name}</p>}
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description *</Label>
							<Textarea
								id="description"
								value={formData.description || ""}
								onChange={(e) => handleInputChange("description", e.target.value)}
								placeholder="Enter task description"
							/>
							{errors.description && <p className="text-red-600 text-sm">{errors.description}</p>}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="start_date">Start Date *</Label>
								<Input
									id="start_date"
									type="date"
									value={formData.start_date || ""}
									onChange={(e) => handleInputChange("start_date", e.target.value)}
									min={maxDateToday}
								/>
								{errors.start_date && <p className="text-red-600 text-sm">{errors.start_date}</p>}
							</div>
							<div className="space-y-2">
								<Label htmlFor="end_date">End Date *</Label>
								<Input
									id="end_date"
									type="date"
									value={formData.end_date || ""}
									onChange={(e) => handleInputChange("end_date", e.target.value)}
									min={formData.start_date || maxDateToday}
								/>
								{errors.end_date && <p className="text-red-600 text-sm">{errors.end_date}</p>}
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="task_status">Status *</Label>
							<Select
								value={formData.task_status || "not_started"}
								onValueChange={(value) => handleInputChange("task_status", value)}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue placeholder="Select status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="not_started">Not Started</SelectItem>
									<SelectItem value="in_progress">In Progress</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="on_hold">On Hold</SelectItem>
									<SelectItem value="cancelled">Cancelled</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="priority">Priority *</Label>
							<Select
								value={formData.priority || "medium"}
								onValueChange={(value) => handleInputChange("priority", value)}
							>
								<SelectTrigger className="rounded-xl">
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
						<div className="space-y-2">
							<Label>Task Leaders (Optional)</Label>
							<UserProfileSearchableSelect
								value={formData.managers || []}
								onValueChange={(values) =>
									handleInputChange(
										"managers",
										values.map((val) => Number(val)),
									)
								}
								placeholder="Select task leaders"
								multiple
							/>
						</div>
						<div className="space-y-2">
							<Label>Assign To (Optional)</Label>
							<UserProfileSearchableSelect
								value={formData.assigned_to || []}
								onValueChange={(values) =>
									handleInputChange(
										"assigned_to",
										values.map((val) => Number(val)),
									)
								}
								placeholder="Select assignees"
								multiple
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="submit" className="w-full rounded-full" disabled={loading}>
							{loading ? "Saving..." : initialData ? "Update Task" : "Create Task"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
