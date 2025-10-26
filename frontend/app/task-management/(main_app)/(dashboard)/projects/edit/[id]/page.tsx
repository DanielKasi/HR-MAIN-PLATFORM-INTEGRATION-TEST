"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Button } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { Textarea } from "@/platform/v1/components";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/platform/v1/components";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors-context-aware";
import { PROJECT_STATUS_API, PROJECTS_API, showErrorToast } from "@/lib/utils";
import { IProjectFormData } from "@/types/types.utils";
import { FixedLoader } from "@/platform/v1/components";
import UserSearchableSelect from "@/components/selects/user-searchable-select";
import RelatedUserSearchableSelect from "@/components/selects/related-user-searchable-select";
import StaffGroupsSearchableSelect from "@/components/selects/staff-groups-searchable-select";
import { RichTextEditor } from "@/components/common/rich-editor";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

export default function EditProjectPage() {
	const router = useModuleNavigation();
	const params = useParams();
	const project_id = params.id;
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(false);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const [projectStatuses, setProjectStatuses] = useState<{ id: number; status_name: string }[]>([]);
	const MAX_DATE_TODAY = new Date().toISOString().split("T")[0];
	const Date18YearsOld = new Date();

	Date18YearsOld.setFullYear(new Date().getFullYear() - 18);

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
		completion_date: undefined,
		milestones: undefined,
	});

	useEffect(() => {
		if (currentInstitution) {
			setFormData((prev) => ({ ...prev, institution: currentInstitution.id }));
		}
	}, [currentInstitution]);

	useEffect(() => {
		fetchProject();
	}, [project_id, currentInstitution, router]);

	useEffect(() => {
		const loadStatuses = async () => {
			try {
				const res = await PROJECT_STATUS_API.getPaginatedProjectStatuses({});
				setProjectStatuses(res.results || []);
			} catch (error) {
				showErrorToast({ error, defaultMessage: "Failed to load statuses" });
			}
		};
		loadStatuses();
	}, []);

	const fetchProject = async () => {
		if (!project_id || !currentInstitution) return;
		setFetching(true);
		try {
			const project = await PROJECTS_API.getByProjectById({
				project_id: Number(project_id),
			});

			setFormData({
				project_name: project.project_name,
				description: project.description,
				start_date: project.start_date,
				end_date: project.end_date,
				project_status: project.project_status?.id || 0,
				institution: project.institution ?? 0,
				user_manager: project.user_manager?.id || 0,
				user_assignees: project.user_assignees?.map((member) => member.id) || [],
				staff_group_assignees: project.staff_group_assignees?.map((g) => g.id) || [],
				completion_date: project.completion_date || undefined,
				milestones: JSON.stringify(project.milestones) || "",
			});
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Error fetching project details",
			});
			router.push("/projects");
		} finally {
			setFetching(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentInstitution || !project_id) {
			return;
		}

		setLoading(true);
		try {
			await PROJECTS_API.update({
				project_id: Number(project_id),
				data: {
					...formData,
					start_date: !!formData.start_date ? formData.start_date : null,
					end_date: !!formData.end_date ? formData.end_date : null,
					completion_date: !!formData.completion_date ? formData.completion_date : null,
				},
			});
			toast.success("Project updated successfully!");
			router.push("/projects");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error updating project" });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof IProjectFormData, value: string | number | number[]) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));

		if (errors[field]) {
			setErrors((prev) => ({
				...prev,
				[field]: [],
			}));
		}
	};

	return (
		<div className="min-h-screen p-4 sm:p-6 bg-white rounded-xl">
			<div className="">
				{/* Header */}
				<div className="mb-6 sm:mb-8">
					<div className="flex items-center justify-start gap-3 sm:gap-4 mb-2 sm:mb-3">
						<Link href="/projects">
							<Button size="sm" variant="outline" className="rounded-full aspect-square">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
							Edit Project
						</h1>
					</div>
					<p className="text-slate-600 text-xs sm:text-sm ml-3">
						Update your project with all the necessary details
					</p>
				</div>

				{/* Form */}
				<div>
					{fetching ? (
						<FixedLoader />
					) : (
						<form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
							<div className="space-y-4 sm:space-y-6">
								<div className="space-y-2 sm:space-y-3">
									<Label htmlFor="project_name" className="text-sm sm:text-base font-medium">
										Project Name *
									</Label>
									<Input
										id="project_name"
										value={formData.project_name}
										onChange={(e) => handleInputChange("project_name", e.target.value)}
										placeholder="Enter a descriptive project name"
										className="h-10 sm:h-12 text-sm sm:text-base border-slate-200 focus:border-blue-500"
										required
									/>
								</div>
								<div className="space-y-2 sm:space-y-3">
									<Label htmlFor="description" className="text-sm sm:text-base font-medium">
										Project Description *
									</Label>
									<RichTextEditor
										value={formData.description || ""}
										onChange={(value) => handleInputChange("description", value)}
										maxLength={1000}
									/>
								</div>
							</div>

							<div className="space-y-4 sm:space-y-6">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
									<div className="space-y-2 sm:space-y-3">
										<Label htmlFor="start_date" className="text-sm sm:text-base font-medium">
											Start Date
										</Label>
										<Input
											id="start_date"
											type="date"
											value={formData.start_date || ""}
											onChange={(e) => handleInputChange("start_date", e.target.value)}
											className="h-10 sm:h-12 text-sm sm:text-base border-slate-200 focus:border-blue-500"
										/>
									</div>
									<div className="space-y-2 sm:space-y-3">
										<Label htmlFor="end_date" className="text-sm sm:text-base font-medium">
											End Date
										</Label>
										<Input
											id="end_date"
											type="date"
											min={formData.start_date || undefined}
											value={formData.end_date || ""}
											onChange={(e) => handleInputChange("end_date", e.target.value)}
											className="h-10 sm:h-12 text-sm sm:text-base border-slate-200 focus:border-blue-500"
										/>
									</div>
								</div>

								{formData.start_date && formData.end_date && (
									<div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
										<div className="flex items-center gap-2 text-blue-800">
											<Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
											<span className="font-medium text-sm sm:text-base">Project Duration</span>
										</div>
										<p className="text-blue-700 mt-1 text-xs sm:text-sm">
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

							<div className="space-y-2 sm:space-y-3">
								<Label htmlFor="project_status" className="text-sm sm:text-base font-medium">
									Project Status *
								</Label>
								<Select
									value={formData.project_status.toString()}
									onValueChange={(value) => handleInputChange("project_status", Number(value))}
								>
									<SelectTrigger className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base">
										<SelectValue placeholder="Select project status" />
									</SelectTrigger>
									<SelectContent className="text-sm sm:text-base">
										{projectStatuses.map((status) => (
											<SelectItem key={status.id} value={status.id.toString()}>
												{status.status_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
								{/* Leaders Selection */}
								<div className="space-y-2 sm:space-y-3">
									<Label className="text-sm sm:text-base font-medium">Project Leader *</Label>
									<RelatedUserSearchableSelect
										value={formData.user_manager ? [formData.user_manager] : []}
										relatedUserId={currentUser?.id || null}
										onValueChange={(values) => {
											const newValue = values.length > 0 ? Number(values[0]) : 0;
											handleInputChange("user_manager", newValue);
											// Clear assignees when leader changes since they'll be from different branches
											handleInputChange("user_assignees", []);
										}}
										placeholder={
											currentUser ? "Select project leader from your branch" : "Please log in first"
										}
										multiple={false}
										disabled={!currentUser}
									/>
									{errors.user_manager && errors.user_manager.length > 0 && (
										<p className="text-xs sm:text-sm text-red-600">{errors.user_manager[0]}</p>
									)}
									{errors.managers && errors.managers.length > 0 && (
										<p className="text-xs sm:text-sm text-red-600">{errors.managers[0]}</p>
									)}
								</div>

								{/* Members Selection */}
								<div className="space-y-2 sm:space-y-3">
									<Label className="text-sm sm:text-base font-medium">Project Members *</Label>
									<RelatedUserSearchableSelect
										value={formData.user_assignees}
										relatedUserId={formData.user_manager || null}
										onValueChange={(values) => {
											handleInputChange(
												"user_assignees",
												values.map((val) => Number(val)),
											);
										}}
										placeholder={
											formData.user_manager
												? "Select project members from leader's branch"
												: "Please select a project leader first"
										}
										multiple={true}
										disabled={!formData.user_manager}
									/>
									{errors.user_assignees && errors.user_assignees.length > 0 && (
										<p className="text-xs sm:text-sm text-red-600">{errors.user_assignees[0]}</p>
									)}
									{errors.assignees && errors.assignees.length > 0 && (
										<p className="text-xs sm:text-sm text-red-600">{errors.assignees[0]}</p>
									)}
								</div>
							</div>

							{/* Member Groups */}
							<div className="space-y-2 sm:space-y-3">
								<Label className="text-sm sm:text-base font-medium">Member Groups</Label>
								<StaffGroupsSearchableSelect
									placeholder="Select member groups..."
									value={formData.staff_group_assignees}
									onValueChange={(values) => {
										handleInputChange("staff_group_assignees", values.map(Number));
									}}
									multiple={true}
								/>
							</div>

							{/* Navigation Buttons */}
							<div className="flex justify-end pt-4 sm:pt-6">
								<Button
									type="submit"
									className="w-full sm:w-auto px-6 sm:px-8 md:px-12 rounded-full text-sm sm:text-base"
									disabled={loading || fetching}
								>
									{loading ? "Updating..." : "Update Project"}
								</Button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
