"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERFORMANCE_CONCERN_TYPE_API } from "@/lib/api/performance.utils";
import type { IPerformanceConcernTypeFormData } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useSelector } from "react-redux";
import Link from "next/link";
import FixedLoader from "@/components/fixed-loader";

export default function PerformanceConcernTypeEditPage() {
	const router = useRouter();
	const { id } = useParams();
	const concernTypeId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPerformanceConcernTypeFormData>({
		name: "",
		description: "",
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !concernTypeId) return;
		const fetchConcernType = async () => {
			try {
				setLoading(true);
				const concernType = await PERFORMANCE_CONCERN_TYPE_API.getById({ concernTypeId });
				setFormData({
					name: concernType.name,
					description: concernType.description,
				});
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch performance concern type" });
				router.push("/admin/performance/concern-types");
			} finally {
				setLoading(false);
			}
		};
		fetchConcernType();
	}, [currentInstitution, concernTypeId, router]);

	const handleUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.name.trim()) {
			showErrorToast({ error: null, defaultMessage: "Name is required" });
			return;
		}
		try {
			setSaving(true);
			await PERFORMANCE_CONCERN_TYPE_API.update({ concernTypeId, data: formData });
			showSuccessToast("Performance concern type updated successfully!");
			router.push(`/admin/performance/concern-types/${concernTypeId}`);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to update performance concern type" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href={`/admin/performance/concern-types/${concernTypeId}`}>
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
						Edit Performance Concern Type
					</h1>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
					<div className="space-y-2">
						<Label>Name *</Label>
						<Input
							placeholder="e.g., Attendance Issues"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
				</div>
				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Description</Label>
					<Textarea
						placeholder="Describe the concern type..."
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
						onClick={() => router.push(`/admin/performance/concern-types/${concernTypeId}`)}
					>
						Cancel
					</Button>
					<Button className="rounded-full w-full max-w-xs" onClick={handleUpdate} disabled={saving}>
						{saving ? "Updating..." : "Update Concern Type"}
					</Button>
				</div>
			</div>
		</div>
	);
}
