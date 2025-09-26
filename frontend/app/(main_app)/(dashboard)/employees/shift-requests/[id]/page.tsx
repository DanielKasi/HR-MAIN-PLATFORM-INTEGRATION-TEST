"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
	ArrowLeft,
	Calendar,
	Clock,
	User,
	Building,
	CheckCircle,
	XCircle,
	AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { shiftsAPI } from "@/lib/utils";
import type { IEmployeeShift } from "@/types/types.utils";
import { showErrorToast } from "@/lib/utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const EmployeeShiftDetailPage = () => {
	const [shift, setShift] = useState<IEmployeeShift | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const shiftId = params?.id as string;

	const fetchShiftDetail = async () => {
		if (!shiftId) return;

		try {
			setLoading(true);
			const shiftData = await shiftsAPI.EMPLOYEE.getById(parseInt(shiftId));
			setShift(shiftData);
		} catch (error) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch shift details.",
			});
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchShiftDetail();
	}, [shiftId]);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "APPROVED":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case "REJECTED":
				return <XCircle className="h-4 w-4 text-red-600" />;
			case "PENDING":
			default:
				return <AlertCircle className="h-4 w-4 text-yellow-600" />;
		}
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "APPROVED":
				return "default";
			case "PENDING":
				return "secondary";
			case "REJECTED":
				return "destructive";
			default:
				return "outline";
		}
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

	if (!shift) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Shift not found</h2>
					<p className="text-gray-600 mt-2">The shift you're looking for doesn't exist.</p>
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
						<h1 className="text-2xl font-semibold tracking-tight">Shift Details</h1>
						<p className="text-muted-foreground">
							{shift.context === "ALLOCATION" ? "Shift Allocation" : "Shift Request"} Details
						</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{getStatusIcon(shift.shift_status)}
					<Badge variant={getStatusBadgeVariant(shift.shift_status)}>{shift.shift_status}</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={shift} onInstanceRefresh={fetchShiftDetail}>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Shift Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Building className="mr-2 h-5 w-5" />
								Shift Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* ... existing content ... */}
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm font-medium">Shift Name:</span>
									<span className="text-sm">
										{typeof shift.shift === "object" ? shift.shift?.name : `Shift #${shift.shift}`}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Day:</span>
									<span className="text-sm">
										{typeof shift.shift === "object" ? shift.shift?.shift_day?.day_name : "N/A"}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Start Time:</span>
									<span className="text-sm flex items-center">
										<Clock className="mr-1 h-3 w-3" />
										{typeof shift.shift === "object" ? shift.shift?.start_time : "N/A"}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">End Time:</span>
									<span className="text-sm flex items-center">
										<Clock className="mr-1 h-3 w-3" />
										{typeof shift.shift === "object" ? shift.shift?.end_time : "N/A"}
									</span>
								</div>
							</div>
							<Separator />
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm font-medium">Date:</span>
									<span className="text-sm flex items-center">
										<Calendar className="mr-1 h-3 w-3" />
										{new Date(shift.date).toLocaleDateString()}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Type:</span>
									<Badge variant={shift.context === "ALLOCATION" ? "default" : "secondary"}>
										{shift.context === "ALLOCATION" ? "Allocation" : "Request"}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Additional Details */}
					<Card>
						<CardHeader>
							<CardTitle>Additional Details</CardTitle>
						</CardHeader>
						<CardContent>
							{/* ... existing content ... */}
							<div className="grid gap-4 md:grid-cols-3">
								<div className="space-y-2">
									<span className="text-sm font-medium">Created By:</span>
									<p className="text-sm">
										{typeof shift.created_by === "object"
											? shift.created_by?.fullname
											: `User ID: ${shift.created_by}`}
									</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Created Date:</span>
									<p className="text-sm">
										{shift.created_at ? new Date(shift.created_at).toLocaleDateString() : "N/A"}
									</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Last Updated:</span>
									<p className="text-sm">
										{shift.updated_at ? new Date(shift.updated_at).toLocaleDateString() : "N/A"}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default EmployeeShiftDetailPage;
