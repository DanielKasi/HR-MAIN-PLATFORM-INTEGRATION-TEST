import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

import { createWorkType, updateWorkType } from "@/lib/utils";
import { IWorkType, IWorkTypeFormData } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface WorkTypeModalProps {
	isOpen: boolean;
	onClose: () => void;
	editingType: IWorkType | null;
	onSaveSuccess: (data: IWorkType) => Promise<void>;
	isSubmitting: boolean;
}

export default function WorkTypeModal({
	isOpen,
	onClose,
	editingType,
	onSaveSuccess,
	isSubmitting,
}: WorkTypeModalProps) {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IWorkTypeFormData>({
		name: "",
		description: "",
		code: "",
		institution: selectedInstitution?.id || 0,
	});

	const [errors, setErrors] = useState<Partial<Record<keyof IWorkTypeFormData, string>>>({});

	useEffect(() => {
		if (isOpen) {
			if (editingType) {
				setFormData({
					name: editingType.name,
					description: editingType.description || "",
					code: "",
					institution: editingType.institution || selectedInstitution?.id || 0,
				});
			}
			setErrors({});
		}
	}, [isOpen, editingType]);

	useEffect(() => {
		if (selectedInstitution) {
			setFormData((prev) => ({ ...prev, institution: selectedInstitution.id }));
		}
	}, [selectedInstitution]);

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof IWorkTypeFormData, string>> = {};

		if (!formData.name?.trim()) {
			newErrors.name = "Name is required";
		} else if (formData.name.length > 100) {
			newErrors.name = "Name must be 100 characters or less";
		}

		// const duplicateName = existingTypes.find(
		//   (type) => type.name.toLowerCase() === formData.name?.toLowerCase() && type.id !== editingType?.id,
		// )
		// if (duplicateName) {
		//   newErrors.name = "A work type with this name already exists"
		// }

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedInstitution) {
			return;
		}

		if (!validateForm()) {
			return;
		}

		try {
			let resultWorkType: IWorkType | null = null;

			if (editingType) {
				resultWorkType = await updateWorkType({
					institutionId: selectedInstitution.id,
					employeeTypeId: editingType.id,
					employeeTypeData: formData,
				});
				toast.success("Work type updated successfully!");
			} else {
				resultWorkType = await createWorkType({
					institutionId: selectedInstitution.id,
					workTypeData: formData,
				});
				toast.success("Work type created successfully!");
			}
			if (resultWorkType) {
				await onSaveSuccess(resultWorkType);
			}
			onClose();
		} catch (error) {
			// showErrorToast({error, defaultMessage: "Failed to save work type"})
		}
	};

	const handleInputChange = (field: keyof IWorkTypeFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-lg sm:text-xl">
						{editingType ? "Edit Work Type" : "Create Work Type"}
					</DialogTitle>
					<DialogDescription className="text-sm sm:text-base">
						{editingType
							? "Update the work type information below."
							: "Add a new work type to your organization."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
					<div className="grid grid-cols-1 gap-4 sm:gap-6">
						<div className="space-y-2">
							<Label htmlFor="name" className="text-sm sm:text-base">
								Name <span className="text-red-500">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name || ""}
								onChange={(e) => handleInputChange("name", e.target.value)}
								maxLength={100}
								className={`text-sm sm:text-base ${errors.name ? "border-red-500" : ""}`}
								placeholder="e.g., Remote, On-site, Hybrid"
							/>
							{errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description" className="text-sm sm:text-base">
							Description
						</Label>
						<Textarea
							id="description"
							value={formData.description || ""}
							onChange={(e) => handleInputChange("description", e.target.value)}
							placeholder="Describe this work type..."
							className="min-h-[80px] sm:min-h-[100px] resize-none text-sm sm:text-base"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
							className="w-full sm:w-auto text-sm bg-transparent"
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto text-sm">
							{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{isSubmitting ? "Saving..." : editingType ? "Update Work Type" : "Create Work Type"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
