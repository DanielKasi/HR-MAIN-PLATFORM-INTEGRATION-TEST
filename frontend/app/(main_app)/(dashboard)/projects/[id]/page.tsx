"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { UserProfile } from "@/types";
import { apiGet } from "@/lib/apiRequest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	ArrowLeft,
	Edit,
	Users,
	Calendar,
	Target,
	Plus,
	CheckCircle2,
	AlertTriangle,
	Eye,
	Trash2,
	FileText,
	TrendingUp,
	Activity,
	MoreVertical,
	ClockAlert,
	List,
} from "lucide-react";
import Link from "next/link";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { IProject, IProjectTask } from "@/types/types.utils";
import { PROJECTS_API } from "@/lib/utils";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import FixedLoader from "@/components/fixed-loader";

const getStatusColor = (status: string) => {
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
		default:
			return "bg-gray-50 text-gray-700 border-gray-200";
	}
};

const getPriorityColor = (priority: string) => {
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

export default function ProjectDetailsPage() {
	const params = useParams();
	const [project, setProject] = useState<IProject | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchProject = async () => {
		try {
			const project = await PROJECTS_API.getByProjectById({ project_id: Number(params.id) });
			setProject(project);
		} catch (error) {
			console.error("Error fetching project:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (params.id) {
			fetchProject();
		}
	}, [params.id]);

	if (loading) {
		return <FixedLoader />;
	}

	if (!project) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-lg">Project not found</div>
			</div>
		);
	}

	const progress = calculateProgress(project.project_tasks);
	const daysRemaining = getDaysRemaining(project.end_date);
	const isOverdue = daysRemaining < 0 && project.project_status !== "completed";

	const taskStats = {
		total: project.project_tasks.length,
		completed: project.project_tasks.filter((t) => t.task_status === "completed").length,
		inProgress: project.project_tasks.filter((t) => t.task_status === "in_progress").length,
		overdue: project.project_tasks.filter(
			(t) => getDaysRemaining(t.end_date) < 0 && t.task_status !== "completed",
		).length,
	};

	const columns = [
		{
			key: "name",
			header: "Task Name",
			className: "w-1/3",
			cellClassName: "",
			cell: (task: IProjectTask) => (
				<div className="space-y-1">
					<h4 className="font-semibold text-slate-900">{task.task_name}</h4>
					<p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
				</div>
			),
		},
		{
			key: "status",
			header: "Status",
			className: "w-1/6",
			cellClassName: "text-center",
			cell: (task: IProjectTask) => (
				<Badge className={`${getStatusColor(task.task_status)} border text-xs`}>
					{task.task_status.replace("_", " ")}
				</Badge>
			),
		},
		{
			key: "priority",
			header: "Priority",
			className: "w-1/6",
			cellClassName: "text-center",
			cell: (task: IProjectTask) => (
				<Badge className={`${getPriorityColor(task.priority)} border text-xs`}>
					{task.priority}
				</Badge>
			),
		},
		{
			key: "assigned",
			header: "Assigned",
			className: "w-1/12",
			cellClassName: "text-center",
			cell: (task: IProjectTask) => (
				<div className="flex items-center justify-center gap-1 text-xs text-slate-600">
					<Users className="h-3 w-3" />
					{task.assigned_to.length}
				</div>
			),
		},
		{
			key: "dueDate",
			header: "Due Date",
			className: "w-1/6",
			cellClassName: "",
			cell: (task: IProjectTask) => {
				const taskDaysRemaining = getDaysRemaining(task.end_date);
				const isTaskOverdue = taskDaysRemaining < 0 && task.task_status !== "completed";
				return (
					<div className="flex items-center gap-2 text-xs text-slate-600">
						<Calendar className="h-3 w-3 flex-shrink-0" />
						<span>{new Date(task.end_date).toLocaleDateString()}</span>
						{isTaskOverdue && (
							<Badge variant="destructive" className="text-xs">
								Overdue
							</Badge>
						)}
					</div>
				);
			},
		},
		{
			key: "actions",
			header: "",
			className: "w-1/12 text-right",
			cellClassName: "text-right",
			cell: (task: IProjectTask) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link href={`/projects/project-tasks/${task.id}`}>
								<Eye className="mr-2 h-4 w-4" />
								View Details
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link href={`/projects/project-tasks/edit/${task.id}`}>
								<Edit className="mr-2 h-4 w-4" />
								Edit Task
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem className="text-red-600">
							<Trash2 className="mr-2 h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	const tableData = { results: project.project_tasks };
	const skeletonRows = 3;
	const emptyState = (
		<div className="text-center py-12">
			<Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
			<h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks yet</h3>
			<p className="text-slate-600 mb-4">Start by creating your first task for this project</p>
			<Link href={`/projects/project-tasks/add?project=${project.id}`}>
				<Button className="rounded-xl">
					<Plus className="mr-2 h-4 w-4" />
					Create Task
				</Button>
			</Link>
		</div>
	);

	return (
		<div className="min-h-screen bg-white rounded-xl p-6">
			<div className="max-w-full space-y-8">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<div className="flex items-center justify-start gap-4 mb-2">
							<Link href="/projects">
								<Button variant="outline" size="sm" className=" rounded-full !aspect-square">
									<ArrowLeft className="h-4 w-4" />
								</Button>
							</Link>
							<h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gray-900  bg-clip-text text-transparent">
								{project.project_name}
							</h1>
						</div>
						<div className="flex items-center gap-3">
							<Badge className={`${getStatusColor(project.project_status)} border`}>
								{project.project_status.replace("_", " ")}
							</Badge>
							{isOverdue && (
								<Badge variant="destructive">{Math.abs(daysRemaining)} days overdue</Badge>
							)}
						</div>
					</div>
					<Link href={`/projects/edit/${project.id}`}>
						<Button className="!rounded-xl">
							<Edit className="h-4 w-4 md:mr-2" />
							<span className="hidden md:inline-block">Edit Project</span>
						</Button>
					</Link>
				</div>

				<div
					className={` gap-6 ${project?.approval_status !== "active" && project?.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
				>
					{project?.approvals && project.approvals.length > 0 && (
						<div className="order-1 lg:order-2">
							<ApprovalWorkflow
								approvals={project.approvals}
								instance_approval_status={project.approval_status}
								onRefresh={fetchProject}
							/>
						</div>
					)}

					<div
						className={`${project?.approval_status !== "active" && project?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
					>
						{/* Stats Cards */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							<Card className="shadow-sm rounded-xl">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium">Progress</p>
											<p className="text-3xl font-bold">{progress}%</p>
										</div>
										<TrendingUp className="h-8 w-8" />
									</div>
								</CardContent>
							</Card>

							<Card className="shadow-sm">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium">Total Tasks</p>
											<p className="text-3xl font-bold">{taskStats.total}</p>
										</div>
										<List className="h-8 w-8" />
									</div>
								</CardContent>
							</Card>

							<Card className="shadow-sm">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium">Completed Tasks</p>
											<p className="text-3xl font-bold">{taskStats.completed}</p>
										</div>
										<CheckCircle2 className="h-8 w-8" />
									</div>
								</CardContent>
							</Card>
							<Card className="shadow-sm">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium">Tasks Overdue</p>
											<p className="text-3xl font-bold">{taskStats.overdue}</p>
										</div>
										<AlertTriangle className="h-8 w-8" />
									</div>
								</CardContent>
							</Card>

							<Card className="shadow-sm">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium">Days remaining</p>
											<p className="text-3xl font-bold text-green-600">
												{daysRemaining >= 0 ? daysRemaining : 0}
											</p>
										</div>
										<Activity className="h-8 w-8 text-green-600" />
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Main Content */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
							<div className="lg:col-span-2">
								<Card className="border-0 !shadow-md">
									<CardHeader className="flex flex-row items-center justify-between pb-4">
										<div className="space-y-1">
											<CardTitle className="text-lg font-semibold">Project Tasks</CardTitle>
											<p className="text-sm text-slate-600">Manage and track all project tasks</p>
										</div>
										<Link href={`/projects/project-tasks/add?project=${project.id}`}>
											<Button className="rounded-xl">
												<Plus className="h-4 w-4 mr-2" />
												Add Task
											</Button>
										</Link>
									</CardHeader>
									<CardContent>
										<Table className={cn("w-full")}>
											<TableHeader>
												<TableRow className="border-b bg-muted/30">
													{columns.map((col) => (
														<TableHead key={col.key} className={col.className}>
															{col.header}
														</TableHead>
													))}
												</TableRow>
											</TableHeader>
											<TableBody>
												{loading ? (
													Array.from({ length: skeletonRows }).map((_, rowIndex) => (
														<TableRow key={rowIndex} className="border-b">
															{columns.map((col) => (
																<TableCell key={col.key}>
																	<Skeleton className="h-6 w-3/4" />
																</TableCell>
															))}
														</TableRow>
													))
												) : (tableData?.results?.length ?? 0) === 0 ? (
													<TableRow>
														<TableCell colSpan={columns.length} className="text-center py-12">
															{emptyState}
														</TableCell>
													</TableRow>
												) : (
													tableData?.results?.map((task: IProjectTask, index) => (
														<TableRow
															key={index}
															className="hover:bg-muted/50 transition-colors border-b"
														>
															{columns.map((col) => (
																<TableCell key={col.key} className={col.cellClassName}>
																	{col.cell(task)}
																</TableCell>
															))}
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</CardContent>
								</Card>
							</div>

							{/* Sidebar */}
							<div className="space-y-6 ">
								{/* Team Members */}
								<Card className="border-0 !shadow-md">
									<CardContent className="space-y-4">
										<div>
											<h4 className="font-medium text-slate-900 mb-3">Project Leaders</h4>
											<div className="space-y-2">
												{project.managers.map((leader) => (
													<div
														key={leader.id}
														className="flex items-center gap-3 p-2 rounded-lg bg-slate-50"
													>
														<Avatar className="h-8 w-8">
															<AvatarImage src={`/placeholder.svg?height=32&width=32`} />
															<AvatarFallback className="text-xs">
																{leader.user.fullname
																	.split(" ")
																	.map((n) => n[0])
																	.join("")}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-slate-900 truncate">
																{leader.user.fullname}
															</p>
															<p className="text-xs text-slate-600">Leader</p>
														</div>
													</div>
												))}
											</div>
										</div>

										<div>
											<h4 className="font-medium text-slate-900 mb-3">Team Members</h4>
											<div className="space-y-2">
												{project.assignees.map((member) => (
													<div
														key={member.id}
														className="flex items-center gap-3 p-2 rounded-lg bg-slate-50"
													>
														<Avatar className="h-8 w-8">
															<AvatarImage src={`/placeholder.svg?height=32&width=32`} />
															<AvatarFallback className="text-xs">
																{member.user.fullname
																	.split(" ")
																	.map((n) => n[0])
																	.join("")}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-slate-900 truncate">
																{member.user.fullname}
															</p>
															<p className="text-xs text-slate-600">Member</p>
														</div>
													</div>
												))}
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
