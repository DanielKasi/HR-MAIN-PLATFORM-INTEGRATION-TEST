"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, FileText, Settings, CheckCircle, XCircle } from "lucide-react";
import type { IPerformanceConcern } from "@/types/performance.types";
import { PERFORMANCE_CONCERN_API } from "@/lib/api/performance.utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function ConcernViewPage() {
	const [concern, setConcern] = useState<IPerformanceConcern | null>(null);
	const [loading, setLoading] = useState(true);

	const params = useParams();
	const router = useRouter();
	const concernId = parseInt(params.id as string);

	const fetchConcern = async () => {
		try {
			setLoading(true);
			const data = await PERFORMANCE_CONCERN_API.getById({ concernId });
			setConcern(data);
		} catch (error) {
			toast.error("Failed to fetch concern details");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (concernId) {
			fetchConcern();
		}
	}, [concernId]);

	if (loading) {
		return <div className="p-6">Loading...</div>;
	}

	if (!concern) {
		return <div className="p-6">Period not found</div>;
	}
	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const getStatusBadgeVariant = (isActive: boolean) => {
		return isActive ? "default" : "destructive";
	};

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
					<div>
						<p className="text-muted-foreground">Performance Concern Details</p>
					</div>
				</div>
			</div>
			<ApprovableInstancePageLayout instance={concern} onInstanceRefresh={fetchConcern}>
				<div className="grid gap-6 md:grid-cols-2 mt-8">
					{/* Basic Period Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Concern Type Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Description:</span>
									<span className="text-sm">{concern.description}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Category:</span>
									<span className="text-sm">{concern.category?.name}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Approval Status:</span>
									<span className="text-sm">{concern.approval_status}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Status:</span>
									<Badge variant={getStatusBadgeVariant(concern.is_active)}>
										{concern.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* System Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								System Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex justify-between">
								<span className="text-sm font-medium text-gray-600">Created Date:</span>
								<span className="text-sm">
									{typeof concern.created_at === "string"
										? formatDateTime(concern.created_at)
										: "Unknown"}
								</span>
							</div>
							<div className="flex justify-between mt-5">
								<span className="text-sm font-medium text-gray-600">Updated Date:</span>
								<span className="text-sm">
									{typeof concern.updated_at === "string"
										? formatDateTime(concern.updated_at)
										: "Unknown"}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
