"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { PERFORMANCE_IMPROVEMENT_PLAN_API } from "@/lib/api/performance.utils";
import type {
	IPerformanceConcern,
	IPerformanceImprovementPlan,
	IPIPSupportResource,
} from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import FixedLoader from "@/components/fixed-loader";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import Link from "next/link";
import { format } from "date-fns";
import { IObjective } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";
import { DocumentGenerationDialog } from "@/components/document-generation-dialog";

export default function PerformanceImprovementPlanDetailPage() {
	const router = useRouter();
	const { id } = useParams();
	const planId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [plan, setPlan] = useState<IPerformanceImprovementPlan | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const isMobile = useMobile();
	const [showDocumentDialog, setShowDocumentDialog] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !planId) return;
		loadPlan();
	}, [currentInstitution, planId, router]);

	const loadPlan = async () => {
		try {
			setLoading(true);
			const data = await PERFORMANCE_IMPROVEMENT_PLAN_API.getById({ pipId: planId });
			setPlan(data);
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: "Failed to fetch performance improvement plan",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		try {
			setDeleting(true);
			await PERFORMANCE_IMPROVEMENT_PLAN_API.delete({ pipId: planId });
			showSuccessToast("Performance improvement plan deleted successfully!");
			router.push("/performance/pip");
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: "Failed to delete performance improvement plan",
			});
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
		}
	};

	if (loading || !plan) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href="/performance/pip">
						<Button variant="outline" className="rounded-full aspect-square w-10 h-10">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
						PIP Details: {plan.employee.name || plan.employee.user?.fullname || "Unknown"}
					</h1>
				</div>
				<div className="flex gap-4">
					<Button
						variant="outline"
						className="rounded-xl"
						onClick={() => router.push(`/performance/pip/${planId}/edit`)}
					>
						Edit
					</Button>
					<Button
						variant="destructive"
						className="rounded-xl"
						onClick={() => setDeleteConfirmOpen(true)}
						disabled={deleting}
					>
						<Trash2 className="h-4 w-4 mr-2" /> Delete
					</Button>
					<Button
						variant="outline"
						size={isMobile ? "sm" : "default"}
						onClick={() => setShowDocumentDialog(true)}
						className="flex items-center gap-2 shadow-sm"
					>
						<FileText className="h-4 w-4" />
						<span className="hidden md:inline">Generate Document</span>
					</Button>
				</div>
			</div>

			<div className="space-y-4">
				<div>
					<label className="text-sm font-medium">Employee</label>
					<p>{plan.employee?.name || plan.employee.user?.fullname || "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Start Date</label>
					<p>{plan.start_date ? format(new Date(plan.start_date), "PPP") : "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">End Date</label>
					<p>{plan.end_date ? format(new Date(plan.end_date), "PPP") : "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Support Resources</label>
					<p>{plan.support_resources?.map((res) => res.name).join(", ") || "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Progress Notes</label>
					<p>{plan.progress_notes || "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Consequences</label>
					<p>{plan.consequences || "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Status</label>
					<p>{plan.status || "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Final Review Date</label>
					<p>
						{plan.final_review_date ? format(new Date(plan.final_review_date), "PPP") : "Unknown"}
					</p>
				</div>
				<div>
					<label className="text-sm font-medium">Outcome</label>
					<p>{plan.outcome || "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Objectives</label>
					<p>{plan.objectives?.map((obj) => obj.name).join(", ") || "Unknown"}</p>
				</div>
				<div>
					<label className="text-sm font-medium">Document Template</label>
					<p>{plan.document_template || "Unknown"}</p>
				</div>
			</div>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Performance Improvement Plan"
				description="Are you sure you want to delete this performance improvement plan? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>

			<DocumentGenerationDialog
				open={showDocumentDialog}
				onOpenChange={setShowDocumentDialog}
				contextId={Number(planId)}
				context="pip"
			/>
		</div>
	);
}
