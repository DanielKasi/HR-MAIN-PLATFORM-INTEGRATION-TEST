"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, FileText, Settings, CheckCircle, XCircle } from "lucide-react";
import type { IKeyResult, IKeyResultFormData } from "@/types/types.utils";
import { KEY_RESULTS_API } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function KeyResultViewPage() {
	const [keyResult, setKeyResults] = useState<IKeyResult | null>(null);
	const [loading, setLoading] = useState(true);

	const params = useParams();
	const router = useRouter();
	const keyResultId = parseInt(params.id as string);

	const fetchKeyResults = async () => {
		try {
			setLoading(true);
			const data = await KEY_RESULTS_API.getById({ keyResultId });
			setKeyResults(data);
		} catch (error) {
			toast.error("Failed to fetch concern details");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (keyResultId) {
			fetchKeyResults();
		}
	}, [keyResultId]);

	if (loading) {
		return <div className="p-6">Loading...</div>;
	}

	if (!keyResult) {
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
			<ApprovableInstancePageLayout instance={keyResult} onInstanceRefresh={fetchKeyResults}>
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
									<span className="text-sm text-gray-700">Title:</span>
									<span className="text-sm">{keyResult.title}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Description:</span>
									<span className="text-sm">{keyResult.description}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Target Value:</span>
									<span className="text-sm">{keyResult.target_value}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Duration:</span>
									<span className="text-sm">{keyResult.duration}</span>
								</div>
                                <div className="flex justify-between">
									<span className="text-sm text-gray-700">Progress Type:</span>
									<span className="text-sm">{keyResult.progress_type}</span>
								</div>
                                 <div className="flex justify-between">
									<span className="text-sm text-gray-700">Approval Status:</span>
									<span className="text-sm">{keyResult.approval_status}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Status:</span>
									<Badge variant={getStatusBadgeVariant(keyResult.is_active)}>
										{keyResult.is_active ? "Active" : "Inactive"}
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
									{typeof keyResult.created_at === "string"
										? formatDateTime(keyResult.created_at)
										: "N/A"}
								</span>
							</div>
							<div className="flex justify-between mt-5">
								<span className="text-sm font-medium text-gray-600">Updated Date:</span>
								<span className="text-sm">
									{typeof keyResult.updated_at === "string"
										? formatDateTime(keyResult.updated_at)
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
