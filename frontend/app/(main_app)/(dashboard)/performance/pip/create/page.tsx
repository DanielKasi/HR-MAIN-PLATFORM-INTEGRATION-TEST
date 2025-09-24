"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERFORMANCE_IMPROVEMENT_PLAN_API } from "@/lib/api/performance.utils";
import type { IPerformanceImprovementPlanFormData } from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import PerformanceConcernSearchableSelect from "../../concerns/_components/performance-concern-searchable-select";
import PIPSupportResourceSearchableSelect from "../[id]/support-resource-searchable-select";
import { ObjectiveSearchableSelect } from "@/components/selects/objective-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function PerformanceImprovementPlanCreatePage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPerformanceImprovementPlanFormData>({
		employee: 0,
		start_date: format(new Date(), "yyyy-MM-dd"),
		end_date: "",
		issues: [],
		support_resources: [],
		progress_notes: "",
		consequences: "",
		status: "draft",
		final_review_date: "",
		outcome: "",
		objectives: [],
		document_template: null,
	});
	const [saving, setSaving] = useState(false);

	const handleCreate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.employee) {
			showErrorToast({ error: null, defaultMessage: "Employee is required" });
			return;
		}
		if (!formData.start_date) {
			showErrorToast({ error: null, defaultMessage: "Start date is required" });
			return;
		}
		try {
			setSaving(true);
			await PERFORMANCE_IMPROVEMENT_PLAN_API.create({ data: formData });
			showSuccessToast("Performance improvement plan created successfully!");
			router.push("/admin/performance/performance-improvement-plans");
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: "Failed to create performance improvement plan",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href="/admin/performance/performance-improvement-plans">
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
						Create Performance Improvement Plan
					</h1>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
					<div className="space-y-2">
						<Label>Employee *</Label>
						<EmployeeSearchableSelect
							value={formData.employee ? [formData.employee] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, employee: values[0] ? Number(values[0]) : 0 })
							}
							placeholder="Select employee..."
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<Label>Start Date *</Label>
						<Input
							type="date"
							value={formData.start_date}
							onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
							className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<Label>End Date</Label>
						<Input
							type="date"
							value={formData.end_date}
							onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
							className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<Label>Status</Label>
						<Select
							value={formData.status}
							onValueChange={(value) => setFormData({ ...formData, status: value as any })}
						>
							<SelectTrigger className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base">
								<SelectValue placeholder="Select status..." />
							</SelectTrigger>
							<SelectContent>
								{[
									"draft",
									"active",
									"under_review",
									"completed_success",
									"completed_failure",
									"terminated",
								].map((status) => (
									<SelectItem key={status} value={status}>
										{status.replace("_", " ").toUpperCase()}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Issues</Label>
						<PerformanceConcernSearchableSelect
							value={formData.issues}
							onValueChange={(values) => setFormData({ ...formData, issues: values.map(Number) })}
							placeholder="Select issues..."
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
							multiple
						/>
					</div>
					<div className="space-y-2">
						<Label>Support Resources</Label>
						<PIPSupportResourceSearchableSelect
							value={formData.support_resources}
							onValueChange={(values) =>
								setFormData({ ...formData, support_resources: values.map(Number) })
							}
							placeholder="Select support resources..."
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
							multiple
						/>
					</div>
					<div className="space-y-2">
						<Label>Objectives</Label>
						<ObjectiveSearchableSelect
							value={formData.objectives}
							onValueChange={(values) =>
								setFormData({ ...formData, objectives: values.map(Number) })
							}
							placeholder="Select objectives..."
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
							multiple
						/>
					</div>
					<div className="space-y-2">
						<Label>Final Review Date</Label>
						<Input
							type="date"
							value={formData.final_review_date}
							onChange={(e) => setFormData({ ...formData, final_review_date: e.target.value })}
							className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
				</div>
				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Progress Notes</Label>
					<Textarea
						placeholder="Enter progress notes..."
						value={formData.progress_notes}
						onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
						className="rounded-2xl"
						rows={4}
					/>
				</div>
				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Consequences</Label>
					<Textarea
						placeholder="Enter consequences..."
						value={formData.consequences}
						onChange={(e) => setFormData({ ...formData, consequences: e.target.value })}
						className="rounded-2xl"
						rows={4}
					/>
				</div>
				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Outcome</Label>
					<Textarea
						placeholder="Enter outcome..."
						value={formData.outcome}
						onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
						className="rounded-2xl"
						rows={4}
					/>
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						className="rounded-full w-full max-w-xs"
						onClick={() => router.push("/admin/performance/performance-improvement-plans")}
					>
						Cancel
					</Button>
					<Button className="rounded-full w-full max-w-xs" onClick={handleCreate} disabled={saving}>
						{saving ? "Creating..." : "Create PIP"}
					</Button>
				</div>
			</div>
		</div>
	);
}
