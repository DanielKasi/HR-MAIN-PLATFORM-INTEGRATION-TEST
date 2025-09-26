"use client";

import type { ITaxRule, ITaxRuleFormData, TaxableIncomeSource } from "@/types/types.utils";

import { useState } from "react";
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

// Updated type for tax brackets - each bracket can have its own income source
interface TaxBracket {
	incomeSource: TaxableIncomeSource | "";
	lowerBound: number | null; // null for first bracket
	percentage: number;
	fixedAmount: number;
}

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

	// State for complex formula - each bracket has its own income source
	const [brackets, setBrackets] = useState<TaxBracket[]>([
		{ incomeSource: "", lowerBound: null, percentage: 0, fixedAmount: 0 },
	]);

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
		setBrackets([{ incomeSource: "", lowerBound: null, percentage: 0, fixedAmount: 0 }]);
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
			setBrackets([{ incomeSource: "", lowerBound: null, percentage: 0, fixedAmount: 0 }]);
		} else if (value === "fixed") {
			setFormData({
				...formData,
				tax_rule_percentage: undefined,
				tax_rule_formula: undefined,
				taxable_income_source: undefined,
			});
			setBrackets([{ incomeSource: "", lowerBound: null, percentage: 0, fixedAmount: 0 }]);
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
		if (brackets.length === 0) return "";

		const parts = brackets
			.map((bracket) => {
				if (!bracket.incomeSource) return "";

				const source = bracket.incomeSource;
				const lowerBound = bracket.lowerBound;
				const percentage = bracket.percentage;
				const fixedAmount = bracket.fixedAmount;

				let expression = "";

				if (lowerBound !== null) {
					expression = `(${source} - ${lowerBound})`;
				} else {
					expression = source;
				}

				if (percentage > 0) {
					expression += ` * ${percentage / 100}`;
				}

				if (fixedAmount > 0) {
					expression += ` + ${fixedAmount}`;
				}

				return `[${expression}]`;
			})
			.filter((part) => part !== ""); // Remove empty parts

		return parts.join(" + ");
	};

	const addBracket = () => {
		setBrackets([...brackets, { incomeSource: "", lowerBound: 0, percentage: 0, fixedAmount: 0 }]);
	};

	const updateBracket = (index: number, field: keyof TaxBracket, value: any) => {
		setBrackets(
			brackets.map((bracket, i) => (i === index ? { ...bracket, [field]: value } : bracket)),
		);
	};

	const removeBracket = (index: number) => {
		if (brackets.length <= 1) return;
		setBrackets(brackets.filter((_, i) => i !== index));
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
			// Validate brackets
			for (let i = 0; i < brackets.length; i++) {
				const bracket = brackets[i];

				// Income source is required for each bracket
				if (!bracket.incomeSource) {
					toast.error(`Bracket ${i + 1} must have a taxable income source`);
					return;
				}

				// First bracket can have null lowerBound, others must have valid numbers
				if (i > 0 && (bracket.lowerBound === null || bracket.lowerBound <= 0)) {
					toast.error(`Bracket ${i + 1} must have a valid lower bound`);
					return;
				}

				// Percentage must be between 0-100
				if (bracket.percentage < 0 || bracket.percentage > 100) {
					toast.error(`Bracket ${i + 1} percentage must be between 0 and 100`);
					return;
				}

				// Fixed amount must be non-negative
				if (bracket.fixedAmount < 0) {
					toast.error(`Bracket ${i + 1} fixed amount cannot be negative`);
					return;
				}

				// At least one of percentage or fixed amount must be set
				if (bracket.percentage === 0 && bracket.fixedAmount === 0) {
					toast.error(`Bracket ${i + 1} must have either a percentage or fixed amount`);
					return;
				}
			}

			// Validate bracket order (lower bounds must be increasing)
			for (let i = 1; i < brackets.length; i++) {
				const current = brackets[i].lowerBound!;
				const previous = brackets[i - 1].lowerBound;

				if (previous !== null && current <= previous) {
					toast.error(`Bracket ${i + 1} lower bound must be greater than previous bracket`);
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
								// For complex formulas, we don't set a single taxable_income_source
								// since each bracket has its own
								taxable_income_source: undefined,
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
							<Label className="text-sm text-gray-800">Complex Formula Builder *</Label>

							{/* Brackets */}
							<div className="space-y-4">
								<Label className="text-sm text-gray-700">Tax Brackets</Label>
								{brackets.map((bracket, idx) => (
									<div key={idx} className="space-y-3 p-3 border rounded-lg">
										<div className="flex justify-between items-center">
											<span className="font-medium text-sm">Bracket {idx + 1}</span>
											{brackets.length > 1 && (
												<Button
													variant="ghost"
													size="icon"
													onClick={() => removeBracket(idx)}
													className="ml-2 p-1 h-6 w-6"
													disabled={isSubmitting}
												>
													<X className="h-4 w-4 text-red-500" />
												</Button>
											)}
										</div>

										{/* Income Source per bracket */}
										<div className="space-y-2">
											<Label className="text-xs text-gray-600">Taxable Income Source *</Label>
											<Select
												value={bracket.incomeSource}
												onValueChange={(value) =>
													updateBracket(idx, "incomeSource", value as TaxableIncomeSource)
												}
												disabled={isSubmitting}
											>
												<SelectTrigger className="w-full rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base p-2">
													{incomeSourcesMapper.find(
														(source) => source.value === bracket.incomeSource,
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
												<Label className="text-xs text-gray-600">Lower Bound</Label>
												<FormattedNumberInput
													value={bracket.lowerBound || ""}
													onValueChange={(val) =>
														updateBracket(idx, "lowerBound", !val ? 0 : Number(val))
													}
													placeholder="e.g., 410000"
													disabled={isSubmitting}
													className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
												/>
											</div>
										)}

										<div className="grid grid-cols-2 gap-3">
											<div className="space-y-2">
												<Label className="text-xs text-gray-600">Percentage (%)</Label>
												<FormattedNumberInput
													value={bracket.percentage}
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
												<FormattedNumberInput
													value={bracket.fixedAmount}
													onValueChange={(val) => updateBracket(idx, "fixedAmount", Number(val))}
													placeholder="e.g., 48500"
													min="0"
													step="0.01"
													disabled={isSubmitting}
													className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
												/>
											</div>
										</div>
									</div>
								))}

								<Button
									variant="outline"
									className="rounded-xl w-full"
									onClick={addBracket}
									disabled={isSubmitting}
								>
									<PlusCircle className="h-4 w-4 mr-2" />
									Add Bracket
								</Button>
							</div>

							{/* Preview */}
							<div>
								<Label className="text-sm text-gray-700">Formula Preview</Label>
								<Input
									readOnly
									value={buildFormulaString()}
									placeholder="e.g., [(gross_salary * 0.1)] + [(basic_salary - 410000) * 0.3 + 48500]"
									className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Example: "[(gross_salary * 0.1)] + [(basic_salary - 410000) * 0.3 + 48500]"
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
