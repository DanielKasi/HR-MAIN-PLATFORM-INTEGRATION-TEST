"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	FileText,
	Download,
	Edit,
	Calendar,
	User,
	CheckCircle,
	XCircle,
} from "lucide-react";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getDocumentTemplateDetails } from "@/lib/utils";
import { IDocumentTemplate } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function DocumentTemplateViewPage() {
	const { id } = useParams();
	const router = useRouter();
	const { toast } = useToast();

	const [documentTemplate, setDocumentTemplate] = useState<IDocumentTemplate | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			fetchDocumentTemplate();
		}
	}, [id]);

	const fetchDocumentTemplate = async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		try {
			const template = await getDocumentTemplateDetails(Number(id));
			if (!template) {
				toast({
					title: "Not Found",
					description: "The requested document template does not exist.",
					variant: "destructive",
				});
				router.push("/documents/templates");
			} else {
				setDocumentTemplate(template);
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch document template",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = () => {
		if (!documentTemplate) return;

		if (documentTemplate.file) {
			window.open(documentTemplate.file, "_blank");
		} else if (documentTemplate.content) {
			const blob = new Blob([documentTemplate.content], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${documentTemplate.name}.txt`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	};

	const getTemplateTypeColor = (type: string) => {
		switch (type) {
			case "pdf":
				return "bg-red-100 text-red-800";
			case "word":
				return "bg-blue-100 text-blue-800";
			case "text":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!documentTemplate) return null;

	return (
		<div className="max-w-full bg-white mt-4 pb-12 px-6">
			{/* Back Button */}
			<div className="flex items-center gap-3 mb-8">
				<Button
					size="sm"
					variant="outline"
					className="rounded-full aspect-square"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="mt-5 ml-3">
					<h1 className="text-3xl font-bold tracking-tight">Document Template Details</h1>
					<p className="text-muted-foreground mt-1">
						View and manage document template information
					</p>
				</div>
			</div>

			<ApprovableInstancePageLayout
				instance={documentTemplate}
				onInstanceRefresh={fetchDocumentTemplate}
			>
				{/* Main Content */}
				<div className="">
					{/* Document Template Details */}
					<div className="space-y-6">
						<Card className="shadow-sm border-0 ring-1 ring-border">
							<CardHeader className="pb-6">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-lg bg-primary/10">
											<FileText className="h-6 w-6 text-primary" />
										</div>
										<div>
											<CardTitle className="text-2xl">{documentTemplate.name}</CardTitle>
											<CardDescription className="text-base mt-1">
												Template for{" "}
												<span className="font-medium">
													{typeof documentTemplate.document_type === "object"
														? documentTemplate.document_type.name
														: "Unknown Type"}
												</span>
											</CardDescription>
										</div>
									</div>
									<div className="flex gap-2">
										<Badge
											className={`${getTemplateTypeColor(documentTemplate.template_type)} flex items-center gap-1`}
										>
											<FileText className="h-3 w-3" />
											{documentTemplate.template_type.toUpperCase()}
										</Badge>
										<Badge
											variant={documentTemplate.is_active ? "default" : "secondary"}
											className="flex items-center gap-1"
										>
											{documentTemplate.is_active ? (
												<CheckCircle className="h-3 w-3" />
											) : (
												<XCircle className="h-3 w-3" />
											)}
											{documentTemplate.is_active ? "Active" : "Inactive"}
										</Badge>
										{documentTemplate.approval_status_display && (
											<Badge
												className={
													documentTemplate.approval_status_display === "active"
														? "bg-green-100 text-green-800 border-green-200"
														: ["under_creation", "under_update", "under_deletion"].includes(
																	documentTemplate.approval_status_display,
															  )
															? "bg-yellow-100 text-yellow-800 border-yellow-200"
															: "bg-gray-100 text-gray-800 border-gray-200"
												}
											>
												{documentTemplate.approval_status_display === "active" && (
													<CheckCircle className="h-3 w-3 mr-1" />
												)}
												{documentTemplate.approval_status_display.charAt(0).toUpperCase() +
													documentTemplate.approval_status_display.slice(1)}
											</Badge>
										)}
									</div>
								</div>
							</CardHeader>

							<CardContent className="space-y-8">
								{/* Basic Information */}
								<div className="space-y-3">
									<h3 className="font-semibold text-lg">Basic Information</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="space-y-2">
											<label className="text-sm font-medium text-muted-foreground">
												Template Name
											</label>
											<p className="text-base font-medium">{documentTemplate.name}</p>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium text-muted-foreground">
												Template Type
											</label>
											<Badge className={getTemplateTypeColor(documentTemplate.template_type)}>
												{documentTemplate.template_type.toUpperCase()}
											</Badge>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium text-muted-foreground">Status </label>
											<Badge variant={documentTemplate.is_active ? "default" : "secondary"}>
												{documentTemplate.is_active ? "Active" : "Inactive"}
											</Badge>
										</div>
									</div>
								</div>

								<Separator />

								{/* File Information */}
								{documentTemplate.file && (
									<div className="space-y-3">
										<h3 className="font-semibold text-lg">Attached File</h3>
										<div className="bg-muted/30 rounded-lg p-4 border">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<FileText className="h-5 w-5 text-muted-foreground" />
													<span className="text-sm font-medium">Template File</span>
												</div>
												<Button
													size="sm"
													variant="outline"
													onClick={handleDownload}
													className="flex items-center gap-1"
												>
													<Download className="h-3 w-3" />
													Download
												</Button>
											</div>
										</div>
									</div>
								)}

								<Separator />

								{/* Metadata */}
								<div className="space-y-3">
									<h3 className="font-semibold text-lg">Metadata</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<div>
												<p className="font-medium text-sm">Created</p>
												<p className="text-xs text-muted-foreground">
													{new Date(documentTemplate.created_at).toLocaleDateString("en-US", {
														year: "numeric",
														month: "long",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<div>
												<p className="font-medium text-sm">Last Updated</p>
												<p className="text-xs text-muted-foreground">
													{new Date(documentTemplate.updated_at).toLocaleDateString("en-US", {
														year: "numeric",
														month: "long",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</p>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
