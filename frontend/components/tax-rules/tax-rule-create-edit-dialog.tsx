"use client";

import type { ITaxRule, ITaxRuleFormData, TaxableIncomeSource } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { Plus, Loader2, X, PlusCircle } from "lucide-react";
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
import { Textarea } from "../ui/textarea";

interface TaxRuleCreateEditDialogProps {
	taxId: number;
	onSuccess: (taxRule: ITaxRule) => void;
	disabled?: boolean;
	isEmbeded?: boolean;
	// For editing
	taxRule?: ITaxRule | null;
	isOpen?: boolean;
	onClose?: () => void;
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

const OPERATORS = ["+", "-", "*", "/"] as const;
type Operator = (typeof OPERATORS)[number];

// Enhanced bracket type with configurable operators
interface TaxBracket {
	incomeSource: TaxableIncomeSource | "";
	lowerBound: number | null;
	lowerBoundOperator: Operator;
	percentage: number;
	fixedAmountOperator: Operator;
	fixedAmount: number;
}

// Operator between formula groupings
interface FormulaGrouping {
	bracket: TaxBracket;
	groupOperator: Operator | null;
}

export function TaxRuleCreateEditDialog({
	taxId,
	onSuccess,
	disabled = false,
	isEmbeded = false,
	taxRule = null,
	isOpen: externalIsOpen,
	onClose: externalOnClose,
}: TaxRuleCreateEditDialogProps) {
	const isEditMode = !!taxRule;
	const isControlled = externalIsOpen !== undefined && externalOnClose !== undefined;

	const [internalIsOpen, setInternalIsOpen] = useState(false);
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

	const [formulaGroupings, setFormulaGroupings] = useState<FormulaGrouping[]>([
		{
			bracket: {
				incomeSource: "",
				lowerBound: null,
				lowerBoundOperator: "-",
				percentage: 0,
				fixedAmountOperator: "+",
				fixedAmount: 0,
			},
			groupOperator: null,
		},
	]);

	const isOpen = isControlled ? externalIsOpen : internalIsOpen;
	const setIsOpen = isControlled ? externalOnClose : setInternalIsOpen;

	const resetFormulaGroupings = () => {
		setFormulaGroupings([
			{
				bracket: {
					incomeSource: "",
					lowerBound: null,
					lowerBoundOperator: "-",
					percentage: 0,
					fixedAmountOperator: "+",
					fixedAmount: 0,
				},
				groupOperator: null,
			},
		]);
	};

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
		resetFormulaGroupings();
	};

	const parseFormulaFromString = (formula: string) => {
		resetFormData();
	};

	useEffect(() => {
		if (isEditMode && taxRule) {
			let detectedCalculationType: "percentage" | "fixed" | "tax_formula" = "percentage";

			if (taxRule.tax_rule_formula) {
				detectedCalculationType = "tax_formula";
				parseFormulaFromString(taxRule.tax_rule_formula);
			} else if (
				taxRule.tax_rule_fixed_amount !== null &&
				taxRule.tax_rule_fixed_amount !== undefined
			) {
				detectedCalculationType = "fixed";
			} else if (
				taxRule.tax_rule_percentage !== null &&
				taxRule.tax_rule_percentage !== undefined
			) {
				detectedCalculationType = "percentage";
			}

			setCalculationType(detectedCalculationType);
			setFormData({
				institution_tax: taxRule.institution_tax.id,
				tax_rule_name: taxRule.tax_rule_name || "",
				tax_rule_description: taxRule.tax_rule_description || "",
				tax_rule_percentage: taxRule.tax_rule_percentage,
				tax_rule_fixed_amount: taxRule.tax_rule_fixed_amount,
				salary_from: taxRule.salary_from || 0,
				salary_to: taxRule.salary_to || 0,
			});
		} else {
			resetFormData();
		}
	}, [taxRule, isEditMode]);

	const handleCalculationTypeChange = (value: "percentage" | "fixed" | "tax_formula") => {
		setCalculationType(value);
		if (value === "percentage") {
			setFormData({
				...formData,
				tax_rule_fixed_amount: undefined,
				tax_rule_formula: undefined,
				taxable_income_source: undefined,
			});
			resetFormulaGroupings();
		} else if (value === "fixed") {
			setFormData({
				...formData,
				tax_rule_percentage: undefined,
				tax_rule_formula: undefined,
				taxable_income_source: undefined,
			});
			resetFormulaGroupings();
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
		if (formulaGroupings.length === 0) return "";

		const parts = formulaGroupings
			.map((grouping, idx) => {
				const bracket = grouping.bracket;
				if (!bracket.incomeSource) return "";

				let expression = "";

				// Handle income source and lower bound
				if (bracket.lowerBound !== null) {
					expression = `(${bracket.incomeSource} ${bracket.lowerBoundOperator} ${bracket.lowerBound})`;
				} else {
					expression = bracket.incomeSource;
				}

				// Handle percentage
				if (bracket.percentage > 0) {
					expression += ` * ${bracket.percentage / 100}`;
				}

				// Handle fixed amount
				if (bracket.fixedAmount !== 0) {
					const fixedAmountStr =
						bracket.fixedAmount < 0 ? `(${bracket.fixedAmount})` : bracket.fixedAmount.toString();
					expression += ` ${bracket.fixedAmountOperator} ${fixedAmountStr}`;
				}

				const groupingExpression = `[${expression}]`;

				// Add group operator (for groupings after the first)
				if (idx === 0) {
					return groupingExpression;
				} else {
					return `${grouping.groupOperator} ${groupingExpression}`;
				}
			})
			.filter((part) => part !== "");

		return parts.join(" ");
	};

	const addFormulaGrouping = () => {
		setFormulaGroupings([
			...formulaGroupings,
			{
				bracket: {
					incomeSource: "",
					lowerBound: 0,
					lowerBoundOperator: "-",
					percentage: 0,
					fixedAmountOperator: "+",
					fixedAmount: 0,
				},
				groupOperator: "+",
			},
		]);
	};

	const updateBracket = (index: number, field: keyof TaxBracket, value: any) => {
		setFormulaGroupings(
			formulaGroupings.map((grouping, i) =>
				i === index ? { ...grouping, bracket: { ...grouping.bracket, [field]: value } } : grouping,
			),
		);
	};

	const updateGroupOperator = (index: number, operator: Operator) => {
		setFormulaGroupings(
			formulaGroupings.map((grouping, i) =>
				i === index ? { ...grouping, groupOperator: operator } : grouping,
			),
		);
	};

	const removeFormulaGrouping = (index: number) => {
		if (formulaGroupings.length <= 1) return;

		const newGroupings = formulaGroupings.filter((_, i) => i !== index);
		const updatedGroupings = newGroupings.map((grouping, i) => ({
			...grouping,
			groupOperator: i === 0 ? null : grouping.groupOperator,
		}));

		setFormulaGroupings(updatedGroupings);
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
			// Validate formula groupings
			for (let i = 0; i < formulaGroupings.length; i++) {
				const grouping = formulaGroupings[i];
				const bracket = grouping.bracket;

				if (!bracket.incomeSource) {
					toast.error(`Grouping ${i + 1} must have a taxable income source`);
					return;
				}

				if (i > 0 && (bracket.lowerBound === null || bracket.lowerBound === 0)) {
					toast.error(`Grouping ${i + 1} must have a valid lower bound`);
					return;
				}

				if (bracket.percentage < 0 || bracket.percentage > 100) {
					toast.error(`Grouping ${i + 1} percentage must be between 0 and 100`);
					return;
				}

				if (!OPERATORS.includes(bracket.lowerBoundOperator)) {
					toast.error(`Grouping ${i + 1} has invalid lower bound operator`);
					return;
				}
				if (!OPERATORS.includes(bracket.fixedAmountOperator)) {
					toast.error(`Grouping ${i + 1} has invalid fixed amount operator`);
					return;
				}
			}

			for (let i = 1; i < formulaGroupings.length; i++) {
				const grouping = formulaGroupings[i];
				if (!grouping.groupOperator || !OPERATORS.includes(grouping.groupOperator)) {
					toast.error(`Operator before grouping ${i + 1} is invalid`);
					return;
				}
			}
		}

		setIsSubmitting(true);
		try {
			const payload = {
				...formData,
				...(calculationType === "percentage"
					? {
							tax_rule_percentage: formData.tax_rule_percentage,
							tax_rule_fixed_amount: undefined,
							tax_rule_formula: undefined,
							taxable_income_source: undefined,
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
								taxable_income_source: undefined,
								tax_rule_fixed_amount: undefined,
								tax_rule_percentage: undefined,
							}),
			};

			let resultTaxRule: ITaxRule;

			if (isEditMode) {
				resultTaxRule = await taxRulesAPI.update(taxRule!.id, payload);
			} else {
				resultTaxRule = await taxRulesAPI.create(payload);
			}

			onSuccess(resultTaxRule);
			toast.success(isEditMode ? "Tax rule updated successfully" : "Tax rule created successfully");
			setIsOpen(false);
		} catch (error: any) {
			showErrorToast({
				error,
				defaultMessage: isEditMode
					? "An error occurred while updating the tax rule"
					: "An error occurred while creating the tax rule",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		if (!isControlled) {
			setInternalIsOpen(open);
			if (!open) {
				resetFormData();
			}
		}
	};

	const dialogContent = (
		<DialogContent className="sm:max-w-[600px] rounded-2xl border-0 shadow-2xl">
			<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
				<DialogTitle className="text-2xl font-bold text-gray-900">
					{isEditMode ? "Edit Tax Rule" : "Add Tax Rule"}
				</DialogTitle>
				<DialogDescription className="text-gray-600 text-base">
					{isEditMode
						? "Update the tax calculation rule information below."
						: "Create a new tax calculation rule with salary range and calculation method."}
				</DialogDescription>
			</DialogHeader>
			<div className="grid grid-cols-1 gap-6 py-6 overflow-y-auto h-[70svh] md:h-[60svh] px-2">
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
					<Textarea
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
							<RadioGroupItem value="tax_formula" id="tax_formula" />
							<Label htmlFor="tax_formula" className="text-sm font-medium">
								Tax Rule Formula
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
						<Label className="text-sm text-gray-800">Advanced Formula Builder *</Label>

						<div className="space-y-4">
							<Label className="text-sm text-gray-700">Formula Groupings</Label>
							{formulaGroupings.map((grouping, idx) => (
								<div key={idx} className="space-y-3 p-3 border rounded-lg">
									<div className="flex justify-between items-center">
										<span className="font-medium text-sm">Grouping {idx + 1}</span>
										{formulaGroupings.length > 1 && (
											<Button
												variant="ghost"
												size="icon"
												onClick={() => removeFormulaGrouping(idx)}
												className="ml-2 p-1 h-6 w-6"
												disabled={isSubmitting}
											>
												<X className="h-4 w-4 text-red-500" />
											</Button>
										)}
									</div>

									{idx > 0 && (
										<div className="space-y-2">
											<Label className="text-xs text-gray-600">Operator Before Grouping</Label>
											<Select
												value={grouping.groupOperator || "+"}
												onValueChange={(value) => updateGroupOperator(idx, value as Operator)}
												disabled={isSubmitting}
											>
												<SelectTrigger className="w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base p-2">
													{grouping.groupOperator}
												</SelectTrigger>
												<SelectContent>
													{OPERATORS.map((op) => (
														<SelectItem key={op} value={op}>
															{op}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}

									<div className="space-y-2">
										<Label className="text-xs text-gray-600">Income Source *</Label>
										<Select
											value={grouping.bracket.incomeSource}
											onValueChange={(value) =>
												updateBracket(idx, "incomeSource", value as TaxableIncomeSource)
											}
											disabled={isSubmitting}
										>
											<SelectTrigger className="w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base p-2">
												{incomeSourcesMapper.find(
													(source) => source.value === grouping.bracket.incomeSource,
												)?.label || "Select income source"}
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

									{idx > 0 && (
										<div className="space-y-2">
											<Label className="text-xs text-gray-600">Lower Bound & Operator</Label>
											<div className="grid grid-cols-3 gap-2">
												<Select
													value={grouping.bracket.lowerBoundOperator}
													onValueChange={(value) =>
														updateBracket(idx, "lowerBoundOperator", value as Operator)
													}
													disabled={isSubmitting}
												>
													<SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base p-2">
														{grouping.bracket.lowerBoundOperator}
													</SelectTrigger>
													<SelectContent>
														{OPERATORS.map((op) => (
															<SelectItem key={op} value={op}>
																{op}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormattedNumberInput
													value={grouping.bracket.lowerBound || ""}
													onValueChange={(val) =>
														updateBracket(idx, "lowerBound", !val ? 0 : Number(val))
													}
													placeholder="e.g., 410000"
													disabled={isSubmitting}
													className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base col-span-2"
												/>
											</div>
										</div>
									)}

									<div className="space-y-2">
										<Label className="text-xs text-gray-600">Percentage (%)</Label>
										<FormattedNumberInput
											value={grouping.bracket.percentage}
											onValueChange={(val) => updateBracket(idx, "percentage", Number(val))}
											placeholder="e.g., 30"
											min="0"
											max="100"
											step="0.01"
											disabled={isSubmitting}
											className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-xs text-gray-600">Fixed Amount</Label>
										<div className="grid grid-cols-3 gap-2">
											<Select
												value={grouping.bracket.fixedAmountOperator}
												onValueChange={(value) =>
													updateBracket(idx, "fixedAmountOperator", value as Operator)
												}
												disabled={isSubmitting}
											>
												<SelectTrigger className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base p-2">
													{grouping.bracket.fixedAmountOperator}
												</SelectTrigger>
												<SelectContent>
													{OPERATORS.map((op) => (
														<SelectItem key={op} value={op}>
															{op}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormattedNumberInput
												value={grouping.bracket.fixedAmount}
												onValueChange={(val) => updateBracket(idx, "fixedAmount", Number(val))}
												placeholder="e.g., 48500"
												step="0.01"
												disabled={isSubmitting}
												className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base col-span-2"
											/>
										</div>
									</div>
								</div>
							))}

							<Button
								variant="outline"
								className="rounded-xl w-full"
								onClick={addFormulaGrouping}
								disabled={isSubmitting}
							>
								<PlusCircle className="h-4 w-4 mr-2" />
								Add Grouping
							</Button>
						</div>

						<div>
							<Label className="text-sm text-gray-700">Formula Preview</Label>
							<Input
								readOnly
								value={buildFormulaString()}
								placeholder="e.g., [(gross_salary * 0.1)] + [(basic_salary - 410000) * 0.3 - 48500]"
								className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Examples: "[(gross_salary * 0.1)] + [(basic_salary - 410000) * 0.3 - 48500]" or
								"[taxable_gross_salary + 10000] / [basic_salary * 0.25]"
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
				{isEditMode && (
					<Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
						Cancel
					</Button>
				)}
				<Button
					onClick={handleSubmit}
					disabled={isSubmitting}
					className="bg-primary rounded-full w-full"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="mr-2 h-5 w-5 animate-spin" />
							{isEditMode ? "Updating..." : "Creating..."}
						</>
					) : isEditMode ? (
						"Update Tax Rule"
					) : (
						"Create Tax Rule"
					)}
				</Button>
			</DialogFooter>
		</DialogContent>
	);

	if (isEditMode) {
		return (
			<Dialog open={isOpen} onOpenChange={isControlled ? undefined : handleOpenChange}>
				{dialogContent}
			</Dialog>
		);
	}

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
			{dialogContent}
		</Dialog>
	);
}
