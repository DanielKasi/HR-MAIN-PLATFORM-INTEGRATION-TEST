"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { taxRulesAPI } from "@/lib/utils";
import type { ITaxRule, ITaxRuleFormData } from "@/types/types.utils";
import FormattedNumberInput from "../common/inputs/formatted-number-input";

interface CreateTaxRuleDialogProps {
	taxId: number;
	onSuccess: (newTaxRule: ITaxRule) => void;
	disabled?: boolean;
	isEmbeded?: boolean;
}

export function CreateTaxRuleDialog({
	taxId,
	onSuccess,
	disabled = false,
	isEmbeded = false,
}: CreateTaxRuleDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [calculationType, setCalculationType] = useState<"percentage" | "fixed">("percentage");
	const [formData, setFormData] = useState<ITaxRuleFormData>({
		institution_tax: taxId,
		tax_rule_name: "",
		tax_rule_description: "",
		tax_rule_percentage: undefined,
		tax_rule_fixed_amount: undefined,
		salary_from: 0,
		salary_to: 0,
	});

	const resetFormData = () => {
		setFormData({
			institution_tax: taxId,
			tax_rule_name: "",
			tax_rule_description: "",
			tax_rule_percentage: undefined,
			tax_rule_fixed_amount: undefined,
			salary_from: 0,
			salary_to: 0,
		});
		setCalculationType("percentage");
	};

	const handleCalculationTypeChange = (value: "percentage" | "fixed") => {
		setCalculationType(value);
		// Clear the other field when switching types
		if (value === "percentage") {
			setFormData({ ...formData, tax_rule_fixed_amount: undefined });
		} else {
			setFormData({ ...formData, tax_rule_percentage: undefined });
		}
	};

	const handleSubmit = async () => {
		if (!formData.tax_rule_name.trim()) {
			toast.error("Please enter a tax rule name");
			return;
		}

		if (!formData.salary_from || !formData.salary_to) {
			toast.error("Please enter salary range");
			return;
		}

		if (formData.salary_from >= formData.salary_to) {
			toast.error("Salary 'from' must be less than salary 'to'");
			return;
		}

		if (calculationType === "percentage" && !formData.tax_rule_percentage) {
			toast.error("Please enter a percentage rate");
			return;
		}

		if (calculationType === "fixed" && !formData.tax_rule_fixed_amount) {
			toast.error("Please enter a fixed amount");
			return;
		}

		setIsSubmitting(true);
		try {
			// Prepare data based on calculation type
			const createData = {
				...formData,
				// Only include the relevant field based on calculation type
				...(calculationType === "percentage"
					? {
							tax_rule_percentage: formData.tax_rule_percentage,
							tax_rule_fixed_amount: undefined,
						}
					: {
							tax_rule_fixed_amount: formData.tax_rule_fixed_amount,
							tax_rule_percentage: undefined,
						}),
			};

			// Use actual API call
			const newTaxRule = await taxRulesAPI.create(createData);
			onSuccess(newTaxRule);
			toast.success("Tax rule created successfully");
			resetFormData();
			setIsOpen(false);
		} catch (error: any) {
			console.error("Error creating tax rule:", error);
			toast.error(error.message || "An error occurred while creating the tax rule");
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
					variant={isEmbeded ? "outline" : "default"}
					className="flex items-center gap-2"
					disabled={disabled}
				>
					<Plus className="h-4 w-4" />
					{!isEmbeded ? "Add Tax Rule" : ""}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<DialogTitle className="text-2xl font-bold text-gray-900">Add Tax Rule</DialogTitle>
					<DialogDescription className="text-gray-600 text-base">
						Create a new tax calculation rule with salary range and calculation method.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-6 py-6">
					<div className="space-y-3">
						<Label htmlFor="tax_rule_name" className="text-sm text-gray-800">
							Tax Rule Name *
						</Label>
						<Input
							id="tax_rule_name"
							value={formData.tax_rule_name}
							onChange={(e) => setFormData({ ...formData, tax_rule_name: e.target.value })}
							placeholder="e.g., Basic Rate, Higher Rate"
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
						/>
					</div>

					<div className="space-y-3">
						<Label htmlFor="tax_rule_description" className="text-sm text-gray-800">
							Description
						</Label>
						<Input
							id="tax_rule_description"
							value={formData.tax_rule_description || ""}
							onChange={(e) => setFormData({ ...formData, tax_rule_description: e.target.value })}
							placeholder="e.g., Basic income tax rate for low earners"
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
						/>
					</div>

					<div className="space-y-4">
						<Label className="text-sm text-gray-800">Calculation Method *</Label>
						<RadioGroup
							value={calculationType}
							onValueChange={handleCalculationTypeChange}
							className="flex flex-col space-y-3"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="percentage" id="percentage" />
								<Label htmlFor="percentage" className="text-sm font-medium">
									Percentage Rate
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="fixed" id="fixed" />
								<Label htmlFor="fixed" className="text-sm font-medium">
									Fixed Amount
								</Label>
							</div>
						</RadioGroup>
					</div>

					{calculationType === "percentage" && (
						<div className="space-y-3">
							<Label htmlFor="tax_rule_percentage" className="text-sm text-gray-800">
								Percentage Rate *
							</Label>
							<div className="relative">
								<FormattedNumberInput
									id="tax_rule_percentage"
									type="number"
									min="0"
									max="100"
									step="0.01"
									value={formData.tax_rule_percentage || ""}
									onValueChange={(e) => setFormData({ ...formData, tax_rule_percentage: e })}
									placeholder="e.g., 10.5"
									disabled={isSubmitting}
									className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pr-8"
								/>
								<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
									%
								</span>
							</div>
						</div>
					)}

					{calculationType === "fixed" && (
						<div className="space-y-3">
							<Label htmlFor="tax_rule_fixed_amount" className="text-sm text-gray-800">
								Fixed Amount *
							</Label>
							<div className="relative">
								<FormattedNumberInput
									id="tax_rule_fixed_amount"
									min="0"
									step="0.01"
									value={formData.tax_rule_fixed_amount || ""}
									onValueChange={(val) => setFormData({ ...formData, tax_rule_fixed_amount: val })}
									placeholder="e.g., 5000.00"
									disabled={isSubmitting}
									className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pl-8"
								/>
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-3">
							<Label htmlFor="salary_from" className="text-sm text-gray-800">
								Salary From *
							</Label>
							<div className="relative">
								<FormattedNumberInput
									id="salary_from"
									type="number"
									min="0"
									step="0.01"
									value={formData.salary_from || ""}
									onValueChange={(value) => setFormData({ ...formData, salary_from: value })}
									placeholder="e.g., 0"
									disabled={isSubmitting}
									className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pl-8"
								/>
							</div>
						</div>

						<div className="space-y-3">
							<Label htmlFor="salary_to" className="text-sm text-gray-800">
								Salary To *
							</Label>
							<div className="relative">
								<FormattedNumberInput
									id="salary_to"
									type="number"
									min="0"
									step="0.01"
									value={formData.salary_to || ""}
									onValueChange={(val) => setFormData({ ...formData, salary_to: val })}
									placeholder="e.g., 50000"
									disabled={isSubmitting}
									className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pl-8"
								/>
							</div>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting}
						className="bg-primary rounded-full w-full"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Creating...
							</>
						) : (
							"Create Tax Rule"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
