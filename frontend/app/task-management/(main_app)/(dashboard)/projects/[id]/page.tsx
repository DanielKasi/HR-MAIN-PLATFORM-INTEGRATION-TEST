"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Edit,
	Plus,
	Search,
	MoreHorizontal,
	Eye,
	Trash2,
	Clock,
	CheckCircle2,
	Pause,
	XCircle,
	AlertCircle,
	Target,
	X,
	MessageSquare,
	Calendar,
	History,
} from "lucide-react";
import Link from "next/link";
import { DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Card } from "@/platform/v1/components";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/platform/v1/components";
import { DndContext, DragEndEvent, DragOverEvent, closestCenter } from "@dnd-kit/core";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Skeleton } from "@/platform/v1/components";
import { PROJECTS_TASKS_API, PROJECT_TASK_PRIORITY_API } from "@/lib/utils";
import { IPaginatedResponse, IProject, IProjectTask } from "@/types/types.utils";
import { PROJECTS_API } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { showErrorToast } from "@/lib/utils";
import { toast } from "sonner";
import {
	IProjectEmailConfiguration,
	IProjectTaskStatuses,
	IProjectTaskPriority,
} from "@/types/project.type";
import { Icon } from "@iconify/react";
import { formatDate, getFileUrl } from "@/lib/helpers";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { ProtectedComponent } from "@/platform/v1/components";
import { PERMISSION_CODES } from "@/constants";
import ProjectTaskDialog from "@/components/projects/tasks/project-task-dialog";
import { useSelector } from "react-redux";
import { selectUser } from "@/store/auth/selectors-context-aware";
import { ProjectAuditTrail } from "@/components/projects/tasks/project-audit-log";
import { ConfigurationInput } from "@/components/projects/tasks/projects-configurations-input-select";
import { PROJECT_EMAIL_CONFIGURATION_API } from "@/lib/utils.chats";
import { ProjectTaskStatusDialog } from "@/components/common/dialogs/project-task-status-dialog";
import { AssigneeAvatarsWithTooltip } from "@/components/common/assignee-avatar-with-tooltip";
import { DroppableStatusColumn } from "@/components/common/dropable-status-column";
import { ProjectChatThread } from "@/components/projects/tasks/project-chat-thread";
import TaskDetailsDialog from "@/components/projects/tasks/project-task-details-dialog";
import { TaskTimelineDialog } from "@/components/common/dialogs/task-timeline-extension";
import Calender, { Group, Item } from "@/components/projects/tasks/calender";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

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
	if (tasks.length === 0) return 0;
	const completedTasks = tasks.filter(
		(task) => task.task_status?.name?.toLowerCase() === "completed",
	).length;
	return Math.round((completedTasks / tasks.length) * 100);
};

const getStatusBadge = (status: { id: number; name: string; color_code?: string }) => {
	const backgroundColor = status.color_code || "#64748b";

	return (
		<Badge
			style={{
				backgroundColor: `${backgroundColor}30`,
				color: backgroundColor,
				border: `1.5px solid ${backgroundColor}`,
			}}
			className="capitalize text-xs sm:text-sm"
		>
			{status.name}
		</Badge>
	);
};

export default function ProjectDetailsPage() {
	const params = useParams();
	const router = useModuleNavigation();
	const [project, setProject] = useState<IProject | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"board" | "timeline" | "table">("board");
	const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [taskToDelete, setTaskToDelete] = useState<IProjectTask | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState<IProjectTask | null>(null);
	const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
	const [filteredProject, setFilteredProject] = useState<IProject | null>(null);
	const [taskStatuses, setTaskStatuses] = useState<IProjectTaskStatuses[]>([]);
	const [nextStatusesUrl, setNextStatusesUrl] = useState<string | null>(null);
	const [statusesLoading, setStatusesLoading] = useState(true);
	const [fetchingMore, setFetchingMore] = useState(false);
	const [taskPriorities, setTaskPriorities] = useState<IProjectTaskPriority[]>([]);
	const [prioritiesLoading, setPrioritiesLoading] = useState(true);
	const [memberFilter, setMemberFilter] = useState<number | null>(null);
	const [taskOrder, setTaskOrder] = useState<Record<number, number[]>>({});
	const [activeTask, setActiveTask] = useState<IProjectTask | null>(null);
	const [startDateFilter, setStartDateFilter] = useState<string>("");
	const [endDateFilter, setEndDateFilter] = useState<string>("");
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [taskForTimeline, setTaskForTimeline] = useState<IProjectTask | null>(null);
	const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
	const [isAuditLogOpen, setIsAuditLog] = useState(false);
	const [emailConfig, setEmailConfig] = useState<IProjectEmailConfiguration[]>([]);
	const [isConfigurationsOpen, setIsConfigurations] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [editingStatus, setEditingStatus] = useState<IProjectTaskStatuses | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<IProjectTaskStatuses | null>(null);

	const tabConfig = [
		{ id: "board" as const, label: "Board" },
		{ id: "timeline" as const, label: "Timeline" },
		{ id: "table" as const, label: "Table" },
	];

	const refreshConfigurations = async () => {
		await fetchProject();
		await fetchEmailConfig();
	};

	const currentUser = useSelector(selectUser);

	const handleDragStart = (event: DragStartEvent) => {
		const task = project?.project_tasks.find((t) => t.id === Number(event.active.id));
		setActiveTask(task || null);
	};

	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: {
				distance: 3,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 100,
				tolerance: 5,
			},
		}),
	);

	const fetchProject = async () => {
		try {
			const fetchedProject = await PROJECTS_API.getByProjectById({
				project_id: Number(params.id),
			});

			const normalizedTasks = (fetchedProject.project_tasks || [])
				.map((task) => {
					const taskStatus =
						task.applied_project_task_status && typeof task.applied_project_task_status === "object"
							? task.applied_project_task_status
							: task.task_status;

					if (!taskStatus || typeof taskStatus !== "object") {
						return null;
					}

					return {
						...task,
						task_status: taskStatus,
					};
				})
				.filter((task): task is IProjectTask => task !== null);

			setProject({
				...fetchedProject,
				project_tasks: normalizedTasks,
				user_assignees: fetchedProject.user_assignees || [],
			});
			setTaskStatuses(fetchedProject.project_task_statuses || []);
			setStatusesLoading(false);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch project" });
			setStatusesLoading(false);
		}
	};

	const allMembers = useMemo(() => {
		if (!project?.project_tasks) return [];

		const membersMap = new Map<number, { id: number; name: string }>();

		project.project_tasks.forEach((task) => {
			task.user_assignees.forEach((member) => {
				if (!membersMap.has(member.id)) {
					membersMap.set(member.id, member);
				}
			});
		});

		return Array.from(membersMap.values());
	}, [project?.project_tasks]);

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
		if (scrollWidth - scrollLeft - clientWidth < 200 && nextStatusesUrl && !fetchingMore) {
			setFetchingMore(true);
		}
	};

	const fetchEmailConfig = async () => {
		if (project?.id) {
			try {
				const response =
					await PROJECT_EMAIL_CONFIGURATION_API.getPaginatedProjectEmailConfiguration({
						page: 1,
					});
				const configs = response.results.filter((c) => c.project === project.id);
				setEmailConfig(configs);
			} catch (error) {
				console.error("Failed to fetch email configuration", error);
				setEmailConfig([]);
			}
		}
	};

	useEffect(() => {
		if (params.id) {
			loadData();
			fetchTaskPriorities();
		}
	}, [params.id]);

	const loadData = async () => {
		setLoading(true);
		await fetchProject();
		setLoading(false);
	};

	useEffect(() => {
		fetchEmailConfig();
	}, [project?.id]);

	useEffect(() => {
		if (project) {
			let filteredTasks = project.project_tasks || [];

			// Apply search filter
			if (searchQuery) {
				filteredTasks = filteredTasks.filter((task) =>
					task.task_name.toLowerCase().includes(searchQuery.toLowerCase()),
				);
			}

			// Apply date filters
			if (startDateFilter) {
				filteredTasks = filteredTasks.filter((task) => {
					if (!task.start_date) return false;
					return new Date(task.start_date) >= new Date(startDateFilter);
				});
			}

			if (endDateFilter) {
				filteredTasks = filteredTasks.filter((task) => {
					if (!task.end_date) return false;
					return new Date(task.end_date) <= new Date(endDateFilter);
				});
			}
			setFilteredProject({
				...project,
				project_tasks: filteredTasks,
			});
		}
	}, [project, searchQuery, startDateFilter, endDateFilter]);

	const groupedTasks = useMemo(() => {
		if (!filteredProject || statusesLoading || taskStatuses.length === 0) {
			return {} as Record<number, IProjectTask[]>;
		}

		const groups: Record<number, IProjectTask[]> = {};
		taskStatuses.forEach((status) => {
			groups[status.id] = [];
		});

		filteredProject.project_tasks?.forEach((task) => {
			if (!task.task_status || !task.task_status.id) {
				return;
			}

			const statusId = task.task_status.id;
			if (groups[statusId]) {
				groups[statusId].push(task);
			} else {
				groups[statusId] = [task];
			}
		});

		return groups;
	}, [filteredProject, taskStatuses, statusesLoading]);

	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event;

		if (!over) return;

		const activeId = Number(active.id);
		const overId = Number(over.id);

		if (activeId === overId) return;

		const activeTask = project?.project_tasks.find((t) => t.id === activeId);
		const overTask = project?.project_tasks.find((t) => t.id === overId);

		if (!activeTask || !overTask) return;

		if (activeTask.task_status.id === overTask.task_status.id) {
			setProject((prev) => {
				if (!prev) return prev;

				const tasks = [...prev.project_tasks];
				const activeIndex = tasks.findIndex((t) => t.id === activeId);
				const overIndex = tasks.findIndex((t) => t.id === overId);

				const [removed] = tasks.splice(activeIndex, 1);

				const activeWeight = activeTask.priority?.weight ?? 0;
				const overWeight = overTask.priority?.weight ?? 0;

				const wouldViolateConstraint =
					(activeWeight < overWeight && overIndex < activeIndex) ||
					(activeWeight > overWeight && overIndex > activeIndex);

				if (wouldViolateConstraint) {
					let correctIndex = overIndex;

					if (activeWeight < overWeight) {
						for (let i = overIndex; i < tasks.length; i++) {
							const taskWeight = tasks[i].priority?.weight ?? 0;

							if (taskWeight <= activeWeight) {
								correctIndex = i;
								break;
							}
							correctIndex = i + 1;
						}
					} else {
						for (let i = overIndex; i >= 0; i--) {
							const taskWeight = tasks[i].priority?.weight ?? 0;

							if (taskWeight >= activeWeight) {
								correctIndex = i;
								break;
							}
							correctIndex = 0;
						}
					}

					tasks.splice(correctIndex, 0, removed);
				} else {
					tasks.splice(overIndex, 0, removed);
				}

				return {
					...prev,
					project_tasks: tasks,
				};
			});
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		setActiveTask(null);

		if (!over || !project) return;

		const activeTaskId = Number(active.id);
		const movedTask = project.project_tasks.find((t) => t.id === activeTaskId);
		if (!movedTask) return;

		let targetStatusId: number | null = null;

		const droppedOnStatus = taskStatuses.find((status) => status.id === Number(over.id));

		if (droppedOnStatus) {
			targetStatusId = droppedOnStatus.id;
		} else {
			const overTask = project.project_tasks.find((t) => t.id === Number(over.id));
			if (overTask) {
				targetStatusId = overTask.task_status.id;
			}
		}

		if (targetStatusId && movedTask.task_status.id !== targetStatusId) {
			const newStatus = taskStatuses.find((s) => s.id === targetStatusId);
			if (!newStatus) return;

			setProject((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					project_tasks: prev.project_tasks.map((task) =>
						task.id === activeTaskId ? { ...task, task_status: newStatus } : task,
					),
				};
			});

			const updatePayload: any = {
				applied_project_task_status: targetStatusId,
				project: project.id,
				task_name: movedTask.task_name,
				description: movedTask.description,
				start_date: movedTask.start_date,
				end_date: movedTask.end_date,
				completion_date: movedTask.completion_date ?? undefined,
				priority: movedTask.priority?.id,
			};

			if (!movedTask.freeze_assignee) {
				updatePayload.user_manager = movedTask.user_manager?.id;
				updatePayload.user_assignees = movedTask.user_assignees.map((a) => a.id);
				updatePayload.staff_group_assignees = movedTask.staff_group_assignees.map((g) => g.id);
			}

			PROJECTS_TASKS_API.update({
				taskId: activeTaskId,
				data: updatePayload,
			})
				.then(() => {
					toast.success("Task moved", { duration: 1500 });
				})
				.catch((error) => {
					fetchProject();
					showErrorToast({ error, defaultMessage: "Failed to move task" });
				});
		}
	};

	const fetchTaskPriorities = async () => {
		try {
			const response = await PROJECT_TASK_PRIORITY_API.getPaginatedProjectTaskPriority({
				page: 1,
			});
			setTaskPriorities(response.results);
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to load task priorities",
			});
		} finally {
			setPrioritiesLoading(false);
		}
	};

	const taskActionsDropdown = (task: IProjectTask) => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => {
						router.push(`/projects/${params.id}/tasks/${task.id}`);
					}}
					className="text-xs sm:text-sm"
				>
					<Eye className="h-4 w-4 mr-2" /> View
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						setSelectedTask(task);
						setIsAddTaskOpen(true);
					}}
					className="text-xs sm:text-sm"
				>
					<Edit className="h-4 w-4 mr-2" /> Edit
				</DropdownMenuItem>
				{currentUser &&
					currentUser?.id !== task.created_by &&
					currentUser.id === task.user_manager?.id && (
						<DropdownMenuItem
							onClick={() => {
								setTaskForTimeline(task);
								setIsTimelineDialogOpen(true);
							}}
							className="text-xs sm:text-sm px-2 py-1.5"
						>
							<Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Request extension
						</DropdownMenuItem>
					)}
				<DropdownMenuItem
					onClick={() => setTaskToDelete(task)}
					className="text-red-600 text-xs sm:text-sm"
				>
					<Trash2 className="h-4 w-4 mr-2" /> Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const columns: ColumnDef<IProjectTask>[] = [
		{
			key: "name",
			header: (
				<div className="flex items-center justify-start gap-2 sm:gap-4 text-xs sm:text-sm">
					<span>Task</span>
				</div>
			),
			cell: (task) => <span className="text-xs sm:text-sm">{task.task_name || ""}</span>,
		},
		{
			key: "leads",
			header: <span className="text-xs sm:text-sm">Leads</span>,
			cell: (task) => (
				<AssigneeAvatarsWithTooltip
					assignees={task.user_manager ? [task.user_manager] : []}
					projectId={Number(params.id)}
				/>
			),
		},
		{
			key: "members",
			header: <span className="text-xs sm:text-sm">Members</span>,
			cell: (task) => (
				<AssigneeAvatarsWithTooltip assignees={task.user_assignees} projectId={Number(params.id)} />
			),
		},
		{
			key: "start_date",
			header: (
				<div className="flex items-center justify-start gap-2 sm:gap-4 text-xs sm:text-sm">
					<span>Start Date</span>
				</div>
			),
			cell: (task) => (
				<span className="text-xs sm:text-sm">{formatDate(task.start_date ?? "")}</span>
			),
		},
		{
			key: "end_date",
			header: (
				<div className="flex items-center justify-start gap-2 sm:gap-4 text-xs sm:text-sm">
					<span>End Date</span>
				</div>
			),
			cell: (task) => <span className="text-xs sm:text-sm">{formatDate(task.end_date ?? "")}</span>,
		},
		{
			key: "priority",
			header: <span className="text-xs sm:text-sm">Priority</span>,
			cell: (task) => (
				<Badge
					style={{
						backgroundColor: task.priority?.color
							? `${task.priority.color}30`
							: "rgba(120, 120, 120, 0.3)",
						color: task.priority?.color || "rgba(120, 120, 120, 1)",
						border: `1.5px solid ${task.priority?.color || "rgba(120, 120, 120, 1)"}`,
					}}
					className="font-medium text-xs sm:text-sm"
				>
					{task.priority?.name || "No Priority"}
				</Badge>
			),
		},
		{
			key: "status",
			header: <span className="text-xs sm:text-sm">Status</span>,
			cell: (task) => getStatusBadge(task.task_status),
		},
		{
			key: "actions",
			header: <span className="text-xs sm:text-sm">Actions</span>,
			cell: (task) => taskActionsDropdown(task),
		},
	];

	if (loading || !project || statusesLoading) {
		return (
			<div className="min-h-screen bg-white p-3 sm:p-4 rounded-xl space-y-4 sm:space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 sm:gap-4">
						<Skeleton className="h-6 w-6 sm:h-8 sm:w-8" />
						<Skeleton className="h-6 sm:h-8 w-48 sm:w-96" />
					</div>
					<div className="flex gap-1 sm:gap-2">
						<Skeleton className="h-8 sm:h-10 w-16 sm:w-20" />
						<Skeleton className="h-8 sm:h-10 w-16 sm:w-20" />
					</div>
				</div>
				<Skeleton className="h-4 sm:h-6 w-full sm:w-96" />
				<div className="space-y-3 sm:space-y-4">
					<Skeleton className="h-3 sm:h-4 w-full" />
					<div className="flex justify-between flex-col sm:flex-row gap-3 sm:gap-4">
						<div className="space-y-2">
							<Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
							<div className="flex -space-x-1 sm:-space-x-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
								))}
							</div>
						</div>
						<div className="space-y-2">
							<Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
							<div className="flex -space-x-1 sm:-space-x-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
								))}
							</div>
						</div>
						<div className="space-y-2">
							<Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
							<Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
						</div>
					</div>
				</div>
				<div className="space-y-3 sm:space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded"
							>
								<Skeleton className="h-3 sm:h-4 w-32 sm:w-48" />
								<Skeleton className="h-5 sm:h-6 w-5 sm:w-6" />
							</div>
						))}
					</div>
				</div>
				<div className="flex gap-1 sm:gap-2 md:gap-4 lg:gap-8 min-w-max px-4 sm:px-8 overflow-x-auto border-b border-gray-200">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-8 sm:h-10 w-16 sm:w-20" />
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

	const handleDocumentAction = (
		action: "view" | "edit" | "delete",
		docId: number,
		docUrl?: string,
	) => {
		switch (action) {
			case "view":
				if (docUrl) {
					const absoluteUrl = getFileUrl(docUrl);
					const fileExtension = docUrl.split(".").pop()?.toLowerCase();
					if (fileExtension === "pdf") {
						window.open(absoluteUrl, "_blank");
					} else if (fileExtension === "doc" || fileExtension === "docx") {
						const link = document.createElement("a");
						link.href = absoluteUrl;
						link.download = docUrl.split("/").pop() || "document";
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
					} else {
						toast.error("Unsupported file type");
					}
				} else {
					toast.error("Document URL not found");
				}
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
		<div className="relative min-h-screen">
			{/* Main Content - shrinks when chat is open */}
			<div
				className={`min-h-screen bg-white p-3 sm:p-4 rounded-xl space-y-4 sm:space-y-6 overflow-visible transition-all duration-300 ${
					isChatOpen ? "lg:mr-[400px]" : ""
				}`}
			>
				{project ? (
					<>
						{/* Header */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
							{/* Left Section: Back button + project info */}
							<div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-4 w-full sm:w-auto">
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										variant="outline"
										className="rounded-full aspect-square"
										onClick={() => router.push("/projects")}
									>
										<ArrowLeft className="h-5 w-5" />
									</Button>
									<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
										<h1 className="text-base sm:text-lg md:text-2xl font-bold break-words">
											{project.project_name}
										</h1>
										<Badge
											style={{
												backgroundColor: `${project.project_status?.color_code}30`,
												color: project.project_status?.color_code,
												border: `1.5px solid ${project.project_status?.color_code}`,
											}}
											className="capitalize text-[10px] sm:text-xs md:text-sm mt-1 sm:mt-0 flex items-center"
										>
											{getStatusIcon(
												project.project_status?.status_name
													.toLowerCase()
													.replace(/\s+/g, "_") as any,
											)}
											<span className="ml-1">{project.project_status?.status_name}</span>
										</Badge>
									</div>
								</div>
							</div>

							{/* Right Section: Buttons */}
							<div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
								{/* Audit Trail */}
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_PROJECT_STATUSES}>
									<Button
										variant="outline"
										className="flex-1 sm:flex-none rounded-lg text-xs sm:text-sm"
										onClick={() => {
											setIsStatusDialogOpen(true);
											setEditingStatus(null);
										}}
									>
										<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										Manage Statuses
									</Button>
								</ProtectedComponent>
								<Button
									variant="outline"
									className={`flex-1 sm:flex-none rounded-lg text-xs sm:text-sm ${
										isConfigurationsOpen ? "bg-blue-50 border-blue-500" : ""
									}`}
									onClick={() => setIsConfigurations(!isConfigurationsOpen)}
								>
									<History className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
									Configurations
								</Button>
								<Button
									variant="outline"
									className={`flex-1 sm:flex-none rounded-lg text-xs sm:text-sm ${
										isAuditLogOpen ? "bg-blue-50 border-blue-500" : ""
									}`}
									onClick={() => setIsAuditLog(!isAuditLogOpen)}
								>
									<History className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
									Audit Trail
								</Button>

								{/* Discussion */}
								<Button
									variant="outline"
									className={`flex-1 sm:flex-none rounded-lg text-xs sm:text-sm ${
										isChatOpen ? "bg-blue-50 border-blue-500" : ""
									}`}
									onClick={() => setIsChatOpen(!isChatOpen)}
								>
									<MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
									Discussion
								</Button>

								{/* Edit */}
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_PROJECTS}>
									<Button
										variant="outline"
										className="flex-1 sm:flex-none rounded-lg text-xs sm:text-sm"
										asChild
									>
										<Link href={`/projects/edit/${project.id}`}>
											<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
											Edit
										</Link>
									</Button>
								</ProtectedComponent>

								{/* Delete */}
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_PROJECTS}>
									<Button
										variant="destructive"
										className="flex-1 sm:flex-none rounded-lg text-xs sm:text-sm !bg-transparent !text-destructive !border !border-destructive"
										onClick={() => setProjectToDelete(project)}
									>
										<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										Delete
									</Button>
								</ProtectedComponent>
							</div>
						</div>
						{/* Description and Progress */}
						{/* <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <p className="text-gray-600 text-xs sm:text-sm max-w-full sm:max-w-[70%]">
              {project.description}
            </p>
            <CircularProgress percentage={progress} />
          </div> */}
						{/* Team and Dates */}
						<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 pt-10 ml-2">
							<div className="space-y-3 sm:space-y-4">
								<div className="space-y-2">
									<h3 className="font-medium text-xs sm:text-sm">Leads</h3>
									<AssigneeAvatarsWithTooltip
										assignees={project.user_manager ? [project.user_manager] : []}
										projectId={Number(params.id)}
									/>
								</div>
								<div className="space-y-2">
									<h3 className="font-medium text-xs sm:text-sm">Members</h3>
									<AssigneeAvatarsWithTooltip
										assignees={project.user_assignees}
										projectId={Number(params.id)}
									/>
								</div>
							</div>
							<div className="flex flex-col items-start sm:items-end gap-2 sm:gap-3 text-xs sm:text-sm">
								<div className="flex items-center gap-2 sm:gap-4">
									<Icon
										icon="hugeicons:calendar-03"
										className="!w-4 !h-4 sm:!w-5 sm:!h-5 text-gray-600"
									/>
									<span className="text-gray-500">Start Date</span>
									<p className="font-medium">{formatDate(project.start_date ?? "")}</p>
								</div>
								<div className="flex items-center gap-2 sm:gap-4">
									<Icon
										icon="hugeicons:calendar-03"
										className="!w-4 !h-4 sm:!w-5 sm:!h-5 text-gray-600"
									/>
									<span className="text-gray-500">End Date</span>
									<p className="font-medium">{formatDate(project.end_date ?? "")}</p>
								</div>
							</div>
						</div>
						{/* Documents */}
						<div>
							<h3 className="font-medium text-xs sm:text-sm mb-3 sm:mb-4 ml-2">Documents</h3>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
								{project.project_documents.map((doc) => (
									<div
										key={doc.id}
										className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
									>
										<div className="flex items-center gap-2 sm:gap-3">
											<div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded flex items-center justify-center"></div>
											<div>
												<p className="font-medium text-xs sm:text-sm">{doc.name}</p>
											</div>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" className="h-8 w-8 p-0">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_DOCUMENTS}>
													<DropdownMenuItem
														onClick={() => handleDocumentAction("view", doc.id, doc.document)}
														className="text-xs sm:text-sm"
													>
														<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
														View
													</DropdownMenuItem>
												</ProtectedComponent>
												{/* Uncomment if needed */}
												{/* <ProtectedComponent
              permissionCode={PERMISSION_CODES.CAN_EDIT_DOCUMENTS}
            >
              <DropdownMenuItem
                onClick={() => handleDocumentAction("edit", doc.id)}
                className="text-xs sm:text-sm"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            </ProtectedComponent>
            <ProtectedComponent
              permissionCode={PERMISSION_CODES.CAN_DELETE_DOCUMENTS}
            >
              <DropdownMenuItem
                className="text-red-600 text-xs sm:text-sm"
                onClick={() => handleDocumentAction("delete", doc.id)}
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </ProtectedComponent> */}
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								))}
							</div>
						</div>
						{/* Custom Tabs */}
						<div className="flex gap-1 sm:gap-2 md:gap-4 lg:gap-8 min-w-max px-4 sm:px-8 overflow-x-auto border-b border-gray-200">
							{tabConfig.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
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
						{/* Search and Filters */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative z-0">
							<div className="flex items-center gap-2 sm:gap-4 flex-wrap">
								<div className="relative w-full sm:w-auto max-w-full sm:max-w-[300px]">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
									<Input
										placeholder="Search tasks..."
										className="pl-10 w-full text-xs sm:text-sm"
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<Select
									onValueChange={(val: string) => {
										if (val !== "all") {
											setFilteredProject({
												...project,
												project_tasks: project?.project_tasks.filter(
													(task) => task.task_status.id === Number(val),
												),
											} as IProject);
										} else {
											setFilteredProject(project);
										}
									}}
								>
									<SelectTrigger className="w-[140px] sm:w-[180px] rounded-2xl text-xs sm:text-sm">
										<SelectValue placeholder="All Status" />
									</SelectTrigger>
									<SelectContent className="text-xs sm:text-sm">
										<SelectItem value="all">All Status</SelectItem>
										{taskStatuses.map((status, idx) => (
											<SelectItem key={idx} value={status.id.toString()} className="capitalize">
												{status.name.replace(/\s+/g, "_")}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									onValueChange={(val: string) => {
										if (val !== "all") {
											setFilteredProject({
												...project,
												project_tasks: project?.project_tasks.filter(
													(task) => task.priority?.id === Number(val),
												),
											} as IProject);
										} else {
											setFilteredProject(project);
										}
									}}
								>
									<SelectTrigger className="w-[140px] sm:w-[180px] rounded-2xl text-xs sm:text-sm">
										<SelectValue placeholder="All Priorities" />
									</SelectTrigger>
									<SelectContent className="text-xs sm:text-sm">
										<SelectItem value="all">All Priorities</SelectItem>
										{taskPriorities.map((priority) => (
											<SelectItem
												key={priority.id}
												value={priority.id.toString()}
												className="capitalize"
											>
												{priority.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									onValueChange={(val: string) => {
										setMemberFilter(val === "all" ? null : Number(val));
									}}
								>
									<SelectTrigger className="w-[140px] sm:w-[180px] rounded-2xl text-xs sm:text-sm">
										<SelectValue placeholder="All Members" />
									</SelectTrigger>
									<SelectContent className="text-xs sm:text-sm">
										<SelectItem value="all">All Members</SelectItem>
										{allMembers.map((member) => (
											<SelectItem key={member.id} value={member.id.toString()}>
												{member.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-gray-50 p-2 rounded-2xl">
									<Input
										type="date"
										placeholder="Start Date"
										value={startDateFilter}
										onChange={(e) => setStartDateFilter(e.target.value)}
										className="w-full sm:w-[160px] rounded-xl text-xs sm:text-sm border-gray-200"
									/>

									<span className="text-xs sm:text-sm text-gray-500">to</span>

									<Input
										type="date"
										placeholder="End Date"
										value={endDateFilter}
										onChange={(e) => setEndDateFilter(e.target.value)}
										className="w-full sm:w-[160px] rounded-xl text-xs sm:text-sm border-gray-200"
									/>

									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setSearchQuery("");
											setStartDateFilter("");
											setEndDateFilter("");
											setMemberFilter(null);
										}}
										className="h-8 w-full sm:h-9 sm:w-9 rounded-xl p-0"
									>
										<X className="h-3 w-3 sm:h-4 sm:w-4" />
									</Button>
								</div>
							</div>
							<div className="flex gap-1 sm:gap-2">
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_TASKS}>
									<Button
										className="rounded-xl w-full sm:w-auto text-xs sm:text-sm"
										onClick={() => setIsAddTaskOpen(true)}
									>
										<Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										New Task
									</Button>
								</ProtectedComponent>
							</div>
						</div>
						{/* Tab Content */}
						{activeTab === "board" && (
							<>
								<DndContext
									sensors={sensors}
									collisionDetection={closestCenter}
									onDragStart={handleDragStart}
									onDragOver={handleDragOver}
									onDragEnd={handleDragEnd}
								>
									<div
										className="overflow-x-auto pb-3 sm:pb-4"
										onScroll={handleScroll}
										style={{ WebkitOverflowScrolling: "touch" }}
									>
										<div className="flex space-x-3 sm:space-x-4 min-w-max">
											{taskStatuses.map((status) => {
												const tasks = groupedTasks[status.id] || [];
												return (
													<DroppableStatusColumn
														key={status.id}
														statusId={status.id}
														statusName={status.name}
														tasks={tasks}
														projectId={Number(params.id)}
														taskActionsDropdown={taskActionsDropdown}
													/>
												);
											})}
										</div>
									</div>

									{/* Add DragOverlay */}
									<DragOverlay
										dropAnimation={{
											duration: 200,
											easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
										}}
									>
										{activeTask ? (
											<Card className="p-3 sm:p-4 rounded-xl shadow-2xl bg-white scale-105 transform cursor-grabbing">
												<div className="flex justify-between items-start">
													<h4 className="font-medium text-xs sm:text-sm">{activeTask.task_name}</h4>
												</div>
												<div className="mt-2 sm:mt-3 flex justify-between items-end">
													<Badge
														style={{
															backgroundColor: activeTask.priority?.color
																? `${activeTask.priority.color}30`
																: "rgba(120, 120, 120, 0.3)",
															color: activeTask.priority?.color || "#787878",
															border: `1.5px solid ${activeTask.priority?.color || "#787878"}`,
														}}
														className="font-medium text-xs sm:text-sm capitalize"
													>
														{activeTask.priority?.name || "No Priority"}
													</Badge>
													<AssigneeAvatarsWithTooltip
														assignees={activeTask.user_assignees}
														projectId={Number(params.id)}
													/>
												</div>
											</Card>
										) : null}
									</DragOverlay>
								</DndContext>
							</>
						)}
						{activeTab === "timeline" && filteredProject && (
							<div className="space-y-3 sm:space-y-4">
								<Calender
									groups={filteredProject.project_tasks?.map(
										(task: IProjectTask): Group => ({
											id: task.id,
											title: task.task_name,
											rightTitle: task.task_status.name.replace(/\s+/g, "_").toUpperCase(),
										}),
									)}
									items={filteredProject.project_tasks?.map(
										(task: IProjectTask): Item => ({
											id: task.id,
											group: task.id,
											title: task.task_name,
											className: task.task_status.name.toLowerCase().replace(/\s+/g, "_"),
											start_time: Date.parse(task.start_date ?? ""),
											end_time: Date.parse(task.end_date ?? ""),
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
											? Date.parse(task.end_date) - Date.parse(task.start_date ?? "")
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
										const newEndDate =
											edge === "right" ? new Date(time).toISOString() : task.end_date;

										if (!newStartDate || !newEndDate) return;

										if (Date.parse(newEndDate) < Date.parse(newStartDate)) {
											return;
										}

										await handleTimelineUpdate({
											taskId: task.id,
											start_date: newStartDate ?? undefined,
											end_date: newEndDate ?? undefined,
										});
									}}
								/>
							</div>
						)}
						{activeTab === "table" && filteredProject && (
							<PaginatedTable<IProjectTask>
								paginated={false}
								fetchFirstPage={async () => {
									let tasks = filteredProject.project_tasks;
									if (memberFilter) {
										tasks = tasks.filter((task) =>
											task.user_assignees.some((assignee) => assignee.id === memberFilter),
										);
									}

									return {
										count: tasks.length,
										next: null,
										previous: null,
										results: tasks,
									} as IPaginatedResponse<IProjectTask>;
								}}
								deps={[filteredProject, memberFilter]}
								onError={(err) =>
									showErrorToast({
										error: err,
										defaultMessage: "Failed to fetch tasks",
									})
								}
								className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-auto"
								tableClassName="min-w-[600px] sm:min-w-[800px] [&_th]:border-0 [&_td]:border-0"
								footerClassName="pt-3 sm:pt-4"
								columns={columns}
								skeletonRows={10}
								emptyState={
									<div className="text-center py-8 sm:py-12">
										<p className="text-muted-foreground text-xs sm:text-sm mb-4">No tasks found</p>
									</div>
								}
							/>
						)}
						{/* Chat Slide-in Panel */}
						<div
							className={`fixed inset-y-0 right-0 w-full sm:w-[420px] lg:w-[480px] bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
								isChatOpen ? "translate-x-0" : "translate-x-full"
							}`}
						>
							<div className="flex-shrink-0 flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50/50 to-white">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-blue-200/50">
										<MessageSquare className="h-5 w-5 text-blue-600" />
									</div>
									<div>
										<h3 className="font-semibold text-base text-gray-900">Discussion</h3>
										<p className="text-xs text-muted-foreground">Project chat thread</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsChatOpen(false)}
									className="h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
								>
									<X className="h-5 w-5" />
								</Button>
							</div>

							<div className="flex-1 overflow-hidden bg-gray-50/50">
								<ProjectChatThread
									projectId={project.id}
									className="h-full w-full border-none"
									taskAssignees={[
										{
											id: project.user_manager?.id ?? 0,
											name: project.user_manager?.name ?? "unknown",
										},
										...project.user_assignees
											.filter((a) => a.id !== project.user_manager?.id)
											.map((a) => ({
												id: a.id,
												name: a.name,
											})),
									]}
									onProjectUpdate={fetchProject}
								/>
							</div>
						</div>
						{isChatOpen && (
							<div
								className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
								onClick={() => setIsChatOpen(false)}
							/>
						)}
						{/* Overlay for mobile */}
						{isChatOpen && (
							<div
								className="fixed inset-0 bg-black/50 z-40 sm:hidden"
								onClick={() => setIsChatOpen(false)}
							/>
						)}
						{/* Audit Log-in Panel */}
						<div
							className={`fixed inset-y-0 right-0 w-full sm:w-[420px] lg:w-[480px] bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
								isAuditLogOpen ? "translate-x-0" : "translate-x-full"
							}`}
						>
							<div className="flex-shrink-0 flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50/50 to-white">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-blue-200/50">
										<History className="h-5 w-5 text-blue-600" />
									</div>
									<div>
										<h3 className="font-semibold text-base text-gray-900">Audit Logs</h3>
										<p className="text-xs text-muted-foreground">Audit Trail Logs</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsAuditLog(false)}
									className="h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
								>
									<X className="h-5 w-5" />
								</Button>
							</div>

							<div className="flex-1 overflow-hidden bg-gray-50/50">
								<ProjectAuditTrail projectId={project.id} />
							</div>
						</div>

						<div
							className={`fixed inset-y-0 right-0 w-full sm:w-[420px] lg:w-[480px] bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
								isConfigurationsOpen ? "translate-x-0" : "translate-x-full"
							}`}
						>
							<div className="flex-shrink-0 flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50/50 to-white">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-blue-200/50">
										<History className="h-5 w-5 text-blue-600" />
									</div>
									<div>
										<h3 className="font-semibold text-base text-gray-900">Configurations</h3>
										<p className="text-xs text-muted-foreground">
											Set configurations for a project
										</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsConfigurations(false)}
									className="h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
								>
									<X className="h-5 w-5" />
								</Button>
							</div>
							<ConfigurationInput
								isOpen={isConfigurationsOpen}
								onClose={() => setIsConfigurations(false)}
								onSave={refreshConfigurations}
								projectId={project?.id}
								statusConfigData={
									project?.completed_status?.id && project?.failed_status?.id
										? {
												project: project.id,
												completed_status: project.completed_status.id,
												failed_status: project.failed_status.id,
											}
										: null
								}
								emailConfigData={emailConfig}
								completedStatusName={project?.completed_status?.status_name}
								failedStatusName={project?.failed_status?.status_name}
								completedStatusColor={project?.completed_status?.color_code}
								failedStatusColor={project?.failed_status?.color_code}
							/>
						</div>
						{/* Overlay */}
						{isAuditLogOpen && (
							<div
								className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
								onClick={() => setIsAuditLog(false)}
							/>
						)}
						{/* Overlay */}
						{isConfigurationsOpen && (
							<div
								className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
								onClick={() => setIsConfigurations(false)}
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
						{taskForTimeline && (
							<TaskTimelineDialog
								isOpen={isTimelineDialogOpen}
								onOpenChange={setIsTimelineDialogOpen}
								taskId={taskForTimeline.id}
								currentEndDate={taskForTimeline.end_date ?? ""}
								onSuccess={() => {
									fetchProject();
								}}
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
							<ProjectTaskDialog
								isOpen={isAddTaskOpen}
								onClose={() => {
									setSelectedTask(null);
									setIsAddTaskOpen(false);
								}}
								onSave={async () => {
									await fetchProject();
								}}
								initialData={selectedTask}
								project={filteredProject}
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
						<ProjectTaskStatusDialog
							open={isStatusDialogOpen}
							onOpenChange={setIsStatusDialogOpen}
							onSave={async () => {
								await fetchProject();
								setIsStatusDialogOpen(false);
							}}
							initialData={null}
						/>
					</>
				) : (
					<></>
				)}
			</div>
		</div>
	);
}
