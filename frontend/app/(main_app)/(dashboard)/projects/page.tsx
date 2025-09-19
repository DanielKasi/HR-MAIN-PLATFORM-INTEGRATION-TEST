"use client";

import type { IEmployee, IProject, IProjectStatus, IProjectTask } from "@/types/types.utils";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROJECTS_API, showErrorToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

const getStatusIcon = (status: IProjectStatus) => {
	switch (status) {
		case "completed":
			return <CheckCircle2 className="h-4 w-4 text-green-600" />;
		case "in_progress":
			return <Clock className="h-4 w-4 text-blue-600" />;
		case "planning":
			return <Target className="h-4 w-4 text-yellow-600" />;
		case "on_hold":
			return <Pause className="h-4 w-4 text-orange-600" />;
		case "cancelled":
			return <XCircle className="h-4 w-4 text-red-600" />;
		case "not_started":
			return <AlertCircle className="h-4 w-4 text-gray-600" />;
		default:
			return <AlertCircle className="h-4 w-4 text-gray-600" />;
	}
};

const getStatusColor = (status: IProjectStatus) => {
	switch (status) {
		case "completed":
			return "bg-green-50 text-green-700 border-green-200";
		case "in_progress":
			return "bg-blue-50 text-blue-700 border-blue-200";
		case "planning":
			return "bg-yellow-50 text-yellow-700 border-yellow-200";
		case "on_hold":
			return "bg-orange-50 text-orange-700 border-orange-200";
		case "cancelled":
			return "bg-red-50 text-red-700 border-red-200";
		case "not_started":
			return "bg-gray-50 text-gray-700 border-gray-200";
		default:
			return "bg-gray-50 text-gray-700 border-gray-200";
	}
};

const getStatusBadgeVariant = (status: IProjectStatus) => {
	switch (status) {
		case "completed":
		case "in_progress":
		case "planning":
			return "default" as const;
		case "on_hold":
			return "secondary" as const;
		case "cancelled":
			return "destructive" as const;
		case "not_started":
			return "outline" as const;
		default:
			return "secondary" as const;
	}
};

const getStatusLabel = (status: IProjectStatus) => {
	return status.replace("_", " ");
};

const calculateProgress = (tasks: IProjectTask[]) => {
	if (tasks.length === 0) return 0;
	const completedTasks = tasks.filter((task) => task.task_status === "completed").length;
	return Math.round((completedTasks / tasks.length) * 100);
};

const SkeletonCard = () => (
	<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 animate-pulse">
		<div className="flex items-start justify-between">
			<div className="h-6 bg-gray-200 rounded w-3/4"></div>
			<div className="h-8 w-8 bg-gray-200 rounded-full"></div>
		</div>
		<div className="h-4 bg-gray-200 rounded w-20"></div>
		<div className="space-y-2">
			<div className="flex justify-between text-sm">
				<div className="h-3 bg-gray-200 rounded w-16"></div>
				<div className="h-3 bg-gray-200 rounded w-8"></div>
			</div>
			<div className="w-full bg-gray-200 rounded-full h-2"></div>
		</div>
		<div className="space-y-1">
			<div className="flex justify-between">
				<div className="h-3 bg-gray-200 rounded w-20"></div>
				<div className="h-3 bg-gray-200 rounded w-20"></div>
			</div>
		</div>
		<div className="flex justify-between pt-4 border-t border-gray-200">
			<div className="flex items-center gap-2">
				<div className="flex -space-x-1">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="w-6 h-6 bg-gray-200 rounded-full" />
					))}
				</div>
				<div className="h-3 bg-gray-200 rounded w-16"></div>
			</div>
			<div className="h-3 bg-gray-200 rounded w-16"></div>
		</div>
	</div>
);

export default function ProjectsPage() {
	const [projects, setProjects] = useState<IProject[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(1);
	const [selectedStatus, setSelectedStatus] = useState<"all" | IProjectStatus>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const { ref, inView } = useInView({ threshold: 0 });

	const fetchProjects = useCallback(
		async (pageNum: number, search: string) => {
			if (!currentInstitution) return null;
			try {
				const res = await PROJECTS_API.getPaginatedProjects({
					institutionId: currentInstitution.id,
					page: pageNum,
					search: search || undefined,
				});
				return res;
			} catch (error) {
				showErrorToast({ error, defaultMessage: "Failed to fetch projects" });
				return null;
			}
		},
		[currentInstitution?.id],
	);

	useEffect(() => {
		setProjects([]);
		setPage(1);
		setHasMore(true);
		setLoading(true);
		fetchProjects(1, searchTerm).then((res) => {
			if (res) {
				setProjects(res.results);
				setHasMore(!!res.next);
			}
			setLoading(false);
		});
	}, [currentInstitution?.id, searchTerm, fetchProjects]);

	useEffect(() => {
		if (inView && hasMore && !loading) {
			loadMore();
		}
	}, [inView, hasMore, loading]);

	const loadMore = useCallback(async () => {
		if (loading || !hasMore) return;
		setLoading(true);
		const res = await fetchProjects(page + 1, searchTerm);
		if (res) {
			setProjects((prev) => [...prev, ...res.results]);
			setPage((p) => p + 1);
			setHasMore(!!res.next);
		}
		setLoading(false);
	}, [loading, hasMore, page, searchTerm, fetchProjects]);

	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = { all: projects.length };
		projects.forEach((p) => {
			const status = p.project_status;
			counts[status] = (counts[status] || 0) + 1;
		});
		return counts;
	}, [projects]);

	const filteredProjects = useMemo(() => {
		return selectedStatus === "all"
			? projects
			: projects.filter((p) => p.project_status === selectedStatus);
	}, [projects, selectedStatus]);

	const statusOptions = [
		{ value: "all" as const, label: "All Status" },
		{ value: "not_started" as const, label: "Not started" },
		{ value: "planning" as const, label: "Planning" },
		{ value: "in_progress" as const, label: "In Progress" },
		{ value: "completed" as const, label: "Completed" },
		{ value: "cancelled" as const, label: "Cancelled" },
		{ value: "on_hold" as const, label: "On Hold" },
	];

	const handleStatusChange = (value: "all" | IProjectStatus) => {
		setSelectedStatus(value);
	};

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
		<div className="min-h-screen bg-white p-4 rounded-xl">
			<div className="max-w-full mx-auto space-y-8">
				{/* Header Section */}
				<div>
					<div className="flex items-center justify-between gap-8">
						<h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
							Projects
						</h1>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PROJECTS}>
							<Link href="/projects/add">
								<Button className="rounded-xl">
									<Plus className="mr-2 h-5 w-5" />
									New Project
								</Button>
							</Link>
						</ProtectedComponent>
					</div>
					<p className="text-slate-600 text-lg">Manage and track all your projects in one place</p>
				</div>

				{/* Search and Filter */}
				<div className="!py-6 !w-full">
					<div className="flex flex-col md:flex-row md:items-center justify-start gap-8 w-full">
						<div className="relative w-full max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
							<Input
								placeholder="Search projects..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 !w-full"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Select>
								<SelectTrigger className="text-sm font-medium rounded-2xl">Status</SelectTrigger>
								<SelectContent>
									{statusOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label} ({statusCounts[option.value] || 0})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Projects Grid */}
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_PROJECTS}>
					{loading && projects.length === 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{Array.from({ length: 6 }).map((_, i) => (
								<SkeletonCard key={i} />
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{filteredProjects.map((project) => {
								const progress = calculateProgress(project.project_tasks);
								const status = project.project_status;
								const membersCount = project.assignees.length;
								const tasksCount = project.project_tasks.length;

								return (
									<div
										key={project.id}
										className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4"
									>
										{/* Project Name and Actions */}
										<div className="flex items-start justify-between">
											<h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
												{project.project_name}
											</h3>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" className="h-8 w-8 p-0">
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem className="p-0">
														<Link
															className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
															href={`/projects/${project.id}/`}
														>
															<Eye className="h-4 w-4 mr-2" /> View Details
														</Link>
													</DropdownMenuItem>
													<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}>
														<DropdownMenuItem className="p-0">
															<Link
																className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
																href={`/projects/edit/${project.id}`}
															>
																<Edit className="h-4 w-4 mr-2" /> Edit
															</Link>
														</DropdownMenuItem>
													</ProtectedComponent>
													<ProtectedComponent
														permissionCode={PERMISSION_CODES.CAN_DELETE_EMPLOYEES}
													>
														<DropdownMenuItem
															onClick={() => setProjectToDelete(project)}
															className="text-red-600 p-0"
														>
															<span className="text-red-600 hover:text-red-700 text-xs w-full h-full px-2 py-1.5 flex items-center">
																<Trash2 className="h-4 w-4 mr-2" /> Delete
															</span>
														</DropdownMenuItem>
													</ProtectedComponent>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										{/* Status Badge */}
										<Badge
											variant={getStatusBadgeVariant(status)}
											className={`capitalize ${getStatusColor(status)}`}
										>
											{getStatusIcon(status)}
											<span className="ml-1">{getStatusLabel(status)}</span>
										</Badge>

										{/* Progress Bar */}
										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span>Progress</span>
												<span className="font-medium">{progress}%</span>
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2">
												<div
													className="bg-blue-600 h-2 rounded-full transition-all duration-300"
													style={{ width: `${progress}%` }}
												/>
											</div>
										</div>

										{/* Dates */}
										<div className="space-y-1 text-sm text-gray-600">
											<div className="flex justify-between">
												<span>Start Date</span>
												<span className="font-medium">{project.start_date}</span>
											</div>
											<div className="flex justify-between">
												<span>End Date</span>
												<span className="font-medium">{project.end_date}</span>
											</div>
										</div>

										{/* Members and Tasks */}
										<div className="flex justify-between pt-4 border-t border-gray-200">
											<div className="flex items-center gap-2 text-sm text-gray-600">
												<div className="flex -space-x-1">
													{Array.from({ length: Math.min(3, membersCount) }).map((_, i) => (
														<div
															key={i}
															className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white"
														/>
													))}
												</div>
												<span>{membersCount} members</span>
											</div>
											<div className="text-sm text-gray-600">{tasksCount} tasks</div>
										</div>
									</div>
								);
							})}
							{filteredProjects.length === 0 && !loading && (
								<div className="col-span-full text-center py-12">
									<p className="text-muted-foreground mb-4">No projects found</p>
								</div>
							)}
							{hasMore && (
								<div ref={ref} className="col-span-full flex justify-center py-4 min-h-[1px]">
									{loading && (
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
									)}
								</div>
							)}
						</div>
					)}
				</ProtectedComponent>

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
