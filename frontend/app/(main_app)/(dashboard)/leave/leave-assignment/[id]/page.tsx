"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
	ArrowLeft,
	Calendar,
	Clock,
	User,
	FileText,
	CheckCircle,
	XCircle,
	AlertCircle,
	Download,
	Pause,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { LeaveApplicationsAPI, showErrorToast } from "@/lib/utils";
import { handleDownload, getFileUrl, getFileName } from "@/lib/helpers";
import type { ILeaveRequest, ILeaveType } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const DURATION_TYPES = [
	{ value: "full_day", label: "Full Day" },
	{ value: "half_day_morning", label: "Half Day - Morning" },
	{ value: "half_day_afternoon", label: "Half Day - Afternoon" },
	{ value: "hourly", label: "Hourly" },
];

const LeaveAssignmentDetailPage = () => {
	const [leaveApplication, setLeaveAssignment] = useState<ILeaveRequest | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const applicationId = params?.id as string;

	const fetchLeaveAssignmentDetail = async () => {
		if (!applicationId) return;

		try {
			setLoading(true);
			const applicationData = await LeaveApplicationsAPI.getById(parseInt(applicationId));
			setLeaveAssignment(applicationData);
		} catch (error) {
			console.error("Failed to fetch leave application detail:", error);
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch leave application details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLeaveAssignmentDetail();
	}, [applicationId]);

	const getStatusIcon = (status: string) => {
		const icons = {
			pending: <AlertCircle className="h-4 w-4 text-yellow-600" />,
			approved: <CheckCircle className="h-4 w-4 text-green-600" />,
			rejected: <XCircle className="h-4 w-4 text-red-600" />,
			cancelled: <Pause className="h-4 w-4 text-gray-600" />,
		};
		return icons[status as keyof typeof icons] || <Clock className="h-4 w-4 text-gray-600" />;
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "approved":
				return "default";
			case "pending":
				return "secondary";
			case "rejected":
			case "cancelled":
				return "destructive";
			default:
				return "outline";
		}
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

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const calculateDaysBetween = (startDate: string, endDate: string): number => {
		if (!startDate || !endDate) return 0;
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
		return diffDays;
	};

	const getEmployeeName = (employee: ILeaveRequest["employee"]): string => {
		if (typeof employee === "object" && employee !== null) {
			return (employee as any).user?.fullname || (employee as any).email || "Unknown Employee";
		}
		return "Unknown Employee";
	};

	const getLeaveTypeName = (leaveType: ILeaveRequest["leave_type"]): string => {
		if (typeof leaveType === "object" && leaveType !== null) {
			return (leaveType as ILeaveType).name || "Unknown Leave Type";
		}
		return "Unknown Leave Type";
	};

	const getApproverName = (approvedBy: ILeaveRequest["approved_by"]): string => {
		return (approvedBy as any)?.fullname || (approvedBy as any)?.email || "Not Approved";
	};

	const renderSupportingDocumentName = (document: string | File | undefined): string => {
		if (!document) return "Document";

		if (typeof document === "string") {
			const filename = document.split("/").pop() || document;
			return filename.split("?")[0];
		} else if (document instanceof File) {
			return document.name || "Document";
		}

		return "Document";
	};

	if (loading) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
					<div className="grid gap-6 md:grid-cols-2">
						<div className="h-64 bg-gray-200 rounded"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!leaveApplication) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Leave Application not found</h2>
					<p className="text-gray-600 mt-2">
						The leave application you're looking for doesn't exist.
					</p>
					<Button onClick={() => router.back()} className="mt-4">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6 bg-white">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Button
						variant="outline"
						size="sm"
						className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
						onClick={() => router.back()}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
					</Button>
					<div className="mt-4">
						<h1 className="text-2xl font-semibold tracking-tight">Leave Application Details</h1>
						<p className="text-muted-foreground">
							{getEmployeeName(leaveApplication.employee)} -{" "}
							{getLeaveTypeName(leaveApplication.leave_type)}
						</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{getStatusIcon(leaveApplication.status)}
					<Badge variant={getStatusBadgeVariant(leaveApplication.status)}>
						{leaveApplication.status.charAt(0).toUpperCase() + leaveApplication.status.slice(1)}
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout
				instance={leaveApplication}
				onInstanceRefresh={fetchLeaveAssignmentDetail}
			>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Employee & Leave Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<User className="mr-2 h-5 w-5" />
								Employee & Leave Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm font-medium">Employee:</span>
									<span className="text-sm font-semibold">
										{getEmployeeName(leaveApplication.employee)}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Leave Type:</span>
									<Badge
										className={`${getCategoryColor(
											typeof leaveApplication.leave_type === "object" &&
												leaveApplication.leave_type !== null
												? (leaveApplication.leave_type as ILeaveType).category
												: "annual",
										)} border font-medium`}
									>
										{getLeaveTypeName(leaveApplication.leave_type)}
									</Badge>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Duration Type:</span>
									<span className="text-sm">
										{DURATION_TYPES.find((d) => d.value === leaveApplication.duration_type)
											?.label || leaveApplication.duration_type}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Total Days:</span>
									<span className="text-sm font-semibold">
										{calculateDaysBetween(leaveApplication.start_date, leaveApplication.end_date)}{" "}
										days
									</span>
								</div>
							</div>
							<Separator />
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm font-medium">Start Date:</span>
									<span className="text-sm flex items-center">
										<Calendar className="mr-1 h-3 w-3" />
										{formatDate(leaveApplication.start_date)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">End Date:</span>
									<span className="text-sm flex items-center">
										<Calendar className="mr-1 h-3 w-3" />
										{formatDate(leaveApplication.end_date)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Status:</span>
									<Badge
										variant={getStatusBadgeVariant(leaveApplication.status)}
										className="flex items-center gap-1"
									>
										{getStatusIcon(leaveApplication.status)}
										{leaveApplication.status.charAt(0).toUpperCase() +
											leaveApplication.status.slice(1)}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Application Details */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Application Details
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-600">Reason</Label>
									<p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md leading-relaxed">
										{leaveApplication.reason}
									</p>
								</div>

								{leaveApplication.handover_notes && (
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-600">Handover Notes</Label>
										<p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md leading-relaxed">
											{leaveApplication.handover_notes}
										</p>
									</div>
								)}

								{leaveApplication.supporting_document && (
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-600">Supporting Document</Label>
										<div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
											<FileText className="h-4 w-4 text-orange-600" />
											<span className="text-sm text-gray-900 flex-1">
												{renderSupportingDocumentName(leaveApplication.supporting_document)}
											</span>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 px-2 text-orange-600 hover:bg-orange-100"
												onClick={() =>
													handleDownload(
														getFileUrl(leaveApplication.supporting_document as string),
														getFileName(leaveApplication.supporting_document as string),
													)
												}
											>
												<Download className="h-3 w-3" />
											</Button>
										</div>
									</div>
								)}

								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-600">Applied Date</Label>
									<p className="text-sm">
										{leaveApplication.created_at
											? formatDateTime(leaveApplication.created_at)
											: "Unknown"}
									</p>
								</div>

								{leaveApplication.approved_by && (
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-600">
											{leaveApplication.status === "approved" ? "Approved by" : "Processed by"}
										</Label>
										<p className="text-sm font-semibold text-gray-900">
											{getApproverName(leaveApplication.approved_by)}
										</p>
									</div>
								)}

								{leaveApplication.rejection_reason && (
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-600">Rejection Reason</Label>
										<p className="text-sm text-red-800 bg-red-50 p-3 rounded-md">
											{leaveApplication.rejection_reason}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default LeaveAssignmentDetailPage;
