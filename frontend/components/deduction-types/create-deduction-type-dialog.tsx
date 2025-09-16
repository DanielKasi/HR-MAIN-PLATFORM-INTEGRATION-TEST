"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createDeductionType } from "@/lib/utils";
import { IDeductionTypeFormData } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ALLOWANCE_FREQUENCIES } from "@/constants";

interface CreateDeductionTypeDialogProps {
	onSuccess: (newDeductionType: any) => void;
	disabled?: boolean;
	isEmbedded?: boolean;
	isTriggerLabelHidden?: boolean;
}

export function CreateDeductionTypeDialog({
	onSuccess,
	disabled = false,
	isEmbedded = false,
	isTriggerLabelHidden = false,
}: CreateDeductionTypeDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IDeductionTypeFormData>({
		name: "",
		description: "",
		is_mandatory: false,
		is_active: true,
		is_recurring: false,
	});

	const resetFormData = () => {
		setFormData({
			name: "",
			description: "",
			is_mandatory: false,
			is_active: true,
			is_recurring: false,
		});
	};

	const handleSubmit = async () => {
		if (!selectedInstitution) {
			return;
		}
		if (!formData.name || !formData.description) {
			toast.error("Please fill in all required fields");

			return;
		}

		if (formData.is_recurring && !formData.frequency) {
			toast.error("You must set a frequency for recurring deductions!");

			return;
		}

		setIsSubmitting(true);
		try {
			const deductionTypeData: IDeductionTypeFormData = {
				name: formData.name,
				description: formData.description,
				is_mandatory: formData.is_mandatory,
				is_active: formData.is_active,
				is_recurring: formData.is_recurring,
			};

			if (formData.is_recurring) {
				deductionTypeData.frequency = formData.frequency;
			}

			const newDeductionType = await createDeductionType({
				institutionId: selectedInstitution.id,
				deductionTypeData,
			});

			if (newDeductionType) {
				onSuccess(newDeductionType);
				toast.success("Deduction type created successfully");
				resetFormData();
				setIsOpen(false);
			} else {
				toast.error("Failed to create deduction type");
			}
		} catch (error: any) {
			toast.error(error.message || "An error occurred while creating the deduction type");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			resetFormData();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant={isEmbedded ? "outline" : "default"}
					className="flex items-center gap-2"
					disabled={disabled}
				>
					<Plus className="h-4 w-4" />
					{!isEmbedded && !isTriggerLabelHidden ? "Create Deduction Type" : ""}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[34rem] md:max-w-[42rem] rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<DialogTitle className="text-2xl font-bold text-gray-900">Add Deduction Type</DialogTitle>
					<DialogDescription className="text-gray-600 text-base">
						Create a new deduction type to manage employee deductions efficiently.
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[75vh] overflow-y-auto px-4">
					<div className="grid grid-cols-1 gap-6 py-6">
						<div className="space-y-3">
							<Label htmlFor="name" className="text-sm text-gray-800">
								Name *
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								placeholder="e.g., Income Tax, Health Insurance"
								disabled={isSubmitting}
								className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base"
							/>
						</div>

						<div className="space-y-3">
							<Label htmlFor="description" className="text-sm font-semibold text-gray-800">
								Description *
							</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								rows={4}
								placeholder="Provide a detailed description of this deduction type..."
								disabled={isSubmitting}
								className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base resize-none"
							/>
						</div>

						<div className="space-y-3">
							<Label htmlFor="recurrence" className="text-sm font-semibold text-gray-800">
								Is it a recurring or a one time deduction? *
							</Label>
							<Select
								name="recurrence"
								value={formData.is_recurring ? "RECURRING" : "ONE_TIME"}
								onValueChange={(val) =>
									setFormData((prev) => ({
										...prev,
										is_recurring: val === "RECURRING",
										frequency: val === "RECURRING" ? prev.frequency : undefined,
									}))
								}
							>
								<SelectTrigger>
									<SelectValue>{formData.is_recurring ? "Recurring" : "One time"}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ONE_TIME">One time</SelectItem>
									<SelectItem value="RECURRING">Recurring</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{formData.is_recurring && (
							<div className="space-y-3">
								<Label htmlFor="frequency" className="text-sm font-semibold text-gray-800">
									How often this deduction is applied *
								</Label>
								<Select
									name="frequency"
									value={formData.frequency || ""}
									onValueChange={(val) =>
										setFormData((prev) => ({ ...prev, frequency: val as ALLOWANCE_FREQUENCIES }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select frequency" />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(ALLOWANCE_FREQUENCIES).map(([key, value]) => (
											<SelectItem key={key} value={key}>
												{value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="bg-gray-50 rounded-xl p-4 space-y-4">
							<h4 className="text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
							<div className="flex flex-col sm:flex-row sm:items-center gap-6">
								<div className="flex items-center space-x-3">
									<Checkbox
										id="is_mandatory"
										checked={formData.is_mandatory}
										onCheckedChange={(checked) =>
											setFormData({
												...formData,
												is_mandatory: !!checked.valueOf(),
											})
										}
										disabled={isSubmitting}
										className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500/20"
									/>
									<Label htmlFor="is_mandatory" className="text-sm font-medium text-gray-700">
										Is Mandatory
									</Label>
								</div>
								<div className="flex items-center space-x-3">
									<Checkbox
										id="is_active"
										checked={formData.is_active}
										onCheckedChange={(checked) =>
											setFormData({
												...formData,
												is_active: !!checked.valueOf(),
											})
										}
										disabled={isSubmitting}
										className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500/20"
									/>
									<Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
										Is Active
									</Label>
								</div>
							</div>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Creating...
							</>
						) : (
							"Create Deduction Type"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
