"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, AlertTriangle, Info } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createEmployeeDeduction, showErrorToast, updateEmployeeDeduction } from "@/lib/utils";
import { formatCurrency } from "@/lib/helpers";
import { CreateDeductionTypeDialog } from "@/components/deduction-types/create-deduction-type-dialog";
import { ContextSelector } from "../employee-allowances/context-selector";
import type {
	IEmployeeDeduction,
	IDeductionType,
	IEmployeeDeductionFormData,
	ContextType,
	ContextItem,
} from "@/types/types.utils";

interface ILocalEmployeeDeduction extends IEmployeeDeduction {
	context?: ContextType;
	context_ids?: number[];
}

interface ValidationResult {
	context?: string;
	context_ids?: string;
	allowance_type?: string;
	deduction_type?: string;
	amount?: string;
	percentage?: string;
	effective_from?: string;
	effective_to?: string;
	warning?: string;
}

interface EmployeeDeductionFormDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	editingDeduction: ILocalEmployeeDeduction | null;
	deductionTypes: IDeductionType[];
	institutionId: number;
	onSuccess: (deduction: any, isEdit: boolean) => void;
	onDeductionTypeCreated: (newType: IDeductionType) => void;
}

export function EmployeeDeductionFormDialog({
	isOpen,
	onOpenChange,
	editingDeduction,
	deductionTypes,
	institutionId,
	onSuccess,
	onDeductionTypeCreated,
}: EmployeeDeductionFormDialogProps) {
	const [saving, setSaving] = useState(false);
	const [validationErrors, setValidationErrors] = useState<ValidationResult>({});
	const [selectedContext, setSelectedContext] = useState<ContextType | "">("");
	const [selectedContextItems, setSelectedContextItems] = useState<ContextItem[]>([]);

	const [formData, setFormData] = useState({
		deduction_type: "",
		calculation_method: "fixed" as "fixed" | "percentage",
		amount: "",
		percentage: "",
		is_active: true,
		effective_from: "",
		effective_to: "",
	});

	useEffect(() => {
		if (editingDeduction) {
			setFormData({
				deduction_type: editingDeduction.deduction_type.id.toString(),
				calculation_method: editingDeduction.calculation_method,
				amount: editingDeduction.amount,
				percentage: editingDeduction.percentage,
				is_active: editingDeduction.is_active,
				effective_from: editingDeduction.effective_from,
				effective_to: editingDeduction.effective_to || "",
			});

			if (editingDeduction.context) {
				setSelectedContext(editingDeduction.context);
				setSelectedContextItems([]);
			}
		} else {
			resetForm();
		}
	}, [editingDeduction]);

	useEffect(() => {
		const errors: ValidationResult = {};

		if (isOpen) {
			if (!selectedContext) {
				errors.context = "Please select a target group";
			} else if (selectedContextItems.length === 0) {
				errors.context_ids = `Please select at least one ${selectedContext.replace("_", " ")}`;
			}

			if (formData.calculation_method === "fixed") {
				const amount = Number.parseFloat(formData.amount);
				if (formData.amount && (Number.isNaN(amount) || amount <= 0)) {
					errors.amount = "Please enter a valid fixed amount";
				}
			} else {
				const percentage = Number.parseFloat(formData.percentage);
				if (
					formData.percentage &&
					(Number.isNaN(percentage) || percentage <= 0 || percentage > 100)
				) {
					errors.percentage = "Please enter a valid percentage (1-100)";
				} else if (formData.percentage && percentage > 50) {
					errors.warning = "High percentage deduction detected. Please verify this is correct.";
				}
			}

			if (formData.effective_from && formData.effective_to) {
				if (new Date(formData.effective_to) < new Date(formData.effective_from)) {
					errors.effective_to = "End date cannot be before start date";
				}
			}
		}

		setValidationErrors(errors);
	}, [formData, selectedContext, selectedContextItems, isOpen]);

	const resetForm = () => {
		setFormData({
			deduction_type: "",
			calculation_method: "fixed",
			amount: "",
			percentage: "",
			is_active: true,
			effective_from: "",
			effective_to: "",
		});
		setSelectedContext("");
		setSelectedContextItems([]);
		setValidationErrors({});
	};

	const hasValidationErrors = () => {
		if (
			!selectedContext ||
			selectedContextItems.length === 0 ||
			!formData.deduction_type ||
			!formData.effective_from
		) {
			return true;
		}

		if (formData.calculation_method === "fixed" && !formData.amount) {
			return true;
		}

		if (formData.calculation_method === "percentage" && !formData.percentage) {
			return true;
		}

		const errorKeys = Object.keys(validationErrors).filter((key) => key !== "warning");
		return errorKeys.length > 0;
	};

	const handleSubmit = async () => {
		if (hasValidationErrors()) {
			toast.error("Please fix the validation errors before submitting");
			return;
		}

		// if (validationErrors.warning) {
		//   toast.warning(validationErrors.warning)
		// }

		setSaving(true);
		try {
			const contextItems = selectedContextItems.map((item) => item.id);
			const formattedData: Partial<IEmployeeDeductionFormData> & {
				context: string;
				target_departments?: number[];
				target_job_positions?: number[];
				target_employees?: number[];
			} = {
				deduction_type: Number.parseInt(formData.deduction_type),
				calculation_method: formData.calculation_method,
				amount: formData.amount,
				is_active: formData.is_active,
				effective_from: formData.effective_from,
				effective_to: formData.effective_to || null,
				context: selectedContext as ContextType,
			};

			if (formData.calculation_method === "percentage") {
				formattedData.percentage = formData.percentage;
			}

			switch (selectedContext) {
				case "department":
					formattedData.target_departments = contextItems;
					break;
				case "employee":
					formattedData.target_employees = contextItems;
					break;
				case "job_position":
					formattedData.target_job_positions = contextItems;
					break;
				default:
					break;
			}

			if (editingDeduction) {
				const updatedDeduction = await updateEmployeeDeduction({
					id: editingDeduction.id,
					employeeDeductionData: formattedData,
				});
				if (updatedDeduction) {
					onSuccess(updatedDeduction, true);
					toast.success("Deduction updated successfully");
				}
			} else {
				const newDeduction = await createEmployeeDeduction({
					institutionId,
					employeeDeductionData: formattedData,
				});
				if (newDeduction) {
					onSuccess(newDeduction, false);
					toast.success("Deduction created successfully");
				}
			}

			onOpenChange(false);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "An error occurred while saving the deduction" });
		} finally {
			setSaving(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		onOpenChange(open);
		if (!open) {
			resetForm();
		}
	};

	const handleDeductionTypeSuccess = (newDeductionType: IDeductionType) => {
		onDeductionTypeCreated(newDeductionType);
		setFormData({ ...formData, deduction_type: newDeductionType.id.toString() });
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[32rem] md:max-w-[42rem]">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						{editingDeduction ? "Edit Deduction" : "Add New Deduction"}
					</DialogTitle>
					<DialogDescription>
						Configure deduction details, target group, and calculation method.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-6 py-4 max-h-[70vh] overflow-y-auto">
					<div className="space-y-4">
						<ContextSelector
							selectedContext={selectedContext}
							onContextChange={setSelectedContext}
							selectedItems={selectedContextItems}
							onItemsChange={setSelectedContextItems}
							disabled={saving}
						/>
						{validationErrors.context && (
							<p className="text-xs text-red-500 mt-1 flex items-center">
								<AlertTriangle className="h-3 w-3 mr-1" />
								{validationErrors.context}
							</p>
						)}
						{validationErrors.context_ids && (
							<p className="text-xs text-red-500 mt-1 flex items-center">
								<AlertTriangle className="h-3 w-3 mr-1" />
								{validationErrors.context_ids}
							</p>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between h-8">
								<Label htmlFor="deduction_type" className="text-sm font-medium">
									Deduction Type *
								</Label>
								<CreateDeductionTypeDialog
									onSuccess={handleDeductionTypeSuccess}
									disabled={saving}
									isEmbedded={true}
								/>
							</div>
							<Select
								value={formData.deduction_type}
								onValueChange={(value) => setFormData({ ...formData, deduction_type: value })}
								disabled={saving}
							>
								<SelectTrigger
									className={`focus:ring-red-500 focus:border-red-500 ${
										validationErrors.deduction_type
											? "border-red-500 focus:border-red-500 focus:ring-red-500"
											: ""
									}`}
								>
									<SelectValue placeholder="Please select a deduction type" />
								</SelectTrigger>
								<SelectContent>
									{deductionTypes.length > 0 ? (
										deductionTypes.map((type) => (
											<SelectItem key={type.id} value={type.id.toString()}>
												{type.name}
											</SelectItem>
										))
									) : (
										<div className="px-2 py-1.5 text-sm text-gray-500">
											No deduction types available
										</div>
									)}
								</SelectContent>
							</Select>
							{deductionTypes.length === 0 && (
								<p className="text-xs text-red-500 mt-1">
									No deduction types found. Please create deduction types first.
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="calculation_method" className="text-sm font-medium">
								Calculation Method *
							</Label>
							<Select
								value={formData.calculation_method}
								onValueChange={(value: "fixed" | "percentage") =>
									setFormData({ ...formData, calculation_method: value })
								}
								disabled={saving}
							>
								<SelectTrigger className="focus:ring-red-500 focus:border-red-500">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="fixed">Fixed Amount</SelectItem>
									<SelectItem value="percentage">Percentage of Salary</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{formData.calculation_method === "fixed" ? (
							<div className="space-y-2">
								<Label htmlFor="amount" className="text-sm font-medium">
									Fixed Amount *
								</Label>
								<Input
									id="amount"
									type="text"
									placeholder="0.00"
									value={formData.amount ? formatCurrency(formData.amount) : ""}
									onChange={(e) => {
										const rawValue = e.target.value.replace(/[,$]/g, "");
										if (
											rawValue === "" ||
											(!Number.isNaN(Number.parseFloat(rawValue)) &&
												Number.isFinite(Number.parseFloat(rawValue)))
										) {
											setFormData({ ...formData, amount: rawValue });
										}
									}}
									disabled={saving}
									className={`focus:ring-red-500 focus:border-red-500 ${
										validationErrors.amount
											? "border-red-500 focus:border-red-500 focus:ring-red-500"
											: ""
									}`}
								/>
								{validationErrors.amount ? (
									<p className="text-xs text-red-500 mt-1 flex items-center">
										<AlertTriangle className="h-3 w-3 mr-1" />
										{validationErrors.amount}
									</p>
								) : (
									<p className="text-xs text-gray-500">Enter the fixed deduction amount</p>
								)}
							</div>
						) : (
							<div className="space-y-2">
								<Label htmlFor="percentage" className="text-sm font-medium">
									Percentage *
								</Label>
								<Input
									id="percentage"
									type="number"
									step="0.01"
									min="0"
									max="100"
									placeholder="0.00"
									value={formData.percentage}
									onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
									disabled={saving}
									className={`focus:ring-red-500 focus:border-red-500 ${
										validationErrors.percentage
											? "border-red-500 focus:border-red-500 focus:ring-red-500"
											: ""
									}`}
								/>
								{validationErrors.percentage ? (
									<p className="text-xs text-red-500 mt-1 flex items-center">
										<AlertTriangle className="h-3 w-3 mr-1" />
										{validationErrors.percentage}
									</p>
								) : (
									<p className="text-xs text-gray-500">Percentage of base salary (0-100)</p>
								)}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="effective_from" className="text-sm font-medium">
								Effective From *
							</Label>
							<Input
								id="effective_from"
								type="date"
								value={formData.effective_from}
								onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
								className={`focus:ring-red-500 focus:border-red-500 ${
									validationErrors.effective_from
										? "border-red-500 focus:border-red-500 focus:ring-red-500"
										: ""
								}`}
								disabled={saving}
							/>
							{validationErrors.effective_from && (
								<p className="text-xs text-red-500 mt-1 flex items-center">
									<AlertTriangle className="h-3 w-3 mr-1" />
									{validationErrors.effective_from}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="effective_to" className="text-sm font-medium">
								Effective To (Optional)
							</Label>
							<Input
								id="effective_to"
								type="date"
								value={formData.effective_to}
								onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
								className={`focus:ring-red-500 focus:border-red-500 ${
									validationErrors.effective_to
										? "border-red-500 focus:border-red-500 focus:ring-red-500"
										: ""
								}`}
								disabled={saving}
								min={formData.effective_from}
							/>
							{validationErrors.effective_to && (
								<p className="text-xs text-red-500 mt-1 flex items-center">
									<AlertTriangle className="h-3 w-3 mr-1" />
									{validationErrors.effective_to}
								</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex flex-row items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Active Status</Label>
								<p className="text-sm text-gray-500">Enable or disable this deduction</p>
							</div>
							<Switch
								checked={formData.is_active}
								onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
								disabled={saving}
							/>
						</div>
					</div>

					{validationErrors.warning && (
						<div className="space-y-2">
							<div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
								<Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
								<p className="text-sm font-medium text-amber-800">{validationErrors.warning}</p>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={saving || !deductionTypes.length || hasValidationErrors()}
					>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{saving ? "Saving..." : editingDeduction ? "Update" : "Create"} Deduction
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
