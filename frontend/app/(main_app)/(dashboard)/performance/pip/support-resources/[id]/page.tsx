"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PIP_SUPPORT_RESOURCE_API } from "@/lib/api/performance.utils";
import type { IPIPSupportResource } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import FixedLoader from "@/components/fixed-loader";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import Link from "next/link";

export default function PIPSupportResourceDetailPage() {
	const router = useRouter();
	const { id } = useParams();
	const resourceId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [resource, setResource] = useState<IPIPSupportResource | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !resourceId) return;
		const loadResource = async () => {
			try {
				setLoading(true);
				const data = await PIP_SUPPORT_RESOURCE_API.getById({ resourceId });
				setResource(data);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch support resource" });
				router.push("/admin/performance/support-resources");
			} finally {
				setLoading(false);
			}
		};
		loadResource();
	}, [currentInstitution, resourceId, router]);

	const handleDelete = async () => {
		try {
			setDeleting(true);
			await PIP_SUPPORT_RESOURCE_API.delete({ resourceId });
			showSuccessToast("Support resource deleted successfully!");
			router.push("/admin/performance/support-resources");
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete support resource" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
		}
	};

	if (loading || !resource) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href="/admin/performance/support-resources">
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
						Resource Details: {resource.name}
					</h1>
				</div>
				<div className="flex gap-4">
					<Button
						variant="outline"
						className="rounded-xl"
						onClick={() => router.push(`/admin/performance/support-resources/edit/${resourceId}`)}
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
				onOpenChange={(open) => !open && router.push("/admin/performance/support-resources")}
				title={`Resource Details: ${resource.name}`}
				description="View the details for this support resource."
				onRefresh={() => router.refresh()}
			>
				<div className="space-y-4 overflow-y-auto max-h-[60svh]">
					<div>
						<label className="text-sm font-medium">Name</label>
						<p>{resource.name}</p>
					</div>
					<div>
						<label className="text-sm font-medium">Resource Type</label>
						<p>{resource.type?.name || "Unknown"}</p>
					</div>
					<div>
						<label className="text-sm font-medium">Description</label>
						<p>{resource.description || "Unknown"}</p>
					</div>
					<div>
						<label className="text-sm font-medium">Approval Status</label>
						<p>{resource.approval_status || "Unknown"}</p>
					</div>
				</div>
			</ApprovableDialog>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Support Resource"
				description="Are you sure you want to delete this support resource? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
