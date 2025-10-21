"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TerminationInitiationsAPI } from "@/lib/utils";
import { ITermination } from "@/types/types.utils";
import { MAIN_DOMAIN_URL } from "@/constants";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import FixedLoader from "@/components/fixed-loader";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const STATUS_STYLES = {
	submitted: "bg-blue-100 text-blue-800 hover:bg-blue-200",
	under_review: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
	approved: "bg-green-100 text-green-800 hover:bg-green-200",
	rejected: "bg-red-100 text-red-800 hover:bg-red-200",
};

const STATUS_LABELS = {
	submitted: "Submitted",
	under_review: "Under Review",
	approved: "Approved",
	rejected: "Rejected",
};

const SEPARATION_STATUS_STYLES = {
	planned: "bg-blue-100 text-blue-800 hover:bg-blue-200",
	completed: "bg-green-100 text-green-800 hover:bg-green-200",
	cancelled: "bg-red-100 text-red-800 hover:bg-red-200",
};

const SEPARATION_STATUS_LABELS = {
	planned: "Planned",
	completed: "Completed",
	cancelled: "Cancelled",
};

export default function TerminationInitiationDetailsPage() {
	const params = useParams();
	const terminationId = params.id as string;
	const [termination, setTermination] = useState<ITermination | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		fetchTermination();
	}, [params.id]);

	const fetchTermination = async () => {
		try {
			const data = await TerminationInitiationsAPI.getById(parseInt(terminationId));

			setTermination(data);
		} catch (error) {
			toast.error("Failed to fetch termination details");
		}
		setLoading(false);
	};

	if (loading) {
		return <FixedLoader />;
	}

	if (!termination) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-64">
					<div className="text-lg">Termination not found</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full p-4 bg-white rounded-xl">
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center space-x-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/off-boarding/terminations")}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Termination Details</h1>
					</div>
				</div>
				{termination.termination_letter && (
					<Button
						variant="outline"
						onClick={() =>
							window.open(
								process.env.NEXT_PUBLIC_BASE_URL ||
									`${MAIN_DOMAIN_URL}` + termination.termination_letter!,
								"_blank",
							)
						}
					>
						<FileText className="h-4 w-4 mr-2" />
						View Termination Letter
					</Button>
				)}
			</div>

			<ApprovableInstancePageLayout instance={termination} onInstanceRefresh={fetchTermination}>
				<div className="grid gap-6">
					<Card className="shadow-none border-none">
						<CardHeader>
							<CardTitle>Employee Information</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Employee</dt>
									<dd className="text-base">{termination.separation.employee?.name}</dd>
								</div>
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Initiated By</dt>
									<dd className="text-base">
										{termination.separation.initiated_by?.user.fullname || ""}
									</dd>
								</div>
							</dl>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Termination Details</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Status</dt>
									<dd className="text-base">
										<Badge
											variant="secondary"
											className={STATUS_STYLES[termination.initiation_status]}
										>
											{STATUS_LABELS[termination.initiation_status]}
										</Badge>
									</dd>
								</div>
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Separation Status</dt>
									<dd className="text-base">
										<Badge
											variant="secondary"
											className={SEPARATION_STATUS_STYLES[termination.separation.separation_status]}
										>
											{SEPARATION_STATUS_LABELS[termination.separation.separation_status]}
										</Badge>
									</dd>
								</div>
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Last Working Day</dt>
									<dd className="text-base">
										{new Date(termination.last_working_day).toLocaleDateString()}
									</dd>
								</div>
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Effective Date</dt>
									<dd className="text-base">
										{new Date(termination.separation.effective_date).toLocaleDateString()}
									</dd>
								</div>
								<div className="col-span-2">
									<dt className="text-sm font-medium text-muted-foreground">Comments</dt>
									<dd className="text-base mt-1">{termination.comments}</dd>
								</div>
								{termination.separation.additional_notes && (
									<div className="col-span-2">
										<dt className="text-sm font-medium text-muted-foreground">Additional Notes</dt>
										<dd className="text-base mt-1">{termination.separation.additional_notes}</dd>
									</div>
								)}
							</dl>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Timeline</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Created At</dt>
									<dd className="text-base">{new Date(termination.created_at).toLocaleString()}</dd>
								</div>
								<div>
									<dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
									<dd className="text-base">{new Date(termination.updated_at).toLocaleString()}</dd>
								</div>
							</dl>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
