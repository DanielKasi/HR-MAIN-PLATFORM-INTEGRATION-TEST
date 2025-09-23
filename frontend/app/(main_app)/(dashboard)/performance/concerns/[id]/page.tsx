"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PERFORMANCE_CONCERN_API } from "@/lib/api/performance.utils";
import type { IPerformanceConcern } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import FixedLoader from "@/components/fixed-loader";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import Link from "next/link";

export default function PerformanceConcernDetailPage() {
	const router = useRouter();
	const { id } = useParams();
	const concernId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [concern, setConcern] = useState<IPerformanceConcern | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !concernId) return;
		const loadConcern = async () => {
			try {
				setLoading(true);
				const data = await PERFORMANCE_CONCERN_API.getById({ concernId });
				setConcern(data);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch performance concern" });
				router.push("/admin/performance/concerns");
			} finally {
				setLoading(false);
			}
		};
		loadConcern();
	}, [currentInstitution, concernId, router]);

	const handleDelete = async () => {
		try {
			setDeleting(true);
			await PERFORMANCE_CONCERN_API.delete({ concernId });
			showSuccessToast("Performance concern deleted successfully!");
			router.push("/admin/performance/concerns");
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete performance concern" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
		}
	};

	if (loading || !concern) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href="/admin/performance/concerns">
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
						Concern Details:{" "}
						{concern.description?.substring(0, 30) +
							(concern.description?.length > 30 ? "..." : "")}
					</h1>
				</div>
				<div className="flex gap-4">
					<Button
						variant="outline"
						className="rounded-xl"
						onClick={() => router.push(`/admin/performance/concerns/edit/${concernId}`)}
					>
						Edit
					</Button>
					<Button
						variant="destructive"
						className="rounded-xl"
						onClick={() => setDeleteConfirmOpen(true)}
						disabled={deleting}
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete
					</Button>
				</div>
			</div>

			<ApprovableDialog
				isOpen={true}
				onOpenChange={(open) => !open && router.push("/admin/performance/concerns")}
				title={`Concern Details: ${concern.description?.substring(0, 30) + (concern.description?.length > 30 ? "..." : "")}`}
				description="View the details for this performance concern."
				onRefresh={() => router.refresh()}
			>
				<div className="space-y-4 overflow-y-auto max-h-[60svh]">
					<div>
						<label className="text-sm font-medium">Description</label>
						<p>{concern.description || "Unknown"}</p>
					</div>
					<div>
						<label className="text-sm font-medium">Category</label>
						<p>{concern.category?.name || "Unknown"}</p>
					</div>
					<div>
						<label className="text-sm font-medium">Approval Status</label>
						<p>{concern.approval_status || "Unknown"}</p>
					</div>
				</div>
			</ApprovableDialog>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Performance Concern"
				description="Are you sure you want to delete this performance concern? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
