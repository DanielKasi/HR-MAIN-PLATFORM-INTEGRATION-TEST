// File: app/employees/document-requests/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, FileText, Settings, CheckCircle, XCircle } from "lucide-react";
import { IDocumentRequest } from "@/types/documents.types";
import { DOCUMENT_REQUESTS_API } from "@/lib/api/document-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function DocumentRequestViewPage() {
	const [request, setRequest] = useState<IDocumentRequest | null>(null);
	const [loading, setLoading] = useState(true);

	const params = useParams();
	const router = useRouter();
	const requestId = parseInt(params.id as string);

	const fetchRequest = async () => {
		try {
			setLoading(true);
			const data = await DOCUMENT_REQUESTS_API.getById({ requestId });
			setRequest(data);
		} catch (error) {
			toast.error("Failed to fetch request details");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (requestId) {
			fetchRequest();
		}
	}, [requestId]);

	if (loading) {
		return <div className="p-6">Loading...</div>;
	}

	if (!request) {
		return <div className="p-6">Request not found</div>;
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
						<p className="text-muted-foreground">Document Request Details</p>
					</div>
				</div>
			</div>
			<ApprovableInstancePageLayout instance={request} onInstanceRefresh={fetchRequest}>
				<div className="grid gap-6 md:grid-cols-2 mt-8">
					{/* Basic Request Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Request Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Document Type:</span>
									<span className="text-sm">{request.document_type}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Format:</span>
									<span className="text-sm">{request.document_format}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Description:</span>
									<span className="text-sm">{request.description}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-gray-700">Due Date:</span>
									<span className="text-sm">{request.due_date}</span>
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
									{typeof request.created_at === "string"
										? formatDateTime(request.created_at)
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
