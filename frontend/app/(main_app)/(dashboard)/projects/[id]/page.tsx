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
	MoreVertical,
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
import { IProject, IProjectTask } from "@/types/types.utils";
import { PROJECTS_API } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { showErrorToast } from "@/lib/utils";
import { toast } from "sonner";
import { IProjectStatus, IProjectTaskPriority, IProjectTaskStatus } from "@/types/types.utils";

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
	const today = new Date("2025-09-19T01:33:00Z"); // Updated to current date and time
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

const CircularProgress = ({ percentage }: { percentage: number }) => {
	const radius = 36;
	const stroke = 4;
	const normalizedRadius = radius - stroke * 2;
	const circumference = normalizedRadius * 2 * Math.PI;
	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	return (
		<div className="relative">
			<svg height="80" width="80" className="transform -rotate-90 origin-center">
				<circle
					stroke="#e5e7eb"
					strokeWidth={stroke}
					fill="transparent"
					r={normalizedRadius}
					cx={radius}
					cy={radius}
				/>
				<circle
					stroke="#3b82f6"
					strokeWidth={stroke}
					fill="transparent"
					r={normalizedRadius}
					cx={radius}
					cy={radius}
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
				/>
			</svg>
			<div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
				<div className="text-sm font-bold text-gray-700">{percentage}%</div>
			</div>
		</div>
	);
};

export default function ProjectDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const [project, setProject] = useState<IProject | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"board" | "timeline" | "table">("table"); // Default to table for testing
	const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Mock documents
	const documents = useMemo(
		() => [
			{ id: 1, name: "testing-pdf-0001.pdf", created: "Jun 12, 2025" },
			{ id: 2, name: "design-doc-0002.pdf", created: "Jul 5, 2025" },
		],
		[],
	);

	// Mock project data with table tasks
	const mockProject = useMemo(
		() => ({
			id: Number(params.id),
			project_name: "Sample Project Table",
			description: "A project to test the table view with mock data.",
			start_date: "2025-09-01T00:00:00Z",
			end_date: "2025-10-15T00:00:00Z",
			project_status: "in_progress" as IProjectStatus,
			managers: [
				{ id: 1, name: "John Doe", employee_profile_picture: "" },
				{ id: 2, name: "Jane Smith", employee_profile_picture: "" },
			],
			assignees: [
				{ id: 3, name: "Alice Johnson", employee_profile_picture: "" },
				{ id: 4, name: "Bob Brown", employee_profile_picture: "" },
			],
			project_tasks: [
				{
					id: 1,
					task_name: "Planning Phase",
					description: "Initial planning and resource allocation.",
					start_date: "2025-09-01T00:00:00Z",
					end_date: "2025-09-10T00:00:00Z",
					task_status: "completed" as IProjectTaskStatus,
					priority: "medium" as IProjectTaskPriority,
					assignees: [{ id: 1, name: "John Doe", employee_profile_picture: "" }],
				},
				{
					id: 2,
					task_name: "Design Development",
					description: "Creating initial designs and prototypes.",
					start_date: "2025-09-11T00:00:00Z",
					end_date: "2025-09-20T00:00:00Z",
					task_status: "in_progress" as IProjectTaskStatus,
					priority: "high" as IProjectTaskPriority,
					assignees: [{ id: 2, name: "Jane Smith", employee_profile_picture: "" }],
				},
				{
					id: 3,
					task_name: "Implementation",
					description: "Executing the main project tasks.",
					start_date: "2025-09-21T00:00:00Z",
					end_date: "2025-10-05T00:00:00Z",
					task_status: "not_started" as IProjectTaskStatus,
					priority: "urgent" as IProjectTaskPriority,
					assignees: [
						{ id: 3, name: "Alice Johnson", employee_profile_picture: "" },
						{ id: 4, name: "Bob Brown", employee_profile_picture: "" },
					],
				},
				{
					id: 4,
					task_name: "Testing Phase",
					description: "Final testing and quality assurance.",
					start_date: "2025-10-06T00:00:00Z",
					end_date: "2025-10-15T00:00:00Z",
					task_status: "on_hold" as IProjectTaskStatus,
					priority: "low" as IProjectTaskPriority,
					assignees: [{ id: 1, name: "John Doe", employee_profile_picture: "" }],
				},
			],
		}),
		[params.id],
	);

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
			console.error("Error fetching project:", error);
			showErrorToast({ error, defaultMessage: "Failed to fetch project" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (params.id) {
			fetchProject();
		}
	}, [params.id]);

	// Group tasks by status for board, ensure useMemo runs unconditionally
	const groupedTasks = useMemo(() => {
		if (!project)
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
		project.project_tasks.forEach((task) => {
			groups[task.task_status].push(task);
		});
		return groups;
	}, [project]);

	if (loading) {
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

	if (!project) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-lg">Project not found</div>
			</div>
		);
	}

	const progress = calculateProgress(project.project_tasks || mockProject.project_tasks);

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

	return (
		<div className="min-h-screen bg-white p-4 rounded-xl space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/projects" className="p-2 hover:bg-gray-100 rounded-full">
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold">
							{project.project_name || mockProject.project_name}
						</h1>
						<Badge
							className={cn(
								"capitalize",
								getStatusColor(project.project_status || mockProject.project_status),
							)}
						>
							{getStatusIcon(project.project_status || mockProject.project_status)}
							<span className="ml-1">
								{(project.project_status || mockProject.project_status).replace("_", " ")}
							</span>
						</Badge>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" asChild>
						<Link href={`/projects/edit/${project.id || mockProject.id}`}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</Link>
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setProjectToDelete(project || mockProject)}
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete
					</Button>
				</div>
			</div>

			{/* Description and Progress */}
			<div className="flex items-start justify-between">
				<p className="text-gray-600 max-w-[70%]">
					{project.description || mockProject.description}
				</p>
				<CircularProgress percentage={progress} />
			</div>

			{/* Team and Dates */}
			<div className="flex justify-between items-center">
				<div className="space-y-4">
					<div className="space-y-2">
						<h3 className="font-medium text-sm">Leads</h3>
						<div className="flex -space-x-2">
							{(project.managers || mockProject.managers).slice(0, 3).map((lead) => (
								<Avatar key={lead.id} className="h-8 w-8 border-2 border-white rounded-full">
									<AvatarImage src={lead.employee_profile_picture || ""} />
									<AvatarFallback className="text-xs bg-gray-300">
										{lead.name
											?.split(" ")
											.map((n) => n[0])
											.join("") || "?"}
									</AvatarFallback>
								</Avatar>
							))}
							{(project.managers || mockProject.managers).length > 3 && (
								<div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
									+{(project.managers || mockProject.managers).length - 3}
								</div>
							)}
						</div>
					</div>
					<div className="space-y-2">
						<h3 className="font-medium text-sm">Members</h3>
						<div className="flex -space-x-2">
							{(project.assignees || mockProject.assignees).slice(0, 3).map((member) => (
								<Avatar key={member.id} className="h-8 w-8 border-2 border-white rounded-full">
									<AvatarImage src={member.employee_profile_picture || ""} />
									<AvatarFallback className="text-xs bg-gray-300">
										{member.name
											?.split(" ")
											.map((n) => n[0])
											.join("") || "?"}
									</AvatarFallback>
								</Avatar>
							))}
							{(project.assignees || mockProject.assignees).length > 3 && (
								<div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
									+{(project.assignees || mockProject.assignees).length - 3}
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="text-right space-y-1 text-sm">
					<div className="flex justify-end">
						<span className="text-gray-500">Start Date</span>
					</div>
					<div className="font-medium">
						{new Date(project.start_date || mockProject.start_date).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</div>
					<div className="flex justify-end">
						<span className="text-gray-500">End Date</span>
					</div>
					<div className="font-medium">
						{new Date(project.end_date || mockProject.end_date).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</div>
				</div>
			</div>

			{/* Documents */}
			<div>
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
										<MoreVertical className="h-4 w-4" />
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
			</div>

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

			{/* Tab Content */}
			{activeTab === "board" && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input placeholder="Search tasks..." className="pl-10 w-64" />
							</div>
							<Select>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="All Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="not_started">Not started</SelectItem>
									<SelectItem value="on_hold">On Hold</SelectItem>
									<SelectItem value="in_progress">In Progress</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
								</SelectContent>
							</Select>
							<Select>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="All Priorities" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Priorities</SelectItem>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="urgent">Urgent</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button className="rounded-xl">
							<Plus className="h-4 w-4 mr-2" />
							New Task
						</Button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{Object.entries(groupedTasks).map(([statusKey, tasks], index) => {
							const status = statusKey as IProjectTaskStatus;
							const { label, color } = statusMap[status];
							return (
								<div
									key={status}
									className={`min-w-[280px] ${index > 0 ? "border-l border-gray-200 pl-4" : ""}`}
								>
									<div className="flex justify-between items-center mb-4">
										<h3 className="font-medium">{label}</h3>
										<Badge variant="outline">{tasks.length}</Badge>
									</div>
									<div className={cn("space-y-3", color)}>
										{tasks.slice(0, 5).map((task) => (
											<Card key={task.id} className="p-3">
												<h4 className="font-medium text-sm mb-2">{task.task_name}</h4>
												<Badge
													className={`${getPriorityColor(task.priority)} text-xs mb-2`}
													variant="outline"
												>
													{task.priority}
												</Badge>
												<div className="flex items-center justify-between">
													<div className="flex -space-x-1">
														{task.assignees.slice(0, 2).map((assignee) => (
															<Avatar
																key={assignee.id}
																className="h-6 w-6 border-2 border-white rounded-full"
															>
																<AvatarImage src={assignee.employee_profile_picture || ""} />
																<AvatarFallback className="text-xs bg-gray-300">
																	{assignee.name?.[0] || "?"}
																</AvatarFallback>
															</Avatar>
														))}
														{task.assignees.length > 2 && (
															<div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
																+{task.assignees.length - 2}
															</div>
														)}
													</div>
													<span className="text-xs text-gray-500">{task.assignees.length}</span>
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

			{activeTab === "timeline" && (
				<div className="space-y-4">
					<div className="flex justify-between items-center">
						<h3 className="text-lg font-semibold">Timeline</h3>
						<Button>Add Milestone</Button>
					</div>
					<div className="space-y-6">
						{(project.project_tasks || mockProject.project_tasks)
							.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
							.map((task) => (
								<div key={task.id} className="flex items-start gap-4">
									<div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
									<div className="flex-1">
										<div className="flex justify-between items-start">
											<h4 className="font-medium">{task.task_name}</h4>
											<Badge className={getStatusColor(task.task_status)}>
												{task.task_status.replace("_", " ")}
											</Badge>
										</div>
										<p className="text-sm text-gray-600 mb-2">{task.description}</p>
										<div className="flex gap-4 text-xs text-gray-500">
											<span>
												{new Date(task.start_date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
												})}
											</span>
											<span>—</span>
											<span>
												{new Date(task.end_date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
												})}
											</span>
										</div>
									</div>
								</div>
							))}
					</div>
				</div>
			)}

			{activeTab === "table" && (
				<Card className="border-0 shadow-none">
					<CardContent className="p-0">
						<Table>
							<TableHeader className="bg-gray-50">
								<TableRow>
									<TableHead className="w-[300px] font-medium text-sm text-gray-600">
										Task Name
									</TableHead>
									<TableHead className="w-[150px] font-medium text-sm text-gray-600">
										Status
									</TableHead>
									<TableHead className="w-[150px] font-medium text-sm text-gray-600">
										Priority
									</TableHead>
									<TableHead className="w-[100px] font-medium text-sm text-gray-600">
										Assigned
									</TableHead>
									<TableHead className="w-[150px] font-medium text-sm text-gray-600">
										Due Date
									</TableHead>
									<TableHead className="w-[50px] font-medium text-sm text-gray-600">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(project.project_tasks || mockProject.project_tasks).map((task) => (
									<TableRow key={task.id} className="border-b border-gray-200">
										<TableCell className="py-4">
											<div>
												<h4 className="font-medium text-sm">{task.task_name}</h4>
												<p className="text-xs text-gray-500 mt-1">{task.description}</p>
											</div>
										</TableCell>
										<TableCell className="py-4">
											<Badge className={cn("px-2 py-1 rounded", getStatusColor(task.task_status))}>
												{task.task_status.replace("_", " ")}
											</Badge>
										</TableCell>
										<TableCell className="py-4">
											<Badge className={cn("px-2 py-1 rounded", getPriorityColor(task.priority))}>
												{task.priority}
											</Badge>
										</TableCell>
										<TableCell className="py-4">
											<div className="flex -space-x-2">
												{task.assignees.slice(0, 2).map((assignee) => (
													<Avatar
														key={assignee.id}
														className="h-6 w-6 border-2 border-white rounded-full"
													>
														<AvatarImage src={assignee.employee_profile_picture || ""} />
														<AvatarFallback className="text-xs bg-gray-300">
															{assignee.name?.[0] || "?"}
														</AvatarFallback>
													</Avatar>
												))}
												{task.assignees.length > 2 && (
													<div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
														+{task.assignees.length - 2}
													</div>
												)}
											</div>
										</TableCell>
										<TableCell className="py-4 text-sm text-gray-600">
											{new Date(task.end_date).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
												year: "numeric",
											})}
										</TableCell>
										<TableCell className="py-4">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
														<MoreVertical className="h-4 w-4 text-gray-500" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem className="text-sm">View</DropdownMenuItem>
													<DropdownMenuItem className="text-sm">Edit</DropdownMenuItem>
													<DropdownMenuItem className="text-sm text-red-600">
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
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
		</div>
	);
}
