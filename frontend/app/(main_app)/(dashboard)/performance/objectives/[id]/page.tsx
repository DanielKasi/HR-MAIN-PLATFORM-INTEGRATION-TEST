"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, User, FileText, CheckCircle, XCircle, Calendar, Building } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OBJECTIVES_API, showErrorToast } from "@/lib/utils";
import type { IObjective } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const ObjectivesDetailPage = () => {
	const [objective, setObjective] = useState<IObjective | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const objectiveId = params?.id as string;

	const fetchObjectiveDetail = async () => {
		if (!objectiveId) return;

		try {
			setLoading(true);
			const objectiveData = await OBJECTIVES_API.getById({
				objectiveId: parseInt(objectiveId),
			});
			setObjective(objectiveData);
		} catch (error) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch objective details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchObjectiveDetail();
	}, [objectiveId]);

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

	if (!objective) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Objective not found</h2>
					<p className="text-gray-600 mt-2">The objective you're looking for doesn't exist.</p>
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
						<h1 className="text-2xl font-semibold tracking-tight">{objective.name}</h1>
						<p className="text-muted-foreground">Objective Details</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{getStatusIcon(objective.is_active)}
					<Badge variant={getStatusBadgeVariant(objective.is_active)}>
						{objective.is_active ? "Active" : "Inactive"}
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={objective} onInstanceRefresh={fetchObjectiveDetail}>
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
									<span className="text-sm font-semibold">{objective.name}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Duration:</span>
									<span className="text-sm">
										{objective.duration || "N/A"} {objective.duration_unit}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Status:</span>
									<Badge variant={getStatusBadgeVariant(objective.is_active)}>
										{objective.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Approval Status:</span>
									<span className="text-sm capitalize">
										{objective.approval_status?.replace("_", " ")}
									</span>
								</div>
							</div>
							<Separator />
							{objective.description && (
								<div className="space-y-2">
									<span className="text-sm font-medium">Description:</span>
									<p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
										{objective.description}
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Timeline Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								Timeline & System Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="space-y-2">
									<span className="text-sm font-medium">Start Date:</span>
									<p className="text-sm">{objective.date ? formatDate(objective.date) : "N/A"}</p>
								</div>
								<Separator />
								<div className="space-y-2">
									<span className="text-sm font-medium">Created Date:</span>
									<p className="text-sm">
										{objective.created_at ? formatDate(objective.created_at) : "N/A"}
									</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Last Updated:</span>
									<p className="text-sm">
										{objective.updated_at ? formatDate(objective.updated_at) : "N/A"}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Key Result Information - if available */}
					{objective.key_result && (
						<Card className="md:col-span-2">
							<CardHeader>
								<CardTitle className="flex items-center">
									<Building className="mr-2 h-5 w-5" />
									Key Result
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<span className="text-sm font-medium">Title:</span>
										<p className="text-sm font-semibold">{objective.key_result.title}</p>
									</div>
									<div className="space-y-2">
										<span className="text-sm font-medium">Target Value:</span>
										<p className="text-sm">{objective.key_result.target_value}</p>
									</div>
									<div className="space-y-2">
										<span className="text-sm font-medium">Progress Type:</span>
										<p className="text-sm capitalize">{objective.key_result.progress_type}</p>
									</div>
									<div className="space-y-2">
										<span className="text-sm font-medium">Duration:</span>
										<p className="text-sm">{objective.key_result.duration}</p>
									</div>
									{objective.key_result.description && (
										<div className="space-y-2 md:col-span-2">
											<span className="text-sm font-medium">Description:</span>
											<p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
												{objective.key_result.description}
											</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Manager Information - if available */}
					{objective.managers && (
						<Card className="md:col-span-2">
							<CardHeader>
								<CardTitle className="flex items-center">
									<User className="mr-2 h-5 w-5" />
									Manager
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center space-x-4">
									<div className="flex-1">
										<p className="font-medium">
											{objective.managers.name || objective.managers.user?.fullname}
										</p>
										<p className="text-sm text-gray-600">{objective.managers.user?.email}</p>
										<p className="text-sm text-gray-600">{objective.managers.position_details}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Assignees Information - if available */}
					{objective.assignees && objective.assignees.length > 0 && (
						<Card className="md:col-span-2">
							<CardHeader>
								<CardTitle className="flex items-center">
									<User className="mr-2 h-5 w-5" />
									Assignees ({objective.assignees.length})
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{objective.assignees.map((assignee, index) => (
										<div key={index} className="border rounded-lg p-3">
											<p className="font-medium">{assignee.name || assignee.user?.fullname}</p>
											<p className="text-sm text-gray-600">{assignee.user?.email}</p>
											<p className="text-sm text-gray-600">{assignee.position_details}</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default ObjectivesDetailPage;
