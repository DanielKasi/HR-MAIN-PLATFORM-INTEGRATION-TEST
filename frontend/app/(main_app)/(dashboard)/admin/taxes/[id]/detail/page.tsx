"use client";

import type { ITax, ITaxRule } from "@/types/types.utils";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, Edit, Trash2, Search, MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TaxRuleCreateEditDialog } from "@/components/tax-rules/tax-rule-create-edit-dialog";
import { DeleteTaxRuleDialog } from "@/components/tax-rules/delete-tax-rule-dialog";
import { taxesAPI, taxRulesAPI } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/helpers";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { RefObject } from "react";

// Use backend types
export type { ITax, ITaxRule, ITaxRuleFormData } from "@/types/types.utils";

const getStatusColor = (status: string) => {
	return status === "active"
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const TaxDetailsPage = () => {
	const params = useParams();
	const router = useRouter();
	const isMobile = useMobile();
	const taxId = params.id as string;

	const [tax, setTax] = useState<ITax | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingTaxRule, setEditingTaxRule] = useState<ITaxRule | null>(null);
	const [deletingTaxRule, setDeletingTaxRule] = useState<ITaxRule | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const selectedInstitution = useSelector(selectSelectedInstitution);

	// Fetch tax details
	const fetchTaxData = useCallback(
		async (showRefreshLoader = false) => {
			if (!selectedInstitution?.id || !taxId) return;

			try {
				if (showRefreshLoader) {
					setIsRefreshing(true);
				}

				const taxData = await taxesAPI.getById(parseInt(taxId));
				setTax(taxData);
			} catch (error) {
				console.error("Error fetching tax ", error);
				toast.error("Failed to load tax data");
				setTax(null);
			} finally {
				setIsRefreshing(false);
			}
		},
		[selectedInstitution?.id, taxId],
	);

	useEffect(() => {
		fetchTaxData();
	}, [fetchTaxData]);

	const handleCreateSuccess = (newTaxRule: ITaxRule) => {
		tableRefreshRef.current?.();
		toast.success("Tax rule created successfully");
	};

	const handleUpdateSuccess = (updatedTaxRule: ITaxRule) => {
		tableRefreshRef.current?.();
		setIsEditDialogOpen(false);
		setEditingTaxRule(null);
		toast.success("Tax rule updated successfully");
	};

	const handleDeleteSuccess = (deletedId: number) => {
		tableRefreshRef.current?.();
		setIsDeleteDialogOpen(false);
		setDeletingTaxRule(null);
		toast.success("Tax rule deleted successfully");
	};

	const handleEditTaxRule = (taxRule: ITaxRule) => {
		setEditingTaxRule(taxRule);
		setIsEditDialogOpen(true);
	};

	const handleDeleteTaxRule = (taxRule: ITaxRule) => {
		setDeletingTaxRule(taxRule);
		setIsDeleteDialogOpen(true);
	};

	const handleRefresh = () => {
		fetchTaxData(true);
		tableRefreshRef.current?.();
	};

	const handleBack = () => {
		router.push("/admin/taxes");
	};

	const getCalculationType = (rule: ITaxRule) => {
		if (rule.tax_rule_formula) {
			return "Formula";
		} else if (rule.tax_rule_fixed_amount !== null && rule.tax_rule_fixed_amount !== undefined) {
			return "Fixed Amount";
		} else {
			return "Percentage";
		}
	};

	const getRateOrAmount = (rule: ITaxRule) => {
		if (rule.tax_rule_percentage !== null && rule.tax_rule_percentage !== undefined) {
			return `${rule.tax_rule_percentage}%`;
		} else if (rule.tax_rule_fixed_amount !== null && rule.tax_rule_fixed_amount !== undefined) {
			return formatCurrency(rule.tax_rule_fixed_amount);
		} else if (rule.tax_rule_formula) {
			return "Custom Formula";
		}
		return "N/A";
	};

	const columns: ColumnDef<ITaxRule>[] = [
		{
			key: "name",
			header: "Tax Rule Name",
			cell: (rule) => rule.tax_rule_name,
		},
		{
			key: "calculationType",
			header: "Calculation Type",
			cell: (rule) => getCalculationType(rule),
		},
		{
			key: "rateAmount",
			header: "Rate/Amount",
			cell: (rule) => getRateOrAmount(rule),
		},
		{
			key: "salaryRange",
			header: "Salary Range",
			cell: (rule) => (
				<>
					{formatCurrency(rule.salary_from || 0)} - {formatCurrency(rule.salary_to || 0)}
				</>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (rule) => (
				<Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
			),
		},
		{
			key: "created",
			header: "Created",
			cell: (rule) => formatDate(rule.created_at),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (rule) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => handleEditTaxRule(rule)}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleDeleteTaxRule(rule)} className="text-red-600">
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	const hasFilters = searchTerm || statusFilter !== "all";

	return (
		<div className="space-y-6 bg-white rounded-xl border shadow-sm">
			{/* Header */}
			<div
				className={` gap-6 ${tax?.approval_status !== "active" && tax?.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
			>
				{tax?.approvals && tax.approvals.length > 0 && (
					<div className="order-1 lg:order-2">
						<ApprovalWorkflow
							approvals={tax.approvals}
							instance_approval_status={tax.approval_status}
							onRefresh={fetchTaxData}
						/>
					</div>
				)}

				<div
					className={`${tax?.approval_status !== "active" && tax?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
				>
					{tax && (
						<div className="">
							<div className="p-6 border-b border-gray-200">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
									<div>
										<div className="flex items-center justify-start gap-4">
											<Button
												variant="outline"
												className="w-10 h-10 rounded-full aspect-square"
												onClick={handleBack}
											>
												<ArrowLeft className="h-4 w-4" />
											</Button>
											<h1 className="text-3xl font-bold text-gray-900">{tax.tax_name}</h1>
										</div>

										<div className="flex items-center gap-2 mt-2">
											<Badge className={getStatusColor(tax.tax_status ? "active" : "inactive")}>
												{tax.tax_status ? "Active" : "Inactive"}
											</Badge>
											<span className="text-sm text-gray-500">
												Created: {formatDate(tax.created_at)}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Tax Rules Section */}
					<div className="bg-white">
						<div className="p-6 border-gray-200">
							<div className="flex flex-col sm:flex-row sm:items-center gap-4">
								<div>
									<h2 className="text-xl font-semibold text-gray-900">Tax Rules</h2>
								</div>
								<div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 justify-center">
									<div className="relative max-w-sm">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
										<Input
											placeholder="Search tax rules..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-10"
										/>
									</div>
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-full sm:w-[180px]">
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Status</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>
									{hasFilters && (
										<Button
											variant="outline"
											onClick={() => {
												setSearchTerm("");
												setStatusFilter("all");
											}}
											size="sm"
										>
											Clear Filters
										</Button>
									)}
								</div>
								<div className="flex items-center gap-3">
									<TaxRuleCreateEditDialog
										taxId={parseInt(taxId)}
										onSuccess={handleCreateSuccess}
										disabled={!selectedInstitution?.id}
									/>
								</div>
							</div>
						</div>

						{/* Paginated Table */}
						<div className="p-6">
							<PaginatedTable<ITaxRule>
								fetchFirstPage={async () => {
									if (!selectedInstitution) throw new Error("No institution selected");

									return await taxRulesAPI.byInstitutionTax.getPaginated({
										institution_tax: parseInt(taxId),
										search: searchTerm || undefined,
										page: 1,
									});
								}}
								fetchFromUrl={taxRulesAPI.byInstitutionTax.getPaginatedFromUrl}
								deps={[selectedInstitution?.id, taxId, searchTerm]}
								query={searchTerm}
								onError={(err) => {
									console.error("Error fetching tax rules:", err);
									toast.error("Failed to load tax rules");
								}}
								className="space-y-4"
								tableClassName="min-w-[800px]"
								footerClassName="pt-4"
								columns={columns}
								skeletonRows={10}
								refreshRef={tableRefreshRef}
								emptyState={
									<div className="text-center py-12">
										<p className="text-muted-foreground mb-4">
											{hasFilters
												? "No tax rules found matching your filters"
												: "No tax rules found. Create your first tax rule to get started."}
										</p>
									</div>
								}
							/>
						</div>
					</div>
				</div>

				{/* Dialogs */}
				{editingTaxRule && (
					<TaxRuleCreateEditDialog
						taxId={parseInt(taxId)}
						taxRule={editingTaxRule}
						isOpen={isEditDialogOpen}
						onClose={() => {
							setIsEditDialogOpen(false);
							setEditingTaxRule(null);
						}}
						onSuccess={handleUpdateSuccess}
					/>
				)}

				{deletingTaxRule && (
					<DeleteTaxRuleDialog
						taxRule={deletingTaxRule}
						isOpen={isDeleteDialogOpen}
						onClose={() => {
							setIsDeleteDialogOpen(false);
							setDeletingTaxRule(null);
						}}
						onSuccess={handleDeleteSuccess}
					/>
				)}
			</div>
		</div>
	);
};

export default TaxDetailsPage;
