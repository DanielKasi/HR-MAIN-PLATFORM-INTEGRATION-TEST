"use client";

import type { ITax, ITaxRule } from "@/types/types.utils";

import { useState, useEffect, useMemo, useCallback } from "react";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CreateTaxRuleDialog } from "@/components/tax-rules/create-tax-rule-dialog";
import { EditTaxRuleDialog } from "@/components/tax-rules/edit-tax-rule-dialog";
import { DeleteTaxRuleDialog } from "@/components/tax-rules/delete-tax-rule-dialog";
import { taxesAPI, taxRulesAPI } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/helpers";
import { CardHeader } from "@/components/ui/card";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

// Use backend types
export type { ITax, ITaxRule, ITaxRuleFormData } from "@/types/types.utils";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

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

const TaxDetailComponent = () => {
	const params = useParams();
	const router = useRouter();
	const isMobile = useMobile();
	const taxId = params.id as string;

	const [tax, setTax] = useState<ITax | null>(null);
	const [taxRules, setTaxRules] = useState<ITaxRule[]>([]);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingTaxRule, setEditingTaxRule] = useState<ITaxRule | null>(null);
	const [deletingTaxRule, setDeletingTaxRule] = useState<ITaxRule | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

	const selectedInstitution = useSelector(selectSelectedInstitution);

	// Fetch tax details and rules
	const fetchTaxData = useCallback(
		async (showRefreshLoader = false) => {
			if (!selectedInstitution?.id || !taxId) return;

			try {
				if (showRefreshLoader) {
					setIsRefreshing(true);
				} else {
					setIsLoading(true);
				}

				// Use actual API calls
				const [taxData, taxRulesData] = await Promise.all([
					taxesAPI.getById(parseInt(taxId)),
					taxRulesAPI.getByTaxId(parseInt(taxId)),
				]);

				setTax(taxData);
				setTaxRules(taxRulesData);
			} catch (error) {
				console.error("Error fetching tax data:", error);
				toast.error("Failed to load tax data");
				setTax(null);
				setTaxRules([]);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[selectedInstitution?.id, taxId],
	);

	useEffect(() => {
		fetchTaxData();
	}, [fetchTaxData]);

	const handleCreateSuccess = (newTaxRule: ITaxRule) => {
		setTaxRules([newTaxRule, ...taxRules]);
		clearFilters();
		toast.success("Tax rule created successfully");
	};

	const handleUpdateSuccess = (updatedTaxRule: ITaxRule) => {
		setTaxRules(taxRules.map((rule) => (rule.id === updatedTaxRule.id ? updatedTaxRule : rule)));
		setIsEditDialogOpen(false);
		setEditingTaxRule(null);
		toast.success("Tax rule updated successfully");
	};

	const handleDeleteSuccess = (deletedId: number) => {
		setTaxRules(taxRules.filter((rule) => rule.id !== deletedId));
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
	};

	const handleBack = () => {
		router.push("/admin/taxes");
	};

	// Filtered and paginated data
	const filteredTaxRules = useMemo(() => {
		let filtered = taxRules;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(rule) =>
					rule.tax_rule_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(rule.salary_from?.toString() || "").includes(searchTerm) ||
					(rule.salary_to?.toString() || "").includes(searchTerm),
			);
		}

		// Apply status filter - backend doesn't have is_active, so we'll show all
		if (statusFilter !== "all") {
			// For now, show all rules since backend doesn't have is_active field
			filtered = filtered;
		}

		return filtered;
	}, [taxRules, searchTerm, statusFilter]);

	const paginatedTaxRules = useMemo(() => {
		const startIndex = (currentPage - 1) * pageSize;
		const endIndex = startIndex + pageSize;

		return filteredTaxRules.slice(startIndex, endIndex);
	}, [filteredTaxRules, currentPage, pageSize]);

	const totalPages = Math.ceil(filteredTaxRules.length / pageSize);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePageSizeChange = (newPageSize: string) => {
		setPageSize(Number(newPageSize));
		setCurrentPage(1);
	};

	const clearFilters = () => {
		setSearchTerm("");
		setStatusFilter("all");
		setCurrentPage(1);
	};

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
										<Button variant="outline" onClick={clearFilters} size="sm">
											Clear Filters
										</Button>
									)}
								</div>
								<div className="flex items-center gap-3">
									<CreateTaxRuleDialog
										taxId={parseInt(taxId)}
										onSuccess={handleCreateSuccess}
										disabled={!selectedInstitution?.id}
									/>
								</div>
							</div>
						</div>

						{/* Table */}
						<div className="p-6">
							{isLoading ? (
								<div className="p-2 space-y-6 ">
									<div className="h-[calc(100vh-2rem)]">
										<CardHeader className="border-b">
											<div className="flex justify-between gap-8 items-center">
												<div className="flex items-center justify-start gap-4">
													<div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
													<div className="space-y-2">
														<div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
														<div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
													</div>
												</div>
												<div className="grid grid-cols-3">
													<div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
													<div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
													<div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
												</div>
											</div>
										</CardHeader>
										<TableSkeleton rows={10} columns={8} />
									</div>
								</div>
							) : (
								<>
									{/* Desktop Table */}
									<div className="rounded-xl">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Calculation Type</TableHead>
													<TableHead>Rate/Amount</TableHead>
													<TableHead>Salary Range</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>Created</TableHead>
													<TableHead className="w-12">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{paginatedTaxRules.length === 0 ? (
													<TableRow>
														<TableCell colSpan={6} className="text-center py-8 text-gray-500">
															{hasFilters
																? "No tax rules found matching your filters"
																: "No tax rules found"}
														</TableCell>
													</TableRow>
												) : (
													paginatedTaxRules.map((rule) => (
														<TableRow key={rule.id}>
															<TableCell className="font-medium">{rule.tax_rule_name}</TableCell>
															<TableCell>
																{rule.tax_rule_percentage
																	? `${rule.tax_rule_percentage}%`
																	: formatCurrency(rule.tax_rule_fixed_amount || 0)}
															</TableCell>
															<TableCell>
																{formatCurrency(rule.salary_from || 0)} -{" "}
																{formatCurrency(rule.salary_to || 0)}
															</TableCell>
															<TableCell>
																<Badge className="bg-green-100 text-green-800 border-green-200">
																	Active
																</Badge>
															</TableCell>
															<TableCell>{formatDate(rule.created_at)}</TableCell>
															<TableCell>
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
																		<DropdownMenuItem
																			onClick={() => handleDeleteTaxRule(rule)}
																			className="text-red-600"
																		>
																			<Trash2 className="h-4 w-4 mr-2" />
																			Delete
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																</DropdownMenu>
															</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Dialogs */}
				{editingTaxRule && (
					<EditTaxRuleDialog
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

export default TaxDetailComponent;
