"use client";

import type {
	ILeaveTypeGender,
	ILeaveType,
	ILeaveTypeCategory,
	ILeaveTypeFormData,
} from "@/types/types.utils";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LeaveTypesAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useSelector } from "react-redux";
import FormatNumberInput from "@/components/format-number-input";

const LEAVE_CATEGORIES: Array<{ value: ILeaveTypeCategory; label: string }> = [
	{ value: "annual", label: "Annual Leave" },
	{ value: "sick", label: "Sick Leave" },
	{ value: "maternity", label: "Maternity Leave" },
	{ value: "paternity", label: "Paternity Leave" },
	{ value: "unpaid", label: "Unpaid Leave" },
];

const GENDER_CHOICES: Array<{ value: ILeaveTypeGender; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
];

interface LeaveTypeFormDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	editingLeaveType?: ILeaveType | null;
	onSuccess: (leaveType: ILeaveType) => void;
}

export const LeaveTypeFormDialog = ({
	isOpen,
	onOpenChange,
	editingLeaveType,
	onSuccess,
}: LeaveTypeFormDialogProps) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const [formData, setFormData] = useState<ILeaveTypeFormData>({
		name: "",
		category: "annual",
		description: "",
		max_days_per_year: 0,
		carry_forward_allowed: false,
		max_carry_forward_days: 0,
		requires_document: false,
		gender_specific: "all",
		is_paid: false,
	});

	const isEditMode = !!editingLeaveType;

	// Reset form data when dialog opens/closes or when editing leave type changes
	useEffect(() => {
		if (isOpen) {
			if (editingLeaveType) {
				// Populate form with existing data for edit mode
				setFormData({
					name: editingLeaveType.name,
					category: editingLeaveType.category,
					description: editingLeaveType.description,
					max_days_per_year: editingLeaveType.max_days_per_year,
					carry_forward_allowed: editingLeaveType.carry_forward_allowed,
					max_carry_forward_days: editingLeaveType.max_carry_forward_days,
					requires_document: editingLeaveType.requires_document,
					gender_specific: editingLeaveType.gender_specific || "all",
					is_paid: editingLeaveType.is_paid,
				});
			} else {
				// Reset form for create mode
				setFormData({
					name: "",
					category: "annual",
					description: "",
					max_days_per_year: 0,
					carry_forward_allowed: false,
					max_carry_forward_days: 0,
					requires_document: false,
					gender_specific: "all",
					is_paid: false,
				});
			}
		}
	}, [isOpen, editingLeaveType]);

	const handleSubmit = async () => {
		// Validation
		if (!formData.name || !formData.description || !formData.max_days_per_year) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (selectedInstitution?.id === undefined) {
			toast.error("Institution is not selected");
			return;
		}

		setIsSubmitting(true);
		try {
			const leaveTypeData: ILeaveTypeFormData = {
				...formData,
				gender_specific: formData.gender_specific === "all" ? null : formData.gender_specific,
			};

			let result: ILeaveType | null = null;

			if (isEditMode && editingLeaveType) {
				// Update existing leave type
				result = await LeaveTypesAPI.update({
					leaveTypeId: editingLeaveType.id,
					leaveTypeData,
				});
			} else {
				// Create new leave type
				result = await LeaveTypesAPI.create({
					institutionId: selectedInstitution.id,
					leaveTypeData,
				});
			}

			if (result) {
				const successMessage = isEditMode
					? "Leave type updated successfully"
					: "Leave type created successfully";
				toast.success(successMessage);
				onSuccess(result);
				onOpenChange(false);
			} else {
				const errorMessage = isEditMode
					? "Failed to update leave type"
					: "Failed to create leave type";
				toast.error(errorMessage);
			}
		} catch (error: any) {
			console.error(`Error ${isEditMode ? "updating" : "creating"} leave type:`, error);
			const errorMessage =
				error.message ||
				`An error occurred while ${isEditMode ? "updating" : "creating"} the leave type`;
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDialogClose = (open: boolean) => {
		if (!open && !isSubmitting) {
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleDialogClose}>
			<DialogContent className="sm:max-w-[900px] w-[95vw] sm:w-full rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
						{isEditMode ? "Edit Leave Type" : "Add Leave Type"}
					</DialogTitle>
					<DialogDescription className="text-sm sm:text-base text-gray-600">
						{isEditMode
							? "Make changes to the existing leave type configuration."
							: "Create a new leave type to manage employee leave requests efficiently."}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4 sm:py-6 overflow-y-auto max-h-[70svh] px-1">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
						<div className="space-y-3">
							<Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-gray-800">
								Name *
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								placeholder="e.g., Annual Leave, Sick Leave"
								disabled={isSubmitting}
								className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
							/>
						</div>
						<div className="space-y-3">
							<Label htmlFor="category" className="text-xs sm:text-sm font-semibold text-gray-800">
								Category *
							</Label>
							<Select
								value={formData.category}
								onValueChange={(value: ILeaveTypeCategory) =>
									setFormData({ ...formData, category: value })
								}
								disabled={isSubmitting}
							>
								<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
									<SelectValue placeholder="Select a category" />
								</SelectTrigger>
								<SelectContent>
									{LEAVE_CATEGORIES.map((category) => (
										<SelectItem
											key={category.value}
											value={category.value}
											className="text-sm sm:text-base"
										>
											{category.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-3">
						<Label htmlFor="description" className="text-xs sm:text-sm font-semibold text-gray-800">
							Description *
						</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							rows={4}
							placeholder="Provide a detailed description of this leave type..."
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base resize-none"
						/>
					</div>
					<div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-4 md:col-span-2">
						<h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">
							Configuration Options
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
							<div className="flex items-center justify-start gap-8 space-x-3">
								<Switch
									disabled={isSubmitting}
									checked={formData.carry_forward_allowed}
									id="carry_forward_allowed"
									onCheckedChange={(checked: boolean) =>
										setFormData({
											...formData,
											carry_forward_allowed: checked,
										})
									}
								/>
								<Label
									htmlFor="carry_forward_allowed"
									className="text-xs sm:text-sm font-medium text-gray-700"
								>
									Carry Forward Allowed
								</Label>
							</div>
							<div className="flex items-center justify-start gap-6 space-x-3">
								<Switch
									disabled={isSubmitting}
									checked={formData.requires_document}
									id="requires_document"
									onCheckedChange={(checked: boolean) =>
										setFormData({
											...formData,
											requires_document: checked,
										})
									}
								/>
								<Label
									htmlFor="requires_document"
									className="text-xs sm:text-sm font-medium text-gray-700"
								>
									Requires Document
								</Label>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
						<div className="space-y-3">
							<Label
								htmlFor="max_days_per_year"
								className="text-xs sm:text-sm font-semibold text-gray-800"
							>
								Max Days Per Year *
							</Label>
							<FormatNumberInput
								id="max_days_per_year"
								value={formData.max_days_per_year?.toString() || ""}
								onChange={(formatted, numeric) =>
									setFormData({ ...formData, max_days_per_year: numeric })
								}
								placeholder="e.g., 20"
								disabled={isSubmitting}
								className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
							/>
						</div>
						{formData.carry_forward_allowed && (
							<div className="space-y-3">
								<Label
									htmlFor="max_carry_forward_days"
									className="text-xs sm:text-sm font-semibold text-gray-800"
								>
									Max Carry Forward Days
								</Label>
								<FormatNumberInput
									id="max_carry_forward_days"
									value={formData.max_carry_forward_days?.toString() || ""}
									onChange={(formatted, numeric) =>
										setFormData({
											...formData,
											max_carry_forward_days: numeric,
										})
									}
									placeholder="e.g., 5"
									disabled={isSubmitting}
									className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
								/>
							</div>
						)}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<Label
								htmlFor="gender_specific"
								className="text-xs sm:text-sm font-semibold text-gray-800"
							>
								Gender Specific
							</Label>
							<Select
								value={formData.gender_specific || ""}
								onValueChange={(value: ILeaveTypeGender) =>
									setFormData({ ...formData, gender_specific: value })
								}
								disabled={isSubmitting}
							>
								<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
									<SelectValue placeholder="Select gender" />
								</SelectTrigger>
								<SelectContent>
									{GENDER_CHOICES.map((gender) => (
										<SelectItem
											key={gender.value}
											value={gender.value}
											className="text-sm sm:text-base"
										>
											{gender.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center justify-start gap-8 space-x-3">
							<Switch
								id="is_paid"
								checked={formData.is_paid}
								onCheckedChange={(checked: boolean) =>
									setFormData({
										...formData,
										is_paid: checked,
									})
								}
								disabled={isSubmitting}
							/>
							<Label htmlFor="is_paid" className="text-xs sm:text-sm font-medium text-gray-700">
								Is paid
							</Label>
						</div>
					</div>
				</div>
				<DialogFooter className="flex flex-col sm:flex-row gap-3">
					<Button className="w-full rounded-full" onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
								{isEditMode ? "Updating..." : "Creating..."}
							</>
						) : (
							`${isEditMode ? "Update" : "Create"} Leave Type`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
