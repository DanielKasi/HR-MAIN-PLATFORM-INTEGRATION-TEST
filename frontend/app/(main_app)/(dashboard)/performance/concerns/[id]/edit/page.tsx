"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERFORMANCE_CONCERN_API } from "@/lib/api/performance.utils";
import type { IPerformanceConcernFormData } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useSelector } from "react-redux";
import Link from "next/link";
import FixedLoader from "@/components/fixed-loader";
import PerformanceConcernTypeSearchableSelect from "../../../concern-types/_components/performance-concern-type-searchable-select";
import { PerformanceConcernTypeCreateEditDialog } from "../../../concern-types/_components/performance-concern-type-create-edit-dialog";

export default function PerformanceConcernEditPage() {
	const router = useRouter();
	const { id } = useParams();
	const concernId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPerformanceConcernFormData>({
		description: "",
		category: 0,
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [openCategoryDialog, setOpenCategoryDialog] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !concernId) return;
		const fetchConcern = async () => {
			try {
				setLoading(true);
				const concern = await PERFORMANCE_CONCERN_API.getById({ concernId });
				setFormData({
					description: concern.description,
					category: concern.category?.id || 0,
				});
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch performance concern" });
				router.push("/admin/performance/concerns");
			} finally {
				setLoading(false);
			}
		};
		fetchConcern();
	}, [currentInstitution, concernId, router]);

	const handleUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.description.trim()) {
			showErrorToast({ error: null, defaultMessage: "Description is required" });
			return;
		}
		if (!formData.category) {
			showErrorToast({ error: null, defaultMessage: "Category is required" });
			return;
		}
		try {
			setSaving(true);
			await PERFORMANCE_CONCERN_API.update({ concernId, data: formData });
			showSuccessToast("Performance concern updated successfully!");
			router.push(`/admin/performance/concerns/${concernId}`);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to update performance concern" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href={`/admin/performance/concerns/${concernId}`}>
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
						Edit Performance Concern
					</h1>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Label>Category *</Label>
							<Button
								variant="ghost"
								size="sm"
								className="p-0 h-6 w-6"
								onClick={() => setOpenCategoryDialog(true)}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<PerformanceConcernTypeSearchableSelect
							value={formData.category ? [formData.category] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, category: values[0] ? Number(values[0]) : 0 })
							}
							placeholder="Select category..."
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
				</div>
				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Description *</Label>
					<Textarea
						placeholder="Describe the concern..."
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
						onClick={() => router.push(`/admin/performance/concerns/${concernId}`)}
					>
						Cancel
					</Button>
					<Button className="rounded-full w-full max-w-xs" onClick={handleUpdate} disabled={saving}>
						{saving ? "Updating..." : "Update Concern"}
					</Button>
				</div>
			</div>

			<PerformanceConcernTypeCreateEditDialog
				open={openCategoryDialog}
				onOpenChange={setOpenCategoryDialog}
				selectedConcernType={null}
				onSuccess={(createdCategoryId) => {
					if (createdCategoryId) {
						setFormData((prev) => ({ ...prev, category: createdCategoryId }));
					}
				}}
			/>
		</div>
	);
}
