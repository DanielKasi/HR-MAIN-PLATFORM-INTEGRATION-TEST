"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import {
	Search,
	Edit,
	Trash2,
	Check,
	X,
	Clock,
	FileText,
	Download,
	Plus,
	CheckCircle2,
	XCircle,
	AlertCircle,
	Pause,
	Eye,
	Loader2,
	Info,
	AlertTriangle,
	Calendar,
	MoreVertical,
	Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeaveApplicationsAPI, getLeaveTypes } from "@/lib/utils";
import { ILeaveRequest, ILeaveType } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";
import { useRouter } from "next/navigation";

const STATUS_CHOICES = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" },
	{ value: "cancelled", label: "Cancelled" },
];

const DURATION_TYPES = [
	{ value: "full_day", label: "Full Day" },
	{ value: "half_day_morning", label: "Half Day - Morning" },
	{ value: "half_day_afternoon", label: "Half Day - Afternoon" },
	{ value: "hourly", label: "Hourly" },
];

const LeaveApplicationsPage = () => {
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
	const [ordering, setOrdering] = useState("");
	const refreshTableRef = useRef<(() => void) | null>(null);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();

	const handleDeleteSuccess = () => {
		toast.success("Leave application deleted successfully");
		refreshTableRef.current?.();
	};

	const fetchFirstPage = async (search?: string) => {
		if (!selectedInstitution?.id) {
			return { results: [], count: 0, next: null, previous: null };
		}

		return LeaveApplicationsAPI.getPaginated({
			institutionId: selectedInstitution.id,
			page: 1,
			search,
			status: statusFilter !== "all" ? statusFilter : undefined,
			leave_type_id: leaveTypeFilter !== "all" ? leaveTypeFilter : undefined,
			ordering: ordering || undefined,
		});
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return LeaveApplicationsAPI.getPaginatedFromUrl({ url });
	};

	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		type: "approve" | "reject" | "delete";
		applicationId: string | number;
		applicationName: string;
	}>({
		isOpen: false,
		type: "approve",
		applicationId: "",
		applicationName: "",
	});

	const getEmployeeName = (employee: ILeaveRequest["employee"]): string => {
		if (typeof employee === "object" && employee !== null) {
			return (employee as any).user?.fullname || (employee as any).email || "Unknown Employee";
		}

		return "Unknown Employee";
	};
	const getLeaveTypeName = (leaveType: ILeaveRequest["leave_type"]): string => {
		if (typeof leaveType === "object" && leaveType !== null) {
			return (leaveType as any).name || "Unknown Leave Type";
		}
		if (typeof leaveType === "number" || typeof leaveType === "string") {
			const found = leaveTypes.find((type) => type.id.toString() === leaveType.toString());

			return found?.name || "Unknown Leave Type";
		}

		return "Unknown Leave Type";
	};

	useEffect(() => {
		fetchData();
	}, [selectedInstitution]);

	const fetchData = async () => {
		if (!selectedInstitution?.id) {
			return;
		}
		try {
			const leaveTypesData = await getLeaveTypes({ institutionId: selectedInstitution.id });
			const activeLeaveTypes = leaveTypesData?.filter((type) => type.is_active !== false) || [];

			setLeaveTypes(activeLeaveTypes);
		} catch (error) {
			toast.error("Failed to load data");
			setLeaveTypes([]);
		}
	};

	const handleStatusChange = async (
		id: string | number,
		action: "approve" | "reject",
		rejectionReason?: string,
	) => {
		if (!selectedInstitution?.id) {
			toast.error("Institution ID is required");

			return;
		}

		setIsSubmitting(true);
		try {
			const updatedApplication =
				action === "approve"
					? await LeaveApplicationsAPI.approve({
							leaveApplicationId: id,
							institutionId: selectedInstitution?.id,
							rejectionReason,
						})
					: await LeaveApplicationsAPI.reject({
							leaveApplicationId: id,
							institutionId: selectedInstitution?.id,
							rejectionReason,
						});

			if (updatedApplication) {
				toast.success(`Application ${action}d successfully`);
				refreshTableRef.current?.();
			} else {
				toast.error(`Failed to ${action} application - no data returned`);
				refreshTableRef.current?.();
			}
		} catch (error) {
			toast.error(`An error occurred while ${action}ing the application`);
			refreshTableRef.current?.();
		} finally {
			setIsSubmitting(false);
		}
		setConfirmDialog({ isOpen: false, type: "approve", applicationId: "", applicationName: "" });
	};

	const handleDeleteApplication = async (id: string | number) => {
		if (!selectedInstitution?.id) {
			toast.error("Institution ID is required");

			return;
		}

		setIsSubmitting(true);
		try {
			const success = await LeaveApplicationsAPI.delete(id);

			if (success) {
				handleDeleteSuccess();
			} else {
				toast.error(
					"Failed to delete leave application. Only pending applications can be deleted.",
				);
				refreshTableRef.current?.();
			}
		} catch (error: any) {
			let errorMessage = "An error occurred while deleting the leave application";

			if (error.response?.data?.error) {
				errorMessage = error.response.data.error;
			} else if (error.response?.status === 400) {
				errorMessage = "Cannot delete this application. Only pending applications can be deleted.";
			}

			toast.error(errorMessage);
			refreshTableRef.current?.();
		} finally {
			setIsSubmitting(false);
		}
		setConfirmDialog({ isOpen: false, type: "delete", applicationId: "", applicationName: "" });
	};

	const openConfirmDialog = (
		type: "approve" | "reject" | "delete",
		applicationId: string | number,
		applicationName: string,
	) => {
		setConfirmDialog({
			isOpen: true,
			type,
			applicationId,
			applicationName,
		});
	};

	const handleConfirmAction = () => {
		if (confirmDialog.type === "approve") {
			handleStatusChange(confirmDialog.applicationId, "approve");
		} else if (confirmDialog.type === "reject") {
			handleStatusChange(confirmDialog.applicationId, "reject", "Application rejected");
		} else if (confirmDialog.type === "delete") {
			handleDeleteApplication(confirmDialog.applicationId);
		}
	};

	const getStatusColor = (status: string) => {
		const colors = {
			pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
			approved: "bg-green-50 text-green-700 border-green-200",
			rejected: "bg-red-50 text-red-700 border-red-200",
			cancelled: "bg-gray-50 text-gray-700 border-gray-200",
		};

		return colors[status as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200";
	};

	const getStatusIcon = (status: string) => {
		const icons = {
			pending: <AlertCircle className="h-3 w-3" />,
			approved: <CheckCircle2 className="h-3 w-3" />,
			rejected: <XCircle className="h-3 w-3" />,
			cancelled: <Pause className="h-3 w-3" />,
		};

		return icons[status as keyof typeof icons] || <Clock className="h-3 w-3" />;
	};

	const getCategoryColor = (category: string) => {
		const colors = {
			annual: "bg-blue-50 text-blue-700 border-blue-200",
			sick: "bg-red-50 text-red-700 border-red-200",
			maternity: "bg-pink-50 text-pink-700 border-pink-200",
			paternity: "bg-indigo-50 text-indigo-700 border-indigo-200",
			study: "bg-purple-50 text-purple-700 border-purple-200",
			compassionate: "bg-green-50 text-green-700 border-green-200",
		};

		return colors[category as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200";
	};

	if (!selectedInstitution?.id) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="flex flex-col items-center space-y-4 text-center">
					<div className="relative">
						<div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
						<Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-gray-800">No Institution Selected</h3>
						<p className="text-gray-600">
							Please select an institution to manage leave applications.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full min-h-screen bg-white">
			{/* Header */}
			<div className="flex flex-col gap-6 p-6">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Leave Applications</h1>
					</div>
				</div>

				{/* Search and Filters */}
				<div className="flex flex-col sm:flex-row gap-4 items-center sm:items-center justify-start">
					<div className="relative !w-full !max-w-md md:!max-w-lg">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search leave applications..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10 "
						/>
					</div>
					<div className="flex gap-2">
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none rounded-xl">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								{STATUS_CHOICES.map((status) => (
									<SelectItem key={status.value} value={status.value}>
										{status.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
							<SelectTrigger className="w-full sm:w-[150px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none rounded-xl">
								<SelectValue placeholder="All Leave Types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Leave Types</SelectItem>
								{leaveTypes.map((type) => (
									<SelectItem key={type.id} value={type.id.toString()}>
										{type.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Table Content */}
				<div className="flex-1 pb-6 min-h-0">
					<PaginatedTableWrapper<ILeaveRequest>
						fetchFirstPage={() => fetchFirstPage(searchTerm)}
						fetchFromUrl={fetchFromUrl}
						deps={[selectedInstitution?.id, searchTerm, statusFilter, leaveTypeFilter, ordering]}
					>
						{({ data, loading, refresh }) => {
							useEffect(() => {
								refreshTableRef.current = refresh;
							}, [refresh]);

							if (loading) return <TableSkeleton rows={10} columns={8} />;

							if (!data?.results?.length) {
								return (
									<div className="text-center py-12">
										<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
										<h3 className="text-lg font-semibold mb-2">No leave applications found</h3>
									</div>
								);
							}

							// Apply client-side filtering
							const filteredResults = data.results.filter((app) => {
								const matchesStatus = statusFilter === "all" || app.status === statusFilter;
								const matchesLeaveType =
									leaveTypeFilter === "all" ||
									(typeof app.leave_type === "object" && app.leave_type !== null
										? (app.leave_type as any).id?.toString() === leaveTypeFilter
										: app.leave_type?.toString() === leaveTypeFilter);

								return matchesStatus && matchesLeaveType;
							});

							return (
								<div className="rounded-lg border bg-white">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>
													<div className="flex items-center gap-2">
														<span>Employee</span>
														<Button
															size="sm"
															variant={ordering === "employee" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() => setOrdering(ordering === "employee" ? "" : "employee")}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead>
													<div className="flex items-center gap-2">
														<span>Leave Type</span>
														<Button
															size="sm"
															variant={ordering === "leave_type" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() =>
																setOrdering(ordering === "leave_type" ? "" : "leave_type")
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead>
													<div className="flex items-center gap-2">
														<span>Start Date</span>
														<Button
															size="sm"
															variant={ordering === "start_date" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() =>
																setOrdering(ordering === "start_date" ? "" : "start_date")
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead>
													<div className="flex items-center gap-2">
														<span>End Date</span>
														<Button
															size="sm"
															variant={ordering === "end_date" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() => setOrdering(ordering === "end_date" ? "" : "end_date")}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead>
													<div className="flex items-center gap-2">
														<span>Duration</span>
														<Button
															size="sm"
															variant={ordering === "duration_type" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() =>
																setOrdering(ordering === "duration_type" ? "" : "duration_type")
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Reason</TableHead>
												<TableHead className="w-[70px]">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredResults.map((application) => (
												<TableRow key={application.id?.toString() || Math.random()}>
													<TableCell>
														<div className="font-medium text-gray-900">
															{getEmployeeName(application.employee)}
														</div>
													</TableCell>
													<TableCell>
														<Badge
															className={`${getCategoryColor((application.leave_type as any)?.category || "annual")} border font-medium`}
														>
															{getLeaveTypeName(application.leave_type)}
														</Badge>
													</TableCell>
													<TableCell>
														<span className="text-sm font-medium text-gray-900">
															{new Date(application.start_date).toLocaleDateString()}
														</span>
													</TableCell>
													<TableCell>
														<span className="text-sm font-medium text-gray-900">
															{new Date(application.end_date).toLocaleDateString()}
														</span>
													</TableCell>
													<TableCell>
														<span className="text-sm text-gray-900">
															{DURATION_TYPES.find((d) => d.value === application.duration_type)
																?.label || application.duration_type}
														</span>
													</TableCell>
													<TableCell>
														<Badge
															className={`${getStatusColor(application.status)} border font-medium flex items-center gap-1 w-fit`}
														>
															{getStatusIcon(application.status)}
															{application.status.charAt(0).toUpperCase() +
																application.status.slice(1)}
														</Badge>
													</TableCell>
													<TableCell>
														<div className="max-w-xs">
															<p className="text-sm text-gray-900 line-clamp-2">
																{application.reason}
															</p>
														</div>
													</TableCell>
													<TableCell>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
																	<MoreVertical className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																{application.status === "pending" && (
																	<>
																		<ProtectedComponent
																			permissionCode={
																				PERMISSION_CODES.CAN_APPROVE_LEAVE_APPLICATIONS
																			}
																		>
																			<DropdownMenuItem
																				onClick={() =>
																					openConfirmDialog(
																						"approve",
																						application.id?.toString() || "",
																						getEmployeeName(application.employee),
																					)
																				}
																				className="text-green-600"
																			>
																				<Check className="h-4 w-4 mr-2" />
																				Approve
																			</DropdownMenuItem>
																		</ProtectedComponent>

																		<ProtectedComponent
																			permissionCode={
																				PERMISSION_CODES.CAN_REJECT_LEAVE_APPLICATIONS
																			}
																		>
																			<DropdownMenuItem
																				onClick={() =>
																					openConfirmDialog(
																						"reject",
																						application.id?.toString() || "",
																						getEmployeeName(application.employee),
																					)
																				}
																				className="text-red-600"
																			>
																				<X className="h-4 w-4 mr-2" />
																				Reject
																			</DropdownMenuItem>
																		</ProtectedComponent>

																		<ProtectedComponent
																			permissionCode={
																				PERMISSION_CODES.CAN_DELETE_LEAVE_APPLICATIONS
																			}
																		>
																			<DropdownMenuItem
																				onClick={() =>
																					openConfirmDialog(
																						"delete",
																						application.id?.toString() || "",
																						getEmployeeName(application.employee),
																					)
																				}
																				className="text-red-600"
																			>
																				<Trash2 className="h-4 w-4 mr-2" />
																				Delete
																			</DropdownMenuItem>
																		</ProtectedComponent>
																	</>
																)}
																<ProtectedComponent
																	permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_APPLICATIONS}
																>
																	<DropdownMenuItem
																		onClick={() =>
																			router.push(`/leave/leave-application/${application.id}`)
																		}
																		className="flex items-center px-2 sm:px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm"
																	>
																		<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500" />
																		View details
																	</DropdownMenuItem>
																</ProtectedComponent>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</div>

			{/* Confirmation Dialog */}
			<Dialog
				open={confirmDialog.isOpen}
				onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, isOpen: open })}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold">
							{confirmDialog.type === "approve" && "Approve Application"}
							{confirmDialog.type === "reject" && "Reject Application"}
							{confirmDialog.type === "delete" && "Delete Application"}
						</DialogTitle>
						<DialogDescription>
							{confirmDialog.type === "approve" &&
								`Are you sure you want to approve ${confirmDialog.applicationName}'s leave application? This action cannot be undone.`}
							{confirmDialog.type === "reject" &&
								`Are you sure you want to reject ${confirmDialog.applicationName}'s leave application? This action cannot be undone.`}
							{confirmDialog.type === "delete" &&
								`Are you sure you want to delete ${confirmDialog.applicationName}'s leave application? Only pending applications can be deleted.`}
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-3 mt-6">
						<Button
							variant="outline"
							onClick={() =>
								setConfirmDialog({
									isOpen: false,
									type: "approve",
									applicationId: "",
									applicationName: "",
								})
							}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							className={`${
								confirmDialog.type === "approve"
									? "bg-green-600 hover:bg-green-700"
									: confirmDialog.type === "reject"
										? "bg-orange-600 hover:bg-orange-700"
										: "bg-red-600 hover:bg-red-700"
							} text-white`}
							onClick={handleConfirmAction}
							disabled={isSubmitting}
						>
							{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isSubmitting ? (
								"Processing..."
							) : (
								<>
									{confirmDialog.type === "approve" && "Yes, Approve"}
									{confirmDialog.type === "reject" && "Yes, Reject"}
									{confirmDialog.type === "delete" && "Yes, Delete"}
								</>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default LeaveApplicationsPage;
