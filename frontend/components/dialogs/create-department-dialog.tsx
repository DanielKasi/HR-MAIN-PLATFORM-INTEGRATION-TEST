"use client";

import * as React from "react";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { RichTextEditor } from "../common/rich-editor";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { createDepartment } from "@/lib/utils";
import { DepartmentFormData } from "@/types/types.utils";

interface CreateDepartmentDialogProps {
	trigger?: React.ReactNode;
	onDepartmentCreated?: (department: any) => void;
}

export function CreateDepartmentDialog({
	trigger,
	onDepartmentCreated,
}: CreateDepartmentDialogProps) {
	const [open, setOpen] = useState(false);
	const [formData, setFormData] = useState<DepartmentFormData>({
		name: "",
		description: "",
		institution: 0,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState<Partial<DepartmentFormData>>({});

	const selectedInstitution = useSelector(selectSelectedInstitution);

	const updateFormData = (field: keyof DepartmentFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<DepartmentFormData> = {};

		if (!formData.name.trim()) {
			newErrors.name = "Department name is required";
		} else if (formData.name.trim().length < 2) {
			newErrors.name = "Department name must be at least 2 characters";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Department description is required";
		} else if (formData.description.trim().length < 10) {
			newErrors.description = "Description must be at least 10 characters";
		}

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!selectedInstitution) {
			toast.error("Missing organization information");

			return;
		}

		if (!validateForm()) {
			toast.error("Please fix the form errors before submitting");

			return;
		}

		setIsSubmitting(true);

		try {
			const newDepartment = await createDepartment({
				departmentData: {
					name: formData.name.trim(),
					description: formData.description.trim(),
					institution: selectedInstitution.id,
				},
			});

			if (newDepartment) {
				toast.success("Department created successfully!");
				onDepartmentCreated?.(newDepartment);
				setOpen(false);
				setFormData({ name: "", description: "", institution: 0 });
			} else {
				toast.error("Failed to create department. Please try again.");
			}
		} catch (error) {
			toast.error("Failed to create department. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || <Button variant="outline">Create New Department</Button>}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[28rem] md:max-w-[38rem] lg:max-w-[48rem]">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
							<Building2 className="h-5 w-5 text-primary" />
						</div>
						<div>
							<DialogTitle>Create New Department</DialogTitle>
							<DialogDescription>Add a new department to your organization.</DialogDescription>
						</div>
					</div>
				</DialogHeader>
				<form className="overflow-y-auto h-full max-h-[60svh]">
					<div className="grid gap-4 py-4 ">
						<div className="space-y-2">
							<Label htmlFor="name">Department Name</Label>
							<Input
								id="name"
								placeholder="e.g., Human Resources, Finance, Operations"
								value={formData.name}
								onChange={(e) => updateFormData("name", e.target.value)}
								className={errors.name ? "border-destructive" : ""}
							/>
							{errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							{/* <Textarea
                id="description"
                placeholder="Describe the department's role, responsibilities, and objectives..."
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                className={errors.description ? "border-destructive" : ""}
              /> */}
							<RichTextEditor
								id="description"
								placeholder="Describe the department's role, responsibilities, and objectives..."
								value={formData.description}
								onChange={(value) => updateFormData("description", value)}
								className={errors.description ? "border-destructive" : ""}
							/>
							{errors.description && (
								<p className="text-sm text-destructive">{errors.description}</p>
							)}
						</div>
					</div>
				</form>
				<div className="flex items-center justify-end gap-8 py-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
								Creating...
							</>
						) : (
							"Create Department"
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
