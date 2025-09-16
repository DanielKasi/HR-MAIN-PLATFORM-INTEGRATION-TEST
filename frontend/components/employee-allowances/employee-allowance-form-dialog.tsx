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
import type {
	IEmployeeAllowanceFormData,
	IEmployee,
	IAllowanceType,
	IDepartment,
	IJobPosition,
	IEmployeeAllowance,
} from "@/types/types.utils";
import { createEmployeeAllowance, updateEmployeeAllowance } from "@/lib/utils";
import { formatCurrency } from "@/lib/helpers";
import { CreateAllowanceTypeDialog } from "@/components/allowance-types/create-allowance-type-dialog";
import { ContextSelector } from "./context-selector";

interface ContextItem {
	id: number;
	name: string;
	description?: string;
}

interface ILocalEmployeeAllowance extends IEmployeeAllowance {
	context?: "employee" | "department" | "job_position";
	context_ids?: number[];
}

interface ValidationResult {
	context?: string;
	context_ids?: string;
	allowance_type?: string;
	amount?: string;
	percentage?: string;
	effective_from?: string;
	effective_to?: string;
	warning?: string;
}

interface EmployeeAllowanceFormDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	editingAllowance: ILocalEmployeeAllowance | null;
	allowanceTypes: IAllowanceType[];
	institutionId: number;
	onSuccess: (allowance: any, isEdit: boolean) => void;
	onAllowanceTypeCreated: (newType: IAllowanceType) => void;
}

export function EmployeeAllowanceFormDialog({
	isOpen,
	onOpenChange,
	editingAllowance,
	allowanceTypes,
	institutionId,
	onSuccess,
	onAllowanceTypeCreated,
}: EmployeeAllowanceFormDialogProps) {
	const [saving, setSaving] = useState(false);
	const [validationErrors, setValidationErrors] = useState<ValidationResult>({});
	const [selectedContext, setSelectedContext] = useState<
		"employee" | "department" | "job_position" | ""
	>("");
	const [isCreateAllowanceTypeDialogOpen, setIsCreateAllowanceTypeDialogOpen] = useState(false);
	const [selectedContextItems, setSelectedContextItems] = useState<ContextItem[]>([]);

	const [formData, setFormData] = useState({
		allowance_type: "",
		calculation_method: "fixed" as "fixed" | "percentage",
		amount: "",
		percentage: "",
		is_active: true,
		effective_from: "",
		effective_to: "",
	});

	// Update form data when editing allowance changes
	useEffect(() => {
		if (editingAllowance) {
			setFormData({
				allowance_type: editingAllowance.allowance_type.id.toString(),
				calculation_method: editingAllowance.calculation_method,
				amount: editingAllowance.amount,
				percentage: editingAllowance.percentage,
				is_active: editingAllowance.is_active,
				effective_from: editingAllowance.effective_from,
				effective_to: editingAllowance.effective_to || "",
			});

			// Set context data if available
			if (editingAllowance.context) {
				setSelectedContext(editingAllowance.context);
				// Note: You might need to fetch the context items based on the IDs
				// This is a simplified version - you may need to implement proper loading
				setSelectedContextItems([]);
			}
		} else {
			resetForm();
		}
	}, [editingAllowance]);

	// Validation effect
	useEffect(() => {
		const errors: ValidationResult = {};

		if (isOpen) {
			// Context validation
			if (!selectedContext) {
				errors.context = "Please select a target group";
			} else if (selectedContextItems.length === 0) {
				errors.context_ids = `Please select at least one ${selectedContext.replace("_", " ")}`;
			}

			// Amount/percentage validation
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
					errors.warning = "High percentage allowance detected. Please verify this is correct.";
				}
			}

			// Date validation
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
			allowance_type: "",
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
			!formData.allowance_type ||
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

		if (validationErrors.warning) {
			toast.warning(validationErrors.warning);
		}

		setSaving(true);
		try {
			const contextItems = selectedContextItems.map((item) => item.id);
			const formattedData: Partial<IEmployeeAllowanceFormData> & {
				context: string;
				target_departments?: number[];
				target_job_positions?: number[];
				target_employees?: number[];
			} = {
				allowance_type: Number.parseInt(formData.allowance_type),
				calculation_method: formData.calculation_method,
				amount: formData.amount,
				is_active: formData.is_active,
				effective_from: formData.effective_from,
				effective_to: formData.effective_to || null,
				context: selectedContext,
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

			if (editingAllowance) {
				const updatedAllowance = await updateEmployeeAllowance({
					id: editingAllowance.id,
					employeeAllowanceData: formattedData,
				});
				if (updatedAllowance) {
					onSuccess(updatedAllowance, true);
					toast.success("Allowance updated successfully");
				}
			} else {
				const newAllowance = await createEmployeeAllowance({
					institutionId,
					employeeAllowanceData: formattedData,
				});
				if (newAllowance) {
					onSuccess(newAllowance, false);
					toast.success("Allowance created successfully");
				}
			}

			onOpenChange(false);
		} catch (error: any) {
			toast.error(
				error?.message || error?.detail || "An error occurred while saving the allowance",
			);
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

	const handleAllowanceTypeSuccess = (newAllowanceType: IAllowanceType) => {
		onAllowanceTypeCreated(newAllowanceType);
		setFormData({ ...formData, allowance_type: newAllowanceType.id.toString() });
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="max-w-[32rem] md:max-w-[42rem]">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold">
							{editingAllowance ? "Edit Allowance" : "Add New Allowance"}
						</DialogTitle>
						<DialogDescription>
							Configure allowance details, target group, and calculation method.
						</DialogDescription>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-6 py-4 max-h-[70vh] overflow-y-auto">
						{/* Context Selector */}
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
							{/* Allowance Type */}
							<div className="space-y-2">
								<div className="flex items-center justify-between h-8">
									<Label htmlFor="allowance_type" className="text-sm font-medium">
										Allowance Type *
									</Label>
									<Button
										variant={"outline"}
										className="flex items-center gap-2"
										disabled={saving}
										onClick={() => setIsCreateAllowanceTypeDialogOpen(true)}
									>
										<Plus className="h-4 w-4" />
									</Button>
								</div>
								<Select
									value={formData.allowance_type}
									onValueChange={(value) => setFormData({ ...formData, allowance_type: value })}
									disabled={saving}
								>
									<SelectTrigger
										className={`focus:ring-orange-500 focus:border-orange-500 ${
											validationErrors.allowance_type
												? "border-red-500 focus:border-red-500 focus:ring-red-500"
												: ""
										}`}
									>
										<SelectValue placeholder="Please select an allowance type" />
									</SelectTrigger>
									<SelectContent>
										{allowanceTypes.length > 0 ? (
											allowanceTypes.map((type) => (
												<SelectItem key={type.id} value={type.id.toString()}>
													{type.name}
												</SelectItem>
											))
										) : (
											<div className="px-2 py-1.5 text-sm text-gray-500">
												No allowance types available
											</div>
										)}
									</SelectContent>
								</Select>
								{allowanceTypes.length === 0 && (
									<p className="text-xs text-red-500 mt-1">
										No allowance types found. Please create allowance types first.
									</p>
								)}
							</div>

							{/* Calculation Method */}
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
									<SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="fixed">Fixed Amount</SelectItem>
										<SelectItem value="percentage">Percentage of Salary</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Amount/Percentage Fields */}
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
										className={`focus:ring-orange-500 focus:border-orange-500 ${
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
										<p className="text-xs text-gray-500">Enter the fixed allowance amount</p>
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
										className={`focus:ring-orange-500 focus:border-orange-500 ${
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

							{/* Effective From */}
							<div className="space-y-2">
								<Label htmlFor="effective_from" className="text-sm font-medium">
									Effective From *
								</Label>
								<Input
									id="effective_from"
									type="date"
									value={formData.effective_from}
									onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
									className={`focus:ring-orange-500 focus:border-orange-500 ${
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

							{/* Effective To */}
							<div className="space-y-2">
								<Label htmlFor="effective_to" className="text-sm font-medium">
									Effective To (Optional)
								</Label>
								<Input
									id="effective_to"
									type="date"
									value={formData.effective_to}
									onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
									className={`focus:ring-orange-500 focus:border-orange-500 ${
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

						{/* Active Status */}
						<div className="space-y-2">
							<div className="flex flex-row items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<Label className="text-base font-medium">Active Status</Label>
									<p className="text-sm text-gray-500">Enable or disable this allowance</p>
								</div>
								<Switch
									checked={formData.is_active}
									onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
									className="data-[state=checked]:bg-orange-600"
									disabled={saving}
								/>
							</div>
						</div>

						{/* Warning message for high percentage */}
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
							disabled={saving || !allowanceTypes.length || hasValidationErrors()}
						>
							{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{saving ? "Saving..." : editingAllowance ? "Update" : "Create"} Allowance
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<CreateAllowanceTypeDialog
				isOpen={isCreateAllowanceTypeDialogOpen}
				onOpenChange={setIsCreateAllowanceTypeDialogOpen}
				onSuccess={handleAllowanceTypeSuccess}
				disabled={saving}
				isEmbeded
			/>
		</>
	);
}
