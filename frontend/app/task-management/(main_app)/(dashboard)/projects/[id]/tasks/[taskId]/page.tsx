"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Edit, MessageSquare, Trash2, X, History } from "lucide-react";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Skeleton } from "@/platform/v1/components";
import { IProjectTask } from "@/types/types.utils";
import { PROJECTS_TASKS_API, showErrorToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { AssigneeAvatarsWithTooltip } from "@/components/common/assignee-avatar-with-tooltip";
import { PERMISSION_CODES } from "@/constants";
import RichTextDisplay from "@/components/common/rich-text-display";
import { TaskChatThread } from "@/components/projects/tasks/task-chat-thread";
import { TaskTimelineDialog } from "@/components/common/dialogs/task-timeline-extension";
import { useSelector } from "react-redux";
import { selectUser } from "@/store/auth/selectors-context-aware";
import { formatDate } from "@/lib/helpers";
import { TaskAuditTrail } from "@/components/projects/tasks/task-audit-log";
import { ProtectedComponent } from "@/platform/v1/components";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

function ErrorBoundary({ children }: { children: React.ReactNode }) {
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		setHasError(false);
	}, []);

	if (hasError) {
		return <div>Something went wrong. Please try again.</div>;
	}

	return children;
}

export default function TaskViewPage() {
	const params = useParams();
	const router = useModuleNavigation();
	const [task, setTask] = useState<IProjectTask | null>(null);
	const [loading, setLoading] = useState(true);
	const [taskToDelete, setTaskToDelete] = useState<IProjectTask | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [isAuditLogOpen, setIsAuditLog] = useState(false);
	const currentUser = useSelector(selectUser);
	const isTaskCreator = task?.created_by === currentUser?.id;
	const isTaskLeader = task?.user_manager?.id === currentUser?.id;

	const fetchTask = async () => {
		if (!params.taskId || isNaN(Number(params.taskId))) {
			setLoading(false);
			return;
		}
		try {
			const fetchedTask = await PROJECTS_TASKS_API.getByTaskId({
				taskId: Number(params.taskId),
			});
			if (!fetchedTask) {
				setTask(null);
			} else {
				setTask(fetchedTask);
			}
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch task" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (params.taskId) {
			fetchTask();
		} else {
			setLoading(false);
		}
	}, [params.taskId]);

	const handleDelete = async () => {
		if (!task) return;
		try {
			setIsDeleting(true);
			await PROJECTS_TASKS_API.delete({ taskId: task.id });
			toast.success("Task deleted successfully");
			router.push("/task-mgt/task");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to delete task" });
		} finally {
			setTaskToDelete(null);
			setIsDeleting(false);
		}
	};

	if (!params.taskId || isNaN(Number(params.taskId))) {
		return <div>Error: Invalid task ID</div>;
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-white p-3 sm:p-4 rounded-xl space-y-4 sm:space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
					<Skeleton className="h-8 w-8" />
					<div className="flex gap-2">
						<Skeleton className="h-9 sm:h-10 w-16 sm:w-20" />
						<Skeleton className="h-9 sm:h-10 w-16 sm:w-20" />
					</div>
				</div>
				<Skeleton className="h-5 sm:h-6 w-3/4 sm:w-96" />
				<div className="space-y-3 sm:space-y-4">
					<Skeleton className="h-3 sm:h-4 w-full" />
					<Skeleton className="h-3 sm:h-4 w-3/4" />
				</div>
			</div>
		);
	}

	if (!task) {
		return <div>Error: Task not found</div>;
	}

	return (
		<ErrorBoundary>
			<div className="relative min-h-screen">
				<div
					className={`min-h-screen bg-white p-4 sm:p-4 transition-all duration-300 ${
						isChatOpen ? "lg:mr-[400px]" : ""
					}`}
				>
					<div className="space-y-4 sm:space-y-6">
						{/* Header */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
							<div className="flex items-center gap-3 sm:gap-4">
								<Button
									size="sm"
									variant="outline"
									className="rounded-full aspect-square"
									onClick={() => router.back()}
								>
									<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
								</Button>
								<div className="flex items-center gap-2 sm:gap-3 mt-2">
									<h1 className="text-lg sm:text-xl md:text-2xl font-bold">{task.task_name}</h1>
									<Badge
										style={{
											backgroundColor: `${task.applied_project_task_status?.color_code || task.applied_task_status?.color_code || "rgba(120, 120, 120"}30`,
											color: task.project
												? task.applied_project_task_status?.color_code
												: task.applied_task_status?.color_code || "rgba(120, 120, 120, 1)",
											border: `1.5px solid ${`${task.applied_project_task_status?.color_code || task.applied_task_status?.color_code || "rgba(120, 120, 120"}30`}`,
										}}
										className="capitalize text-xs sm:text-sm"
									>
										{task.project
											? task.applied_project_task_status?.name || ""
											: task.applied_task_status?.name || ""}
									</Badge>
								</div>
							</div>
							<div className="flex flex-wrap gap-2 sm:gap-2">
								<Button
									variant="outline"
									className={`w-full sm:w-auto rounded-lg text-xs sm:text-sm ${
										isAuditLogOpen ? "bg-blue-50 border-blue-500" : ""
									}`}
									onClick={() => setIsAuditLog(!isAuditLogOpen)}
								>
									<History className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
									Audit Trail
								</Button>
								<Button
									variant="outline"
									className={`w-full sm:w-auto rounded-lg text-xs sm:text-sm ${
										isChatOpen ? "bg-blue-50 border-blue-500" : ""
									}`}
									onClick={() => setIsChatOpen(!isChatOpen)}
								>
									<MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
									Discussion
								</Button>
								{isTaskCreator ? (
									<Button
										variant="outline"
										className="w-full sm:w-auto rounded-lg text-xs sm:text-sm"
										onClick={() => setIsTimelineDialogOpen(true)}
									>
										<Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										Manage Timeline Extensions
									</Button>
								) : isTaskLeader && !isTaskCreator ? (
									<Button
										variant="outline"
										className="w-full sm:w-auto rounded-lg text-xs sm:text-sm"
										onClick={() => setIsTimelineDialogOpen(true)}
									>
										<Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										Request Extension
									</Button>
								) : (
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EXTEND_TASK_TIMELINE}>
										<Button
											variant="outline"
											className="w-full sm:w-auto rounded-lg text-xs sm:text-sm"
											onClick={() => setIsTimelineDialogOpen(true)}
										>
											<Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
											Manage Timeline Extensions
										</Button>
									</ProtectedComponent>
								)}
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_TASKS}>
									<Button
										variant="outline"
										className="w-full sm:w-auto rounded-lg text-xs sm:text-sm"
										onClick={() => setIsEditOpen(true)}
									>
										<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										Edit
									</Button>
								</ProtectedComponent>
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_TASKS}>
									<Button
										variant="destructive"
										className="w-full sm:w-auto !rounded-lg !bg-transparent !text-destructive !border !border-destructive text-xs sm:text-sm"
										onClick={() => setTaskToDelete(task)}
									>
										<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										Delete
									</Button>
								</ProtectedComponent>
							</div>
						</div>
						{/* Description */}
						<div>
							<RichTextDisplay
								htmlContent={task.description || ""}
								className="text-gray-600 text-xs sm:text-sm"
							/>
						</div>
						{/* Details Grid */}
						<div className="grid grid-cols-1 md:flex md:items-start md:justify-between gap-3 sm:gap-4">
							{/* Priority */}
							<div className="space-y-2">
								<h3 className="font-medium text-xs sm:text-sm">Priority</h3>
								<Badge
									style={{
										backgroundColor: task.priority?.color
											? `${task.priority.color}30`
											: "rgba(120, 120, 120, 0.3)",
										color: task.priority?.color || "rgba(120, 120, 120, 1)",
										border: `1.5px solid ${task.priority?.color || "rgba(120, 120, 120, 1)"}`,
									}}
									className="capitalize text-xs sm:text-sm"
								>
									{task.priority?.name || "No Priority"}
								</Badge>
							</div>

							<div className="flex flex-col sm:flex-row items-start justify-start gap-3 sm:gap-8">
								<div className="space-y-2">
									<h3 className="font-medium text-xs sm:text-sm">Start Date</h3>
									<div className="flex items-center gap-2 text-gray-600">
										<Icon icon="hugeicons:calendar-03" className="h-4 w-4 sm:h-5 sm:w-5" />
										<span className="text-xs sm:text-sm">{formatDate(task.start_date ?? "")}</span>
									</div>
								</div>

								<div className="space-y-2">
									<h3 className="font-medium text-xs sm:text-sm">End Date</h3>
									<div className="flex items-center gap-2 text-gray-600">
										<Icon icon="hugeicons:calendar-03" className="h-4 w-4 sm:h-5 sm:w-5" />
										<span className="text-xs sm:text-sm">{formatDate(task.end_date ?? "")}</span>
									</div>
								</div>
							</div>
						</div>
						{/* Team Section */}
						<div className="space-y-2">
							<h3 className="font-medium text-xs sm:text-sm">Task Leaders</h3>
							<AssigneeAvatarsWithTooltip
								assignees={task.user_manager ? [task.user_manager] : []}
								projectId={typeof task.project === "number" ? task.project : task.project?.id}
							/>
						</div>

						<div className="space-y-2">
							<h3 className="font-medium text-xs sm:text-sm">Assignees</h3>
							<AssigneeAvatarsWithTooltip
								assignees={task.user_assignees}
								projectId={typeof task.project === "number" ? task.project : task.project?.id}
							/>
						</div>
						{/* Custom Fields Section */}
						{(() => {
							const customFields =
								typeof task.custom_fields === "string"
									? JSON.parse(task.custom_fields)
									: task.custom_fields;

							return customFields && Object.keys(customFields).length > 0 ? (
								<div className="pt-3 space-y-3">
									<h3 className="font-semibold text-sm text-gray-800">Custom Fields</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg p-3 sm:p-3">
										{Object.entries(customFields).map(([key, value]) => (
											<div key={key} className="space-y-1">
												<h4 className="text-xs font-medium text-gray-700 capitalize">
													{key.replace(/_/g, " ")}
												</h4>
												<div className="text-xs text-gray-600">
													{Array.isArray(value) ? (
														<ul className="list-disc list-inside space-y-0.5">
															{value.map((item, idx) => (
																<li key={idx} className="text-xs text-gray-700">
																	{String(item)}
																</li>
															))}
														</ul>
													) : typeof value === "boolean" ? (
														<Badge
															variant={value ? "default" : "secondary"}
															className={`text-xs px-2 py-0.5 ${
																value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
															}`}
														>
															{value ? "Yes" : "No"}
														</Badge>
													) : (
														<span className="block truncate">{String(value)}</span>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							) : null;
						})()}
					</div>

					{/* Dialogs - Outside the main content */}
					{taskToDelete && (
						<ConfirmationDialog
							isOpen={!!taskToDelete}
							title="Delete Task"
							description="Are you sure you want to delete this task? This action cannot be undone."
							onConfirm={handleDelete}
							onClose={() => setTaskToDelete(null)}
							disabled={isDeleting}
						/>
					)}

					<TaskTimelineDialog
						isOpen={isTimelineDialogOpen}
						onOpenChange={(open) => {
							setIsTimelineDialogOpen(open);
						}}
						taskId={task.id}
						currentEndDate={task.end_date ?? undefined}
						isCreator={isTaskCreator}
						isLeader={isTaskLeader}
						hasExtendPermission={true}
						task={task}
						isProjectTask={true}
						onSuccess={() => {
							fetchTask();
							setIsTimelineDialogOpen(false);
						}}
					/>

					{/* <TaskDialog
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSave={async () => await fetchTask()}
            initialData={task}
          /> */}
				</div>

				{/* Chat Slide-in Panel */}
				<div
					className={`fixed inset-y-0 right-0 w-full sm:w-[420px] lg:w-[480px] bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
						isChatOpen ? "translate-x-0" : "translate-x-full"
					}`}
				>
					<div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50/50 to-white">
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-blue-200/50">
								<MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
							</div>
							<div>
								<h3 className="font-semibold text-sm sm:text-base text-gray-900">Discussion</h3>
								<p className="text-[10px] sm:text-xs text-muted-foreground">Task chat thread</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsChatOpen(false)}
							className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 transition-colors"
						>
							<X className="h-4 w-4 sm:h-5 sm:w-5" />
						</Button>
					</div>

					<div className="flex-1 overflow-hidden bg-gray-50/50">
						<TaskChatThread
							key={task.id}
							taskId={task.id}
							taskAssignees={[
								{
									id: task.user_manager?.id ?? 0,
									name: task.user_manager?.name ?? "unknown",
								},
								...task.user_assignees
									.filter((a) => a.id !== task.user_manager?.id)
									.map((a) => ({
										id: a.id,
										name: a.name,
									})),
							]}
							className="h-full w-full border-none"
							onTaskUpdate={fetchTask}
						/>
					</div>
				</div>

				{/* Audit Log-in Panel */}
				<div
					className={`fixed inset-y-0 right-0 w-full sm:w-[420px] lg:w-[480px] bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
						isAuditLogOpen ? "translate-x-0" : "translate-x-full"
					}`}
				>
					<div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50/50 to-white">
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-blue-200/50">
								<History className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
							</div>
							<div>
								<h3 className="font-semibold text-sm sm:text-base text-gray-900">Audit Logs</h3>
								<p className="text-[10px] sm:text-xs text-muted-foreground">Audit Trail Logs</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsAuditLog(false)}
							className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-gray-100 transition-colors"
						>
							<X className="h-4 w-4 sm:h-5 sm:w-5" />
						</Button>
					</div>

					<div className="flex-1 overflow-hidden bg-gray-50/50">
						<TaskAuditTrail taskId={task.id} />
					</div>
				</div>

				{/* Overlay */}
				{isChatOpen && (
					<div
						className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
						onClick={() => setIsChatOpen(false)}
					/>
				)}

				{/* Overlay */}
				{isAuditLogOpen && (
					<div
						className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
						onClick={() => setIsAuditLog(false)}
					/>
				)}
			</div>
		</ErrorBoundary>
	);
}
