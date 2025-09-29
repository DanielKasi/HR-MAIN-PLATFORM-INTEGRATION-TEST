"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, FileText, Settings, CheckCircle, XCircle } from "lucide-react";

import { PERIODS_API } from "@/lib/utils";
import type { IPeriod } from "@/types/types.utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function PeriodViewPage() {
	const [period, setPeriod] = useState<IPeriod | null>(null);
	const [loading, setLoading] = useState(true);

	const params = useParams();
	const router = useRouter();
	const periodId = parseInt(params.id as string);

	const fetchPeriod = async () => {
		try {
			setLoading(true);
			const data = await PERIODS_API.getById({ periodId });
			setPeriod(data);
		} catch (error) {
			toast.error("Failed to fetch period details");
			console.error("Error fetching period:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (periodId) {
			fetchPeriod();
		}
	}, [periodId]);

	const getStatusBadgeVariant = (isClosed: boolean) => {
		return isClosed ? "destructive" : "default";
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	if (loading) {
		return <div className="p-6">Loading...</div>;
	}

	if (!period) {
		return <div className="p-6">Period not found</div>;
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
						<h1 className="text-2xl font-semibold tracking-tight">{period.name}</h1>
						<p className="text-muted-foreground">Performance Period Details</p>
					</div>
				</div>
			</div>
			<ApprovableInstancePageLayout instance={period} onInstanceRefresh={fetchPeriod}>
				<div className="grid gap-6 md:grid-cols-2 mt-8">
					{/* Basic Period Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Period Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Period Name:</span>
									<span className="text-sm text-gray-700">{period.name}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Start Date:</span>
									<span className="text-sm">
										{new Date(period.start_date).toLocaleDateString()}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">End Date:</span>
									<span className="text-sm">{new Date(period.end_date).toLocaleDateString()}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Duration:</span>
									<span className="text-sm">
										{(() => {
											const start = new Date(period.start_date);
											const end = new Date(period.end_date);
											const diffTime = Math.abs(end.getTime() - start.getTime());
											const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
											return `${diffDays} days`;
										})()}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Status:</span>
									<Badge variant={getStatusBadgeVariant(period.is_closed)}>
										{period.is_closed ? "Closed" : "Open"}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Status & Settings */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Settings className="mr-2 h-5 w-5" />
								Status & Settings
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-700">Active Status:</span>
									<Badge
										className={`${period.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"} border font-medium`}
									>
										{period.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
								{period.approval_status && (
									<div className="flex justify-between items-center">
										<span className="text-sm text-gray-700">Approval Status:</span>
										<Badge
											variant={
												period.approval_status === "active"
													? "default"
													: period.approval_status === "under_creation"
														? "secondary"
														: "outline"
											}
										>
											{period.approval_status.charAt(0).toUpperCase() +
												period.approval_status.slice(1).replace(/_/g, " ")}
										</Badge>
									</div>
								)}
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
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-600">Created Date</Label>
								<p className="text-sm">
									{typeof period.created_at === "string"
										? formatDateTime(period.created_at)
										: "N/A"}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
