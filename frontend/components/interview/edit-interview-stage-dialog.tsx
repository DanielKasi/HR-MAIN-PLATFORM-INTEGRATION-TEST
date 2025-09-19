"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, X, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";

interface ProcessedStage {
	id: string;
	name: string;
	count: number;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
	level: number;
	interviewer: string;
	candidates: any[];
}

interface IInterviewStageFormData {
	name: string;
	level: number;
	interviewers: number[];
	job_position_advert: number;
}

interface EditInterviewStageDialogProps {
	isOpen: boolean;
	onClose: () => void;
	stage: ProcessedStage | null;
	onSave: (stageId: string, formData: IInterviewStageFormData) => Promise<void>;
	size?: "sm" | "md" | "lg" | "xl";
}

export function EditInterviewStageDialog({
	isOpen,
	onClose,
	stage,
	onSave,
	size = "md",
}: EditInterviewStageDialogProps) {
	const sizeClasses = {
		sm: "max-w-md",
		md: "max-w-lg",
		lg: "max-w-2xl",
		xl: "max-w-4xl",
	};

	const [formData, setFormData] = useState<IInterviewStageFormData>({
		name: "",
		level: 1,
		interviewers: [],
		job_position_advert: 0,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (stage && isOpen) {
			setFormData({
				name: stage.name,
				level: stage.level,
				interviewers: [],
				job_position_advert: 0,
			});
			setErrors({});
		}
	}, [stage, isOpen]);

	const updateFormData = (field: keyof IInterviewStageFormData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: "" }));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.name.trim()) {
			newErrors.name = "Stage name is required";
		}

		if (formData.level < 1) {
			newErrors.level = "Level must be at least 1";
		}

		if (formData.interviewers.length === 0) {
			newErrors.interviewers = "Please select at least one interviewer";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSave = async () => {
		if (!stage || !validateForm()) {
			return;
		}

		setIsSaving(true);
		try {
			await onSave(stage.id, formData);
			toast.success(`Stage "${formData.name}" updated successfully`);
			onClose();
		} catch (error) {
			toast.error("Failed to update stage");
			console.error("Error updating stage:", error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleClose = () => {
		if (!isSaving) {
			onClose();
		}
	};

	if (!stage) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className={cn("p-0 rounded-xl overflow-hidden", sizeClasses[size])}>
				<DialogHeader className="px-6 py-4 border-b">
					<DialogTitle className="text-xl font-semibold text-gray-900">
						Edit Interview Stage
					</DialogTitle>
				</DialogHeader>

				<div className="px-6 py-6">
					{/* Current Stage Info */}
					{/* Edit Form - Only Name and Interviewers */}
					<div className="space-y-6">
						{/* Stage Name */}
						<div className="space-y-2">
							<Label htmlFor="stage_name" className="text-sm font-medium">
								Stage Name *
							</Label>
							<Input
								id="stage_name"
								value={formData.name}
								onChange={(e) => updateFormData("name", e.target.value)}
								placeholder="e.g., Technical Interview, HR Round"
								className={errors.name ? "border-red-300 focus:border-red-300" : ""}
								disabled={isSaving}
							/>
							{errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
						</div>

						{/* Interviewers */}
						<div className="space-y-2">
							<Label htmlFor="stage_interviewers" className="text-sm font-medium">
								Interviewers *
							</Label>
							<EmployeeSearchableSelect
								value={formData.interviewers.map((id) => id.toString())}
								onValueChange={(values) => {
									const numberValues = Array.isArray(values)
										? values.map((v) => Number(v))
										: [Number(values)];
									const uniqueValues = [...new Set(numberValues)];
									updateFormData("interviewers", uniqueValues);
								}}
								disabled={isSaving}
								placeholder="Search and select interviewers"
								showEmployeeId={false}
								showDepartment={true}
								multiple={true}
							/>
							{errors.interviewers && <p className="text-sm text-red-600">{errors.interviewers}</p>}
							<p className="text-xs text-gray-500">
								Select the employees who will conduct interviews at this stage
							</p>
						</div>
					</div>
				</div>

				{/* Footer - Full Width Rounded Button */}
				<div className="px-6 py-4 border-t bg-gray-50">
					<Button
						onClick={handleSave}
						disabled={isSaving}
						className="w-full bg-orange-600 hover:bg-orange-700 rounded-full py-6"
					>
						{isSaving ? (
							<>
								<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
								Saving Changes...
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								Save Changes
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
