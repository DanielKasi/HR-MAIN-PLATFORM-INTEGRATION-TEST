"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, FileText } from "lucide-react";
import type { IOffboardingStage } from "@/types/types.utils";
import { OffboardingStagesAPI } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function ConcernTypeViewPage() {
	const [stages, setStages] = useState<IOffboardingStage | null>(null);
	const [loading, setLoading] = useState(true);

	const params = useParams();
	const router = useRouter();
	const stageId = parseInt(params.id as string);

	const fetchStages = async () => {
		try {
			setLoading(true);
			const data = await OffboardingStagesAPI.getById(stageId);

			setStages(data);
		} catch (error) {
			toast.error("Failed to fetch stage details");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (stageId) {
			fetchStages();
		}
	}, [stageId]);

	if (loading) {
		return <div className="p-6">Loading...</div>;
	}

	if (!stages) {
		return <div className="p-6">Stages not found</div>;
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
					<div className="mt-4">
						<p className="text-muted-foreground">Stage Details</p>
						<h1 className="text-2xl font-semibold tracking-tight">{stages.stage_name}</h1>
					</div>
				</div>
			</div>
			<ApprovableInstancePageLayout instance={stages} onInstanceRefresh={fetchStages}>
				<div className="grid gap-6 md:grid-cols-2 mt-8">
					{/* Basic Period Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Stage Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Stage Name:</span>
									<span className="text-sm text-gray-700">{stages.stage_name}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700"> Stage Description:</span>
									<span className="text-sm">{stages.stage_description}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Status:</span>
									<Badge variant={getStatusBadgeVariant(stages.is_active)}>
										{stages.is_active ? "Active" : "Inactive"}
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
									{typeof stages.created_at === "string"
										? formatDateTime(stages.created_at)
										: "N/A"}
								</span>
							</div>
							<div className="flex justify-between mt-5">
								<span className="text-sm font-medium text-gray-600">Updated Date:</span>
								<span className="text-sm">
									{typeof stages.updated_at === "string"
										? formatDateTime(stages.updated_at)
										: "N/A"}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
