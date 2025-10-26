"use client";

import type { ITaskTimeLine } from "@/types/project.type";
import { useState, useRef, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { Check, X, Search, MoreVertical, Eye, Filter, Loader2 } from "lucide-react";
import { debounce } from "lodash";
import { selectSelectedInstitution } from "@/store/auth/selectors-context-aware";
import { PaginatedTable } from "@/components/PaginatedTable";
import { Input } from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/platform/v1/components";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/platform/v1/components";
import { TASK_TIMELINE_API } from "@/lib/utils.chats";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { hasPermission } from "@/lib/helpers";
import { PERMISSION_CODES } from "@/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/platform/v1/components";
import RichTextDisplay from "@/components/common/rich-text-display";
import { TaskTimelineDialog } from "@/components/common/dialogs/task-timeline-extension";

export default function TaskTimelineExtensionPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [searchTerm, setSearchTerm] = useState("");
	const [inputValue, setInputValue] = useState("");
	const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
	const [loadingAction, setLoadingAction] = useState<number | null>(null);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const router = useModuleNavigation();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedAction, setSelectedAction] = useState<"approve" | "reject" | undefined>(undefined);
	const [selectedTimeline, setSelectedTimeline] = useState<ITaskTimeLine | undefined>(undefined);

	const debouncedSearch = useMemo(
		() =>
			debounce((value: string) => {
				setSearchTerm(value);
			}, 300),
		[],
	);

	useEffect(() => {
		return () => {
			debouncedSearch.cancel();
		};
	}, [debouncedSearch]);

	const openViewDetails = (timeline: ITaskTimeLine) => {
		router.push(`/task-mgt/task/${timeline.task.id}`);
	};

	const getStatus = (timeline: ITaskTimeLine) => {
		if (timeline.approved && timeline.accepted) return "approved";
		if (!timeline.approved && !timeline.accepted && timeline.approval_reason) return "rejected";
		return "pending";
	};

	return (
		<div className="p-4 sm:p-6 bg-white rounded-xl overflow-x-hidden">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
				<div className="space-y-1">
					<h1 className="text-xl sm:text-2xl font-bold tracking-tight sm:ml-4">
						Task Timeline Extension Requests
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground sm:ml-4">
						Review and manage task timeline extension requests for your organization
					</p>
				</div>
			</div>

			{/* Filters and Search */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<div className="relative w-full sm:max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by task..."
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value);
							debouncedSearch(e.target.value);
						}}
						className="pl-10"
					/>
				</div>
				<Select
					value={statusFilter}
					onValueChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
				>
					<SelectTrigger className="w-full sm:w-[180px]">
						<Filter className="h-4 w-4 mr-2" />
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="approved">Approved</SelectItem>
						<SelectItem value="rejected">Rejected</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Timeline Extensions Table */}
			<PaginatedTable<ITaskTimeLine>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");

					return await TASK_TIMELINE_API.getPaginated({
						search: searchTerm || undefined,
						//status: statusFilter || undefined,
					});
				}}
				fetchFromUrl={TASK_TIMELINE_API.getTaskExtensionsFromUrl}
				deps={[currentInstitution?.id, searchTerm, statusFilter]}
				className="w-full max-w-full overflow-x-auto bg-white"
				tableClassName="min-w-[900px] [&_th]:border-0 [&_td]:border-0"
				columns={[
					{
						key: "task",
						header: "Task Name",
						cell: (timeline) => (
							<div className="text-xs sm:text-sm text-muted-foreground">
								{timeline.task?.name || timeline.task?.id || "—"}
							</div>
						),
					},
					{
						key: "new_end_date",
						header: "New End Date",
						cell: (timeline) => (
							<div className="text-xs sm:text-sm text-muted-foreground max-w-xs truncate">
								{timeline.new_end_date ? new Date(timeline.new_end_date).toLocaleDateString() : "—"}
							</div>
						),
					},
					{
						key: "reason",
						header: "Reason",
						cell: (timeline) => (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<div className="text-xs sm:text-sm text-muted-foreground max-w-[200px] truncate">
											<RichTextDisplay
												htmlContent={timeline.request_reason || "—"}
												className="text-xs sm:text-sm text-gray-600"
											/>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<RichTextDisplay
											htmlContent={timeline.request_reason || "No reason provided"}
										/>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						),
					},
					{
						key: "status",
						header: "Status",
						cell: (timeline) => (
							<Badge
								variant={
									getStatus(timeline) === "approved"
										? "default"
										: getStatus(timeline) === "rejected"
											? "destructive"
											: "secondary"
								}
								className="text-xs"
							>
								{getStatus(timeline).charAt(0).toUpperCase() + getStatus(timeline).slice(1)}
							</Badge>
						),
					},
					{
						key: "approval_reason",
						header: "Approval Reason",
						cell: (timeline) => (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<div className="text-xs sm:text-sm text-muted-foreground max-w-[200px] truncate">
											<RichTextDisplay
												htmlContent={timeline.approval_reason || "—"}
												className="text-xs sm:text-sm text-gray-600"
											/>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<RichTextDisplay
											htmlContent={timeline.approval_reason || "No approval reason provided"}
										/>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						),
					},
					{
						key: "created_at",
						header: "Created",
						cell: (timeline) => (
							<div className="text-xs sm:text-sm text-muted-foreground">
								{new Date(timeline.created_at).toLocaleDateString()}
							</div>
						),
					},
					{
						key: "actions",
						header: "Actions",
						className: "w-[50px]",
						cell: (timeline) => {
							const canView = hasPermission(PERMISSION_CODES.CAN_VIEW_TASK_TIMELINE);
							const canApprove = hasPermission(PERMISSION_CODES.CAN_APPROVE_TASK_TIMELINE);
							const hasAnyPermission = canView || canApprove;

							if (!hasAnyPermission) return null;

							return (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="h-8 w-8 p-0"
											disabled={loadingAction === timeline.id}
										>
											{loadingAction === timeline.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<MoreVertical className="h-4 w-4" />
											)}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Actions</DropdownMenuLabel>
										<DropdownMenuSeparator />
										{canView && (
											<DropdownMenuItem onClick={() => openViewDetails(timeline)}>
												<Eye className="h-4 w-4 mr-2" />
												View Details
											</DropdownMenuItem>
										)}
										{canApprove && getStatus(timeline) === "pending" && (
											<>
												<DropdownMenuItem
													onClick={() => {
														setSelectedTimeline(timeline);
														setSelectedAction("approve");
														setDialogOpen(true);
													}}
												>
													<Check className="h-4 w-4 mr-2 text-green-500" />
													Approve
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => {
														setSelectedTimeline(timeline);
														setSelectedAction("reject");
														setDialogOpen(true);
													}}
													className="text-destructive focus:text-destructive"
												>
													<X className="h-4 w-4 mr-2 text-red-500" />
													Reject
												</DropdownMenuItem>
											</>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							);
						},
					},
				]}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-8 sm:py-12 px-4">
						<h3 className="text-base sm:text-lg font-semibold mb-2">
							{searchTerm || statusFilter
								? "No timeline extensions found"
								: "No task timeline extensions available"}
						</h3>
						<p className="text-xs sm:text-sm text-muted-foreground mb-4">
							{searchTerm || statusFilter
								? "Try adjusting your search or filter terms"
								: "No task timeline extension requests exist for this organization"}
						</p>
					</div>
				}
			/>
			{/* TaskTimelineDialog */}
			<TaskTimelineDialog
				isOpen={dialogOpen}
				onOpenChange={(open) => {
					setDialogOpen(open);
					if (!open) {
						setSelectedTimeline(undefined);
						setSelectedAction(undefined);
					}
				}}
				taskId={selectedTimeline?.task.id || 0}
				isCreator={hasPermission(PERMISSION_CODES.CAN_APPROVE_TASK_TIMELINE)}
				onSuccess={() => {
					tableRefreshRef.current?.();
					setDialogOpen(false);
					setSelectedTimeline(undefined);
					setSelectedAction(undefined);
				}}
				selectedAction={selectedAction}
				selectedTimeline={selectedTimeline}
			/>
		</div>
	);
}
