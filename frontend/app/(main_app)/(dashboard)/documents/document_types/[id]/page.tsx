"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Building2, CheckCircle, XCircle } from "lucide-react";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getDocumentTypeDetails } from "@/lib/utils";
import { IDocumentType } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function DocumentTypeViewPage() {
	const { id } = useParams();
	const router = useRouter();
	const { toast } = useToast();

	const [documentType, setDocumentType] = useState<IDocumentType | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			fetchDocumentType();
		}
	}, [id]);

	const fetchDocumentType = async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		try {
			const doc = await getDocumentTypeDetails(Number(id));
			if (!doc) {
				toast({
					title: "Not Found",
					description: "The requested document type does not exist.",
					variant: "destructive",
				});
				router.push("/document-types");
			} else {
				setDocumentType(doc);
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch document type",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!documentType) return null;

	return (
		<div className={`max-w-full bg-white mt-4 pb-12`}>
			{/* Back Button */}
			<div className="flex items-center gap-3 mb-8 px-6">
				<Button
					size="sm"
					variant="outline"
					className="rounded-full aspect-square ml-4"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="mt-5 ml-3">
					<h1 className="text-3xl font-bold tracking-tight">Document Type Details</h1>
					<p className="text-muted-foreground mt-1">View and manage document type information</p>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={documentType} onInstanceRefresh={fetchDocumentType}>
				<Card className="shadow-none border-none ring-1 ring-border mx-10">
					<CardHeader className="pb-6">
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-primary/10">
									<FileText className="h-6 w-6 text-primary" />
								</div>
								<div>
									<CardTitle className="text-2xl">{documentType.name}</CardTitle>
									<CardDescription className="text-base mt-1">
										Document type code:{" "}
										<span className="font-mono font-medium">{documentType.code}</span>
									</CardDescription>
								</div>
							</div>
							<div className="flex gap-2">
								<Badge
									variant={documentType.is_active ? "default" : "secondary"}
									className="flex items-center gap-1"
								>
									{documentType.is_active ? (
										<CheckCircle className="h-3 w-3" />
									) : (
										<XCircle className="h-3 w-3" />
									)}
									{documentType.is_active ? "Active" : "Inactive"}
								</Badge>
								{documentType.approval_status && (
									<Badge
										className={
											documentType.approval_status === "active"
												? "bg-green-100 text-green-800 border-green-200"
												: ["under_creation", "under_update", "under_deletion"].includes(
															documentType.approval_status,
													  )
													? "bg-yellow-100 text-yellow-800 border-yellow-200"
													: "bg-gray-100 text-gray-800 border-gray-200"
										}
									>
										{documentType.approval_status === "active" && (
											<CheckCircle className="h-3 w-3 mr-1" />
										)}
										{documentType.approval_status.charAt(0).toUpperCase() +
											documentType.approval_status.slice(1)}
									</Badge>
								)}
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-8">
						{/* Description Section */}
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-lg">Description</h3>
							</div>
							<div className="bg-muted/30 rounded-lg p-4 border">
								<p className="text-sm leading-relaxed">
									{documentType.description || "No description provided for this document type."}
								</p>
							</div>
						</div>

						<Separator />

						{/* Status Information */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-3">
								<h3 className="font-semibold text-lg flex items-center gap-2">
									Status Information
								</h3>
								<div className="space-y-4">
									<div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
										<span className="text-sm font-medium text-muted-foreground">Status</span>
										<Badge variant={documentType.is_active ? "default" : "secondary"}>
											{documentType.is_active ? "Active" : "Inactive"}
										</Badge>
									</div>
									<div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
										<span className="text-sm font-medium text-muted-foreground">
											Approval Status
										</span>
										<span className="font-medium">{documentType.approval_status}</span>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</ApprovableInstancePageLayout>
		</div>
	);
}
