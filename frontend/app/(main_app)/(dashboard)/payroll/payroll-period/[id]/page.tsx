"use client";
import type { IDepartment, IPayrollPeriod, IPayslip, IBankAccount } from "@/types/types.utils";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, CheckCircle, Loader2, Download, ArrowLeft, CreditCard, Search } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { InfiniteScrollSelect } from "@/components/infinite-scroll-select";
import {
	markPayslipAsPaid,
	createBulkPayslips,
	downloadPayrollDocument,
	getPayrollPeriod,
	getDepartments,
	showErrorToast,
} from "@/lib/utils";
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors";
import { formatDate } from "@/lib/helpers";
import { bankAccountsAPI } from "@/lib/utils";
import { EmployeePayrollTable } from "@/components/employee/employee-payroll";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function PayrollPeriodDetails() {
	const router = useRouter();
	const [payrollPeriod, setPayrollPeriod] = useState<IPayrollPeriod | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	// const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
	const [bulkPaymentModalOpen, setBulkPaymentModalOpen] = useState(false);
	const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
	const [bulkProcessing, setBulkProcessing] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [departments, setDepartments] = useState<IDepartment[]>([]);

	const accessToken = useSelector(selectAccessToken);
	// const [editingPayslip, setEditingPayslip] = useState<IPayslip | null>(null);
	// const [editModalOpen, setEditModalOpen] = useState(false);

	// const [isUpdating, setIsUpdating] = useState(false);

	// Bank account selection modal states
	const [downloadModalOpen, setDownloadModalOpen] = useState(false);
	const [bankAccounts, setBankAccounts] = useState<IBankAccount[]>([]);
	const [selectedBankAccount, setSelectedBankAccount] = useState<IBankAccount | null>(null);
	const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
	const [bankAccountsHasMore, setBankAccountsHasMore] = useState(true);
	const [bankAccountsPage, setBankAccountsPage] = useState(1);
	const [bankAccountsSearch, setBankAccountsSearch] = useState("");
	const [isDownloading, setIsDownloading] = useState(false);
	// const [isPayslipDownLoading, setIsPayslipDownloading] = useState(false);
	const [displayedPayslips, setDisplayedPayslips] = useState<IPayslip[]>([]);
	const refreshFunctionRef = useRef<(() => void) | null>(null);

	const params = useParams();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const payrollPeriodId = params.id as string;

	// const extractItems = (payslips: IPayslip[]) => {
	//   const allItems = new Set<string>();

	//   payslips.forEach((payslip) => {
	//     if (payslip.items?.allowance) {
	//       Object.keys(payslip.items.allowance).forEach((key) => allItems.add(key));
	//     }
	//     if (payslip.items?.deduction) {
	//       Object.keys(payslip.items.deduction).forEach((key) => allItems.add(key));
	//     }
	//   });

	//   return Array.from(allItems).sort();
	// };

	useEffect(() => {
		if (selectedInstitution && payrollPeriodId) {
			fetchDepartments();
			fetchData();
		}
	}, [selectedInstitution, payrollPeriodId]);

	const handleErrorToast = (error: any, defaultMessage: string) => {
		toast.error(error?.message || error?.detail?.error || defaultMessage);
	};

	const fetchDepartments = async () => {
		if (!selectedInstitution) {
			return;
		}
		try {
			const depts = await getDepartments({ institutionId: selectedInstitution.id });

			setDepartments(depts);
		} catch (error: any) {
			handleErrorToast(error, "Failed to fetch departments");
		}
	};

	const fetchData = async () => {
		if (!selectedInstitution?.id || !payrollPeriodId) {
			return;
		}
		try {
			const fetchedPeriod = await getPayrollPeriod({ payrollPeriodId });
			setPayrollPeriod(fetchedPeriod);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load payroll period" });
		}
	};

	// Bank accounts fetching functions
	const fetchBankAccounts = async (page = 1, search = "", reset = false) => {
		try {
			setBankAccountsLoading(true);

			const searchParams = new URLSearchParams();

			searchParams.append("page", page.toString());
			searchParams.append("page_size", "20");
			if (search) {
				searchParams.append("search", search);
			}

			const response = await bankAccountsAPI.getAll(`?${searchParams.toString()}`);

			if (reset) {
				setBankAccounts(response.results);
			} else {
				setBankAccounts((prev) => [...prev, ...response.results]);
			}

			setBankAccountsHasMore(!!response.next);
			setBankAccountsPage(page);
		} catch (error: any) {
			handleErrorToast(error, "Failed to fetch bank accounts");
		} finally {
			setBankAccountsLoading(false);
		}
	};

	const handleBankAccountSearch = (query: string) => {
		setBankAccountsSearch(query);
		setBankAccountsPage(1);
		fetchBankAccounts(1, query, true);
	};

	const handleLoadMoreBankAccounts = () => {
		if (!bankAccountsLoading && bankAccountsHasMore) {
			fetchBankAccounts(bankAccountsPage + 1, bankAccountsSearch, false);
		}
	};

	// Initialize bank accounts when modal opens
	useEffect(() => {
		if (downloadModalOpen && bankAccounts.length === 0) {
			fetchBankAccounts(1, "", true);
		}
	}, [downloadModalOpen]);

	const handleDownloadPayroll = async () => {
		if (!selectedBankAccount) {
			toast.error("Please select a bank account");

			return;
		}

		if (!payrollPeriodId) {
			return;
		}

		try {
			setIsDownloading(true);
			await downloadPayrollDocument({
				accessToken,
				payrollId: payrollPeriodId,
				payingAccountId: selectedBankAccount.id.toString(),
			});
			toast.success("Payroll document download started");
			setDownloadModalOpen(false);
			setSelectedBankAccount(null);
		} catch (error: any) {
			handleErrorToast(error, "Failed to download payroll document");
		} finally {
			setIsDownloading(false);
		}
	};

	const getUnpaidPayslipsByDepartment = (department: string) => {
		return displayedPayslips.filter(
			(payslip) =>
				!payslip.is_paid &&
				(department === "all" || payslip.employee.department.id.toString() === department),
		);
	};

	const handleBulkMarkAsPaid = async () => {
		const unpaidPayslips = getUnpaidPayslipsByDepartment(selectedDepartment);

		if (unpaidPayslips.length === 0) {
			toast.info("No unpaid payslips found for the selected criteria");

			return;
		}

		setBulkProcessing(true);
		let successCount = 0;
		let errorCount = 0;

		try {
			for (const payslip of unpaidPayslips) {
				try {
					const success = await markPayslipAsPaid(payslip.id);

					if (success) {
						successCount++;
					} else {
						errorCount++;
					}
				} catch (error) {
					errorCount++;
				}
			}

			if (successCount > 0 && errorCount > 0) {
				toast.warning(`Processed payments for ${successCount} payslips, ${errorCount} failed`);
			} else if (successCount > 0 && errorCount === 0) {
				toast.success(`Successfully processed payment for ${successCount} payslips`);
			} else {
				toast.error("Failed to mark any payslips as paid");
			}

			setBulkPaymentModalOpen(false);
			setSelectedDepartment("all");
			if (refreshFunctionRef.current) {
				refreshFunctionRef.current();
			}
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "An error occurred during bulk payment processing" });
		} finally {
			setBulkProcessing(false);
		}
	};

	const handleGeneratePayslips = async () => {
		if (!selectedInstitution) {
			toast.error("No institution found");

			return;
		}

		setIsGenerating(true);
		try {
			await createBulkPayslips({
				institutionId: selectedInstitution.id,
				payrollPeriodId: Number(payrollPeriodId),
			});
			toast.success(`Successfully generated payslips`);
			if (refreshFunctionRef.current) {
				refreshFunctionRef.current();
			}
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "An error occurred while processing payslips" });
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div>
				<CardHeader className="p-0">
					<div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-8 sm:items-center">
						<div className="flex items-center justify-start gap-4">
							<Button
								variant="outline"
								onClick={() => router.back()}
								className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<div className="min-w-0 flex-1">
								{payrollPeriod && (
									<>
										<CardTitle className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
											Payslips for {payrollPeriod.name}
										</CardTitle>
										<CardDescription className="text-sm sm:text-base text-gray-600">
											Manage payslips for {formatDate(payrollPeriod.start_date)} -{" "}
											{formatDate(payrollPeriod.end_date)}
										</CardDescription>
									</>
								)}
							</div>
						</div>
					</div>
				</CardHeader>

				{/* Search and Filters */}
				<div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-4 mt-6 sm:mt-10">
					{/* Search bar */}
					<div className="relative w-full md:max-w-lg lg:max-w-xl">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search by employee name or email..."
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
							}}
							className="pl-10 h-12 w-full"
						/>
					</div>

					{/* Buttons container */}
					<div className="flex flex-col md:flex-row md:flex-wrap gap-2">
						{/* Bulk Payments dialog/button */}
						<Dialog open={bulkPaymentModalOpen} onOpenChange={setBulkPaymentModalOpen}>
							<DialogTrigger asChild>
								<Button
									className="bg-green-600 hover:bg-green-700 shadow-md w-full sm:w-auto"
									disabled={
										!selectedInstitution || displayedPayslips.filter((p) => !p.is_paid).length === 0
									}
								>
									<CheckCircle className="w-4 h-4 mr-2" />
									<span className="hidden sm:inline">Bulk Payments</span>
									<span className="sm:hidden">Bulk Pay</span>
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4">
								<DialogHeader>
									<DialogTitle>Process Payments in Bulk</DialogTitle>
									<DialogDescription>
										Select a department to mark all unpaid payslips as paid for this period
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-6">
									<div className="space-y-4">
										<div className="space-y-2">
											<label htmlFor="department" className="text-sm font-medium text-gray-700">
												Department
											</label>
											<Select
												value={selectedDepartment}
												onValueChange={setSelectedDepartment}
												disabled={bulkProcessing}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select department" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="all">All Departments</SelectItem>
													{departments.map((dept, idx) => (
														<SelectItem key={idx} value={dept.id.toString()}>
															{dept.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										{selectedDepartment && (
											<div className="bg-green-50 p-4 rounded-lg">
												<h4 className="font-semibold text-green-900 mb-2">
													{getUnpaidPayslipsByDepartment(selectedDepartment).length} unpaid payslips
													found
												</h4>
												<div className="text-sm text-green-800">
													{selectedDepartment === "all"
														? "This will process payments for all unpaid payslips in this period."
														: `This will process payments for all unpaid payslips in ${departments.find((dept) => dept.id.toString() === selectedDepartment)?.name || ""}.`}
												</div>
											</div>
										)}
									</div>
									<DialogFooter>
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setBulkPaymentModalOpen(false);
												setSelectedDepartment("all");
											}}
											disabled={bulkProcessing}
										>
											Cancel
										</Button>
										<Button
											onClick={handleBulkMarkAsPaid}
											className="bg-green-600 hover:bg-green-700"
											disabled={
												bulkProcessing ||
												!selectedDepartment ||
												getUnpaidPayslipsByDepartment(selectedDepartment).length === 0
											}
										>
											{bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
											Process {getUnpaidPayslipsByDepartment(selectedDepartment).length} Payments
										</Button>
									</DialogFooter>
								</div>
							</DialogContent>
						</Dialog>

						{/* Generate Payslips button */}
						{payrollPeriod && (
							<Button
								onClick={handleGeneratePayslips}
								className="bg-green-600 hover:bg-green-700 shadow-md disabled:bg-gray-400 w-full sm:w-auto"
								disabled={!selectedInstitution || !payrollPeriodId || isGenerating}
							>
								{isGenerating ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Plus className="w-4 h-4 mr-2" />
								)}
								<span className="hidden sm:inline">
									{isGenerating ? "Generating..." : "Generate Payslips"}
								</span>
								<span className="sm:hidden">{isGenerating ? "Generating..." : "Generate"}</span>
							</Button>
						)}

						{payrollPeriod && (
							<>
								<Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
									<DialogTrigger asChild>
										<Button
											className="shadow-md w-full sm:w-auto"
											disabled={!selectedInstitution?.id}
										>
											<Download className="w-4 h-4 mr-2" />
											Download EFT
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-2xl">
										<DialogHeader>
											<DialogTitle className="flex items-center gap-2">
												<CreditCard className="h-5 w-5" />
												Select Payment Account
											</DialogTitle>
											<DialogDescription>
												Choose the bank account from which payslips will be generated for{" "}
												{payrollPeriod.name}
											</DialogDescription>
										</DialogHeader>

										<div className="py-4">
											<InfiniteScrollSelect
												items={bankAccounts}
												loading={bankAccountsLoading}
												hasMore={bankAccountsHasMore}
												onLoadMore={handleLoadMoreBankAccounts}
												onSearch={handleBankAccountSearch}
												onSelect={setSelectedBankAccount}
												selectedItem={selectedBankAccount}
												getItemId={(account) => account.id}
												getItemLabel={(account) => account.account_name || account.account_number}
												getItemDescription={(account) =>
													`${account.account_name} • ${account.account_number}`
												}
												placeholder="Select a bank account..."
												searchPlaceholder="Search bank accounts..."
												emptyMessage="No bank accounts found"
											/>
										</div>

										<DialogFooter>
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setDownloadModalOpen(false);
													setSelectedBankAccount(null);
												}}
												disabled={isDownloading}
											>
												Cancel
											</Button>
											<Button
												onClick={handleDownloadPayroll}
												disabled={!selectedBankAccount || isDownloading}
											>
												{isDownloading ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Downloading...
													</>
												) : (
													<>
														<Download className="mr-2 h-4 w-4" />
														Download Payroll
													</>
												)}
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</>
						)}
					</div>
				</div>

				{/* Results Table */}
				<div
					className={`pt-4 ${payrollPeriod?.approval_status !== "active" && payrollPeriod?.approvals?.length ? "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""} `}
				>
					{payrollPeriod?.approvals && (
						<ApprovalWorkflow
							className="order-1 md:order-2"
							approvals={payrollPeriod.approvals}
							instance_approval_status={payrollPeriod.approval_status}
							onRefresh={fetchData}
						/>
					)}
					<div className="lg:col-span-2 xl:col-span-3 order-2 md:order-1 mx-0 md:mx-2">
						<>
							{selectedInstitution && (
								<EmployeePayrollTable
									institutionId={selectedInstitution.id}
									scope={{ type: "default", payrollPeriodId }}
									setParentPayslips={setDisplayedPayslips}
									refreshTableRef={refreshFunctionRef}
									searchTerm={searchTerm}
									showEmployeeAvatar={false}
								/>
							)}
						</>
					</div>
				</div>
			</div>
		</div>
	);
}
