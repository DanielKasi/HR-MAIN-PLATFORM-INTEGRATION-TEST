"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Plus,
	Search,
	Edit,
	Trash2,
	CheckCircle,
	Clock,
	Loader2,
	Info,
	AlertTriangle,
	Eye,
	Settings,
	MoreVertical,
	X,
	Download,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
	createPayrollPeriod,
	updatePayrollPeriod,
	deletePayrollPeriod,
	generatePeriodName,
	checkPeriodOverlap,
	getPaginatedPayrollPeriods,
	getPaginatedPayrollPeriodsFromUrl,
	downloadPayrollPasslipsReport,
	showErrorToast,
} from "@/lib/utils";
import { IPayrollPeriod, IPayrollPeriodFormData, IEmployee, IPayslip } from "@/types/types.utils";
import { selectSelectedInstitution, selectAccessToken } from "@/store/auth/selectors";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Icon } from "@iconify/react";

interface ValidationResult {
	name?: string;
	start_date?: string;
	end_date?: string;
	pay_date?: string;
	warning?: string;
}

export default function PayrollPeriods() {
	// Form state
	const [formData, setFormData] = useState({
		name: "",
		start_date: "",
		end_date: "",
		pay_date: "",
	});

	const [saving, setSaving] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingPeriod, setEditingPeriod] = useState<IPayrollPeriod | null>(null);
	const [validationErrors, setValidationErrors] = useState<ValidationResult>({});
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<"all" | "processed" | "pending">("all");
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const refreshTableRef = useRef<(() => void) | null>(null);
	const accessToken = useSelector(selectAccessToken);
	const [isLoading, setIsLoading] = useState(false);
	const [isExcelPayslipsReportDownloading, setIsExcelPayslipsReportDownloading] = useState(false);
	const [periodToDelete, setPeriodToDelete] = useState<IPayrollPeriod | null>(null);
	const [ordering, setOrdering] = useState("");
	// const fetchPayrollPeriods = useCallback(async () => {
	//   if (!selectedInstitution?.id) {
	//     setPayrollPeriods([]);
	//     return;
	//   }

	//   try {
	//     setIsLoading(true);
	//     setIsRefreshing(true);
	//     const periodsData = await getPayrollPeriods(selectedInstitution.id);
	//     if (periodsData && Array.isArray(periodsData)) {
	//       setPayrollPeriods(periodsData);
	//     } else {
	//       setPayrollPeriods([]);
	//       toast.error("No payroll periods found");
	//     }
	//   } catch (error: any) {
	//     console.error("Error fetching payroll periods:", error);
	//     setPayrollPeriods([]);
	//     toast.error(error.message || "Failed to load payroll periods");
	//   } finally {
	//     setIsRefreshing(false);
	//     setIsLoading(false);
	//   }
	// }, [selectedInstitution?.id]);

	// useEffect(() => {
	//   fetchPayrollPeriods();
	// }, [fetchPayrollPeriods]);

	// Auto-generate period name
	useEffect(() => {
		if (formData.start_date && formData.end_date && !editingPeriod) {
			const generatedName = generatePeriodName(formData.start_date, formData.end_date);
			if (
				formData.name === "" ||
				formData.name === generatePeriodName(formData.start_date, formData.end_date)
			) {
				setFormData((prev) => ({ ...prev, name: generatedName }));
			}
		}
	}, [formData.start_date, formData.end_date, editingPeriod]);

	// Validate form
	useEffect(() => {
		const errors: ValidationResult = {};
		if (isModalOpen) {
			if (formData.name && formData.name.trim().length < 3) {
				errors.name = "Period name must be at least 3 characters long";
			}
			if (formData.start_date && formData.end_date) {
				if (new Date(formData.end_date) <= new Date(formData.start_date)) {
					errors.end_date = "End date must be after start date";
				}
			}
			if (formData.pay_date && formData.end_date) {
				if (new Date(formData.pay_date) < new Date(formData.end_date)) {
					errors.pay_date = "Pay date should typically be after the period end date";
				}
			}
			if (formData.start_date && formData.end_date) {
				const duration = Math.ceil(
					(new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) /
						(1000 * 60 * 60 * 24),
				);
				if (duration > 365) {
					errors.warning =
						"This period is longer than a year. Please verify the dates are correct.";
				} else if (duration < 1) {
					errors.end_date = "Period must be at least 1 day long";
				}
			}
		}
		setValidationErrors(errors);
	}, [formData, isModalOpen]);

	const hasValidationErrors = () => {
		if (!formData.name || !formData.start_date || !formData.end_date || !formData.pay_date) {
			return true;
		}
		const errorKeys = Object.keys(validationErrors).filter((key) => key !== "warning");
		return errorKeys.length > 0;
	};

	const resetForm = () => {
		setFormData({
			name: "",
			start_date: "",
			end_date: "",
			pay_date: "",
		});
		setEditingPeriod(null);
		setValidationErrors({});
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// console.log("Submitting : ", saving, "\n With Validation errors : ", hasValidationErrors());
		if (saving || hasValidationErrors()) {
			return;
		}

		if (!selectedInstitution?.id) {
			toast.error("Institution not selected");
			return;
		}
		if (hasValidationErrors()) {
			toast.error("Please fix the validation errors before submitting");
			return;
		}
		if (validationErrors.warning) {
			toast.warning(validationErrors.warning);
		}

		try {
			const overlapCheck = await checkPeriodOverlap({
				institutionId: selectedInstitution.id,
				startDate: formData.start_date,
				endDate: formData.end_date,
				excludeId: editingPeriod?.id,
			});
			if (overlapCheck.hasOverlap) {
				const overlappingNames = overlapCheck.overlappingPeriods.map((p) => p.name).join(", ");
				toast.error(`Period overlaps with existing periods: ${overlappingNames}`);
				return;
			}
		} catch (error: any) {
			console.error("Error checking overlap:", error);
			toast.warning("Could not verify period overlap. Please check manually.");
		}

		setSaving(true);
		try {
			const formattedData: IPayrollPeriodFormData = {
				name: formData.name,
				start_date: formData.start_date,
				end_date: formData.end_date,
				pay_date: formData.pay_date,
				is_processed: false,
			};
			if (editingPeriod) {
				const updatedPeriod = await updatePayrollPeriod({
					id: editingPeriod.id,
					payrollPeriodData: formattedData,
				});
				if (updatedPeriod) {
					toast.success("Payroll period updated successfully");
					refreshTableRef.current?.();
				}
			} else {
				const newPeriod = await createPayrollPeriod({
					institutionId: selectedInstitution.id,
					payrollPeriodData: formattedData,
				});
				if (newPeriod) {
					toast.success("Payroll period created successfully");
					refreshTableRef.current?.();
				}
			}
			setIsModalOpen(false);
			resetForm();
		} catch (error: any) {
			console.error("Failed to save payroll period:", error);
			toast.error(error.message || "An error occurred while saving the payroll period");
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (period: IPayrollPeriod) => {
		setEditingPeriod(period);
		setFormData({
			name: period.name,
			start_date: period.start_date,
			end_date: period.end_date,
			pay_date: period.pay_date,
		});
		setIsModalOpen(true);
	};

	const handleDelete = async (id: number) => {
		try {
			await deletePayrollPeriod(id);
			toast.success("Payroll period deleted successfully");
			refreshTableRef.current?.();
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to delete payroll period" });
		}
		setPeriodToDelete(null);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const getDaysRemaining = (payDate: string) => {
		const today = new Date();
		const pay = new Date(payDate);
		const diffTime = pay.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	};

	const clearFilters = () => {
		setSearchTerm("");
		setFilterStatus("all");
	};

	const exportPayslipsReport = async (period_id: number) => {
		setIsExcelPayslipsReportDownloading(true);

		try {
			toast.info("Downloading payroll payslips report...");
			await downloadPayrollPasslipsReport({ accessToken, period_id });
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to download payroll passlips report." });
		} finally {
			setIsExcelPayslipsReportDownloading(false);
		}
	};

	if (isLoading) {
		return (
			<div className="p-2 space-y-6">
				<Card className="h-[calc(100vh-2rem)] shadow-lg">
					<CardHeader className="border-b">
						<div className="flex justify-between gap-8 items-center">
							<div className="flex items-center justify-start gap-4">
								<div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
								<div className="space-y-2">
									<div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
									<div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
								</div>
							</div>
							<div className="flex gap-2">
								<div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
								<div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
								<div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
							</div>
						</div>
					</CardHeader>
					<TableSkeleton rows={10} columns={8} />
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header and Filters */}
			<div className="bg-white rounded-lg shadow-sm min-h-screen">
				<div className="p-6 border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Payroll Periods</h1>
						</div>
					</div>
				</div>
				<div className="p-6 border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex items-center gap-4 justify-between">
							<div className="relative flex-1 max-w-sm">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search payroll periods..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<Select
								value={filterStatus}
								onValueChange={(value: string) =>
									setFilterStatus(value as "all" | "processed" | "pending")
								}
							>
								<SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
									<SelectValue placeholder="All Statuses" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="processed">Processed</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PAYROLL_PERIODS}>
								<Button
									onClick={() => {
										setIsModalOpen(true);
									}}
									disabled={saving}
								>
									<Plus className="md:mr-2 h-4 w-4" />
									<span className="hidden md:inline">Add Period</span>
								</Button>
							</ProtectedComponent>
						</div>
					</div>
				</div>
				<div className="p-6">
					<PaginatedTableWrapper<IPayrollPeriod>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");
							return await getPaginatedPayrollPeriods({
								institutionId: selectedInstitution.id,
								page: 1,
								search: searchTerm || undefined,
								ordering,
							});
						}}
						fetchFromUrl={getPaginatedPayrollPeriodsFromUrl}
						deps={[selectedInstitution?.id, searchTerm, ordering]}
						className="space-y-4"
						footerClassName="pt-4"
					>
						{({ data, loading, refresh }) => {
							// Store refresh function in ref when component mounts/updates
							useEffect(() => {
								refreshTableRef.current = refresh;
							}, [refresh]);

							if (loading) {
								return (
									<div className="p-2 space-y-6 ">
										<div className="h-[calc(100vh-2rem)]">
											<CardHeader className="border-b">
												<div className="flex justify-between gap-8 items-center">
													<div className="flex items-center justify-start gap-4">
														<div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
														<div className="space-y-2">
															<div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
															<div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
														</div>
													</div>
													<div className="grid grid-cols-3">
														<div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
														<div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
														<div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
													</div>
												</div>
											</CardHeader>
											<TableSkeleton rows={10} columns={8} />
										</div>
									</div>
								);
							}

							if (!data || data.results.length === 0) {
								return (
									<div className="p-12 text-center">
										<Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
										<h3 className="text-lg font-semibold mb-2">No payroll periods found</h3>
										<p className="text-muted-foreground mb-4">
											{searchTerm
												? "No payroll periods match your search criteria."
												: "Get started by creating your first payroll period."}
										</p>
									</div>
								);
							}

							// Apply client-side filters (status filter)
							const filteredResults = data.results.filter((period) => {
								const matchesStatus =
									filterStatus === "all" ||
									(filterStatus === "processed" && period.is_processed) ||
									(filterStatus === "pending" && !period.is_processed);

								return matchesStatus;
							});

							if (filteredResults.length === 0) {
								return (
									<div className="p-12 text-center">
										<Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
										<h3 className="text-lg font-semibold mb-2">No payroll periods found</h3>
										<p className="text-muted-foreground mb-4">
											No payroll periods match the selected status filter.
										</p>
									</div>
								);
							}

							return (
								<>
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_PAYROLL_PERIODS}>
										<div className="overflow-x-auto">
											<Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
												<TableHeader className="bg-gray-50/50">
													<TableRow>
														<TableHead>
															<div className="flex items-center justify-start gap-4">
																<span>Name</span>
																<Button
																	onClick={() => {
																		if (ordering === "name") {
																			setOrdering("");
																		} else {
																			setOrdering("name");
																		}
																	}}
																	size={"sm"}
																	variant={ordering === "name" ? "default" : "outline"}
																	type="button"
																>
																	<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
																</Button>
															</div>
														</TableHead>
														<TableHead>
															<div className="flex items-center justify-start gap-4">
																<span>Period</span>
																<Button
																	onClick={() => {
																		if (ordering === "start_date") {
																			setOrdering("");
																		} else {
																			setOrdering("start_date");
																		}
																	}}
																	size={"sm"}
																	variant={ordering === "start_date" ? "default" : "outline"}
																	type="button"
																>
																	<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
																</Button>
															</div>
														</TableHead>
														<TableHead>
															<div className="flex items-center justify-start gap-4">
																<span>Pay Date</span>
																<Button
																	onClick={() => {
																		if (ordering === "pay_date") {
																			setOrdering("");
																		} else {
																			setOrdering("pay_date");
																		}
																	}}
																	size={"sm"}
																	variant={ordering === "pay_date" ? "default" : "outline"}
																	type="button"
																>
																	<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
																</Button>
															</div>
														</TableHead>
														<TableHead>
															<div className="flex items-center justify-start gap-4">
																<span>Days to Pay</span>
																<Button
																	onClick={() => {
																		if (ordering === "days_to_pay") {
																			setOrdering("");
																		} else {
																			setOrdering("days_to_pay");
																		}
																	}}
																	size={"sm"}
																	variant={ordering === "days_to_pay" ? "default" : "outline"}
																	type="button"
																>
																	<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
																</Button>
															</div>
														</TableHead>
														<TableHead>Status</TableHead>
														<TableHead className="text-right">Actions</TableHead>
													</TableRow>
												</TableHeader>

												<TableBody>
													{filteredResults.map((period) => (
														<TableRow key={period.id}>
															<TableCell className="font-medium">
																<div className="font-medium text-gray-900">{period.name}</div>
															</TableCell>
															<TableCell>
																<div className="space-y-1">
																	<div className="text-sm font-medium text-gray-900">
																		{formatDate(period.start_date)} - {formatDate(period.end_date)}
																	</div>
																	<div className="text-xs text-gray-500">
																		{Math.ceil(
																			(new Date(period.end_date).getTime() -
																				new Date(period.start_date).getTime()) /
																				(1000 * 60 * 60 * 24),
																		)}{" "}
																		days
																	</div>
																</div>
															</TableCell>
															<TableCell>
																<div className="font-semibold text-gray-900">
																	{formatDate(period.pay_date)}
																</div>
															</TableCell>
															<TableCell>
																<div className="font-semibold text-gray-700">
																	{(() => {
																		const daysRemaining = getDaysRemaining(period.pay_date);
																		return daysRemaining < 0
																			? `${Math.abs(daysRemaining)} days ago`
																			: daysRemaining === 0
																				? "Today"
																				: `${daysRemaining} days`;
																	})()}
																</div>
															</TableCell>
															<TableCell>
																<Badge
																	className={`font-medium px-3 py-1 ${
																		period.is_processed
																			? "bg-green-100 text-green-800 border-green-200"
																			: "bg-yellow-100 text-yellow-800 border-yellow-200"
																	}`}
																>
																	<div className="flex items-center gap-1">
																		{period.is_processed ? (
																			<CheckCircle className="w-3 h-3" />
																		) : (
																			<Clock className="w-3 h-3" />
																		)}
																		{period.is_processed ? "Processed" : "Pending"}
																	</div>
																</Badge>
															</TableCell>

															<TableCell className="text-right">
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
																		>
																			<MoreVertical className="h-5 w-5 text-gray-600" />
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_VIEW_PAYROLL_PERIODS}
																		>
																			<DropdownMenuItem>
																				<Link
																					href={`/payroll/payroll-period/${period.id}`}
																					className="flex items-center w-full"
																				>
																					<Eye className="h-4 w-4 mr-2" />
																					View Details
																				</Link>
																			</DropdownMenuItem>
																		</ProtectedComponent>
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_EDIT_PAYROLL_PERIODS}
																		>
																			<DropdownMenuItem
																				onClick={() => handleEdit(period)}
																				className="flex items-center"
																			>
																				<Edit className="h-4 w-4 mr-2" />
																				Edit
																			</DropdownMenuItem>
																		</ProtectedComponent>
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_DELETE_PAYROLL_PERIODS}
																		>
																			<DropdownMenuItem
																				onClick={() => setPeriodToDelete(period)}
																				className="flex items-center text-red-600 focus:text-red-700"
																			>
																				<Trash2 className="h-4 w-4 mr-2" />
																				Delete
																			</DropdownMenuItem>
																		</ProtectedComponent>
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_DOWNLOAD_PAYSLIPS}
																		>
																			<DropdownMenuItem
																				onClick={() => exportPayslipsReport(period.id)}
																				className="flex items-center w-full"
																			>
																				<Download className="h-4 w-4 mr-2" />
																				Download Payslips' Report
																			</DropdownMenuItem>
																		</ProtectedComponent>
																	</DropdownMenuContent>
																</DropdownMenu>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</ProtectedComponent>
								</>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</div>

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl rounded-2xl border-0 shadow-2xl">
					<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
						<DialogTitle className="text-2xl font-bold text-gray-900">
							{editingPeriod ? "Edit Payroll Period" : "Add New Payroll Period"}
						</DialogTitle>
						<DialogDescription className="text-gray-600 text-base">
							Configure payroll period details and dates
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 h-fit max-h-[80svh] md:max-h-[65svh] overflow-y-auto">
							<div className="space-y-3">
								<Label htmlFor="name" className="text-sm font-semibold text-gray-800">
									Period Name *
								</Label>
								<Input
									id="name"
									type="text"
									placeholder="Enter period name"
									value={formData.name}
									onChange={(e) => handleInputChange("name", e.target.value)}
									disabled={saving}
									className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
										validationErrors.name
											? "border-red-500 focus:border-red-500 focus:ring-red-500"
											: ""
									}`}
								/>
								<p className="text-xs text-gray-500 mt-1 flex items-center">
									<Info className="h-3 w-3 mr-1" />
									Autogenerated from dates; you can edit as needed.
								</p>
								{validationErrors.name && (
									<p className="text-xs text-red-500 mt-1 flex items-center">
										<AlertTriangle className="h-3 w-3 mr-1" />
										{validationErrors.name}
									</p>
								)}
							</div>
							<div className="space-y-3">
								<Label htmlFor="start_date" className="text-sm font-semibold text-gray-800">
									Start Date *
								</Label>
								<Input
									id="start_date"
									type="date"
									value={formData.start_date}
									onChange={(e) => handleInputChange("start_date", e.target.value)}
									disabled={saving}
									className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
										validationErrors.start_date
											? "border-red-500 focus:border-red-500 focus:ring-red-500"
											: ""
									}`}
								/>
								{validationErrors.start_date && (
									<p className="text-xs text-red-500 mt-1 flex items-center">
										<AlertTriangle className="h-3 w-3 mr-1" />
										{validationErrors.name}
									</p>
								)}
							</div>
							<div className="space-y-3">
								<Label htmlFor="end_date" className="text-sm font-semibold text-gray-800">
									End Date *
								</Label>
								<Input
									id="end_date"
									type="date"
									value={formData.end_date}
									onChange={(e) => handleInputChange("end_date", e.target.value)}
									disabled={saving}
									min={formData.start_date}
									className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
										validationErrors.end_date
											? "border-red-500 focus:border-red-500 focus:ring-red-500"
											: ""
									}`}
								/>
								{validationErrors.end_date && (
									<p className="text-xs text-red-500 mt-1 flex items-center">
										<AlertTriangle className="h-3 w-3 mr-1" />
										{validationErrors.end_date}
									</p>
								)}
							</div>
							<div className="space-y-3">
								<Label htmlFor="pay_date" className="text-sm font-semibold text-gray-800">
									Pay Date *
								</Label>
								<Input
									id="pay_date"
									type="date"
									value={formData.pay_date}
									onChange={(e) => handleInputChange("pay_date", e.target.value)}
									disabled={saving}
									className={`h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
										validationErrors.pay_date
											? "border-red-500 focus:border-red-500 focus:ring-red-500"
											: ""
									}`}
								/>
								{validationErrors.pay_date && (
									<p className="text-xs text-red-500 mt-1 flex items-center">
										<AlertTriangle className="h-3 w-3 mr-1" />
										{validationErrors.pay_date}
									</p>
								)}
							</div>
							{validationErrors.warning && (
								<div className="md:col-span-2 bg-amber-50 rounded-xl p-4">
									<div className="flex items-start gap-2">
										<Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
										<p className="text-sm font-medium text-amber-800">{validationErrors.warning}</p>
									</div>
								</div>
							)}
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
								Cancel
							</Button>
							<Button disabled={saving || hasValidationErrors()}>
								{saving ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										{editingPeriod ? "Updating..." : "Creating..."}
									</>
								) : editingPeriod ? (
									"Update Period"
								) : (
									"Create Period"
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			{periodToDelete && (
				<Dialog open={!!periodToDelete} onOpenChange={(open) => !open && setPeriodToDelete(null)}>
					<DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
						<DialogHeader className="space-y-4 pb-6">
							<div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
								<Trash2 className="w-8 h-8 text-red-600" />
							</div>
							<DialogTitle className="text-2xl font-bold text-gray-900 text-center">
								Delete Payroll Period
							</DialogTitle>
							<DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
								Are you sure you want to delete the payroll period{" "}
								<span className="font-semibold text-gray-900">"{periodToDelete.name}"</span>? This
								action cannot be undone.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button variant="outline" onClick={() => setPeriodToDelete(null)} disabled={saving}>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={() => {
									handleDelete(periodToDelete.id);
								}}
								disabled={saving}
							>
								{saving ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										Deleting...
									</>
								) : (
									"Delete Permanently"
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
