"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERFORMANCE_CONCERN_TYPE_API } from "@/lib/api/performance.utils";
import type { IPerformanceConcernTypeFormData } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function PerformanceConcernTypeCreatePage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPerformanceConcernTypeFormData>({
		name: "",
		description: "",
	});
	const [saving, setSaving] = useState(false);

	const handleCreate = async () => {
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
			await PERFORMANCE_CONCERN_TYPE_API.create({
				data: { ...formData, institution: currentInstitution.id },
			});
			showSuccessToast("Performance concern type created successfully!");
			router.push("/admin/performance/concern-types");
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to create performance concern type" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href="/admin/performance/concern-types">
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
						Create Performance Concern Type
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
						onClick={() => router.push("/admin/performance/concern-types")}
					>
						Cancel
					</Button>
					<Button className="rounded-full w-full max-w-xs" onClick={handleCreate} disabled={saving}>
						{saving ? "Creating..." : "Create Concern Type"}
					</Button>
				</div>
			</div>
		</div>
	);
}
