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
	Clock,
	CheckCircle2,
	AlertTriangle,
	FileText,
	Activity,
	MessageSquare,
	Paperclip,
	Plus,
	TrendingUp,
	List,
} from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { IProjectTask } from "@/types/types.utils";
import { PROJECTS_TASKS_API, showErrorToast } from "@/lib/utils";
import FixedLoader from "@/components/fixed-loader";

interface ITaskTimeSheet {
	id: number;
	task: number;
	start_time: string;
	end_time: string;
	notes: string;
	user: UserProfile;
}

interface ITaskComment {
	id: number;
	task: number;
	user: UserProfile;
	comment: string;
	created_at: string;
}

const getStatusColor = (status: string) => {
	switch (status) {
		case "completed":
			return "bg-green-50 text-green-700 border-green-200";
		case "in_progress":
			return "bg-blue-50 text-blue-700 border-blue-200";
		case "not_started":
			return "bg-gray-50 text-gray-700 border-gray-200";
		case "on_hold":
			return "bg-orange-50 text-orange-700 border-orange-200";
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

const getDaysRemaining = (endDate: string) => {
	const today = new Date();
	const end = new Date(endDate);
	const diffTime = end.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
};

export default function TaskDetailsPage() {
	const params = useParams();
	const [task, setTask] = useState<IProjectTask | null>(null);
	// const [comments, setComments] = useState<ITaskComment[]>([]);
	const [loading, setLoading] = useState(true);
	const [newComment, setNewComment] = useState("");

	const fetchTask = async () => {
		try {
			const response = await PROJECTS_TASKS_API.getByTaskId({ taskId: Number(params.id) });
			setTask(response);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch task details." });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (params.id) {
			fetchTask();
		}
	}, [params.id]);

	if (loading) {
		return <FixedLoader />;
	}

	if (!task) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-lg">Task not found</div>
			</div>
		);
	}

	const daysRemaining = getDaysRemaining(task.end_date);
	const isOverdue = daysRemaining < 0 && task.task_status !== "completed";
	const TimeSheetStartDate = task.task_time_sheet.start_time
		? new Date(task.task_time_sheet.start_time)
		: null;
	const TimeSheetEndDate = task.task_time_sheet.end_time
		? new Date(task.task_time_sheet.end_time)
		: null;
	let totalHours = 0;
	if (TimeSheetStartDate && TimeSheetEndDate) {
		totalHours = (TimeSheetEndDate.getTime() - TimeSheetStartDate.getTime()) / (1000 * 60 * 60);
	}

	return (
		<div className="min-h-screen bg-white rounded-xl p-6">
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_TASKS}>
				<div className="max-w-full space-y-8">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div className="space-y-2">
							<div className="flex items-center justify-start gap-4 mb-2">
								<Link href={`/projects/${task.project}`}>
									<Button variant="outline" size="sm" className="rounded-full !aspect-square">
										<ArrowLeft className="h-4 w-4" />
									</Button>
								</Link>
								<h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
									{task.task_name}
								</h1>
							</div>
							<div className="flex items-center gap-3">
								<Badge className={`${getStatusColor(task.task_status)} border`}>
									{task.task_status.replace("_", " ")}
								</Badge>
								<Badge className={`${getPriorityColor(task.priority)} border`}>
									{task.priority} priority
								</Badge>
								{isOverdue && (
									<Badge variant="destructive">{Math.abs(daysRemaining)} days overdue</Badge>
								)}
							</div>
						</div>
						<Link href={`/projects/project-tasks/edit/${task.id}`}>
							<Button className="!rounded-xl">
								<Edit className="h-4 w-4 md:mr-2" />
								<span className="hidden md:inline-block">Edit Task</span>
							</Button>
						</Link>
					</div>

					<div
						className={`gap-6 ${task?.approval_status !== "active" && task?.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
					>
						{task?.approvals && task.approvals.length > 0 && (
							<div className="order-1 lg:order-2">
								<ApprovalWorkflow
									approvals={task.approvals}
									instance_approval_status={task.approval_status}
									onRefresh={fetchTask}
								/>
							</div>
						)}

						<div
							className={`${task?.approval_status !== "active" && task?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
						>
							{/* Stats Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
								<Card className="shadow-sm rounded-xl">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium">Time Logged</p>
												<p className="text-3xl font-bold">{totalHours.toFixed(1)}h</p>
											</div>
											<Clock className="h-8 w-8" />
										</div>
									</CardContent>
								</Card>

								<Card className="shadow-sm rounded-xl">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium">Days Remaining</p>
												<p
													className={`text-3xl font-bold ${isOverdue ? "text-red-600" : "text-green-600"}`}
												>
													{isOverdue ? Math.abs(daysRemaining) : daysRemaining}
												</p>
											</div>
											<Calendar className="h-8 w-8" />
										</div>
									</CardContent>
								</Card>

								<Card className="shadow-sm rounded-xl">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium">Leaders</p>
												<p className="text-3xl font-bold">{task.managers.length}</p>
											</div>
											<Users className="h-8 w-8" />
										</div>
									</CardContent>
								</Card>

								<Card className="shadow-sm rounded-xl">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium">Assignees</p>
												<p className="text-3xl font-bold">{task.assigned_to.length}</p>
											</div>
											<Users className="h-8 w-8" />
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Main Content */}
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
								<div className="lg:col-span-2">
									<Card className="border-0 !shadow-md">
										<CardHeader className="pb-4">
											<CardTitle className="text-lg font-semibold">Task Description</CardTitle>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="prose max-w-none">
												<p className="text-slate-600">{task.description}</p>
											</div>
										</CardContent>
									</Card>

									{/* Timeline */}
									<Card className="border-0 !shadow-md mt-6">
										<CardHeader className="flex flex-row items-center justify-between pb-4">
											<div className="space-y-1">
												<CardTitle className="text-lg font-semibold">Timeline</CardTitle>
												<p className="text-sm text-slate-600">Task schedule and deadlines</p>
											</div>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="space-y-3">
												<div className="flex justify-between items-center">
													<span className="text-slate-600 text-sm">Start Date</span>
													<span className="font-medium text-slate-900">
														{new Date(task.start_date).toLocaleDateString()}
													</span>
												</div>
												<div className="flex justify-between items-center">
													<span className="text-slate-600 text-sm">Due Date</span>
													<span className="font-medium text-slate-900">
														{new Date(task.end_date).toLocaleDateString()}
													</span>
												</div>
												{task.start_date && task.end_date && (
													<div className="flex justify-between items-center">
														<span className="text-slate-600 text-sm">Duration</span>
														<span className="font-medium text-slate-900">
															{Math.ceil(
																(new Date(task.end_date).getTime() -
																	new Date(task.start_date).getTime()) /
																	(1000 * 60 * 60 * 24),
															)}{" "}
															days
														</span>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								</div>

								{/* Sidebar */}
								<div className="space-y-6">
									{/* Assigned Team */}
									<Card className="border-0 !shadow-md">
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Users className="h-5 w-5" />
												Assigned Team
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div>
												<h4 className="font-medium text-slate-900 mb-3">Task Leaders</h4>
												<div className="space-y-2">
													{task.managers.map((leader) => (
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
												<h4 className="font-medium text-slate-900 mb-3">Assignees</h4>
												<div className="space-y-2">
													{task.assigned_to.map((member) => (
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
																<p className="text-xs text-slate-600">Assignee</p>
															</div>
														</div>
													))}
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Task Info */}
									<Card className="border-0 !shadow-md">
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Activity className="h-5 w-5" />
												Task Information
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="space-y-3">
												<div className="flex justify-between items-center">
													<span className="text-slate-600 text-sm">Priority</span>
													<Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
												</div>

												<div className="flex justify-between items-center">
													<span className="text-slate-600 text-sm">Status</span>
													<Badge className={getStatusColor(task.task_status)}>
														{task.task_status.replace("_", " ")}
													</Badge>
												</div>

												<div className="flex justify-between items-center">
													<span className="text-slate-600 text-sm">Time logged</span>
													<span className="font-medium text-slate-900">
														{totalHours.toFixed(1)}h
													</span>
												</div>

												<div className="flex justify-between items-center">
													<span className="text-slate-600 text-sm">Days remaining</span>
													<span
														className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-900"}`}
													>
														{isOverdue
															? `${Math.abs(daysRemaining)} overdue`
															: `${daysRemaining} days`}
													</span>
												</div>
											</div>

											{isOverdue && (
												<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
													<div className="flex items-center gap-2 text-red-700">
														<AlertTriangle className="h-4 w-4" />
														<span className="font-medium text-sm">Task is overdue</span>
													</div>
												</div>
											)}
										</CardContent>
									</Card>
								</div>
							</div>
						</div>
					</div>
				</div>
			</ProtectedComponent>
		</div>
	);
}
