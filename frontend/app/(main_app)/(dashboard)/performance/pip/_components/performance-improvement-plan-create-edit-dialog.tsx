"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PERFORMANCE_IMPROVEMENT_PLAN_API } from "@/lib/api/performance.utils";
import type {
	IPerformanceConcern,
	IPerformanceImprovementPlan,
	IPerformanceImprovementPlanFormData,
	IPIPSupportResource,
} from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import PerformanceConcernSearchableSelect from "../../concerns/_components/performance-concern-searchable-select";
import PIPSupportResourceSearchableSelect from "../[id]/support-resource-searchable-select";
import ObjectiveSearchableSelect from "@/components/selects/objective-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { IObjective } from "@/types/types.utils";
import DocumentTemplateSearchableSelect from "@/components/selects/document-template-searchable-select";

interface PerformanceImprovementPlanCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedPlan: IPerformanceImprovementPlan | null;
	onSuccess: () => void;
}

export function PerformanceImprovementPlanCreateEditDialog({
	open,
	onOpenChange,
	selectedPlan,
	onSuccess,
}: PerformanceImprovementPlanCreateEditDialogProps) {
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

	useEffect(() => {
		if (selectedPlan) {
			setFormData({
				employee: selectedPlan.employee?.id || 0,
				start_date: selectedPlan.start_date || "",
				end_date: selectedPlan.end_date || "",
				issues: (selectedPlan.issues as IPerformanceConcern[])?.map((issue) => issue.id) || [],
				support_resources:
					(selectedPlan.support_resources as IPIPSupportResource[])?.map((res) => res.id) || [],
				progress_notes: selectedPlan.progress_notes || "",
				consequences: selectedPlan.consequences || "",
				status: selectedPlan.status || "draft",
				final_review_date: selectedPlan.final_review_date || "",
				outcome: selectedPlan.outcome || "",
				objectives: (selectedPlan.objectives as IObjective[])?.map((obj) => obj.id) || [],
				document_template: selectedPlan.document_template || null,
			});
		} else {
			resetForm();
		}
	}, [selectedPlan]);

	const resetForm = () => {
		setFormData({
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
	};

	const handleSubmit = async () => {
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
			if (selectedPlan) {
				await PERFORMANCE_IMPROVEMENT_PLAN_API.update({
					pipId: selectedPlan.id,
					data: formData,
				});
				showSuccessToast("Performance improvement plan updated successfully!");
			} else {
				await PERFORMANCE_IMPROVEMENT_PLAN_API.create({ data: formData });
				showSuccessToast("Performance improvement plan created successfully!");
			}
			resetForm();
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: selectedPlan
					? "Failed to update performance improvement plan"
					: "Failed to create performance improvement plan",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>
						{selectedPlan
							? "Edit Performance Improvement Plan"
							: "Create Performance Improvement Plan"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 max-h-[70svh] overflow-y-auto px-4 py-6">
					<div className="grid grid-cols-1 md:grid-cols-2 items-end gap-4">
						<div className="space-y-2">
							<Label>Employee *</Label>
							<EmployeeSearchableSelect
								value={formData.employee ? [formData.employee] : []}
								onValueChange={(values) =>
									setFormData({ ...formData, employee: values[0] ? Number(values[0]) : 0 })
								}
								placeholder="Select employee..."
								triggerClassName="h-10 rounded-2xl text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label>Start Date *</Label>
							<Input
								type="date"
								value={formData.start_date}
								onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
								className="h-10 rounded-2xl text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label>End Date</Label>
							<Input
								type="date"
								value={formData.end_date}
								onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
								className="h-10 rounded-2xl text-sm"
							/>
						</div>
						{selectedPlan && (
							<div className="space-y-2">
								<Label>Status</Label>
								<Select
									value={formData.status}
									onValueChange={(value) => setFormData({ ...formData, status: value as any })}
								>
									<SelectTrigger className="h-10 rounded-2xl text-sm">
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
											<SelectItem key={status} value={status} className="capitalize">
												{status.replace("_", " ").toUpperCase()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div className="space-y-2">
							<Label>Issues</Label>
							<PerformanceConcernSearchableSelect
								value={formData.issues}
								onValueChange={(values) => setFormData({ ...formData, issues: values.map(Number) })}
								placeholder="Select issues..."
								triggerClassName="h-10 rounded-2xl text-sm"
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
								triggerClassName="h-10 rounded-2xl text-sm"
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
								triggerClassName="h-10 rounded-2xl text-sm"
								multiple
							/>
						</div>
						<div className="space-y-2">
							<Label>Document template</Label>
							<DocumentTemplateSearchableSelect
								value={[formData.document_template || ""]}
								onValueChange={(values) => {
									if (values.length) {
										setFormData({ ...formData, document_template: Number(values[0]) });
									}
								}}
								placeholder="Select template..."
								triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
							/>
						</div>
						<div className="space-y-2">
							<Label>Final Review Date</Label>
							<Input
								type="date"
								value={formData.final_review_date}
								onChange={(e) => setFormData({ ...formData, final_review_date: e.target.value })}
								className="h-10 rounded-2xl text-sm"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label>Progress Notes</Label>
						<Textarea
							placeholder="Enter progress notes..."
							value={formData.progress_notes}
							onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
							className="rounded-2xl"
							rows={4}
						/>
					</div>
					<div className="space-y-2">
						<Label>Consequences</Label>
						<Textarea
							placeholder="Enter consequences..."
							value={formData.consequences}
							onChange={(e) => setFormData({ ...formData, consequences: e.target.value })}
							className="rounded-2xl"
							rows={4}
						/>
					</div>
					<div className="space-y-2">
						<Label>Outcome</Label>
						<Textarea
							placeholder="Enter outcome..."
							value={formData.outcome}
							onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
							className="rounded-2xl"
							rows={4}
						/>
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						className="rounded-full"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						Cancel
					</Button>
					<Button className="rounded-full" onClick={handleSubmit} disabled={saving}>
						{saving
							? selectedPlan
								? "Updating..."
								: "Creating..."
							: selectedPlan
								? "Update"
								: "Create"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
