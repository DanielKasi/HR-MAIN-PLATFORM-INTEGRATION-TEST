"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { PROJECTS_API, showErrorToast } from "@/lib/utils";
import { UserProfileSearchableSelect } from "@/components/selects/user-profile-searchable-select";
import { IProjectFormData, IProjectStatus } from "@/types/types.utils";
import FixedLoader from "@/components/fixed-loader";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";

export default function EditProjectPage() {
	const router = useRouter();
	const params = useParams();
	const project_id = params.id;
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(false);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const currentInstitution = useSelector(selectSelectedInstitution);

	const MAX_DATE_TODAY = new Date().toISOString().split("T")[0];
	const Date18YearsOld = new Date();

	Date18YearsOld.setFullYear(new Date().getFullYear() - 18);
	const MAX_DATE_18 = Date18YearsOld.toISOString().split("T")[0];

	const [formData, setFormData] = useState<IProjectFormData>({
		project_name: "",
		description: "",
		start_date: "",
		end_date: "",
		project_status: "planning",
		institution: 0,
		managers: [],
		assignees: [],
	});

	useEffect(() => {
		if (currentInstitution) {
			setFormData((prev) => ({ ...prev, institution: currentInstitution.id }));
		}
	}, [currentInstitution]);

	useEffect(() => {
		fetchProject();
	}, [project_id, currentInstitution, router]);

	const fetchProject = async () => {
		if (!project_id || !currentInstitution) return;
		setFetching(true);
		try {
			const project = await PROJECTS_API.getByProjectById({ project_id: Number(project_id) });

			setFormData({
				project_name: project.project_name,
				description: project.description,
				start_date: project.start_date,
				end_date: project.end_date,
				project_status: project.project_status,
				institution: project.institution,
				managers: project.managers.map((leader) => leader.id),
				assignees: project.assignees.map((member) => member.id),
			});
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error fetching project details" });
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

		// Validate required fields
		const newErrors: Record<string, string[]> = {};

		if (formData.managers.length === 0) {
			newErrors.managers = ["This field is required."];
		}
		if (formData.assignees.length === 0) {
			newErrors.assignees = ["This field is required."];
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);

			return;
		}

		setLoading(true);
		try {
			await PROJECTS_API.update({ project_id: Number(project_id), data: formData });
			toast.success("Project updated successfully!");
			router.push("/projects");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error updating project" });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof IProjectFormData, value: string | number[]) => {
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
						<Link href="/projects">
							<Button variant="outline" size="sm" className="rounded-full !aspect-square">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
							Edit Project
						</h1>
					</div>
					<p className="text-slate-600 text-lg">
						Update your project with all the necessary details
					</p>
				</div>

				{/* Form */}
				<div className="">
					{fetching ? (
						<FixedLoader />
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
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
									<Textarea
										id="description"
										value={formData.description}
										onChange={(e) => handleInputChange("description", e.target.value)}
										placeholder="Describe the project goals, scope, and key deliverables..."
										rows={4}
										className="rounded-xl resize-none"
										required
									/>
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
									</div>
									<div className="space-y-3">
										<Label htmlFor="end_date" className="text-base font-medium">
											End Date *
										</Label>
										<Input
											id="end_date"
											type="date"
											min={MAX_DATE_TODAY}
											value={formData.end_date}
											onChange={(e) => handleInputChange("end_date", e.target.value)}
											className="h-12 text-base border-slate-200 focus:border-blue-500"
											required
										/>
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

							<div className="space-y-3">
								<Label htmlFor="project_status" className="text-base font-medium">
									Project Status *
								</Label>
								<Select
									value={formData.project_status}
									onValueChange={(value) =>
										handleInputChange("project_status", value as IProjectStatus)
									}
								>
									<SelectTrigger className="h-12 rounded-2xl">
										<SelectValue placeholder="Select project status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="not_started">Not Started</SelectItem>
										<SelectItem value="in_progress">In Progress</SelectItem>
										<SelectItem value="planning">Planning</SelectItem>
										<SelectItem value="on_hold">On Hold</SelectItem>
										<SelectItem value="cancelled">Cancelled</SelectItem>
										<SelectItem value="completed">Completed</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
								{/* Leaders Selection */}
								<div className="space-y-3">
									<Label className="text-base font-medium">Project Leaders *</Label>
									<EmployeeSearchableSelect
										value={formData.managers}
										onValueChange={(values) => {
											handleInputChange(
												"managers",
												values.map((val) => Number(val)),
											);
										}}
										placeholder="Select project managers"
										showEmployeeId={false}
										showDepartment={true}
										multiple={true}
									/>
									{errors.managers && errors.managers.length > 0 && (
										<p className="text-sm text-red-600">{errors.managers[0]}</p>
									)}
								</div>

								{/* Members Selection */}
								<div className="space-y-3">
									<Label className="text-base font-medium">Project Members *</Label>
									<EmployeeSearchableSelect
										value={formData.assignees}
										onValueChange={(values) => {
											handleInputChange(
												"assignees",
												values.map((val) => Number(val)),
											);
										}}
										placeholder="Select project assignees"
										showEmployeeId={false}
										showDepartment={true}
										multiple={true}
									/>
									{errors.assignees && errors.assignees.length > 0 && (
										<p className="text-sm text-red-600">{errors.assignees[0]}</p>
									)}
								</div>
							</div>

							{/* Navigation Buttons */}
							<div className="flex justify-between pt-6">
								<Button
									type="submit"
									className="px-8 md:px-24 rounded-full"
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
