"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Eye, Edit, Trash2, MoreVertical, Calendar, X } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useInView } from "react-intersection-observer";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/platform/v1/components";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors-context-aware";
import { IStandAloneTask } from "@/types/types.utils";
import { showErrorToast, TASK_STATUS_API, TASK_PRIORITY_API, TASKS_API } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PERMISSION_CODES } from "@/constants";
import { ProtectedComponent } from "@/platform/v1/components";
import { ITaskPriority, ITaskStatus } from "@/types/project.type";
import { hasPermission } from "@/lib/helpers";
import RichTextDisplay from "@/components/common/rich-text-display";
import { TaskTimelineDialog } from "@/components/common/dialogs/task-timeline-extension";
import { AssigneeAvatarsWithTooltip } from "@/components/common/assignee-avatar-with-tooltip";
import StandaloneTaskDialog from "@/components/tasks/tasks-dialog";

const SkeletonCard = () => (
	<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4 animate-pulse">
		<div className="flex items-start justify-between">
			<div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4"></div>
			<div className="h-6 sm:h-8 w-6 sm:w-8 bg-gray-200 rounded-full"></div>
		</div>
		<div className="h-3 sm:h-4 bg-gray-200 rounded w-20 mt-2 sm:mt-3"></div>
		<div className="space-y-2 mt-2 sm:mt-3">
			<div className="h-2 sm:h-3 bg-gray-200 rounded w-full"></div>
			<div className="h-2 sm:h-3 bg-gray-200 rounded w-2/3"></div>
		</div>
		<div className="flex justify-between pt-3 sm:pt-4 border-t">
			<div className="h-2 sm:h-3 bg-gray-200 rounded w-20 sm:w-24"></div>
			<div className="h-2 sm:h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
		</div>
	</div>
);

export default function TasksPage() {
	const [tasks, setTasks] = useState<IStandAloneTask[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [nextUrl, setNextUrl] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedStatus, setSelectedStatus] = useState<number | "all">("all");
	const [selectedPriority, setSelectedPriority] = useState<number | "all">("all");
	const [taskToDelete, setTaskToDelete] = useState<IStandAloneTask | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState<IStandAloneTask | null>(null);
	const [taskStatuses, setTaskStatuses] = useState<ITaskStatus[]>([]);
	const [taskPriorities, setTaskPriorities] = useState<ITaskPriority[]>([]);
	const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
	const [taskForTimeline, setTaskForTimeline] = useState<IStandAloneTask | null>(null);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const { ref, inView } = useInView({ threshold: 0 });
	const [searchQuery, setSearchQuery] = useState("");
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");

	useEffect(() => {
		loadOptions();
	}, []);

	const loadOptions = async () => {
		try {
			const [statusesRes, prioritiesRes] = await Promise.all([
				TASK_STATUS_API.getPaginatedTaskStatuses({}),
				TASK_PRIORITY_API.getPaginatedTaskPriority({}),
			]);

			const normalizedStatuses: ITaskStatus[] = (statusesRes.results || []).map((status) => ({
				...status,
				is_active:
					typeof status.is_active === "string"
						? status.is_active.toLowerCase() === "true"
						: !!status.is_active,
				institution: status.institution ?? 0,
				task: status.task ?? 0,
			}));

			setTaskStatuses(normalizedStatuses);
			setTaskPriorities(prioritiesRes.results || []);
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to load priorities and statuses",
			});
		}
	};

	const fetchFirstPage = useCallback(async () => {
		if (!currentInstitution) return;

		setLoading(true);
		try {
			const params = {
				unassigned: true,
				page: 1,
				search: searchTerm || undefined,
				task_status: selectedStatus === "all" ? undefined : selectedStatus,
				priority: selectedPriority === "all" ? undefined : selectedPriority,
				user: hasPermission(PERMISSION_CODES.CAN_VIEW_ALL_TASKS) ? undefined : currentUser?.id,
				start_date: startDate || undefined,
				end_date: endDate || undefined,
			};
			const res = await TASKS_API.getPaginatedTasks(params);

			setTasks(res.results);
			setNextUrl(res.next);
			setHasMore(!!res.next);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch tasks" });
			setHasMore(false);
		} finally {
			setLoading(false);
		}
	}, [currentInstitution?.id, searchTerm, selectedStatus, selectedPriority, startDate, endDate]);

	const fetchNextPage = useCallback(async () => {
		if (!nextUrl || loading) return;

		setLoading(true);
		try {
			const res = await TASKS_API.getPaginatedTasksFromUrl({
				url: nextUrl,
			});

			setTasks((prev) => [...prev, ...res.results]);
			setNextUrl(res.next);
			setHasMore(!!res.next);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load more tasks" });
			setHasMore(false);
		} finally {
			setLoading(false);
		}
	}, [nextUrl, loading]);

	useEffect(() => {
		setTasks([]);
		setHasMore(true);
		setLoading(true);

		const timeout = setTimeout(() => {
			fetchFirstPage();
		}, 1000);

		return () => clearTimeout(timeout);
	}, [currentInstitution?.id, searchTerm, selectedStatus, selectedPriority, startDate, endDate]);

	useEffect(() => {
		if (inView && hasMore && !loading) {
			fetchNextPage();
		}
	}, [inView, hasMore, loading]);

	const handleDelete = async () => {
		if (!taskToDelete) return;
		try {
			setIsDeleting(true);
			await TASKS_API.delete({ taskId: taskToDelete.id });
			setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
			toast.success("Task deleted successfully");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to delete task" });
		} finally {
			setTaskToDelete(null);
			setIsDeleting(false);
		}
	};

	return (
		<div className="min-h-screen bg-white p-3 sm:p-4 rounded-xl">
			<div className="max-w-full mx-auto space-y-6 sm:space-y-8">
				{/* Header */}
				<div>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						<div className="space-y-1 sm:space-y-2">
							<h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								Tasks
							</h1>
							<p className="text-slate-600 text-xs sm:text-sm">
								Manage and track all your tasks in one place
							</p>
						</div>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_TASKS}>
							<Button
								className="w-full sm:w-auto rounded-xl text-xs sm:text-sm"
								onClick={() => {
									setSelectedTask(null);
									setIsAddTaskOpen(true);
								}}
							>
								<Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
								New Task
							</Button>
						</ProtectedComponent>
					</div>
				</div>

				{/* Search and Filters */}
				<div className="py-4 sm:py-6 w-full">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-3 sm:gap-4 w-full">
						<div className="relative w-full sm:max-w-md">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
							<Input
								placeholder="Search tasks..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 h-10 sm:h-12 text-sm sm:text-base w-full"
							/>
						</div>
						<Select
							value={selectedStatus.toString()}
							onValueChange={(val) => setSelectedStatus(val === "all" ? "all" : Number(val))}
						>
							<SelectTrigger className="w-full sm:w-[160px] rounded-2xl text-xs sm:text-sm">
								<SelectValue placeholder="All Status" />
							</SelectTrigger>
							<SelectContent className="text-xs sm:text-sm">
								<SelectItem value="all">All Status</SelectItem>
								{taskStatuses.map((status) => (
									<SelectItem key={status.id} value={status.id.toString()}>
										<div className="flex items-center gap-2">
											<div
												className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
												style={{ backgroundColor: status.color_code }}
											/>
											{status.name}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={selectedPriority.toString()}
							onValueChange={(val) => setSelectedPriority(val === "all" ? "all" : Number(val))}
						>
							<SelectTrigger className="w-full sm:w-[160px] rounded-2xl text-xs sm:text-sm">
								<SelectValue placeholder="All Priorities" />
							</SelectTrigger>
							<SelectContent className="text-xs sm:text-sm">
								<SelectItem value="all">All Priorities</SelectItem>
								{taskPriorities.map((priority) => (
									<SelectItem key={priority.id} value={priority.id.toString()}>
										<div className="flex items-center gap-2">
											<div
												className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
												style={{ backgroundColor: priority.color_code }}
											/>
											{priority.name}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl">
							<Input
								type="date"
								placeholder="Start Date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="w-[140px] sm:w-[160px] rounded-xl text-xs sm:text-sm border-gray-200"
							/>
							<span className="text-xs sm:text-sm text-gray-500">to</span>
							<Input
								type="date"
								placeholder="End Date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="w-[140px] sm:w-[160px] rounded-xl text-xs sm:text-sm border-gray-200"
							/>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setSearchQuery("");
									setStartDate("");
									setEndDate("");
								}}
								className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl p-0"
							>
								<X className="h-3 w-3 sm:h-4 sm:w-4" />
							</Button>
						</div>
					</div>
				</div>

				{/* Tasks Grid */}
				{loading && tasks.length === 0 ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<SkeletonCard key={i} />
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
						{tasks.map((task) => (
							<div
								key={task.id}
								className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 space-y-3 sm:space-y-4"
							>
								{/* Task Name and Actions */}
								<div className="flex items-start justify-between">
									<h3 className="text-base sm:text-lg font-semibold text-gray-900 flex-1 pr-3 sm:pr-4">
										{task.task_name}
									</h3>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_TASKS}>
												<DropdownMenuItem className="p-0">
													<Link
														className="text-xs sm:text-sm flex items-center justify-start w-full h-full px-2 py-1.5"
														href={`/task-mgt/task/${task.id}`}
													>
														<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> View Details
													</Link>
												</DropdownMenuItem>
											</ProtectedComponent>
											<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_TASKS}>
												<DropdownMenuItem
													onClick={() => {
														setSelectedTask(task);
														setIsAddTaskOpen(true);
													}}
													className="text-xs sm:text-sm px-2 py-1.5"
												>
													<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Edit
												</DropdownMenuItem>
											</ProtectedComponent>
											{currentUser &&
												currentUser.id !== task.created_by &&
												currentUser.id === task.user_manager?.id && (
													<DropdownMenuItem
														onClick={() => {
															setTaskForTimeline(task);
															setIsTimelineDialogOpen(true);
														}}
														className="text-xs sm:text-sm px-2 py-1.5"
													>
														<Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Extend Timeline
													</DropdownMenuItem>
												)}
											<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_TASKS}>
												<DropdownMenuItem
													onClick={() => setTaskToDelete(task)}
													className="text-red-600 text-xs sm:text-sm px-2 py-1.5"
												>
													<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Delete
												</DropdownMenuItem>
											</ProtectedComponent>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>

								{/* Status and Priority Badges */}
								<div className="flex gap-2 mt-2 sm:mt-3">
									<Badge
										style={{
											backgroundColor: task.applied_task_status?.color_code
												? `${task.applied_task_status.color_code}30`
												: "rgba(120, 120, 120, 0.3)",
											color: task.applied_task_status?.color_code
												? task.applied_task_status.color_code
												: "rgba(120, 120, 120, 1)",
											border: `1.5px solid ${task.applied_task_status?.color_code ? task.applied_task_status.color_code : "rgba(120, 120, 120, 1)"}`,
										}}
										className="capitalize text-xs sm:text-sm"
									>
										{task.applied_task_status?.name ?? "Not Started"}
									</Badge>
									<Badge
										style={{
											backgroundColor: task.priority?.color
												? `${task.priority.color}30`
												: "rgba(120, 120, 120, 0.3)",
											color: task.priority?.color ? task.priority.color : "rgba(120, 120, 120, 1)",
											border: `1.5px solid ${task.priority?.color ? task.priority.color : "rgba(120, 120, 120, 1)"}`,
										}}
										className="capitalize text-xs sm:text-sm"
									>
										{task.priority?.name ?? "No Priority"}
									</Badge>
								</div>

								{/* Description */}
								<RichTextDisplay
									htmlContent={task.description || ""}
									className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3"
								/>

								{/* Dates */}
								<div className="flex items-center justify-between pt-3 sm:pt-4 border-t">
									{/* Left: Dates */}
									<div className="space-y-1 text-xs sm:text-sm text-gray-600">
										{task.start_date && (
											<div className="flex items-center gap-2">
												<span className="text-gray-500">Start:</span>
												<span className="font-medium">
													{new Date(task.start_date).toLocaleDateString()}
												</span>
											</div>
										)}
										{task.end_date && (
											<div className="flex items-center gap-2">
												<span className="text-gray-500">End:</span>
												<span className="font-medium">
													{new Date(task.end_date).toLocaleDateString()}
												</span>
											</div>
										)}
										{!task.start_date && !task.end_date && (
											<div className="text-gray-400">No dates set</div>
										)}
									</div>

									{/* Right: Assignees */}
									{task.user_assignees && task.user_assignees.length > 0 && (
										<AssigneeAvatarsWithTooltip
											assignees={task.user_assignees}
											projectId={task.project}
										/>
									)}
								</div>
							</div>
						))}
						{tasks.length === 0 && !loading && (
							<div className="col-span-full text-center py-8 sm:py-12">
								<p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
									No tasks found
								</p>
							</div>
						)}
						{hasMore && (
							<div ref={ref} className="col-span-full flex justify-center py-3 sm:py-4">
								{loading && (
									<div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gray-900"></div>
								)}
							</div>
						)}
					</div>
				)}

				{/* Dialogs */}
				{taskToDelete && (
					<ConfirmationDialog
						isOpen={!!taskToDelete}
						title={`Delete ${taskToDelete.task_name}`}
						description="Are you sure you want to delete this task? This action cannot be undone."
						onConfirm={handleDelete}
						onClose={() => setTaskToDelete(null)}
						disabled={isDeleting}
					/>
				)}

				{taskForTimeline && (
					<TaskTimelineDialog
						isOpen={isTimelineDialogOpen}
						onOpenChange={setIsTimelineDialogOpen}
						taskId={taskForTimeline.id}
						// currentStartDate={taskForTimeline.start_date}
						currentEndDate={taskForTimeline.end_date ?? undefined}
						onSuccess={() => {
							fetchFirstPage();
							setTaskForTimeline(null);
						}}
					/>
				)}

				<StandaloneTaskDialog
					isOpen={isAddTaskOpen}
					onClose={() => {
						setSelectedTask(null);
						setIsAddTaskOpen(false);
					}}
					onSave={async () => {
						await fetchFirstPage();
					}}
					initialData={selectedTask}
				/>
			</div>
		</div>
	);
}
