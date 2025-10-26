"use client";

import type { ApprovalDocument } from "@/types/approvals.types";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Users, Shield, CheckCircle2, Edit } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";
import { FixedLoader } from "@/platform/v1/components";
import { showErrorToast } from "@/lib/utils";
import { Separator } from "@/platform/v1/components";
import { APPROVAL_DOCUMENTS_API } from "@/lib/api/approvals/utils";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

export default function ApprovalDetailsPage() {
	const params = useParams();
	const router = useModuleNavigation();
	const approvalId = params.id as string;

	const [approvalDocument, setApprovalDocument] = useState<ApprovalDocument | null>(null);
	// const [levels, setLevels] = useState<ApprovalDocumentLevel[]>([])
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");

	useEffect(() => {
		loadApprovalDetails();
	}, [approvalId]);

	const loadApprovalDetails = async () => {
		try {
			setLoading(true);
			const [documentRes] = await Promise.all([
				APPROVAL_DOCUMENTS_API.fetchById({ id: Number.parseInt(approvalId) }),
			]);

			setApprovalDocument(documentRes);
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to load approval details" });
			setError(e?.message || "Failed to load approval details");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <FixedLoader />;
	}

	if (error || !approvalDocument) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">Approval Not Found</h3>
					<p className="text-muted-foreground mb-4">
						{error || "The requested approval document could not be found."}
					</p>
					<Link href="/admin/settings/approvals">
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Approvals
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-white rounded-xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div className="space-y-1">
					<div className="flex items-center gap-4">
						<Link href="/admin/settings/approvals">
							<Button variant="ghost" className="rounded-full aspect-square" size="sm">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-xl lg:text-2xl font-bold">Approval Details</h1>
					</div>
					<p className="text-muted-foreground">View approval workflow configuration and levels</p>
				</div>
				<Button onClick={() => router.push(`/admin/settings/approvals/${approvalId}/edit`)}>
					<Edit className="h-4 w-4 mr-2" />
					Edit Approval
				</Button>
			</div>

			{/* Document Overview */}
			<Card className="mb-6 ">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Approval Document
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium mb-2">Target</h4>
							<div className="flex items-center gap-2">
								<Badge variant="secondary">{approvalDocument.content_type_name}</Badge>
								{/* <span className="text-sm text-muted-foreground">
                  {approvalDocument.content_type_app}.{approvalDocument.content_type_model}
                </span> */}
							</div>
						</div>
					</div>

					{approvalDocument.description && (
						<div>
							<h4 className="font-medium mb-2">Description</h4>
							<p className="text-sm text-muted-foreground">{approvalDocument.description}</p>
						</div>
					)}

					<div>
						<h4 className="font-medium mb-2">Actions Requiring Approval</h4>
						<div className="flex flex-wrap gap-2">
							{approvalDocument.actions?.map((action) => (
								<Badge key={action.id} variant="outline">
									{action.name}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Approval Levels */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Approval Levels ({approvalDocument.levels.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{approvalDocument.levels.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p className="mb-2">No approval levels configured</p>
							<p className="text-sm">This approval document has no levels defined</p>
						</div>
					) : (
						<div className="space-y-4">
							{approvalDocument.levels.map((level, index) => (
								<Fragment key={index}>
									<div className="rounded-lg p-4">
										<div className="flex items-start justify-between mb-3">
											<div>
												<div className="flex items-center gap-2">
													<Badge variant="outline" className="text-xs">
														Level {index + 1}
													</Badge>
													<span className="font-medium">{level.name}</span>
												</div>
												{level.description && (
													<p className="text-sm text-muted-foreground mt-1">{level.description}</p>
												)}
											</div>
										</div>

										<div className="grid md:grid-cols-2 gap-4 text-sm">
											<div>
												<div className="flex items-center gap-1 mb-2">
													<CheckCircle2 className="h-4 w-4 text-green-600" />
													<span className="font-medium">Approver Groups</span>
												</div>
												{level.approvers_detail && level.approvers_detail.length > 0 ? (
													<div className="space-y-2">
														{level.approvers_detail.map((approver) => (
															<div
																key={approver.id}
																className="flex items-center justify-between p-2 bg-muted/50 rounded"
															>
																<span className="font-medium">{approver.approver_group.name}</span>
																<div className="text-xs text-muted-foreground">
																	{approver.approver_group.users_display.length} users,{" "}
																	{approver.approver_group.roles_display.length} roles
																</div>
															</div>
														))}
													</div>
												) : (
													<p className="text-muted-foreground">No approver groups assigned</p>
												)}
											</div>

											<div>
												<div className="flex items-center gap-1 mb-2">
													<Shield className="h-4 w-4 text-orange-600" />
													<span className="font-medium">Overrider Groups</span>
												</div>
												{level.overriders_detail && level.overriders_detail.length > 0 ? (
													<div className="space-y-2">
														{level.overriders_detail.map((overrider) => (
															<div
																key={overrider.id}
																className="flex items-center justify-between p-2 bg-muted/50 rounded"
															>
																<span className="font-medium">{overrider.approver_group.name}</span>
																<div className="text-xs text-muted-foreground">
																	{overrider.approver_group.users_display.length} users,{" "}
																	{overrider.approver_group.roles_display.length} roles
																</div>
															</div>
														))}
													</div>
												) : (
													<p className="text-muted-foreground">No overrider groups assigned</p>
												)}
											</div>
										</div>
									</div>
									{index !== approvalDocument.levels.length - 1 && <Separator />}
								</Fragment>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
