"use client";

import type {
	ITaxRule,
	ITaxRuleCategory,
	ITaxRuleFormData,
	TaxableIncomeSource,
} from "@/types/types.utils";
import { useState, useEffect, useRef } from "react";
import { Plus, Loader2, X, PlusCircle, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TaxRuleCreateEditDialogProps {
	taxId: number;
	onSuccess: (taxRule: ITaxRule) => void;
	disabled?: boolean;
	isEmbeded?: boolean;
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

type TokenType =
	| "income_source"
	| "fixed_amount"
	| "percentage"
	| "operator"
	| "open_paren"
	| "close_paren"
	| "open_bracket"
	| "close_bracket";

interface Token {
	id: string;
	type: TokenType;
	value: string;
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
	const [taxRuleCategories, setTaxRuleCatgories] = useState<ITaxRuleCategory[]>([]);
	const [formData, setFormData] = useState<ITaxRuleFormData>({
		institution_tax: taxId,
		tax_rule_name: "",
		tax_rule_description: "",
		tax_rule_percentage: undefined,
		tax_rule_fixed_amount: undefined,
		tax_rule_formula: undefined,
		salary_from: 0,
		salary_to: 0,
	});
	const [tokens, setTokens] = useState<Token[]>([]);
	const [showTokenMenu, setShowTokenMenu] = useState(false);
	const tokenMenuRef = useRef<HTMLDivElement>(null);

	const isOpen = isControlled ? externalIsOpen : internalIsOpen;
	const setIsOpen = isControlled ? externalOnClose : setInternalIsOpen;

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
		setTokens([]);
	};

	useEffect(() => {
		fetchTaxRuleCategories();
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const fetchTaxRuleCategories = async () => {
		try {
			const categories = await taxRulesAPI.categories.getAll();
			setTaxRuleCatgories(categories);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch tax rule categories" });
		}
	};

	useEffect(() => {
		if (isEditMode && taxRule) {
			let detectedCalculationType: "percentage" | "fixed" | "tax_formula" = "percentage";
			if (taxRule.tax_rule_formula) {
				detectedCalculationType = "tax_formula";
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
			if (taxRule.tax_rule_formula) {
				const tokenize = (formula: string): Token[] => {
					const tokens: Token[] = [];
					// Match: brackets, parens, percentages, numbers, operators, identifiers
					const regex = /(\[|\]|\(|\)|\d+(?:\.\d+)?%?|[+\-*/]|[a-zA-Z_][a-zA-Z0-9_]*)/g;
					let match;
					let idCounter = 0;
					while ((match = regex.exec(formula)) !== null) {
						const raw = match[0].trim();
						if (!raw) continue;

						// Determine token type
						if (raw === "[") {
							tokens.push({ id: `t${++idCounter}`, type: "open_bracket", value: "[" });
						} else if (raw === "]") {
							tokens.push({ id: `t${++idCounter}`, type: "close_bracket", value: "]" });
						} else if (raw === "(") {
							tokens.push({ id: `t${++idCounter}`, type: "open_paren", value: "(" });
						} else if (raw === ")") {
							tokens.push({ id: `t${++idCounter}`, type: "close_paren", value: ")" });
						} else if (OPERATORS.includes(raw as Operator)) {
							tokens.push({ id: `t${++idCounter}`, type: "operator", value: raw });
						} else if (raw.endsWith("%")) {
							const numPart = raw.slice(0, -1);
							tokens.push({ id: `t${++idCounter}`, type: "percentage", value: numPart });
						} else if (!isNaN(parseFloat(raw))) {
							tokens.push({ id: `t${++idCounter}`, type: "fixed_amount", value: raw });
						} else if (incomeSourcesMapper.some((src) => src.value === raw)) {
							tokens.push({ id: `t${++idCounter}`, type: "income_source", value: raw });
						} else {
							// Fallback: treat as fixed amount (for backward compatibility)
							tokens.push({ id: `t${++idCounter}`, type: "fixed_amount", value: raw });
						}
					}
					return tokens;
				};

				setTokens(tokenize(taxRule.tax_rule_formula));
			}
		} else {
			resetFormData();
		}
	}, [taxRule, isEditMode]);

	const handleClickOutside = (event: MouseEvent) => {
		if (tokenMenuRef.current && !tokenMenuRef.current.contains(event.target as Node)) {
			setShowTokenMenu(false);
		}
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
			setTokens([]);
		} else if (value === "fixed") {
			setFormData({
				...formData,
				tax_rule_percentage: undefined,
				tax_rule_formula: undefined,
				taxable_income_source: undefined,
			});
			setTokens([]);
		} else {
			setFormData({
				...formData,
				tax_rule_percentage: undefined,
				tax_rule_fixed_amount: undefined,
			});
		}
	};

	const buildFormulaString = () => {
		return tokens
			.map((token) => (token.type != "percentage" ? token.value : `${token.value}%`))
			.join(" ");
	};

	const addToken = (type: TokenType, value: string) => {
		const newToken: Token = {
			id: Date.now().toString(),
			type,
			value,
		};
		setTokens([...tokens, newToken]);
	};

	const removeToken = (id: string) => {
		setTokens(tokens.filter((token) => token.id !== id));
	};

	const insertTokenAt = (index: number, type: TokenType, value: string) => {
		const newToken: Token = {
			id: Date.now().toString(),
			type,
			value,
		};
		const newTokens = [...tokens];
		newTokens.splice(index, 0, newToken);
		setTokens(newTokens);
	};

	const handleSubmit = async () => {
		if (!formData.tax_rule_name.trim()) {
			toast.error("Please enter a tax rule name");
			return;
		}
		if (!formData.salary_from) {
			toast.error("You must provide a salary lower bound");
			return;
		}
		if (formData.salary_to && formData.salary_from >= formData.salary_to) {
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
		if (calculationType === "tax_formula" && tokens.length === 0) {
			toast.error("Please build a formula");
			return;
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
		setInternalIsOpen(open);
		if (!open) {
			resetFormData();
		}
		setIsOpen(open);
	};

	const renderTokenInput = (token: Token, index: number) => {
		switch (token.type) {
			case "income_source":
				return (
					<Select
						value={token.value}
						onValueChange={(value) => {
							const newTokens = [...tokens];
							newTokens[index] = { ...token, value };
							setTokens(newTokens);
						}}
					>
						<SelectTrigger className="w-full min-w-[150px] max-w-[180px] rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base p-2">
							<SelectValue placeholder="Select income source" />
						</SelectTrigger>
						<SelectContent>
							{incomeSourcesMapper.map((source) => (
								<SelectItem key={source.value} value={source.value}>
									{source.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			case "fixed_amount":
				return (
					<FormattedNumberInput
						value={token.value}
						onValueChange={(value) => {
							const newTokens = [...tokens];
							newTokens[index] = { ...token, value: value.toString() };
							setTokens(newTokens);
						}}
						placeholder="e.g., 235000"
						className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base max-w-[100px]"
					/>
				);
			case "percentage":
				return (
					<div className="relative">
						<FormattedNumberInput
							value={token.value}
							onValueChange={(value) => {
								const newTokens = [...tokens];
								newTokens[index] = { ...token, value: value.toString() };
								setTokens(newTokens);
							}}
							placeholder="e.g., 10"
							min="0"
							max="100"
							step="0.01"
							className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base pr-8 max-w-[100px]"
						/>
						<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
							%
						</span>
					</div>
				);
			case "operator":
				return (
					<Select
						value={token.value}
						onValueChange={(value) => {
							const newTokens = [...tokens];
							newTokens[index] = { ...token, value };
							setTokens(newTokens);
						}}
					>
						<SelectTrigger className="w-full min-w-[60px] rounded-xl border-gray-200 focus:border-primary/50 focus:ring-primary/20 text-base p-2">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{OPERATORS.map((op) => (
								<SelectItem key={op} value={op}>
									{op}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			default:
				return (
					<Button variant="outline" className="rounded-xl min-w-[40px] h-10" disabled>
						{token.value}
					</Button>
				);
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
						className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base"
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
						className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base"
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
								className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base pr-8"
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
								className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base pl-8"
							/>
						</div>
					</div>
				)}
				{calculationType === "tax_formula" && (
					<div className="space-y-4">
						<Label className="text-sm text-gray-800">Formula Builder *</Label>
						<div className="space-y-4">
							<div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
								{tokens.map((token, index) => (
									<div key={token.id} className="flex items-center gap-1">
										{renderTokenInput(token, index)}
										<Button
											variant="ghost"
											size="icon"
											onClick={() => removeToken(token.id)}
											className="h-6 w-6 p-0"
										>
											<X className="h-3 w-3 text-red-500" />
										</Button>
									</div>
								))}
								{tokens.length === 0 && (
									<div className="text-sm text-gray-500">
										Click "Add" to start building your formula
									</div>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Popover open={showTokenMenu} onOpenChange={setShowTokenMenu}>
									<PopoverTrigger asChild>
										<Button className="rounded-xl">
											<PlusCircle className="h-4 w-4 mr-2" />
											Add
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-48 p-2" ref={tokenMenuRef}>
										<div className="grid grid-cols-2 gap-1">
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													addToken("open_bracket", "[");
													setShowTokenMenu(false);
												}}
												className="text-xs"
											>
												{"[ Group"}
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													addToken("open_paren", "(");
													setShowTokenMenu(false);
												}}
												className="text-xs"
											>
												{"( Bracket"}
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													addToken("income_source", "");
													setShowTokenMenu(false);
												}}
												className="text-xs"
											>
												Income Source
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													addToken("fixed_amount", "");
													setShowTokenMenu(false);
												}}
												className="text-xs"
											>
												Fixed Amount
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													addToken("percentage", "");
													setShowTokenMenu(false);
												}}
												className="text-xs"
											>
												Percentage
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													addToken("operator", "+");
													setShowTokenMenu(false);
												}}
												className="text-xs"
											>
												Operator
											</Button>
											{tokens.some((t) => t.value === "[") && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														addToken("close_bracket", "]");
														setShowTokenMenu(false);
													}}
													className="text-xs"
												>
													{"] Close Group"}
												</Button>
											)}
											{tokens.some((t) => t.value === "(") && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														addToken("close_paren", ")");
														setShowTokenMenu(false);
													}}
													className="text-xs"
												>
													{") Close Bracket"}
												</Button>
											)}
										</div>
									</PopoverContent>
								</Popover>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setTokens([])}
									className="text-xs"
								>
									<Trash2 className="h-3 w-3 mr-1" />
									Clear
								</Button>
							</div>
						</div>
						<div>
							<Label className="text-sm text-gray-700">Formula Preview</Label>
							<Input
								readOnly
								value={buildFormulaString()}
								placeholder="e.g., taxable_gross_salary * 0.1"
								className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Examples: "taxable_gross_salary * 0.1" or "(taxable_gross_salary - 235000) * 0.1"
							</p>
						</div>
					</div>
				)}

				<div className="space-y-3">
					<Label htmlFor="tax_tule_category" className="text-sm text-gray-800">
						Tax rule category (optional)
					</Label>

					<Select
						value={formData.tax_rule_category?.toString() || ""}
						onValueChange={(value) => {
							setFormData({ ...formData, tax_rule_category: parseInt(value) });
						}}
					>
						<SelectTrigger className="w-full min-w-[150px] max-w-[180px] rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base p-2">
							<SelectValue placeholder="Select tax rule category" />
						</SelectTrigger>
						<SelectContent>
							{taxRuleCategories.map((category) => (
								<SelectItem key={category.id} value={category.id.toString()}>
									{category.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

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
								className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base pl-8"
							/>
						</div>
					</div>
					<div className="space-y-3">
						<Label htmlFor="salary_to" className="text-sm text-gray-800">
							Salary To (optional)
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
								className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20 text-base pl-8"
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
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
