"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, FileText, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { LeavePoliciesAPI, showErrorToast } from "@/lib/utils";
import type { ILeavePolicy, ILeaveType } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const LeavePolicyDetailPage = () => {
	const [leavePolicy, setLeavePolicy] = useState<ILeavePolicy | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const policyId = params?.id as string;

	const fetchLeavePolicyDetail = async () => {
		if (!policyId) return;

		try {
			setLoading(true);
			const policyData = await LeavePoliciesAPI.getById(parseInt(policyId));
			setLeavePolicy(policyData);
		} catch (error) {
			console.error("Failed to fetch leave policy detail:", error);
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch leave policy details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLeavePolicyDetail();
	}, [policyId]);

	const getStatusIcon = (isActive: boolean) => {
		return isActive ? (
			<CheckCircle className="h-4 w-4 text-green-600" />
		) : (
			<XCircle className="h-4 w-4 text-red-600" />
		);
	};

	const getStatusBadgeVariant = (isActive: boolean) => {
		return isActive ? "default" : "destructive";
	};

	const getCategoryColor = (category: string) => {
		const colors = {
			annual: "bg-blue-50 text-blue-700 border-blue-200",
			sick: "bg-red-50 text-red-700 border-red-200",
			maternity: "bg-pink-50 text-pink-700 border-pink-200",
			paternity: "bg-indigo-50 text-indigo-700 border-indigo-200",
			study: "bg-purple-50 text-purple-700 border-purple-200",
			compassionate: "bg-green-50 text-green-700 border-green-200",
			unpaid: "bg-gray-50 text-gray-700 border-gray-200",
		};
		return colors[category as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200";
	};

	const getApprovalColor = (requiresApproval: boolean) => {
		return requiresApproval
			? "bg-orange-50 text-orange-700 border-orange-200"
			: "bg-gray-50 text-gray-700 border-gray-200";
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

	const getLeaveTypeName = (leaveType: ILeavePolicy["leave_type"]): string => {
		if (typeof leaveType === "object" && leaveType !== null) {
			return (leaveType as ILeaveType).name || "Unknown Leave Type";
		}
		return "Unknown Leave Type";
	};

	const getLeaveTypeCategory = (leaveType: ILeavePolicy["leave_type"]): string => {
		if (typeof leaveType === "object" && leaveType !== null) {
			return (leaveType as ILeaveType).category || "unknown";
		}
		return "unknown";
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

	if (!leavePolicy) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Leave Policy not found</h2>
					<p className="text-gray-600 mt-2">The leave policy you're looking for doesn't exist.</p>
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
						<h1 className="text-2xl font-semibold tracking-tight">{leavePolicy.name}</h1>
						<p className="text-muted-foreground">Leave Policy Details</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{getStatusIcon(leavePolicy.is_active)}
					<Badge variant={getStatusBadgeVariant(leavePolicy.is_active)}>
						{leavePolicy.is_active ? "Active" : "Inactive"}
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout
				instance={leavePolicy}
				onInstanceRefresh={fetchLeavePolicyDetail}
			>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Basic Policy Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Policy Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Policy Name:</span>
									<span className="text-sm text-gray-700">{leavePolicy.name}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Leave Type:</span>
									<span className="text-sm text-gray-700">
										{getLeaveTypeName(leavePolicy.leave_type)}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Category:</span>
									<Badge
										className={`${getCategoryColor(getLeaveTypeCategory(leavePolicy.leave_type))} border font-medium`}
									>
										{getLeaveTypeCategory(leavePolicy.leave_type)}
									</Badge>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Status:</span>
									<Badge variant={getStatusBadgeVariant(leavePolicy.is_active)}>
										{leavePolicy.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
							</div>
							<Separator />
							<div className="space-y-2">
								<span className="text-sm text-gray-700">Description:</span>
								<p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
									{leavePolicy.description}
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Policy Rules & Requirements */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Settings className="mr-2 h-5 w-5" />
								Rules & Requirements
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Minimum Notice:</span>
									<span className="text-sm flex items-center">
										<Clock className="mr-1 h-3 w-3" />
										{leavePolicy.min_notice_days} days
									</span>
								</div>
								{leavePolicy.max_consecutive_days && leavePolicy.max_consecutive_days > 0 && (
									<div className="flex justify-between">
										<span className="text-sm text-gray-700">Max Consecutive Days:</span>
										<span className="text-sm">{leavePolicy.max_consecutive_days} days</span>
									</div>
								)}
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Applicable After Probation:</span>
									<span className="text-sm">
										{leavePolicy.applicable_after_probation_months} months
									</span>
								</div>
							</div>
							<Separator />
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Manager Approval:</span>
									<Badge
										className={`${getApprovalColor(leavePolicy.requires_manager_approval)} border font-medium`}
									>
										{leavePolicy.requires_manager_approval ? "Required" : "Not Required"}
									</Badge>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">HR Approval:</span>
									<Badge
										className={`${getApprovalColor(leavePolicy.requires_hr_approval)} border font-medium`}
									>
										{leavePolicy.requires_hr_approval ? "Required" : "Not Required"}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* System Information */}
					<Card className="md:col-span-2">
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								System Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-3">
								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-600">Created Date</Label>
									<p className="text-sm">
										{leavePolicy.created_at ? formatDateTime(leavePolicy.created_at) : "N/A"}
									</p>
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-600">Last Updated</Label>
									<p className="text-sm">
										{leavePolicy.updated_at ? formatDateTime(leavePolicy.updated_at) : "N/A"}
									</p>
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-600">Created By</Label>
									<p className="text-sm">
										{typeof leavePolicy.created_by === "object"
											? leavePolicy.created_by?.fullname || "System"
											: leavePolicy.created_by
												? `User ID: ${leavePolicy.created_by}`
												: "System"}
									</p>
								</div>
							</div>
							{leavePolicy.approval_status && (
								<>
									<Separator className="my-4" />
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-600">Approval Status</Label>
										<Badge
											variant={
												leavePolicy.approval_status === "active"
													? "default"
													: leavePolicy.approval_status === "under_creation"
														? "secondary"
														: "outline"
											}
										>
											{leavePolicy.approval_status.charAt(0).toUpperCase() +
												leavePolicy.approval_status.slice(1).replace(/_/g, " ")}
										</Badge>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default LeavePolicyDetailPage;
