"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Edit,
	Users,
	Calendar,
	Plus,
	Search,
	Filter,
	MoreHorizontal,
	Eye,
	Trash2,
	Clock,
	CheckCircle2,
	Pause,
	XCircle,
	AlertCircle,
	Target,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";
import { cn, PROJECTS_TASKS_API } from "@/lib/utils";
import { IPaginatedResponse, IProject, IProjectTask } from "@/types/types.utils";
import { PROJECTS_API } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { showErrorToast } from "@/lib/utils";
import { toast } from "sonner";
import { IProjectStatus, IProjectTaskPriority, IProjectTaskStatus } from "@/types/types.utils";
import { Icon } from "@iconify/react";
import { getFileUrl } from "@/lib/helpers";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";
import Calender, { Group, Item } from "@/components/projects/tasks/calender";
import TaskDialog from "@/components/projects/tasks/project-task-dialog";
import TaskDetailsDialog from "@/components/projects/tasks/project-task-details-dialog";
import { CircularProgress } from "@/components/common/progress-bar/circular-progressbar";

const getStatusColor = (status: IProjectStatus | IProjectTaskStatus) => {
	switch (status) {
		case "completed":
			return "bg-green-50 text-green-700 border-green-200";
		case "in_progress":
			return "bg-blue-50 text-blue-700 border-blue-200";
		case "planning":
		case "not_started":
			return "bg-yellow-50 text-yellow-700 border-yellow-200";
		case "on_hold":
			return "bg-orange-50 text-orange-700 border-orange-200";
		case "cancelled":
			return "bg-red-50 text-red-700 border-red-200";
		default:
			return "bg-gray-50 text-gray-700 border-gray-200";
	}
};

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
		default:
			return <AlertCircle className="h-4 w-4 text-gray-600" />;
	}
};

const getPriorityColor = (priority: IProjectTaskPriority) => {
	switch (priority) {
		case "urgent":
			return "bg-red-100 text-red-800 border-red-200";
		case "high":
			return "bg-orange-100 text-orange-800 border-orange-200";
		case "medium":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		case "low":
			return "bg-green-100 text-green-800 border-green-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

const calculateProgress = (tasks: IProjectTask[]) => {
	if (tasks.length === 0) return 0;
	const completedTasks = tasks.filter((task) => task.task_status === "completed").length;
	return Math.round((completedTasks / tasks.length) * 100);
};

const getDaysRemaining = (endDate: string) => {
	const today = new Date();
	const end = new Date(endDate);
	const diffTime = end.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
};

const statusMap: Record<IProjectTaskStatus, { label: string; color: string }> = {
	not_started: { label: "Not started", color: "bg-gray-100" },
	on_hold: { label: "On Hold", color: "bg-purple-100" },
	in_progress: { label: "In Progress", color: "bg-blue-100" },
	completed: { label: "Completed", color: "bg-green-100" },
};

// const CircularProgress = ({ percentage }: { percentage: number }) => {
// 	const radius = 70;
// 	const stroke = 14;
// 	const normalizedRadius = radius - stroke * 2;
// 	const circumference = normalizedRadius * 2 * Math.PI;
// 	const strokeDashoffset = circumference - (percentage / 100) * circumference;

// 	return (
// 		<div className="relative bg-red-300">
// 			<svg height="160" width="160" className="bg-violet-300">
// 				<g transform={`rotate(-90 ${"100 100"})`}>
// 					<circle
// 						stroke="#e5e7eb"
// 						strokeWidth={stroke}
// 						fill="transparent"
// 						r={normalizedRadius}
// 						cx={radius}
// 						cy={radius}
// 					/>
// 					<circle
// 						stroke="#3b82f6"
// 						strokeWidth={stroke}
// 						fill="transparent"
// 						r={normalizedRadius}
// 						cx={radius}
// 						cy={radius}
// 						strokeDasharray={circumference}
// 						strokeDashoffset={strokeDashoffset}
// 						strokeLinecap="round"
// 					/>
// 				</g>
// 			</svg>
// 			<div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
// 				<div className="text-sm font-bold text-gray-700">{percentage}%</div>
// 			</div>
// 		</div>
// 	);
// };

const formatStatus = (status: string) => status.replace("_", " ");

const getStatusBadge = (status: IProjectTaskStatus) => {
	switch (status) {
		case "completed":
			return (
				<Badge className="bg-green-100 text-green-800 hover:bg-green-100 capitalize text-xs">
					{formatStatus(status)}
				</Badge>
			);
		case "in_progress":
			return (
				<Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs capitalize">
					{formatStatus(status)}
				</Badge>
			);
		case "not_started":
			return (
				<Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs capitalize">
					{formatStatus(status)}
				</Badge>
			);
		default:
			return (
				<Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs capitalize">
					{formatStatus(status)}
				</Badge>
			);
	}
};

export default function ProjectDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const [project, setProject] = useState<IProject | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"board" | "timeline" | "table">("table");
	const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [taskToDelete, setTaskToDelete] = useState<IProjectTask | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState<IProjectTask | null>(null);
	const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
	const [filteredProject, setFilteredProject] = useState<IProject | null>(null);

	// Mock documents
	// const documents = useMemo(
	// 	() => [
	// 		{ id: 1, name: "testing-pdf-0001.pdf", created: "Jun 12, 2025" },
	// 		{ id: 2, name: "design-doc-0002.pdf", created: "Jul 5, 2025" },
	// 	],
	// 	[],
	// );

	const tabConfig = [
		{ id: "board" as const, label: "Board" },
		{ id: "timeline" as const, label: "Timeline" },
		{ id: "table" as const, label: "Table" },
	];

	const fetchProject = async () => {
		try {
			const fetchedProject = await PROJECTS_API.getByProjectById({ project_id: Number(params.id) });
			setProject(fetchedProject);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch project" });
		} finally {
		}
	};

	useEffect(() => {
		if (params.id) {
			loadData();
		}
	}, [params.id]);

	const loadData = async () => {
		setLoading(true);
		await fetchProject();
		setLoading(false);
	};

	useEffect(() => {
		if (project) {
			if (searchQuery) {
				setFilteredProject((prev) => ({
					...project,
					project_tasks: project.project_tasks.filter((task) =>
						task.task_name.toLowerCase().includes(searchQuery.toLowerCase()),
					),
				}));
			} else {
				setFilteredProject(project);
			}
		}
	}, [project, searchQuery]);

	// Group tasks by status for board, ensure useMemo runs unconditionally
	const groupedTasks = useMemo(() => {
		if (!filteredProject)
			return {
				not_started: [],
				on_hold: [],
				in_progress: [],
				completed: [],
			};
		const groups: Record<IProjectTaskStatus, IProjectTask[]> = {
			not_started: [],
			on_hold: [],
			in_progress: [],
			completed: [],
		};
		filteredProject.project_tasks.forEach((task) => {
			groups[task.task_status].push(task);
		});
		return groups;
	}, [filteredProject]);

	const taskActionsDropdown = (task: IProjectTask) => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={() => {
						setSelectedTask(task);
						setIsTaskDetailsOpen(true);
					}}
				>
					<Eye className="mr-2 h-4 w-4" /> View
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						setSelectedTask(task);
						setIsAddTaskOpen(true);
					}}
				>
					<Edit className="mr-2 h-4 w-4" /> Edit
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTaskToDelete(task)} className="text-red-600">
					<Trash2 className="mr-2 h-4 w-4" /> Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const columns: ColumnDef<IProjectTask>[] = [
		{
			key: "name",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Task</span>
				</div>
			),
			cell: (task) => task.task_name || "",
		},
		{
			key: "start_date",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Start Date</span>
				</div>
			),
			cell: (task) =>
				new Date(task.start_date).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				}),
		},
		{
			key: "end_date",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>End Date</span>
				</div>
			),
			cell: (task) =>
				new Date(task.end_date).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				}),
		},
		{
			key: "priority",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Priority</span>
				</div>
			),
			cell: (task) => task.priority.replace("_", " "),
		},
		{
			key: "status",
			header: "Status",
			cell: (task) => getStatusBadge(task.task_status),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (task) => taskActionsDropdown(task),
		},
	];

	if (loading || !project) {
		return (
			<div className="min-h-screen bg-white p-4 rounded-xl space-y-6">
				<div className="flex items-center justify-between">
					<Skeleton className="h-8 w-8" />
					<div className="flex gap-2">
						<Skeleton className="h-10 w-20" />
						<Skeleton className="h-10 w-20" />
					</div>
				</div>
				<Skeleton className="h-6 w-96" />
				<div className="space-y-4">
					<Skeleton className="h-4 w-full" />
					<div className="flex justify-between">
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<div className="flex -space-x-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-8 w-8 rounded-full" />
								))}
							</div>
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<div className="flex -space-x-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-8 w-8 rounded-full" />
								))}
							</div>
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-32" />
						</div>
					</div>
				</div>
				<div className="space-y-4">
					<h3 className="font-medium">Documents</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{Array.from({ length: 2 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-6 w-6" />
							</div>
						))}
					</div>
				</div>
				<div className="flex gap-2 md:gap-4 lg:gap-8 min-w-max px-8 overflow-x-auto border-b border-gray-200">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-20" />
					))}
				</div>
			</div>
		);
	}

	const progress = calculateProgress(project?.project_tasks || []);

	const handleDelete = async () => {
		if (!project) return;
		try {
			setIsDeleting(true);
			await PROJECTS_API.delete({ project_id: project.id });
			toast.success("Project deleted successfully");
			router.push("/projects");
		} catch (error: unknown) {
			showErrorToast({ error, defaultMessage: "Failed to delete project" });
		} finally {
			setProjectToDelete(null);
			setIsDeleting(false);
		}
	};

	const handleTimelineUpdate = async ({
		taskId,
		start_date,
		end_date,
	}: {
		taskId: number;
		start_date?: string;
		end_date?: string;
	}) => {
		if (!project) {
			return;
		}
		try {
			await PROJECTS_TASKS_API.update({
				taskId,
				data: {
					start_date: start_date?.split("T")[0],
					end_date: end_date?.split("T")[0],
					project: project.id,
				},
			});
			await fetchProject();
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to update task" });
		}
	};

	const handleDocumentAction = (action: "view" | "edit" | "delete", docId: number) => {
		switch (action) {
			case "view":
				toast.success(`Viewing document ${docId}`);
				break;
			case "edit":
				toast.success(`Editing document ${docId}`);
				break;
			case "delete":
				toast.success(`Deleting document ${docId}`);
				break;
		}
	};

	const handleTaskDelete = async () => {
		if (!taskToDelete) return;
		try {
			await PROJECTS_TASKS_API.delete({ taskId: taskToDelete.id });
			await fetchProject();
			toast.success("Task deleted successfully");
		} catch (error: unknown) {
			showErrorToast({ error, defaultMessage: "Failed to delete task" });
		} finally {
			setTaskToDelete(null);
		}
	};

	return (
		<div className="min-h-screen bg-white p-4 rounded-xl space-y-6">
			{project ? (
				<>
					{/* Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Link href="/projects" className="p-2 hover:bg-gray-100 rounded-full">
								<ArrowLeft className="h-5 w-5" />
							</Link>
							<div className="flex items-center gap-3">
								<h1 className="text-2xl font-bold">{project.project_name}</h1>
								<Badge className={cn("capitalize", getStatusColor(project.project_status))}>
									{getStatusIcon(project.project_status)}
									<span className="ml-1">{project.project_status.replace("_", " ")}</span>
								</Badge>
							</div>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" className="rounded-lg" asChild>
								<Link href={`/projects/edit/${project.id}`}>
									<Edit className="h-4 w-4 mr-2" />
									Edit
								</Link>
							</Button>
							<Button
								variant="destructive"
								className="!rounded-lg !bg-transparent !text-destructive !border !border-destructive"
								onClick={() => setProjectToDelete(project)}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Delete
							</Button>
						</div>
					</div>

					{/* Description and Progress */}
					<div className="flex items-start justify-between">
						<p className="text-gray-600 max-w-[70%]">{project.description}</p>
						<CircularProgress percentage={progress} />
					</div>

					{/* Team and Dates */}
					<div className="flex justify-between items-center">
						<div className="space-y-4">
							<div className="space-y-2">
								<h3 className="font-medium text-sm">Leads</h3>
								<div className="flex -space-x-2">
									{project.managers.slice(0, 3).map((lead) => (
										<Avatar key={lead.id} className="h-8 w-8 border-2 border-white rounded-full">
											<AvatarImage
												src={
													lead.employee_profile_picture
														? getFileUrl(lead.employee_profile_picture)
														: "/images/profile-placeholder.jpg"
												}
											/>
											<AvatarFallback className="text-xs bg-gray-300">
												{lead.name
													?.split(" ")
													.map((n) => n[0])
													.join("") || "?"}
											</AvatarFallback>
										</Avatar>
									))}
									{project.managers.length > 3 && (
										<div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
											+{project.managers.length - 3}
										</div>
									)}
								</div>
							</div>
							<div className="space-y-2">
								<h3 className="font-medium text-sm">Members</h3>
								<div className="flex -space-x-2">
									{project.assignees.slice(0, 3).map((member) => (
										<Avatar key={member.id} className="h-8 w-8 border-2 border-white rounded-full">
											<AvatarImage
												src={
													member.employee_profile_picture
														? getFileUrl(member.employee_profile_picture)
														: "/images/profile-placeholder.jpg"
												}
											/>
											<AvatarFallback className="text-xs bg-gray-300">
												{member.name
													?.split(" ")
													.map((n) => n[0])
													.join("") || "?"}
											</AvatarFallback>
										</Avatar>
									))}
									{project.assignees.length > 3 && (
										<div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
											+{project.assignees.length - 3}
										</div>
									)}
								</div>
							</div>
						</div>
						<div className="flex flex-col md:flex-row items-center justify-end gap-8 space-y-1 text-sm">
							<div className="flex justify-end items-center gap-4">
								<Icon icon="hugeicons:calendar-03" className="!w-5 !h-5 text-gray-600" />
								<span className="text-gray-500">Start Date</span>
								<p className="font-medium">
									{new Date(project.start_date).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
								</p>
							</div>
							<div className="flex justify-end items-center gap-4">
								<Icon icon="hugeicons:calendar-03" className="!w-5 !h-5 text-gray-600" />
								<span className="text-gray-500">End Date</span>
								<p className="font-medium">
									{new Date(project.end_date).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
								</p>
							</div>
						</div>
					</div>

					{/* Documents */}
					{/* <div>
						<h3 className="font-medium mb-4">Documents</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							{documents.map((doc) => (
								<div
									key={doc.id}
									className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
								>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
											<span className="text-red-600 text-sm font-medium">PDF</span>
										</div>
										<div>
											<p className="font-medium text-sm">{doc.name}</p>
											<p className="text-xs text-gray-500">Created: {doc.created}</p>
										</div>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" className="h-8 w-8 p-0">
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => handleDocumentAction("view", doc.id)}>
												<Eye className="h-4 w-4 mr-2" />
												View
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => handleDocumentAction("edit", doc.id)}>
												<Edit className="h-4 w-4 mr-2" />
												Edit
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-red-600"
												onClick={() => handleDocumentAction("delete", doc.id)}
											>
												<Trash2 className="h-4 w-4 mr-2" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							))}
						</div>
					</div> */}

					{/* Custom Tabs */}
					<div className="flex gap-2 md:gap-4 lg:gap-8 min-w-max px-8 overflow-x-auto border-b border-gray-200">
						{tabConfig.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`pb-4 text-xs md:text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
									activeTab === tab.id
										? "text-gray-800 font-semibold"
										: "text-[#848496] hover:text-gray-800"
								}`}
							>
								{tab.label}
								{activeTab === tab.id && (
									<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
								)}
							</button>
						))}
					</div>
				</>
			) : (
				<></>
			)}

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4 ">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Search tasks..."
							className="pl-10 w-full max-w-lg"
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<Select
						onValueChange={(val: string) => {
							if (val !== "all") {
								setFilteredProject(
									(prev) =>
										({
											...project,
											project_tasks: project?.project_tasks.filter(
												(task) => task.task_status === val,
											),
										}) as IProject,
								);
							} else {
								setFilteredProject(project);
							}
						}}
					>
						<SelectTrigger className="w-[180px] rounded-2xl">
							<SelectValue placeholder="All Status" />
						</SelectTrigger>
						<SelectContent className="">
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="not_started">Not started</SelectItem>
							<SelectItem value="on_hold">On Hold</SelectItem>
							<SelectItem value="in_progress">In Progress</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
						</SelectContent>
					</Select>
					<Select
						onValueChange={(val: string) => {
							console.log("\n\n Setting priorities to : ", val);
							if (val !== "all") {
								setFilteredProject(
									(prev) =>
										({
											...project,
											project_tasks: project?.project_tasks.filter((task) => task.priority === val),
										}) as IProject,
								);
							} else {
								setFilteredProject(project);
							}
						}}
					>
						<SelectTrigger className="w-[180px] rounded-2xl">
							<SelectValue placeholder="All Priorities" />
						</SelectTrigger>
						<SelectContent className="">
							<SelectItem value="all">All Priorities</SelectItem>
							<SelectItem value="low">Low</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="high">High</SelectItem>
							<SelectItem value="urgent">Urgent</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex gap-2">
					<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_TASKS}>
						<Button className="rounded-xl" onClick={() => setIsAddTaskOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							New Task
						</Button>
					</ProtectedComponent>
				</div>
			</div>

			{/* Tab Content */}
			{activeTab === "board" && (
				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
						{Object.entries(groupedTasks).map(([statusKey, tasks], index) => {
							const status = statusKey as IProjectTaskStatus;
							const { label, color } = statusMap[status];
							return (
								<div
									key={status}
									className={`pr-1 ${index > 0 ? "border-l border-gray-400/30 ml-1 pl-2" : ""}`}
								>
									<div
										className={`flex justify-start gap-3 items-center mb-4 rounded-xl p-2 ${color}`}
									>
										<h3 className="font-medium">{label}</h3>
										<span className="!text-sm font-semibold text-gray-600/60">
											({tasks.length})
										</span>
									</div>
									<div className={cn("space-y-3 !w-full flex flex-col items-center !h-full")}>
										{tasks.map((task) => (
											<Card
												key={task.id}
												className="shadow-sm !w-full !max-w-full shadow-black/10 border-black/10 border-[1.5px] !overflow-hidden !rounded-xl !p-4"
											>
												<div className="flex items-center justify-between">
													<h4 className="font-medium text-lg mb-2">{task.task_name}</h4>
													{taskActionsDropdown(task)}
												</div>
												<div className="flex items-end justify-between gap-8 mt-3">
													<div className="!flex !items-center !justify-start gap-4 ">
														{getStatusBadge(task.task_status)}
														<Badge
															className={`${getPriorityColor(task.priority)} !capitalize text-xs`}
															variant="outline"
														>
															{task.priority}
														</Badge>
													</div>
													<div className="flex items-center justify-between">
														{task.assignees.length ? (
															<div className="flex -space-x-1">
																{task.assignees.slice(0, 2).map((assignee) => (
																	<Avatar
																		key={assignee.id}
																		className="h-6 w-6 border-2 border-white rounded-full"
																	>
																		<AvatarImage
																			src={
																				assignee.employee_profile_picture
																					? getFileUrl(assignee.employee_profile_picture)
																					: "/images/profile-placeholder.jpg"
																			}
																		/>
																		<AvatarFallback className="text-xs bg-gray-300">
																			{assignee.name?.[0] || "?"}
																		</AvatarFallback>
																	</Avatar>
																))}
																{task.assignees.length > 2 ? (
																	<div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
																		+{task.assignees.length - 2}
																	</div>
																) : (
																	<></>
																)}
															</div>
														) : (
															<span className="text-xs font-semibold text-gray-500">
																No assignees
															</span>
														)}
													</div>
												</div>
											</Card>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{activeTab === "timeline" && filteredProject && (
				<div className="space-y-4">
					<Calender
						groups={filteredProject.project_tasks.map(
							(task: IProjectTask): Group => ({
								id: task.id,
								title: task.task_name,
								rightTitle: task.task_status.replace("_", " ").toUpperCase(),
							}),
						)}
						items={filteredProject.project_tasks.map(
							(task: IProjectTask): Item => ({
								id: task.id,
								group: task.id,
								title: task.task_name,
								className: task.task_status,
								start_time: Date.parse(task.start_date),
								end_time: Date.parse(task.end_date),
								canMove: true,
								canResize: "both",
								canChangeGroup: false,
								tip: task.description,
							}),
						)}
						onItemMove={async (itemId: number, dragTime: number, newGroupOrder: number) => {
							const task = filteredProject.project_tasks.find((t) => t.id === itemId);
							if (!task) return;

							const todayTimestamp = new Date().setHours(0, 0, 0, 0);
							const newStartDate =
								dragTime < todayTimestamp
									? new Date(todayTimestamp).toISOString()
									: new Date(dragTime).toISOString();
							const duration = task.end_date
								? Date.parse(task.end_date) - Date.parse(task.start_date)
								: 0;
							const newEndDate = new Date(Date.parse(newStartDate) + duration).toISOString();

							await handleTimelineUpdate({
								taskId: task.id,
								start_date: newStartDate,
								end_date: newEndDate,
							});
						}}
						onItemResize={async (itemId: number, time: number, edge: "left" | "right") => {
							const task = filteredProject.project_tasks.find((t) => t.id === itemId);
							if (!task) return;

							const todayTimestamp = new Date().setHours(0, 0, 0, 0);
							const newStartDate =
								edge === "left" && time < todayTimestamp
									? new Date(todayTimestamp).toISOString()
									: edge === "left"
										? new Date(time).toISOString()
										: task.start_date;
							const newEndDate = edge === "right" ? new Date(time).toISOString() : task.end_date;

							if (Date.parse(newEndDate) < Date.parse(newStartDate)) {
								return; // Prevent invalid date range
							}

							await handleTimelineUpdate({
								taskId: task.id,
								start_date: newStartDate,
								end_date: newEndDate,
							});
						}}
					/>
				</div>
			)}

			{activeTab === "table" && filteredProject && (
				<PaginatedTable<IProjectTask>
					paginated={false}
					fetchFirstPage={async () => {
						return {
							count: filteredProject.project_tasks.length,
							next: null,
							previous: null,
							results: filteredProject.project_tasks,
						} as IPaginatedResponse<IProjectTask>;
					}}
					deps={[filteredProject]}
					onError={(err) => showErrorToast({ error: err, defaultMessage: "Failed to fetch tasks" })}
					className="space-y-4"
					tableClassName="min-w-[800px]"
					footerClassName="pt-4"
					columns={columns}
					skeletonRows={10}
					emptyState={
						<div className="text-center py-12">
							<p className="text-muted-foreground mb-4">No tasks found</p>
						</div>
					}
				/>
			)}

			{projectToDelete && (
				<ConfirmationDialog
					isOpen={!!projectToDelete}
					title="Delete Project"
					description="Are you sure you want to delete this project? This action cannot be undone."
					onConfirm={handleDelete}
					onClose={() => setProjectToDelete(null)}
					disabled={isDeleting}
				/>
			)}

			{taskToDelete && (
				<ConfirmationDialog
					isOpen={!!taskToDelete}
					title="Delete Task"
					description="Are you sure you want to delete this task? This action cannot be undone."
					onConfirm={handleTaskDelete}
					onClose={() => setTaskToDelete(null)}
				/>
			)}

			{filteredProject && (
				<TaskDialog
					isOpen={isAddTaskOpen}
					onClose={() => {
						setSelectedTask(null);
						setIsAddTaskOpen(false);
					}}
					onSave={async (taskData) => {
						await fetchProject();
					}}
					initialData={selectedTask}
					projectId={filteredProject.id}
				/>
			)}

			{selectedTask && (
				<TaskDetailsDialog
					isOpen={isTaskDetailsOpen}
					onClose={() => {
						setSelectedTask(null);
						setIsTaskDetailsOpen(false);
					}}
					task={selectedTask}
				/>
			)}
		</div>
	);
}
