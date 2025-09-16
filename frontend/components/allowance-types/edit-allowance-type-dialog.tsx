"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
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
import { IAllowanceTypeFormData, IAllowanceType } from "@/types/types.utils";
import { updateAllowanceType } from "@/lib/utils";
import { ALLOWANCE_FREQUENCIES } from "@/constants";

interface EditAllowanceTypeDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	allowanceType: IAllowanceType | null;
	onSuccess: () => void;
}

export function EditAllowanceTypeDialog({
	isOpen,
	onOpenChange,
	allowanceType,
	onSuccess,
}: EditAllowanceTypeDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState<IAllowanceTypeFormData>({
		name: "",
		description: "",
		is_taxable: true,
		is_active: true,
		is_recurring: false,
	});

	// Update form data when allowanceType changes
	useEffect(() => {
		if (allowanceType) {
			setFormData({
				name: allowanceType.name,
				description: allowanceType.description,
				is_taxable: allowanceType.is_taxable,
				is_active: allowanceType.is_active,
				is_recurring: allowanceType.is_recurring,
				frequency: allowanceType.frequency,
			});
		}
	}, [allowanceType]);

	const resetFormData = () => {
		setFormData({
			name: "",
			description: "",
			is_taxable: true,
			is_active: true,
			is_recurring: false,
		});
	};

	const handleSubmit = async () => {
		if (!allowanceType) return;

		if (!formData.name || !formData.description) {
			toast.error("Please fill in all required fields");

			return;
		}

		if (formData.is_recurring && !formData.frequency) {
			toast.error("You must set a frequency!");

			return;
		}

		setIsSubmitting(true);
		try {
			const allowanceTypeData: Partial<IAllowanceTypeFormData> = {
				name: formData.name,
				description: formData.description,
				is_taxable: formData.is_taxable,
				is_active: formData.is_active,
				is_recurring: formData.is_recurring,
			};

			if (formData.is_recurring) {
				allowanceTypeData.frequency = formData.frequency;
			} else {
				// Clear frequency if not recurring
				allowanceTypeData.frequency = undefined;
			}

			const updatedAllowanceType = await updateAllowanceType({
				id: allowanceType.id,
				allowanceTypeData,
			});

			if (updatedAllowanceType) {
				onSuccess();
				toast.success("Allowance type updated successfully");
				onOpenChange(false);
			} else {
				toast.error("Failed to update allowance type");
			}
		} catch (error: any) {
			console.error("Error updating allowance type:", error);
			toast.error(error.message || "An error occurred while updating the allowance type");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		onOpenChange(open);
		if (!open) {
			resetFormData();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<DialogTitle className="text-2xl font-bold text-gray-900">
						Edit Allowance Type
					</DialogTitle>
					<DialogDescription className="text-gray-600 text-base">
						Make changes to the existing allowance type configuration.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-6 py-6">
					<div className="space-y-3">
						<Label htmlFor="edit-name" className="text-sm font-semibold text-gray-800">
							Name *
						</Label>
						<Input
							id="edit-name"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							placeholder="e.g., Housing Allowance, Transportation"
							disabled={isSubmitting}
							className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
						/>
					</div>
					<div className="space-y-3">
						<Label htmlFor="edit-description" className="text-sm font-semibold text-gray-800">
							Description *
						</Label>
						<Textarea
							id="edit-description"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							rows={4}
							placeholder="Provide a detailed description of this allowance type..."
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base resize-none"
						/>
					</div>

					<div className="space-y-3">
						<Label htmlFor="edit-recurrence" className="text-sm font-semibold text-gray-800">
							Is it a recurring or a one time allowance? *
						</Label>
						<Select
							name="edit-recurrence"
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
							<Label htmlFor="edit-frequency" className="text-sm font-semibold text-gray-800">
								How often this allowance is given *
							</Label>
							<Select
								name="edit-frequency"
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
								<input
									type="checkbox"
									id="edit-is_taxable"
									checked={formData.is_taxable}
									onChange={(e) =>
										setFormData({
											...formData,
											is_taxable: e.target.checked,
										})
									}
									disabled={isSubmitting}
									className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
								/>
								<Label htmlFor="edit-is_taxable" className="text-sm font-medium text-gray-700">
									Taxable Allowance
								</Label>
							</div>
							<div className="flex items-center space-x-3">
								<input
									type="checkbox"
									id="edit-is_active"
									checked={formData.is_active}
									onChange={(e) =>
										setFormData({
											...formData,
											is_active: e.target.checked,
										})
									}
									disabled={isSubmitting}
									className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
								/>
								<Label htmlFor="edit-is_active" className="text-sm font-medium text-gray-700">
									Active Status
								</Label>
							</div>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Updating...
							</>
						) : (
							"Update Allowance Type"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
