"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PIP_SUPPORT_RESOURCE_API } from "@/lib/api/performance.utils";
import type { IPIPSupportResourceFormData } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useSelector } from "react-redux";
import Link from "next/link";
import FixedLoader from "@/components/fixed-loader";
import PIPSupportResourceTypeSearchableSelect from "../../../support-resource-types/_components/pip-support-resource-type-searchable-select";
import { PIPSupportResourceTypeCreateEditDialog } from "../../../support-resource-types/_components/pip-support-resource-type-create-edit-dialog";

export default function PIPSupportResourceEditPage() {
	const router = useRouter();
	const { id } = useParams();
	const resourceId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPIPSupportResourceFormData>({
		name: "",
		description: "",
		type: 0,
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [openTypeDialog, setOpenTypeDialog] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !resourceId) return;
		const fetchResource = async () => {
			try {
				setLoading(true);
				const resource = await PIP_SUPPORT_RESOURCE_API.getById({ resourceId });
				setFormData({
					name: resource.name,
					description: resource.description || "",
					type: resource.type?.id || 0,
				});
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch support resource" });
				router.push("/admin/performance/support-resources");
			} finally {
				setLoading(false);
			}
		};
		fetchResource();
	}, [currentInstitution, resourceId, router]);

	const handleUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.name.trim()) {
			showErrorToast({ error: null, defaultMessage: "Name is required" });
			return;
		}
		if (!formData.type) {
			showErrorToast({ error: null, defaultMessage: "Resource type is required" });
			return;
		}
		try {
			setSaving(true);
			await PIP_SUPPORT_RESOURCE_API.update({ resourceId, data: formData });
			showSuccessToast("Support resource updated successfully!");
			router.push(`/admin/performance/support-resources/${resourceId}`);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to update support resource" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href={`/admin/performance/support-resources/${resourceId}`}>
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">Edit Support Resource</h1>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
					<div className="space-y-2">
						<Label>Name *</Label>
						<Input
							placeholder="e.g., Performance Training Guide"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Label>Resource Type *</Label>
							<Button
								variant="ghost"
								size="sm"
								className="p-0 h-6 w-6"
								onClick={() => setOpenTypeDialog(true)}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<PIPSupportResourceTypeSearchableSelect
							value={formData.type ? [formData.type] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, type: values[0] ? Number(values[0]) : 0 })
							}
							placeholder="Select resource type..."
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
				</div>
				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Description</Label>
					<Textarea
						placeholder="Describe the resource..."
						value={formData.description}
						onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						className="rounded-2xl"
						rows={4}
					/>
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						className="rounded-full w-full max-w-xs"
						onClick={() => router.push(`/admin/performance/support-resources/${resourceId}`)}
					>
						Cancel
					</Button>
					<Button className="rounded-full w-full max-w-xs" onClick={handleUpdate} disabled={saving}>
						{saving ? "Updating..." : "Update Resource"}
					</Button>
				</div>
			</div>

			<PIPSupportResourceTypeCreateEditDialog
				open={openTypeDialog}
				onOpenChange={setOpenTypeDialog}
				selectedResourceType={null}
				onSuccess={(createdTypeId) => {
					if (createdTypeId) {
						setFormData((prev) => ({ ...prev, type: createdTypeId }));
					}
				}}
			/>
		</div>
	);
}
