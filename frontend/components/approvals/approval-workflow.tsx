"use client";

import type { ApprovableEntityStatus, Approval, ApprovalTask } from "@/types/approvals.types";

import { useState } from "react";
import {
	CheckCircle,
	Clock,
	FileCheck,
	RefreshCw,
	MessageSquare,
	Plus,
	Edit,
	Trash2,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { APPROVAL_TASKS_API } from "@/lib/api/approvals/utils";
import { selectUser } from "@/store/auth/selectors";
import { formatTransactionDate } from "@/lib/helpers";

interface ApprovalWorkflowProps {
	approvals: Approval[];
	instance_approval_status?: ApprovableEntityStatus;
	onRefresh?: () => void;
	className?: string;
}

export function ApprovalWorkflow({
	approvals,
	instance_approval_status,
	// onApprovalUpdate,
	onRefresh, // Added refresh prop
	className = "",
}: ApprovalWorkflowProps) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [showCommentFor, setShowCommentFor] = useState<{
		taskId: number;
		action: "approve" | "reject" | "override";
	} | null>(null);
	const currentUser = useSelector(selectUser);

	const [comment, setComment] = useState("");
	const [isContentRevealead, setIsContentRevealed] = useState(true);

	const handleActionClick = (taskId: number, action: "approve" | "reject" | "override") => {
		setShowCommentFor({ taskId, action });
		setComment("");
	};

	const ToggleContent = () => {
		setIsContentRevealed((prev) => !prev);
	};

	const handleSubmitAction = async () => {
		if (!showCommentFor) return;

		setIsProcessing(true);
		try {
			let updatedTask: ApprovalTask;

			if (showCommentFor.action === "approve") {
				updatedTask = await APPROVAL_TASKS_API.approve({
					id: showCommentFor.taskId,
					comment: comment,
				});
			} else if (showCommentFor.action === "override") {
				updatedTask = await APPROVAL_TASKS_API.override({ id: showCommentFor.taskId, comment });
			} else {
				updatedTask = await APPROVAL_TASKS_API.reject({ id: showCommentFor.taskId, comment });
			}
			onRefresh?.();

			setShowCommentFor(null);
			setComment("");
		} catch (error) {
			console.error(`Failed to ${showCommentFor.action} task:`, error);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCancelAction = () => {
		setShowCommentFor(null);
		setComment("");
	};

	const getActionIcon = (actionName: string) => {
		switch (actionName.toLowerCase()) {
			case "create":
				return <Plus className="h-4 w-4" />;
			case "update":
				return <Edit className="h-4 w-4" />;
			case "delete":
				return <Trash2 className="h-4 w-4" />;
			default:
				return <FileCheck className="h-4 w-4" />;
		}
	};

	const getActionColor = (actionName: string) => {
		switch (actionName.toLowerCase()) {
			case "create":
				return "bg-green-100 text-green-800 border-green-200";
			case "update":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "delete":
				return "bg-red-100 text-red-800 border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "approved":
				return "bg-green-100 text-green-800 border-green-200";
			case "rejected":
				return "bg-red-100 text-red-800 border-red-200";
			case "pending":
				return "bg-blue-100 text-blue-800 border-blue-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "approved":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case "rejected":
				return <CheckCircle className="h-4 w-4 text-red-600" />;
			case "pending":
				return <Clock className="h-4 w-4 text-blue-600" />;
			default:
				return <Clock className="h-4 w-4 text-gray-600" />;
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "approved":
				return "Approved";
			case "rejected":
				return "Rejected";
			case "pending":
				return "Pending";
			default:
				return "Not Started";
		}
	};

	const totalTasks = approvals.reduce((sum, approval) => sum + approval.tasks.length, 0);

	if (approvals.length === 0 || instance_approval_status === "active" || !currentUser) {
		return null;
	}

	return (
		<div className={`${className}`}>
			<div className="flex items-center justify-between gap-2 mt-4">
				<div className="flex items-center justify-start gap-4">
					<h3 className="text-base font-semibold">Approval Process</h3>

					<span className="text-xs text-muted-foreground">
						({approvals.length} approval{approvals.length !== 1 ? "s" : ""}, {totalTasks} task
						{totalTasks !== 1 ? "s" : ""})
					</span>
				</div>
				<Button
					size={"sm"}
					variant={"ghost"}
					className="rounded-full font-semibold"
					onClick={ToggleContent}
				>
					{isContentRevealead ? (
						<ChevronUp className="h-5 w-5 font-bold text-gray-900" />
					) : (
						<ChevronDown className="h-5 w-5 font-bold text-gray-900" />
					)}
				</Button>
			</div>

			{isContentRevealead ? (
				<div className="h-full max-h-[70svh] overflow-y-auto">
					{approvals.map((approval, approvalIndex) => (
						<div
							key={approval.id}
							className="border rounded-lg p-4 space-y-4 transition-all duration-300"
						>
							<div className="flex items-center justify-between border-b pb-3">
								<div className="grid grid-cols-1 gap-3">
									<Badge
										className={`${getActionColor(approval.action.name)} flex items-center gap-1`}
									>
										{getActionIcon(approval.action.name)}
										<span>
											This is a{" "}
											<b className="uppercase mx-1">
												{approval.action.name.charAt(0).toUpperCase() +
													approval.action.name.slice(1)}
											</b>{" "}
											operation{" "}
										</span>
									</Badge>
									<Badge className={`${getStatusColor(approval.status)}`}>
										<span>
											This approval process is{" "}
											<b className="uppercase mx-1">
												{approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
											</b>{" "}
										</span>
									</Badge>
								</div>
								<div className="text-sm text-muted-foreground">
									{approval.tasks.length} step{approval.tasks.length !== 1 ? "s" : ""}
								</div>
							</div>

							<div className="space-y-4 ">
								{approval.tasks.map((task, taskIndex) => (
									<div key={task.id} className="relative">
										<div className="flex flex-col items-start gap-3">
											<div className="w-full p-3 flex items-start justify-start bg-gray-100 rounded-xl">
												<div
													className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
														task.status === "approved"
															? "bg-green-100 border-green-500"
															: task.status === "rejected"
																? "bg-red-100 border-red-500"
																: "bg-blue-100 border-blue-400"
													}`}
												>
													<span
														className={`text-xs md:text-sm font-semibold ${
															task.status === "approved"
																? "text-green-700"
																: task.status === "rejected"
																	? "text-red-700"
																	: "text-blue-700"
														}`}
													>
														{taskIndex + 1}
													</span>
												</div>
												<div className="flex flex-col pl-4 w-full">
													<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
														<h4 className="text-sm font-medium text-gray-900">
															{task.level?.name || `Approval Step ${taskIndex + 1}`}
														</h4>

														<Badge className={`text-xs ${getStatusColor(task.status)}`}>
															<span className="flex items-center gap-1">
																{getStatusIcon(task.status)}
																{getStatusText(task.status)}
															</span>
														</Badge>
													</div>

													<p className="text-xs text-gray-500 mt-1">
														{task.status === "approved" || task.status === "rejected"
															? `${getStatusText(task.status)} - ${formatTransactionDate(task.updated_at)}`
															: "Pending Approval"}
														{task.approved_by_fullname && (
															<span className="ml-1">by {task.approved_by_fullname}</span>
														)}
													</p>

													{task.comment && (
														<div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
															<MessageSquare className="h-3 w-3 inline mr-1" />
															{task.comment}
														</div>
													)}

													{task.status === "pending" && !showCommentFor && (
														<div className="flex flex-col sm:grid grid-cols-2 w-full gap-2 sm:gap-4  mt-3">
															{(task.level.approvers_detail.find(
																(approver) =>
																	approver.approver_user === currentUser?.id ||
																	approver.approver_group?.roles_display.some((role) =>
																		currentUser?.roles.find(
																			(user_role) => user_role.id === role.id,
																		),
																	),
															) ||
																task.level.approver_users.includes(currentUser?.id)) && (
																<>
																	<Button
																		size="sm"
																		className="bg-green-600 hover:bg-green-700 text-white text-xs !h-8 rounded-full "
																		onClick={() => handleActionClick(task.id, "approve")}
																		disabled={isProcessing}
																	>
																		Approve
																	</Button>
																	<Button
																		size="sm"
																		variant="destructive"
																		className="text-xs !h-8 rounded-full"
																		onClick={() => handleActionClick(task.id, "reject")}
																		disabled={isProcessing}
																	>
																		Reject
																	</Button>
																</>
															)}

															{(task.level.overriders_detail.find(
																(approver) =>
																	approver.approver_group?.users_display.find(
																		(user) => user.user.id === currentUser?.id,
																	) ||
																	approver.approver_group?.roles_display.some((role) =>
																		currentUser?.roles.find(
																			(user_role) => user_role.id === role.id,
																		),
																	),
															) ||
																task.level.overrider_users.includes(currentUser?.id)) && (
																<Button
																	size="sm"
																	className="bg-blue-400 hover:bg-blue-700 text-white text-xs !h-8 rounded-full "
																	onClick={() => handleActionClick(task.id, "override")}
																	disabled={isProcessing}
																>
																	Override
																</Button>
															)}
														</div>
													)}

													{showCommentFor?.taskId === task.id && (
														<div className="mt-3 space-y-3 border-t pt-3">
															<div>
																<Label htmlFor="comment" className="text-xs font-medium">
																	Comment (Optional)
																</Label>
																<Textarea
																	id="comment"
																	placeholder={`Add a comment for ${showCommentFor.action}ing this step...`}
																	value={comment}
																	onChange={(e) => setComment(e.target.value)}
																	className="mt-1 text-sm resize-none"
																	rows={3}
																/>
															</div>
															<div className="flex gap-2">
																<Button
																	size="sm"
																	onClick={handleSubmitAction}
																	disabled={isProcessing}
																	className={`text-xs h-8 !rounded-full ${
																		showCommentFor.action === "approve"
																			? "bg-green-600 hover:bg-green-700"
																			: showCommentFor.action === "override"
																				? "bg-blue-600 hover:bg-blue-700"
																				: "bg-red-600 hover:bg-red-700"
																	}`}
																>
																	{isProcessing ? (
																		<>
																			<RefreshCw className="h-3 w-3 mr-1 animate-spin" />
																			{showCommentFor.action === "approve"
																				? "Approving..."
																				: showCommentFor.action === "override"
																					? ""
																					: "Rejecting..."}
																		</>
																	) : (
																		`Confirm ${showCommentFor.action === "approve" ? "Approval" : showCommentFor.action === "override" ? "Overriding" : "Rejection"}`
																	)}
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={handleCancelAction}
																	disabled={isProcessing}
																	className="text-xs h-8 bg-transparent !rounded-full"
																>
																	Cancel
																</Button>
															</div>
														</div>
													)}
												</div>
											</div>
										</div>

										{taskIndex < approval.tasks.length - 1 && (
											<div
												className="absolute left-1/2 -translate-x-1/2 w-0.5 h-12 ml-1"
												style={{
													backgroundImage:
														"repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)",
												}}
											/>
										)}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<></>
			)}
		</div>
	);
}
