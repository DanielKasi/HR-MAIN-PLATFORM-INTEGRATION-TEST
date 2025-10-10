"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, FileText, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { LeaveTypesAPI, showErrorToast } from "@/lib/utils";
import type { ILeaveType } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const LeaveTypeDetailPage = () => {
	const [leaveType, setLeaveType] = useState<ILeaveType | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const leaveTypeId = params?.id as string;

	const fetchLeavePolicyDetail = async () => {
		if (!leaveTypeId) return;

		try {
			setLoading(true);
			const leaveTypeData = await LeaveTypesAPI.getById(parseInt(leaveTypeId));
			setLeaveType(leaveTypeData);
		} catch (error) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch leave type details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLeavePolicyDetail();
	}, [leaveTypeId]);

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

	if (!leaveType) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Leave type not found</h2>
					<p className="text-gray-600 mt-2">The leave type you're looking for doesn't exist.</p>
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
						<h1 className="text-2xl font-semibold tracking-tight">{leaveType.name}</h1>
						<p className="text-muted-foreground">Leave Type Details</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{getStatusIcon(leaveType.is_active)}
					<Badge variant={getStatusBadgeVariant(leaveType.is_active)}>
						{leaveType.is_active ? "Active" : "Inactive"}
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={leaveType} onInstanceRefresh={fetchLeavePolicyDetail}>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Basic type Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Leave Type Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Leave Type Name:</span>
									<span className="text-sm text-gray-700">{leaveType.name}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Category:</span>
									<Badge className={`${getCategoryColor(leaveType.category)} border font-medium`}>
										{leaveType.category}
									</Badge>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Max Days Per Year:</span>
									<span className="text-sm">{leaveType.max_days_per_year} days</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Gender Specific:</span>
									<span className="text-sm">{leaveType.gender_specific || "All"}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Status:</span>
									<Badge variant={getStatusBadgeVariant(leaveType.is_active)}>
										{leaveType.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
							</div>
							<Separator />
							<div className="space-y-2">
								<span className="text-sm font-medium">Description:</span>
								<p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
									{leaveType.description}
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
									<span className="text-sm text-gray-700">Max Carry Forward Days:</span>
									<span className="text-sm">{leaveType.max_carry_forward_days} days</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Carry Forward Allowed:</span>
									<Badge
										className={`${leaveType.carry_forward_allowed ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"} border font-medium`}
									>
										{leaveType.carry_forward_allowed ? "Yes" : "No"}
									</Badge>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Requires Document:</span>
									<Badge
										className={`${leaveType.requires_document ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-gray-50 text-gray-700 border-gray-200"} border font-medium`}
									>
										{leaveType.requires_document ? "Yes" : "No"}
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
										{leaveType.created_at ? formatDateTime(leaveType.created_at) : "Unknown"}
									</p>
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-600">Last Updated</Label>
									<p className="text-sm">
										{leaveType.updated_at ? formatDateTime(leaveType.updated_at) : "Unknown"}
									</p>
								</div>
							</div>
							{leaveType.approval_status && (
								<>
									<Separator className="my-4" />
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-600">Approval Status </Label>
										<Badge
											variant={
												leaveType.approval_status === "active"
													? "default"
													: leaveType.approval_status === "under_creation"
														? "secondary"
														: "outline"
											}
										>
											{leaveType.approval_status.charAt(0).toUpperCase() +
												leaveType.approval_status.slice(1).replace(/_/g, " ")}
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

export default LeaveTypeDetailPage;
