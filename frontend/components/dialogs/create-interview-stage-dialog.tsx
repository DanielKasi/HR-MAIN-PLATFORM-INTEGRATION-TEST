"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2, GripVertical } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";
import { createInterviewStage } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import type { IFeedbackField, IInterviewStageFormData } from "@/types/types.utils";
import { FeedbackFieldsModal } from "./feedback-fields-modal";
import { Settings } from "lucide-react";

interface CreateInterviewStageDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	jobPositionId: number;
	jobPositionName?: string;
	existingStagesCount?: number;
	onSuccess?: () => void;
	triggerButton?: React.ReactNode;
	showTrigger?: boolean;
}

export function CreateInterviewStageDialog({
	isOpen,
	onOpenChange,
	jobPositionId,
	jobPositionName,
	existingStagesCount = 0,
	onSuccess,
	triggerButton,
	showTrigger = true,
}: CreateInterviewStageDialogProps) {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [isCreating, setIsCreating] = useState(false);
	const [formData, setFormData] = useState<IInterviewStageFormData>({
		name: "",
		level: 1,
		interviewers: [],
		job_position_advert: jobPositionId,
		feedback_fields: [],
	});
	const [errors, setErrors] = useState<any>({});
	const [isFeedbackFieldsModalOpen, setIsFeedbackFieldsModalOpen] = useState(false);

	useEffect(() => {
		if (isOpen) {
			const nextLevel = existingStagesCount + 1;
			setFormData((prev) => ({
				...prev,
				level: nextLevel,
				job_position_advert: jobPositionId,
			}));
			setErrors({});
		}
	}, [isOpen, existingStagesCount, jobPositionId]);

	const updateFormData = (field: string, value: any) => {
		console.log("Updating field:", field, "with value:", value);
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev: any) => ({ ...prev, [field]: undefined }));
		}
	};

	const removeFeedbackField = (index: number) => {
		const updatedFields = (formData.feedback_fields || []).filter((_, i) => i !== index);
		updateFormData("feedback_fields", updatedFields);
	};

	const updateFeedbackField = (index: number, field: string, value: any) => {
		const updatedFields = [...(formData.feedback_fields || [])];
		updatedFields[index] = { ...updatedFields[index], [field]: value };
		updateFormData("feedback_fields", updatedFields);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedInstitution) {
			toast.error("Missing organization information");
			return;
		}

		const newErrors: any = {};

		if (!formData.name.trim()) {
			newErrors.name = "Stage name is required";
		}
		if (!formData.interviewers || formData.interviewers.length === 0) {
			newErrors.interviewers = "Please select at least one interviewer";
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		setIsCreating(true);

		try {
			console.log("Full formData being sent to API:", formData);
			console.log("Feedback fields specifically:", formData.feedback_fields);
			const result = await createInterviewStage({
				institutionId: selectedInstitution.id,
				stageData: formData,
			});

			if (result) {
				setFormData({
					name: "",
					level: existingStagesCount + 1,
					interviewers: [],
					job_position_advert: jobPositionId,
					feedback_fields: [],
				});
				setErrors({});
				onOpenChange(false);
				toast.success("Interview stage created successfully!");

				if (onSuccess) {
					onSuccess();
				}
			} else {
				toast.error("Failed to create interview stage");
			}
		} catch (error) {
			toast.error("Failed to create interview stage");
		} finally {
			setIsCreating(false);
		}
	};

	const defaultTrigger = (
		<Button className="flex items-center gap-2">
			<Plus className="h-4 w-4" />
			Add Interview Stage
		</Button>
	);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			{showTrigger && <DialogTrigger asChild>{triggerButton || defaultTrigger}</DialogTrigger>}

			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Create Interview Stage</DialogTitle>
					<DialogDescription>
						Create a new interview stage{jobPositionName ? ` for ${jobPositionName}` : ""}.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="stage_name">Stage Name *</Label>
						<Input
							id="stage_name"
							value={formData.name}
							onChange={(e) => updateFormData("name", e.target.value)}
							placeholder="e.g., Technical Interview, HR Round"
							className={errors.name ? "border-destructive" : ""}
						/>
						{errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor="stage_interviewer">Interviewers *</Label>
						<div className="w-full max-w-full overflow-hidden">
							<EmployeeSearchableSelect
								value={formData.interviewers.map((id) => id.toString())}
								onValueChange={(values) => {
									const numberValues = Array.isArray(values)
										? values.map((v) => Number(v))
										: [Number(values)];
									const uniqueValues = [...new Set(numberValues)];
									updateFormData("interviewers", uniqueValues);
								}}
								disabled={isCreating}
								placeholder="Search and select interviewers"
								showEmployeeId={false}
								showDepartment={false}
								multiple={true}
							/>
						</div>
						{errors.interviewers && (
							<p className="text-sm text-destructive">{errors.interviewers}</p>
						)}
					</div>
					<div className="space-y-2 mt-8">
						<div className="flex items-center justify-between">
							<Label>Custom Feedback Fields</Label>
							<span className="text-sm text-muted-foreground">
								{formData.feedback_fields?.length || 0} field(s)
							</span>
						</div>
						<FeedbackFieldsModal
							isOpen={isFeedbackFieldsModalOpen}
							onOpenChange={(open) => setIsFeedbackFieldsModalOpen(open)}
							fields={formData.feedback_fields || []}
							onFieldsChange={(fields) => updateFormData("feedback_fields", fields)}
						/>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsFeedbackFieldsModalOpen(true)}
							disabled={isCreating}
						>
							<Plus className="h-4 w-4 mr-2" />
							Configure Feedback Fields ({formData.feedback_fields?.length || 0})
						</Button>
						{formData.feedback_fields && formData.feedback_fields.length > 0 && (
							<div className="mt-4 p-3 border rounded-lg bg-slate-50">
								<h4 className="text-sm font-semibold text-gray-700 mb-3">
									Added Fields ({formData.feedback_fields.length})
								</h4>
								<div className="space-y-2 max-h-32 overflow-y-auto">
									{formData.feedback_fields.map((field, index) => (
										<div
											key={index}
											className="flex items-center justify-between p-2 bg-white border rounded-md shadow-sm"
										>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-gray-900 truncate">{field.label}</p>
												<div className="flex items-center gap-2 mt-1">
													<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
														{field.type.charAt(0).toUpperCase() + field.type.slice(1)}
													</span>
													{field.options && (
														<span className="text-xs text-gray-500">
															{field.options.length} options
														</span>
													)}
												</div>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => removeFeedbackField(index)}
												className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<div className="flex justify-end gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isCreating}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isCreating}>
							{isCreating ? (
								<>
									<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
									Creating...
								</>
							) : (
								<>
									<Check className="h-4 w-4 mr-2" />
									Create Stage
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
