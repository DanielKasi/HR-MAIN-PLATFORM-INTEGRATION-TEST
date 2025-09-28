"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, User, FileText, CheckCircle, XCircle, Calendar, Building } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { viewWorkType, showErrorToast } from "@/lib/utils";
import type { IWorkType } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const EmployeeTypeDetailPage = () => {
	const [workType, setWorkType] = useState<IWorkType | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const workTypeId = params?.id as string;

	const fetchWorkTypeDetail = async () => {
		if (!workTypeId) return;

		try {
			setLoading(true);
			const typeData = await viewWorkType({ workTypeId: parseInt(workTypeId) });
			setWorkType(typeData);
		} catch (error) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch work type details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchWorkTypeDetail();
	}, [workTypeId]);

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

	const formatDate = (dateString: string) => {
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

	if (!workType) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Work Type not found</h2>
					<p className="text-gray-600 mt-2">The work type you're looking for doesn't exist.</p>
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
						<h1 className="text-2xl font-semibold tracking-tight">{workType.name}</h1>
						<p className="text-muted-foreground">WorkType Details</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{getStatusIcon(workType.is_active)}
					<Badge variant={getStatusBadgeVariant(workType.is_active)}>
						{workType.is_active ? "Active" : "Inactive"}
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={workType} onInstanceRefresh={fetchWorkTypeDetail}>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Basic Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm font-medium">Name:</span>
									<span className="text-sm font-semibold">{workType.name}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Code:</span>
									<span className="text-sm">{workType.code || "N/A"}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Status:</span>
									<Badge variant={getStatusBadgeVariant(workType.is_active)}>
										{workType.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
							</div>
							<Separator />
							{workType.description && (
								<div className="space-y-2">
									<span className="text-sm font-medium">Description:</span>
									<p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
										{workType.description}
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Additional Details */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								System Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="space-y-2">
									<span className="text-sm font-medium">Created Date:</span>
									<p className="text-sm">
										{workType.created_at ? formatDate(workType.created_at) : "N/A"}
									</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Last Updated:</span>
									<p className="text-sm">
										{workType.updated_at ? formatDate(workType.updated_at) : "N/A"}
									</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Created By:</span>
									<p className="text-sm">
										{typeof workType.created_by === "object"
											? workType.created_by?.fullname || "System"
											: workType.created_by
												? `User ID: ${workType.created_by}`
												: "System"}
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

export default EmployeeTypeDetailPage;
