"use client";

import type { ITaxRule, ITaxRuleFormData, TaxableIncomeSource } from "@/types/types.utils";

import { useState } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import FormattedNumberInput from "../common/inputs/formatted-number-input";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { showErrorToast, taxRulesAPI } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";

interface CreateTaxRuleDialogProps {
	taxId: number;
	onSuccess: (newTaxRule: ITaxRule) => void;
	disabled?: boolean;
	isEmbeded?: boolean;
}

const incomeSourcesMapper: Array<{ value: TaxableIncomeSource; label: string }> = [
	{
		value: "taxable_gross_salary",
		label: "Taxable Gross Salary",
	},
	{
		value: "gross_salary",
		label: "Gross Salary",
	},
	{
		value: "basic_salary",
		label: "Basic Salary",
	},
];

export function CreateTaxRuleDialog({
	taxId,
	onSuccess,
	disabled = false,
	isEmbeded = false,
}: CreateTaxRuleDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [calculationType, setCalculationType] = useState<"percentage" | "fixed" | "tax_formula">(
		"percentage",
	);
	const [formData, setFormData] = useState<ITaxRuleFormData>({
		institution_tax: taxId,
		tax_rule_name: "",
		tax_rule_description: "",
		tax_rule_percentage: undefined,
		tax_rule_fixed_amount: undefined,
		salary_from: 0,
		salary_to: 0,
	});

	type FormulaPart = { op: "+" | "-" | "*" | "/"; value: string };
	const [formulaSource, setFormulaSource] = useState<
		"" | "taxable_gross_salary" | "gross_salary" | "basic_salary"
	>("");
	const [formulaParts, setFormulaParts] = useState<FormulaPart[]>([]);

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
		setFormulaSource("");
		setFormulaParts([]);
	};

	const handleCalculationTypeChange = (value: "percentage" | "fixed" | "tax_formula") => {
		setCalculationType(value);
		if (value === "percentage") {
			setFormData({
				...formData,
				tax_rule_fixed_amount: undefined,
				tax_rule_formula: undefined,
				taxable_income_source: undefined,
			});
			setFormulaSource("");
			setFormulaParts([]);
		} else if (value === "fixed") {
			setFormData({
				...formData,
				tax_rule_percentage: undefined,
				tax_rule_formula: undefined,
				taxable_income_source: undefined,
			});
			setFormulaSource("");
			setFormulaParts([]);
		} else {
			// tax_formula selected
			setFormData({
				...formData,
				tax_rule_percentage: undefined,
				tax_rule_fixed_amount: undefined,
			});
		}
	};

	const buildFormulaString = () => {
		if (!formulaSource) return "";
		let res = formulaSource;
		formulaParts.forEach((p) => {
			const val = p.value?.toString() || "0";
			res += ` ${p.op} ${val}`;
		});
		return res;
	};

	const addFormulaPart = () => {
		setFormulaParts((s) => [...s, { op: "+", value: "" }]);
	};

	const updateFormulaPart = (index: number, part: Partial<FormulaPart>) => {
		setFormulaParts((s) => s.map((p, i) => (i === index ? { ...p, ...part } : p)));
	};

	const removeFormulaPart = (index: number) => {
		setFormulaParts((s) => s.filter((_, i) => i !== index));
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

		if (calculationType === "tax_formula") {
			if (!formulaSource) {
				toast.error("Please select taxable income source for formula");
				return;
			}
			// at least one part is optional, but ensure parts values are valid numbers if present
			for (const p of formulaParts) {
				if (!p.value || Number.isNaN(Number(p.value))) {
					toast.error("Please enter valid numeric values for formula parts");
					return;
				}
			}
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
					: calculationType === "fixed"
						? {
								tax_rule_fixed_amount: formData.tax_rule_fixed_amount,
								tax_rule_percentage: undefined,
								tax_rule_formula: undefined,
								taxable_income_source: undefined,
							}
						: {
								tax_rule_formula: buildFormulaString(),
								taxable_income_source: formulaSource || undefined,
								tax_rule_fixed_amount: undefined,
								tax_rule_percentage: undefined,
							}),
			};

			const newTaxRule = await taxRulesAPI.create(createData);

			onSuccess(newTaxRule);
			toast.success("Tax rule created successfully");
			resetFormData();
			setIsOpen(false);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "An error occurred while creating the tax rule" });
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
					className="flex items-center gap-2 rounded-xl"
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
				<div className="grid grid-cols-1 gap-6 py-6 overflow-y-auto h-[70svh] md:h-[60svh]">
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
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="tax_formula" id="fixed" />
								<Label htmlFor="tax_formula" className="text-sm font-medium">
									Tax rule Formula
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

					{calculationType === "tax_formula" && (
						<div className="space-y-4">
							<Label className="text-sm text-gray-800">Formula Builder *</Label>

							{/* Taxable income source select */}
							<div className="space-y-2">
								<Label className="text-sm text-gray-700">Taxable Income Source</Label>

								<Select
									value={formulaSource}
									onValueChange={(value) => setFormulaSource(value as TaxableIncomeSource)}
									disabled={isSubmitting}
								>
									<SelectTrigger className="w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base p-2">
										{incomeSourcesMapper.find((formula) => formula.value === formulaSource)
											?.label || "Select source "}
									</SelectTrigger>
									<SelectContent>
										{incomeSourcesMapper.map((source, idx) => (
											<SelectItem key={idx} value={source.value}>
												{source.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label className="text-sm text-gray-700">Formula Parts</Label>
								{formulaParts.length === 0 && (
									<div className="text-sm text-gray-500">
										No additional parts. You can add operations (e.g. - 235000).
									</div>
								)}
								{formulaParts.map((part, idx) => (
									<div key={idx} className="flex items-center gap-2">
										<div className="grid grid-cols-2 gap-2">
											<Select
												value={part.op}
												onValueChange={(value) =>
													updateFormulaPart(idx, { op: value as FormulaPart["op"] })
												}
												disabled={isSubmitting}
											>
												<SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base p-2 "></SelectTrigger>
												<SelectContent>
													<SelectItem value={"+"}>+</SelectItem>
													<SelectItem value={"-"}>-</SelectItem>
													<SelectItem value={"*"}>*</SelectItem>
													<SelectItem value={"/"}>/</SelectItem>
												</SelectContent>
											</Select>

											<div className="flex-1 min-w-20">
												<FormattedNumberInput
													value={part.value || ""}
													onValueChange={(val) => updateFormulaPart(idx, { value: val.toString() })}
													placeholder="e.g., 235000"
													disabled={isSubmitting}
													className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base pl-3 w-full"
												/>
											</div>
										</div>

										<Button
											variant="ghost"
											size="icon"
											onClick={() => removeFormulaPart(idx)}
											className="ml-2 p-2"
											disabled={isSubmitting}
										>
											<X className="h-4 w-4 text-red-500" />
										</Button>
									</div>
								))}

								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										className="rounded-xl"
										onClick={addFormulaPart}
										disabled={isSubmitting}
									>
										Add Part
									</Button>
									<div className="text-sm text-gray-500">Parts are applied left-to-right</div>
								</div>
							</div>

							{/* Preview */}
							<div>
								<Label className="text-sm text-gray-700">Formula Preview</Label>
								<Input
									readOnly
									value={buildFormulaString()}
									placeholder="e.g., (taxable_gross_salary - 235000) * 0.10"
									className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Example: '(taxable_gross_salary - 235000) * 0.10' or '(gross_salary - 410000) *
									0.30 + 25000'
								</p>
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
