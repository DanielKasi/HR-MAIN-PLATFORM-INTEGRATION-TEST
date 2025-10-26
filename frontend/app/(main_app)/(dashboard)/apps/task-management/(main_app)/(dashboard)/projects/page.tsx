"use client";
import { debounce } from "lodash";
import type { IProject, IProjectTask } from "@/types/types.utils";
import { IProjectStatus } from "@/types/project.type";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import {
	Plus,
	Search,
	Target,
	Clock,
	CheckCircle2,
	AlertCircle,
	Pause,
	XCircle,
	Eye,
	Edit,
	Trash2,
	MoreVertical,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { PERMISSION_CODES } from "@/constants";
import { ProtectedComponent } from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { selectSelectedInstitution, selectUser } from "@/lib/modules/task-management/selectors";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import { PROJECT_STATUS_API, PROJECTS_API, showErrorToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/platform/v1/components";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { hasPermission } from "@/lib/helpers";

const getStatusIcon = (statusName: string) => {
	switch (statusName) {
		case "completed":
			return <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />;
		case "in_progress":
			return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
		case "planning":
			return <Target className="h-3 w-3 sm:h-4 sm:w-4" />;
		case "on_hold":
			return <Pause className="h-3 w-3 sm:h-4 sm:w-4" />;
		case "cancelled":
			return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
		case "not_started":
			return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
		default:
			return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
	}
};

const calculateProgress = (tasks: IProjectTask[]) => {
	if (tasks == null || tasks == undefined) return 0;
	if (tasks.length === 0) return 0;
	const completedTasks = tasks.filter(
		(task) => task.task_status?.name?.toLowerCase() === "completed",
	).length;
	return Math.round((completedTasks / tasks.length) * 100);
};

const SkeletonCard = () => (
	<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4 animate-pulse">
		<div className="flex items-start justify-between">
			<div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4"></div>
			<div className="h-6 sm:h-8 w-6 sm:w-8 bg-gray-200 rounded-full"></div>
		</div>
		<div className="h-3 sm:h-4 bg-gray-200 rounded w-16 sm:w-20"></div>
		<div className="space-y-2">
			<div className="flex justify-between text-sm">
				<div className="h-2 sm:h-3 bg-gray-200 rounded w-12 sm:w-16"></div>
				<div className="h-2 sm:h-3 bg-gray-200 rounded w-6 sm:w-8"></div>
			</div>
			<div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2"></div>
		</div>
		<div className="space-y-1">
			<div className="flex justify-between">
				<div className="h-2 sm:h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
				<div className="h-2 sm:h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
			</div>
		</div>
		<div className="flex justify-between pt-3 sm:pt-4 border-t border-gray-200">
			<div className="flex items-center gap-2">
				<div className="flex -space-x-1">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="w-5 sm:w-6 h-5 sm:h-6 bg-gray-200 rounded-full" />
					))}
				</div>
				<div className="h-2 sm:h-3 bg-gray-200 rounded w-12 sm:w-16"></div>
			</div>
			<div className="h-2 sm:h-3 bg-gray-200 rounded w-12 sm:w-16"></div>
		</div>
	</div>
);

export default function ProjectsPage() {
	const [projects, setProjects] = useState<IProject[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [nextUrl, setNextUrl] = useState<string | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [projectStatuses, setProjectStatuses] = useState<IProjectStatus[]>([]);
	const currentUser = useSelector(selectUser);
	const { ref, inView } = useInView({ threshold: 0 });
	const router = useModuleNavigation("/apps/task-management");

	const fetchFirstPage = useCallback(
		debounce(
			async (searchTerm: string, institutionId: number | undefined, selectedStatus: string) => {
				if (!institutionId) return;

				setLoading(true);
				try {
					const res = await PROJECTS_API.getPaginatedProjects({
						institutionId,
						page: 1,
						search: searchTerm || undefined,
						status: selectedStatus !== "all" ? selectedStatus : undefined,
						user_id: hasPermission(PERMISSION_CODES.CAN_VIEW_ALL_TASKS)
							? undefined
							: currentUser?.id,
					});

					setProjects(res.results);
					setNextUrl(res.next);
					setHasMore(!!res.next);
				} catch (error) {
					showErrorToast({ error, defaultMessage: "Failed to fetch projects" });
					setHasMore(false);
				} finally {
					setLoading(false);
				}
			},
			300,
		),
		[currentUser?.id],
	);

	const fetchNextPage = useCallback(async () => {
		if (!nextUrl || loading) return;

		setLoading(true);
		try {
			const res = await PROJECTS_API.getPaginatedProjectsFromUrl({
				url: nextUrl,
			});

			setProjects((prev) => [...prev, ...res.results]);
			setNextUrl(res.next);
			setHasMore(!!res.next);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load more projects" });
			setHasMore(false);
		} finally {
			setLoading(false);
		}
	}, [nextUrl, loading, currentInstitution?.id]);

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

	useEffect(() => {
		if (searchTerm.length >= 3 || searchTerm.length === 0) {
			fetchFirstPage(searchTerm, currentInstitution?.id, selectedStatus);
		}
		return () => {
			fetchFirstPage.cancel();
		};
	}, [currentInstitution?.id, searchTerm, selectedStatus, fetchFirstPage]);

	useEffect(() => {
		if (inView && hasMore && !loading) {
			fetchNextPage();
		}
	}, [inView, hasMore, loading]);

	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = { all: projects.length };
		projects.forEach((p) => {
			const statusId = p.project_status ? p.project_status.id.toString() : "unknown";
			counts[statusId] = (counts[statusId] || 0) + 1;
		});
		return counts;
	}, [projects]);

	const statusOptions = [
		{ value: "all", label: "All Status" },
		{ value: "unknown", label: "Unknown Status" },
		...projectStatuses.map((status) => ({
			value: status.id.toString(),
			label: status.status_name,
		})),
	];

	const handleDelete = async () => {
		if (!currentInstitution) {
			toast.error("No institution selected");
			return;
		}
		if (!projectToDelete) {
			toast.error("No project to delete!");
			return;
		}
		try {
			setIsDeleting(true);
			await PROJECTS_API.delete({ project_id: projectToDelete.id });
			setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
			toast.success("Project deleted successfully");
		} catch (error: unknown) {
			showErrorToast({ error, defaultMessage: "Failed to delete project" });
		} finally {
			setProjectToDelete(null);
			setIsDeleting(false);
		}
	};

	return (
		<div className="min-h-screen bg-white p-3 sm:p-4 rounded-xl">
			<div className="max-w-full mx-auto space-y-6 sm:space-y-8">
				{/* Header Section */}
				<div>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						<div className="flex items-center gap-2">
							<h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								Projects
							</h1>
						</div>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PROJECTS}>
							<Link href="/projects/add">
								<Button className="rounded-xl w-full sm:w-auto text-xs sm:text-sm">
									<Plus className="h-4 w-4 mr-2" />
									New Project
								</Button>
							</Link>
						</ProtectedComponent>
					</div>
					<p className="text-slate-600 text-xs sm:text-sm mt-1 sm:mt-2 ">
						Manage and track all your projects in one place
					</p>
				</div>

				{/* Search and Filter */}
				<div className="!py-4 sm:!py-6 !w-full">
					<div className="flex flex-col sm:flex-row sm:items-center justify-start gap-3 sm:gap-4 w-full">
						<div className="relative w-full max-w-full sm:max-w-md">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
							<Input
								placeholder="Search projects..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 !w-full text-xs sm:text-sm"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Select value={selectedStatus} onValueChange={setSelectedStatus}>
								<SelectTrigger className="text-xs sm:text-sm font-medium rounded-2xl w-[140px] sm:w-[180px]">
									Status
								</SelectTrigger>
								<SelectContent>
									{statusOptions.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
											className="text-xs sm:text-sm"
										>
											{option.label} ({statusCounts[option.value] || 0})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Projects Grid */}
				<div>
					{loading && projects.length === 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
							{Array.from({ length: 6 }).map((_, i) => (
								<SkeletonCard key={i} />
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
							{projects.map((project) => {
								const progress = calculateProgress(project.project_tasks);
								const statusName = project.project_status
									? project.project_status.status_name?.toLowerCase().replace(/\s+/g, "_") ||
										"not_started"
									: "not_started";
								const membersCount =
									project.user_assignees.length + project.staff_group_assignees.length;
								let tasksCount = 0;
								if (project.project_tasks != undefined) {
									tasksCount = project.project_tasks.length;
								}

								return (
									<div
										key={project.id}
										className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 space-y-3 sm:space-y-4"
									>
										{/* Project Name and Actions */}
										<div className="flex items-start justify-between">
											<h3 className="text-base sm:text-lg font-semibold text-gray-900 flex-1 pr-4">
												{project.project_name}
											</h3>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" className="h-8 w-8 p-0">
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_PROJECTS}>
														<DropdownMenuItem className="p-0">
															<Link
																className="text-xs sm:text-sm flex items-center justify-start w-full h-full px-2 py-1.5"
																href={`/projects/${project.id}/`}
															>
																<Eye className="h-4 w-4 mr-2" /> View Details
															</Link>
														</DropdownMenuItem>
													</ProtectedComponent>
													<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_PROJECTS}>
														<DropdownMenuItem className="p-0">
															<Link
																className="text-xs sm:text-sm flex items-center justify-start w-full h-full px-2 py-1.5"
																href={`/projects/edit/${project.id}`}
															>
																<Edit className="h-4 w-4 mr-2" /> Edit
															</Link>
														</DropdownMenuItem>
													</ProtectedComponent>
													<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_PROJECTS}>
														<DropdownMenuItem
															onClick={() => setProjectToDelete(project)}
															className="text-red-600 p-0"
														>
															<span className="text-red-600 hover:text-red-700 text-xs sm:text-sm w-full h-full px-2 py-1.5 flex items-center">
																<Trash2 className="h-4 w-4 mr-2" /> Delete
															</span>
														</DropdownMenuItem>
													</ProtectedComponent>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										{/* Status Badge */}
										<Badge
											style={{
												backgroundColor: project.project_status
													? `${project.project_status.color_code}30`
													: "#e5e7eb",
												color: project.project_status
													? project.project_status.color_code
													: "#6b7280",
												border: project.project_status
													? `1.5px solid ${project.project_status.color_code}`
													: "1.5px solid #6b7280",
											}}
											className="capitalize text-xs sm:text-sm"
										>
											{getStatusIcon(statusName)}
											<span className="ml-1">
												{project.project_status
													? project.project_status.status_name || "Not Started"
													: "Not Started"}
											</span>
										</Badge>
										{/* Progress Bar */}
										{/* <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div
                          className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div> */}

										{/* Dates */}
										<div className="space-y-1 text-xs sm:text-sm text-gray-600 pt-4">
											{project.start_date && (
												<div className="flex justify-between">
													<span>Start Date</span>
													<span className="font-medium">{project.start_date}</span>
												</div>
											)}
											{project.end_date && (
												<div className="flex justify-between">
													<span>End Date</span>
													<span className="font-medium">{project.end_date}</span>
												</div>
											)}
											{!project.start_date && !project.end_date && (
												<div className="text-center text-gray-400">No dates set</div>
											)}
										</div>

										{/* Members and Tasks */}
										<div className="flex justify-between pt-3 sm:pt-4 border-t border-gray-200">
											<div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
												<Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
												<span>{membersCount} members</span>
											</div>
											<div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
												<CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
												<span>{tasksCount} tasks</span>
											</div>
										</div>
									</div>
								);
							})}
							{projects.length === 0 && !loading && (
								<div className="col-span-full text-center py-8 sm:py-12">
									<p className="text-muted-foreground text-xs sm:text-sm mb-4">No projects found</p>
								</div>
							)}
							{hasMore && (
								<div ref={ref} className="col-span-full flex justify-center py-4 min-h-[1px]">
									{loading && (
										<div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gray-900"></div>
									)}
								</div>
							)}
						</div>
					)}
				</div>

				{projectToDelete && (
					<ConfirmationDialog
						description="Are you sure you want to delete this project? This action cannot be undone."
						disabled={isDeleting}
						isOpen={!!projectToDelete}
						title={`Delete ${projectToDelete.project_name}`}
						onConfirm={handleDelete}
						onClose={() => {
							setProjectToDelete(null);
							setIsDeleting(false);
						}}
					/>
				)}
			</div>
		</div>
	);
}
