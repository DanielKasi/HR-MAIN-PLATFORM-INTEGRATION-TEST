"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	ArrowLeft,
	FileText,
	Trash2,
	Calendar,
	User,
	Target,
	FileCheck,
	AlertCircle,
	CheckCircle2,
	Clock,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

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

	const getStatusBadge = (status: string | undefined) => {
		const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
			active: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
			completed: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
			pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertCircle },
		};

		const statusKey = status?.toLowerCase() || "pending";
		const config = statusConfig[statusKey] || statusConfig.pending;
		const IconComponent = config.icon;

		return (
			<span
				className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}
			>
				<IconComponent className="h-3.5 w-3.5" />
				{status || "Unknown"}
			</span>
		);
	};

	if (loading || !plan) return <FixedLoader />;

	return (
		<div className="p-6 space-y-8 bg-white rounded-lg min-h-screen">
			<ApprovableInstancePageLayout instance={plan} onInstanceRefresh={loadPlan}>
				{/* Header - keeping as requested */}
				<div className="flex justify-between items-center mt-5">
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

				{/* Improved Details Section */}
				<div className="space-y-8 mt-6">
					{/* Employee Information Card */}
					<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-blue-100 rounded-lg">
								<User className="h-5 w-5 text-blue-600" />
							</div>
							<h2 className="text-lg font-semibold text-gray-900">Employee Information</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="text-sm font-medium text-gray-600 uppercase tracking-wide">
									Employee Name
								</label>
								<p className="mt-1 text-base font-medium text-gray-900">
									{plan.employee?.name || plan.employee.user?.fullname || "Unknown"}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600 uppercase tracking-wide">
									Status
								</label>
								<div className="mt-2">{getStatusBadge(plan.status)}</div>
							</div>
						</div>
					</div>

					{/* Timeline Information */}
					<div className="bg-white rounded-xl p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 bg-orange-100 rounded-lg">
								<Calendar className="h-5 w-5 text-orange-600" />
							</div>
							<h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="text-center md:text-left">
								<label className="text-sm font-medium text-gray-600 uppercase tracking-wide">
									Start Date
								</label>
								<p className="mt-2 text-base font-semibold text-gray-900">
									{plan.start_date
										? format(new Date(plan.start_date), "MMM dd, yyyy")
										: "Not specified"}
								</p>
							</div>
							<div className="text-center md:text-left">
								<label className="text-sm font-medium text-gray-600 uppercase tracking-wide">
									End Date
								</label>
								<p className="mt-2 text-base font-semibold text-gray-900">
									{plan.end_date
										? format(new Date(plan.end_date), "MMM dd, yyyy")
										: "Not specified"}
								</p>
							</div>
							<div className="text-center md:text-left">
								<label className="text-sm font-medium text-gray-600 uppercase tracking-wide">
									Final Review
								</label>
								<p className="mt-2 text-base font-semibold text-gray-900">
									{plan.final_review_date
										? format(new Date(plan.final_review_date), "MMM dd, yyyy")
										: "Not scheduled"}
								</p>
							</div>
						</div>
					</div>

					{/* Objectives */}
					<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 bg-green-100 rounded-lg">
								<Target className="h-5 w-5 text-green-600" />
							</div>
							<h2 className="text-lg font-semibold text-gray-900">Objectives</h2>
						</div>
						<div className="space-y-3">
							{plan.objectives && plan.objectives.length > 0 ? (
								plan.objectives.map((obj, index) => (
									<div
										key={index}
										className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
									>
										<div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center justify-center">
											{index + 1}
										</div>
										<p className="text-gray-900 font-medium">{obj.name}</p>
									</div>
								))
							) : (
								<p className="text-gray-500 italic">No objectives specified</p>
							)}
						</div>
					</div>

					{/* Support & Resources */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<div className="p-2 bg-purple-100 rounded-lg">
									<FileCheck className="h-5 w-5 text-purple-600" />
								</div>
								<h2 className="text-lg font-semibold text-gray-900">Support Resources</h2>
							</div>
							<div className="space-y-2">
								{plan.support_resources && plan.support_resources.length > 0 ? (
									plan.support_resources.map((resource, index) => (
										<div
											key={index}
											className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg"
										>
											<div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
											<p className="text-gray-900">{resource.name}</p>
										</div>
									))
								) : (
									<p className="text-gray-500 italic">No support resources specified</p>
								)}
							</div>
						</div>

						<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<div className="p-2 bg-amber-100 rounded-lg">
									<AlertCircle className="h-5 w-5 text-amber-600" />
								</div>
								<h2 className="text-lg font-semibold text-gray-900">Consequences</h2>
							</div>
							<div className="bg-amber-50 rounded-lg p-4">
								<p className="text-gray-900">{plan.consequences || "No consequences specified"}</p>
							</div>
						</div>
					</div>

					{/* Progress & Outcome */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="bg-white border border-gray-200 rounded-xl p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Progress Notes</h2>
							<div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
								<p className="text-gray-900 whitespace-pre-wrap">
									{plan.progress_notes || "No progress notes available"}
								</p>
							</div>
						</div>

						<div className="bg-white border border-gray-200 rounded-xl p-6 ">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Final Outcome</h2>
							<div className="bg-gray-50  rounded-lg p-4 min-h-[100px]">
								<p className="text-gray-900 whitespace-pre-wrap">
									{plan.outcome || "Outcome not yet determined"}
								</p>
							</div>
						</div>
					</div>

					{/* Document Template */}
					<div className="bg-white border border-gray-200 rounded-xl p-6 ">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">Document Template</h2>
						<div className="bg-blue-50 rounded-lg p-4">
							<p className="text-gray-900 font-mono text-sm">
								{plan.document_template || "No document template specified"}
							</p>
						</div>
					</div>
				</div>
			</ApprovableInstancePageLayout>

			{/* Dialogs - keeping as requested */}
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
				context={{ type: "pip", defaultTemplate: plan.document_template }}
			/>
		</div>
	);
}
