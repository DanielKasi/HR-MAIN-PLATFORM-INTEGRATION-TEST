"use client";

import React, { useState, useEffect } from "react";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import {
	ArrowLeft,
	Calendar,
	FileText,
	MoreHorizontal,
	Pencil,
	Plus,
	Trash2,
	Upload,
} from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { USER_GROUPS_API } from "@/lib/api/approvals/utils";
import { Button } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors-context-aware";
import { PROJECTS_API, showErrorToast, PROJECT_STATUS_API } from "@/lib/utils";
import { IProjectFormData } from "@/types/types.utils";
import RelatedUserSearchableSelect from "@/components/selects/related-user-searchable-select";
import { IUserGroup } from "@/types/approvals.types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/platform/v1/components";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/platform/v1/components";
import { RichTextEditor } from "@/components/common/rich-editor";
import StaffGroupsSearchableSelect from "@/components/selects/staff-groups-searchable-select";
import { CustomFieldsModal } from "@/components/common/dialogs/project-custom-fields-dialog";
import { ProjectTaskStatusDialog } from "@/components/common/dialogs/project-task-status-dialog";
import { ProjectStatusDialog } from "../project-statuses/_components/project-status-create-edit-dialog";
import { IProjectStatus, IProjectTaskStatusFormData } from "@/types/project.type";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import RichTextDisplay from "@/components/common/rich-text-display";

export default function AddProjectPage() {
	const router = useModuleNavigation();
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const [documentNames, setDocumentNames] = useState<string[]>([]);
	const MAX_DATE_TODAY = new Date().toISOString().split("T")[0];
	const Date18YearsOld = new Date();
	const [userGroups, setUserGroups] = useState<IUserGroup[]>([]);
	const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
	Date18YearsOld.setFullYear(new Date().getFullYear() - 18);
	const [projectStatuses, setProjectStatuses] = useState<
		{ id: number; status_name: string; color_code: string }[]
	>([]);
	const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
	const [currentDocName, setCurrentDocName] = useState("");
	const [currentDocFile, setCurrentDocFile] = useState<File | null>(null);
	const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
	const [isTaskStatusDialogOpen, setIsTaskStatusDialogOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingStatus, setEditingStatus] = useState<IProjectTaskStatusFormData | null>(null);
	const [] = useState<number | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<IProjectStatus | null>(null);
	const [formData, setFormData] = useState<IProjectFormData>({
		project_name: "",
		description: "",
		start_date: "",
		end_date: "",
		project_status: 0,
		institution: 0,
		user_manager: 0,
		user_assignees: [],
		staff_group_assignees: [],
		completion_date: "",
		milestones: "",
		custom_fields: [],
		project_task_statuses: [],
	});

	const handleAddTaskStatus = (statusData: IProjectTaskStatusFormData) => {
		if (editingStatus) {
			setFormData((prev) => ({
				...prev,
				project_task_statuses:
					prev.project_task_statuses?.map((status) =>
						status.name === editingStatus.name ? statusData : status,
					) || [],
			}));
			toast.success("Task status updated");
			setEditingStatus(null);
		} else {
			setFormData((prev) => ({
				...prev,
				project_task_statuses: [...(prev.project_task_statuses || []), statusData],
			}));
			toast.success("Task status added");
		}
	};

	const openCreateDialog = () => {
		setSelectedStatus(null);
		setDialogOpen(true);
	};

	const openEditDialog = (status: IProjectStatus) => {
		setSelectedStatus(status);
		setDialogOpen(true);
	};

	const handleDeleteTaskStatus = (statusName: string) => {
		setFormData((prev) => ({
			...prev,
			project_task_statuses:
				prev.project_task_statuses?.filter((status) => status.name !== statusName) || [],
		}));
	};

	const updateFormData = <K extends keyof IProjectFormData>(
		field: K,
		value: IProjectFormData[K],
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const removeFeedbackField = (index: number) => {
		const updatedFields = (formData.custom_fields || []).filter((_, i) => i !== index);
		updateFormData("custom_fields", updatedFields);
	};

	const handleAddDocument = () => {
		if (!currentDocName.trim()) {
			showErrorToast({
				error: null,
				defaultMessage: "Document name is required",
			});
			return;
		}
		if (!currentDocFile) {
			showErrorToast({ error: null, defaultMessage: "Please select a file" });
			return;
		}

		setSelectedDocuments([...selectedDocuments, currentDocFile]);
		setDocumentNames([...documentNames, currentDocName]);

		setCurrentDocName("");
		setCurrentDocFile(null);
		setIsDocumentDialogOpen(false);
	};

	const removeDocument = (index: number) => {
		setSelectedDocuments((prev) => prev.filter((_, i) => i !== index));
	};
	useEffect(() => {
		if (currentInstitution) {
			setFormData((prev) => ({ ...prev, institution: currentInstitution.id }));
		}
	}, [currentInstitution]);

	const fetchProjectStatuses = async () => {
		try {
			const statusesRes = await PROJECT_STATUS_API.getPaginatedProjectStatuses({});
			setProjectStatuses(statusesRes.results || []);

			if (statusesRes.results?.length > 0 && formData.project_status === 0) {
				setFormData((prev) => ({
					...prev,
					project_status: statusesRes.results[0].id,
				}));
			}
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to load statuses",
			});
		}
	};

	useEffect(() => {
		const loadData = async () => {
			if (!currentInstitution) return;

			try {
				await fetchProjectStatuses();
				const userGroupsRes = await USER_GROUPS_API.fetchAll();
				setUserGroups(userGroupsRes.results || []);
			} catch (error) {
				showErrorToast({
					error,
					defaultMessage: "Failed to load data",
				});
			}
		};

		loadData();
	}, [currentInstitution]);

	useEffect(() => {
		const fetchTaskStatuses = async () => {
			if (!currentInstitution) {
				return;
			}
			try {
				const response = await PROJECTS_API.getDefaultTaskStatuses();
				setFormData((prev) => ({
					...prev,
					project_task_statuses: response.map((res, idx) => ({
						...res,
						id: idx,
						institution: currentInstitution.id,
					})),
				}));
			} catch (error) {
				showErrorToast({
					error,
					defaultMessage: "Failed to load task statuses",
				});
				toast.error("Failed to load task statuses");
			}
		};
		fetchTaskStatuses();
	}, [currentInstitution]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentInstitution) {
			return;
		}

		const newErrors: Partial<Record<keyof typeof formData, string>> = {};

		if (!formData.user_manager) {
			newErrors.user_manager = "This field is required.";
			showErrorToast({
				error: null,
				defaultMessage: "A project leader is required",
			});
		}

		if (formData.project_status === 0) {
			newErrors.project_status = "This field is required.";
			showErrorToast({
				error: null,
				defaultMessage: "Please select a project status.",
			});
			return;
		}

		if (!formData.project_name.trim()) {
			newErrors.project_name = "Project name is required.";
			showErrorToast({
				error: new Error("Project name is required."),
				defaultMessage: "Please provide a project name.",
			});
			return;
		}

		if (!formData.project_task_statuses || formData.project_task_statuses.length === 0) {
			showErrorToast({
				error: null,
				defaultMessage: "Please add at least one task status for the project.",
			});
			return;
		}
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		setLoading(true);
		try {
			const formDataToSend = new FormData();

			formDataToSend.append("project_name", formData.project_name);
			formDataToSend.append("description", formData.description);
			formData.start_date && formDataToSend.append("start_date", formData.start_date);
			formData.end_date && formDataToSend.append("end_date", formData.end_date);
			formDataToSend.append("project_status", formData.project_status.toString());
			formDataToSend.append("institution", currentInstitution.id.toString());

			formData.user_manager &&
				formDataToSend.append("user_manager", formData.user_manager.toString());
			formData.user_assignees.forEach((id) => {
				formDataToSend.append("user_assignees[]", id.toString());
			});

			formData.staff_group_assignees.forEach((id) => {
				formDataToSend.append("staff_group_assignees[]", id.toString());
			});

			if (formData.completion_date) {
				formDataToSend.append("completion_date", formData.completion_date);
			}

			if (formData.milestones) {
				formDataToSend.append("milestones", formData.milestones);
			}

			if (formData.custom_fields && formData.custom_fields.length > 0) {
				formData.custom_fields.forEach((field) => {
					formDataToSend.append("custom_fields[]", JSON.stringify(field));
				});
			}

			if (formData.project_task_statuses && formData.project_task_statuses.length > 0) {
				formDataToSend.append(
					"project_task_statuses",
					JSON.stringify(
						formData.project_task_statuses.map((st) => ({
							...st,
							institution: currentInstitution.id,
						})),
					),
				);
			}

			selectedDocuments.forEach((file) => {
				formDataToSend.append("documents[]", file);
			});

			documentNames.forEach((name) => {
				formDataToSend.append("document_names[]", name);
			});

			await PROJECTS_API.create({
				institutionId: currentInstitution.id,
				data: formDataToSend,
			});

			toast.success("Project created successfully!");
			router.push("/projects");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error creating project" });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof typeof formData, value: string | number | number[]) => {
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
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center justify-start gap-4 mb-2">
					<Link href="/projects">
						<Button variant="outline" size="sm" className="rounded-full !aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
						Create New Project
					</h1>
				</div>
				<p className="text-slate-600 text-lg">Set up your project with all the necessary details</p>
			</div>

			{/* Form */}
			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Project Name & Description */}
				<div className="space-y-6">
					<div className="space-y-3">
						<Label htmlFor="project_name" className="text-base font-medium">
							Project Name *
						</Label>
						<Input
							id="project_name"
							value={formData.project_name}
							onChange={(e) => handleInputChange("project_name", e.target.value)}
							placeholder="Enter a descriptive project name"
							className="h-12 text-base border-slate-200 focus:border-blue-500"
							required
						/>
					</div>
					<div className="space-y-3">
						<Label htmlFor="description" className="text-base font-medium">
							Project Description *
						</Label>
						<RichTextEditor
							value={formData.description || ""}
							onChange={(value) => handleInputChange("description", value)}
							maxLength={1000}
						/>
					</div>
				</div>

				{/* Dates */}
				<div className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<Label htmlFor="start_date" className="text-base font-medium">
								Start Date
							</Label>
							<Input
								id="start_date"
								type="date"
								min={MAX_DATE_TODAY}
								value={formData.start_date || ""}
								onChange={(e) => handleInputChange("start_date", e.target.value)}
								className="h-12 text-base border-slate-200 focus:border-blue-500"
							/>
						</div>
						<div className="space-y-3">
							<Label htmlFor="end_date" className="text-base font-medium">
								End Date
							</Label>
							<Input
								id="end_date"
								type="date"
								min={formData.start_date || undefined}
								value={formData.end_date || ""}
								onChange={(e) => handleInputChange("end_date", e.target.value)}
								className="h-12 text-base border-slate-200 focus:border-blue-500"
							/>
						</div>

						<div className="space-y-3">
							<Label htmlFor="completion_date" className="text-base font-medium">
								Completion Date
							</Label>
							<Input
								id="completion_date"
								type="date"
								value={formData.completion_date || ""}
								onChange={(e) => handleInputChange("completion_date", e.target.value)}
								className="h-12 text-base border-slate-200 focus:border-blue-500"
							/>
						</div>
						{/* Project Status */}
						<div className="space-y-3">
							<div className="flex items-center justify-start gap-8">
								<Label htmlFor="project_status" className="text-base font-medium">
									Project Status *
								</Label>
								<Button
									size={"sm"}
									type="button"
									variant={"ghost"}
									className="rounded-xl"
									onClick={() => setDialogOpen(true)}
								>
									<Plus className="!w-4 !h-4" />
								</Button>
							</div>
							<Select
								value={formData.project_status.toString()}
								onValueChange={(value) => handleInputChange("project_status", Number(value))}
							>
								<SelectTrigger className="h-12 rounded-2xl">
									<SelectValue placeholder="Select a status" />
								</SelectTrigger>
								<SelectContent>
									{projectStatuses.map((status) => (
										<SelectItem key={status.id} value={status.id.toString()}>
											<div className="flex items-center gap-2">
												<div
													className="w-3 h-3 rounded-full"
													style={{ backgroundColor: status.color_code }}
												/>
												{status.status_name}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{formData.start_date && formData.end_date && (
						<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
							<div className="flex items-center gap-2 text-blue-800">
								<Calendar className="h-5 w-5" />
								<span className="font-medium">Project Duration</span>
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

				{/* Project Leaders and Members */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Left Column: Leaders Section */}
					<div className="space-y-4">
						<div className="flex flex-col-reverse min-h-[120px]">
							<div>
								<Label className="text-base font-medium mb-2 block">Project Leader *</Label>
								{errors.user_manager && (
									<p className="text-sm text-red-600 mb-2">{errors.user_manager}</p>
								)}
								<RelatedUserSearchableSelect
									value={formData.user_manager ? [formData.user_manager] : []}
									relatedUserId={currentUser?.id || null}
									onValueChange={(values) => {
										const newValue = values.length > 0 ? Number(values[0]) : 0;
										setFormData((prev) => ({
											...prev,
											user_manager: newValue,
											// Clear assignees when leader changes since they'll be from different branches
											user_assignees: [],
										}));
									}}
									placeholder={
										currentUser ? "Select project leader from your branch" : "Please log in first"
									}
									multiple={false}
									disabled={!currentUser}
								/>
							</div>
						</div>
					</div>

					{/* Right Column: Members Section */}
					<div className="space-y-4">
						<div className="flex flex-col-reverse min-h-[120px]">
							<div>
								<Label className="text-base font-medium mb-2 block">Project Members *</Label>
								{errors.user_assignees && (
									<p className="text-sm text-red-600 mb-2">{errors.user_assignees}</p>
								)}
								<RelatedUserSearchableSelect
									value={formData.user_assignees}
									relatedUserId={formData.user_manager || null}
									onValueChange={(values) => {
										setFormData((prev) => ({
											...prev,
											user_assignees: values.map((val) => Number(val)),
										}));
									}}
									placeholder={
										formData.user_manager
											? "Select project members from leader's branch"
											: "Please select a project leader first"
									}
									multiple={true}
									disabled={!formData.user_manager}
								/>
							</div>
						</div>
					</div>
					<div>
						<Label className="text-base font-medium mb-2 block">Member Groups</Label>
						<StaffGroupsSearchableSelect
							placeholder="Select member groups..."
							value={formData.staff_group_assignees}
							onValueChange={(values) => {
								handleInputChange("staff_group_assignees", values.map(Number));
							}}
							multiple={true}
						/>
					</div>
				</div>

				{/* Heading */}
				<div className="flex items-center gap-2 mb-6">
					<Label className="text-lg font-semibold text-gray-900 block">Project Task Statuses</Label>
					<Button
						type="button"
						variant="default"
						onClick={() => setIsTaskStatusDialogOpen(true)}
						className="w-auto ml-4 text-white p-2 rounded-md h-8 flex items-center justify-center"
						aria-label="Add Task Status"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>

				{/* Task Status Cards Grid */}
				<div className="grid gap-4 md:grid-cols-3">
					{(formData.project_task_statuses || []).map((status) => (
						<div
							key={status.name}
							className="relative rounded-lg bg-[#F4F4F9] p-4 border border-gray-100"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-2 flex-1">
									{/* Colored Dot Indicator */}
									<div
										className="w-3 h-3 rounded-full flex-shrink-0 -mt-8"
										style={{ backgroundColor: status.color_code || "#6B7280" }}
									/>
									<div className="flex-1">
										<h3 className="font-medium text-black">{status.name}</h3>
										{status.description && (
											<RichTextDisplay
												htmlContent={status.description || "—"}
												className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3"
											/>
										)}
									</div>
								</div>
								<div className="flex items-center gap-1">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-gray-600 hover:bg-transparent"
											>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-40">
											<DropdownMenuItem
												onClick={() => {
													setEditingStatus(status);
													setIsTaskStatusDialogOpen(true);
												}}
												className="cursor-pointer"
											>
												<Pencil className="h-4 w-4 mr-2" />
												Edit
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleDeleteTaskStatus(status.name)}
												className="cursor-pointer text-red-600 focus:text-red-600"
											>
												<Trash2 className="h-4 w-4 mr-2" />
												Remove
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* --- Custom Task Fields Section (moved first) --- */}
				<div className="space-y-2 mt-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center pt-4">
							<Label className="text-base font-medium">Custom Task Fields</Label>
							<Button
								type="button"
								variant="default"
								onClick={() => setIsCustomFieldsModalOpen(true)}
								disabled={isCreating}
								className="w-auto ml-4 text-white p-2 rounded-md h-8 flex items-center justify-center"
								aria-label="Add Custom Field"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<span className="text-sm text-muted-foreground">
							{formData.custom_fields?.length || 0} field(s)
						</span>
					</div>

					<CustomFieldsModal
						isOpen={isCustomFieldsModalOpen}
						onOpenChange={(open) => setIsCustomFieldsModalOpen(open)}
						fields={formData.custom_fields || []}
						onFieldsChange={(fields) => updateFormData("custom_fields", fields)}
					/>

					{formData.custom_fields && formData.custom_fields.length > 0 && (
						<div className="mt-4 p-3 border rounded-lg bg-slate-50">
							<h4 className="text-sm font-semibold text-gray-700 mb-3">
								Added Fields ({formData.custom_fields.length})
							</h4>
							<div className="space-y-2 max-h-32 overflow-y-auto">
								{formData.custom_fields.map((field, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-2 bg-white border rounded-md shadow-sm"
									>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-gray-900 truncate">{field.label}</p>
											<div className="flex items-center gap-2 mt-1">
												<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
													{field.type.charAt(0).toUpperCase() + field.type.slice(1)}
												</span>
												{field.options && (
													<span className="text-xs text-gray-500">
														{field.options.length} options
													</span>
												)}
											</div>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => removeFeedbackField(index)}
											className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* --- Project Documents Section (comes second) --- */}
				<div className="space-y-3 mt-8">
					<div className="flex items-center pt-4">
						<Label className="text-base font-medium">Project Documents</Label>
						<Button
							type="button"
							variant="default"
							onClick={() => setIsDocumentDialogOpen(true)}
							className="w-auto ml-4 text-white p-2 rounded-md h-8 flex items-center justify-center"
							aria-label="Add Document"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>

					{selectedDocuments.length > 0 && (
						<div className="space-y-2">
							{selectedDocuments.map((file, index) => (
								<div
									key={index}
									className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
								>
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">{documentNames[index]}</p>
											<p className="text-xs text-gray-500 truncate">
												{file.name} ({(file.size / 1024).toFixed(1)} KB)
											</p>
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => removeDocument(index)}
										className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
									>
										×
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Add Document Dialog */}
				<Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
					<DialogContent className="w-[95vw] max-w-md mx-auto">
						<DialogHeader>
							<DialogTitle className="text-base sm:text-lg">Add Document</DialogTitle>
						</DialogHeader>

						<div className="space-y-4 py-4 px-2 sm:px-4">
							<div className="space-y-2">
								<Label htmlFor="doc-name" className="text-xs sm:text-sm">
									Document Name *
								</Label>
								<Input
									id="doc-name"
									placeholder="e.g., Project Charter..."
									value={currentDocName}
									onChange={(e) => setCurrentDocName(e.target.value)}
									className="h-10 sm:h-11 text-xs sm:text-sm"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="doc-file" className="text-xs sm:text-sm">
									Select File *
								</Label>
								<input
									id="doc-file"
									type="file"
									accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
									className="sr-only"
									onChange={(e) => {
										if (e.target.files && e.target.files[0]) {
											setCurrentDocFile(e.target.files[0]);
										}
									}}
								/>
								<label htmlFor="doc-file">
									<div className="flex items-center justify-center gap-2 p-3 sm:p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
										<Upload className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
										<span className="text-xs sm:text-sm text-gray-600 truncate">
											{currentDocFile ? currentDocFile.name : "Choose file..."}
										</span>
									</div>
								</label>
								{currentDocFile && (
									<p className="text-xs text-gray-500 mt-1">
										{(currentDocFile.size / 1024).toFixed(1)} KB
									</p>
								)}
							</div>
						</div>

						<DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setCurrentDocName("");
									setCurrentDocFile(null);
									setIsDocumentDialogOpen(false);
								}}
								className="w-full sm:w-auto text-xs sm:text-sm"
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleAddDocument}
								className="w-full sm:w-auto text-xs sm:text-sm"
							>
								Add Document
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<ProjectTaskStatusDialog
					open={isTaskStatusDialogOpen}
					onOpenChange={(open) => {
						if (!open) setEditingStatus(null);
						setIsTaskStatusDialogOpen(open);
					}}
					onSave={handleAddTaskStatus}
					initialData={editingStatus}
				/>

				<ProjectStatusDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					initialData={selectedStatus}
					onSuccess={fetchProjectStatuses}
				/>

				{/* Submit Button */}
				<div className="flex justify-between pt-6">
					<Button type="submit" className="px-8 md:px-24 rounded-full" disabled={loading}>
						{loading ? "Creating..." : "Create Project"}
					</Button>
				</div>
			</form>
		</div>
	);
}
