import { RefObject, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { Users, CheckCircle, Clock, MoreVertical, FileText, Trash2, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import { Badge } from "../ui/badge";

import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { TableSkeleton } from "../common/skeletons/table-skeleton";
import { PaginatedTableWrapper } from "../common/tables/paginated-table-wrapper";
import EditPayslipDialog from "../payroll/edit-payslip-dialog";
import { CardHeader } from "../ui/card";
import { DialogHeader, DialogFooter } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { IPayslip } from "@/types/types.utils";
import {
	deletePayslip,
	downloadSinglePayslip,
	markPayslipAsPaid,
	payrollAPI,
	showErrorToast,
} from "@/lib/utils";
import { formatCurrency, formatDate, getInitials } from "@/lib/helpers";
import { selectAccessToken } from "@/store/auth/selectors";

interface EmployeePayrollTableProps {
	institutionId: number;
	scope:
		| { type: "default"; payrollPeriodId: number | string }
		| { type: "employee"; employeeId: number | string };
	refreshTableRef?: RefObject<(() => void) | null>;
	setParentPayslips?: (payslips: IPayslip[]) => void;
	searchTerm?: string;
	showEmployeeAvatar?: boolean;
	showEmployeeName?: boolean;
}

export function EmployeePayrollTable({
	institutionId,
	scope,
	refreshTableRef,
	setParentPayslips,
	searchTerm,
	showEmployeeAvatar = true,
	showEmployeeName = true,
}: EmployeePayrollTableProps) {
	const [displayedPayslips, setDisplayedPayslips] = useState<IPayslip[]>([]);
	const router = useRouter();

	const accessToken = useSelector(selectAccessToken);
	const [editingPayslip, setEditingPayslip] = useState<IPayslip | null>(null);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [isPayslipDownLoading, setIsPayslipDownloading] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [deletingPayslip, setDeletingPayslip] = useState<IPayslip | null>(null);
	const refreshFunctionRef = refreshTableRef || useRef<() => void | null>(null);

	const handleTriggerEditPayslip = (payslip: IPayslip) => {
		setEditingPayslip(payslip);
		setEditModalOpen(true);
	};

	const handleDelete = async () => {
		if (!deletingPayslip) {
			return;
		}
		try {
			await deletePayslip(deletingPayslip.id);
			toast.success("Payslip deleted successfully");
			setDeletingPayslip(null);
			if (refreshFunctionRef.current) {
				refreshFunctionRef.current();
			}
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "An error occurred while deleting the payslip" });
		} finally {
		}
	};

	const handleMarkAsPaid = async (payslip: IPayslip) => {
		if (payslip.is_paid) {
			toast.info("This payslip is already marked as paid");

			return;
		}

		try {
			await markPayslipAsPaid(payslip.id);
			toast.success(`Payslip for ${payslip.employee?.name} marked as paid`);
			if (refreshFunctionRef.current) {
				refreshFunctionRef.current();
			}
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "An error occurred while marking payslip as paid" });
		}
	};

	const handlePayslipDownLoad = async (payslipId: number) => {
		setIsPayslipDownloading(true);
		try {
			toast.info("Downloading payslip ...");
			await downloadSinglePayslip({ accessToken, payslipId });
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to download payroll passlips report." });
		} finally {
			setIsPayslipDownloading(false);
		}
	};

	const onUpdatePayslipSuccess = async () => {
		if (refreshFunctionRef.current) {
			refreshFunctionRef.current();
		}
		setEditingPayslip(null);
		setEditModalOpen(false);
	};

	const extractItems = (payslips: IPayslip[]) => {
		const allItems = new Set<string>();

		payslips.forEach((payslip) => {
			if (payslip.items?.allowance) {
				Object.keys(payslip.items.allowance).forEach((key) => allItems.add(key));
			}
			if (payslip.items?.deduction) {
				Object.keys(payslip.items.deduction).forEach((key) => allItems.add(key));
			}
		});

		return Array.from(allItems).sort();
	};

	const navigateToPayslipItems = (payslipId: number) => {
		router.push(`/payroll/payroll-period/payslip/${payslipId}/items`);
	};

	return (
		<>
			<PaginatedTableWrapper<IPayslip>
				fetchFirstPage={async () => {
					if (!institutionId) throw new Error("No institution selected");
					if (scope.type === "employee") {
						return await payrollAPI.getPayslipsByInstitution({
							institutionId: institutionId,
							params: {
								search: searchTerm,
								employee_id: Number(scope.employeeId),
							},
						});
					} else {
						if (!scope.payrollPeriodId) {
							throw new Error("Could not find payroll period, please check your scope !");
						}

						return await payrollAPI.getPayslipsByPayrollPeriod({
							payrollId: scope.payrollPeriodId,
							institutionId: institutionId,
							search: searchTerm,
						});
					}
				}}
				fetchFromUrl={async (args: { url: string }) =>
					payrollAPI.getPaginatedPayslipsByPeriollPeriodFromUrl({ url: args.url })
				}
				deps={[institutionId, searchTerm]}
				className="space-y-4"
				footerClassName="pt-4"
			>
				{({ data, loading, refresh }) => {
					useEffect(() => {
						setDisplayedPayslips(data?.results || []);
						if (setParentPayslips) {
							setParentPayslips(data?.results || []);
						}
					}, [data]);

					refreshFunctionRef.current = refresh;

					if (loading) {
						return (
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
						);
					}

					return (
						<div className="overflow-x-auto mt-4">
							<Table className="min-w-max [&_th]:border-0 [&_td]:border-0">
								<TableHeader className="bg-gray-50/50">
									<TableRow className="bg-gray-50">
										{showEmployeeName && (
											<TableHead className="font-semibold text-gray-700 py-4 min-w-[200px] sm:min-w-0">
												<div className="flex items-center gap-2">
													<Users className="w-4 h-4" />
													Employee
												</div>
											</TableHead>
										)}
										<TableHead className="font-semibold text-gray-700 min-w-[8rem]">
											Basic Salary
										</TableHead>
										<TableHead className="font-semibold text-gray-700 min-w-[8rem]">
											Allowances
										</TableHead>
										<TableHead className="font-semibold text-gray-700 min-w-[8rem]">
											Deductions
										</TableHead>
										<TableHead className="font-semibold text-gray-700 min-w-[8rem]">
											Penalties
										</TableHead>

										<TableHead className="font-semibold text-gray-700 min-w-[80px]">Days</TableHead>
										<TableHead className="font-semibold text-gray-700 min-w-[100px]">
											Status
										</TableHead>
										{/* Dynamic item columns */}
										{extractItems(displayedPayslips).map((itemName, index) => (
											<TableHead
												key={itemName}
												className={`text-center font-semibold text-gray-700 min-w-[100px] ${
													index === 0 ? "border-l border-gray-200" : ""
												}`}
											>
												{itemName}
											</TableHead>
										))}
										<TableHead className="font-semibold text-gray-700 min-w-[8rem] !w-[8rem] sticky right-[8rem] bg-white border border-l z-10">
											Net Salary
										</TableHead>
										<TableHead className="font-semibold text-gray-700 text-center sticky right-0 bg-white z-10 min-w-[8rem] !w-[8rem]">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{displayedPayslips.map((payslip, index) => (
										<TableRow
											key={payslip.id}
											className={`hover:bg-orange-50/30 transition-colors border-b ${
												index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
											}`}
										>
											{showEmployeeName && (
												<TableCell className="py-4 min-w-[200px] sm:min-w-0">
													<div className="flex items-center gap-3">
														{showEmployeeAvatar ? (
															<Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-orange-100 flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden">
																<AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-xs flex items-center justify-center sm:text-sm h-full w-full">
																	{getInitials(payslip.employee?.name || "")}
																</AvatarFallback>
															</Avatar>
														) : (
															<></>
														)}

														<div className="min-w-0 flex-1">
															<div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
																{payslip.employee?.name || payslip.employee?.user?.fullname || ""}
															</div>
															<div className="text-sm text-gray-500 truncate">
																{payslip.employee.department.name}
															</div>
														</div>
													</div>
												</TableCell>
											)}
											<TableCell>
												<div className="font-semibold text-gray-900">
													{formatCurrency(payslip.basic_salary)}
												</div>
											</TableCell>
											<TableCell>
												<div className="font-semibold text-green-600">
													{formatCurrency(payslip.total_allowances)}
												</div>
											</TableCell>
											<TableCell>
												<div className="font-semibold text-red-600">
													{formatCurrency(payslip.total_deductions)}
												</div>
											</TableCell>
											<TableCell>
												<div className="font-semibold text-red-600">
													{formatCurrency(payslip.total_penalties)}
												</div>
											</TableCell>

											<TableCell>
												<div className="text-center font-medium text-gray-700">
													{payslip.days_worked}
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant={payslip.is_paid ? "default" : "secondary"}
													className={`${
														payslip.is_paid
															? "bg-green-100 text-green-800 border-green-200"
															: "bg-yellow-100 text-yellow-800 border-yellow-200"
													} font-medium px-3 py-1`}
												>
													<div className="flex items-center gap-1">
														{payslip.is_paid ? (
															<CheckCircle className="w-3 h-3" />
														) : (
															<Clock className="w-3 h-3" />
														)}
														{payslip.is_paid ? "Paid" : "Unpaid"}
													</div>
												</Badge>
												{payslip.paid_date && (
													<div className="text-xs text-gray-500 mt-1">
														{formatDate(payslip.paid_date)}
													</div>
												)}
											</TableCell>
											{/* Dynamic item cells */}
											{extractItems(displayedPayslips).map((itemName, index) => {
												const allowanceItem = payslip.items?.allowance?.[itemName];
												const deductionItem = payslip.items?.deduction?.[itemName];
												const penaltyItem = payslip.items?.penalties?.[itemName];

												let totalAmount = 0;
												let count = 0;
												let isDeduction = false;

												if (allowanceItem) {
													totalAmount = allowanceItem.reduce(
														(sum, item) => sum + Number.parseFloat(item.amount),
														0,
													);
													count = allowanceItem.length;
												} else if (deductionItem) {
													totalAmount = deductionItem.reduce(
														(sum, item) => sum + Number.parseFloat(item.amount),
														0,
													);
													count = deductionItem.length;
													isDeduction = true;
												} else if (penaltyItem) {
													totalAmount = penaltyItem.reduce(
														(sum: number, item: { amount: string }) =>
															sum + Number.parseFloat(item.amount),
														0,
													);
													count = penaltyItem.length;
													isDeduction = true;
												}

												return (
													<TableCell
														key={itemName}
														className={`text-center ${index === 0 ? "border-l border-gray-200" : ""}`}
													>
														{totalAmount > 0 ? (
															<div className="space-y-1">
																<div
																	className={`font-semibold ${isDeduction ? "text-red-600" : "text-green-600"}`}
																>
																	{formatCurrency(totalAmount)}
																</div>
																{count > 1 && <div className="text-xs text-gray-500">{count}x</div>}
															</div>
														) : (
															<span className="text-gray-400">-</span>
														)}
													</TableCell>
												);
											})}

											<TableCell className="sticky bg-white z-10 right-[8rem] ">
												<div className="font-semibold text-green-700">
													{formatCurrency(payslip.net_salary)}
												</div>
											</TableCell>
											<TableCell className="sticky right-0 bg-white z-10 border-l">
												<div className="flex justify-center">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="sm"
																className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
																title="Actions"
															>
																<MoreVertical className="w-5 h-5 text-gray-600" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent
															align="end"
															className="bg-white rounded-lg shadow-lg p-3"
														>
															{/* Editing a payslip should not be allowed now, but we can uncomment it in the future in case of need  */}
															{/* <DropdownMenuItem className="flex justify-start"
                                      onClick={() => handleTriggerEditPayslip(payslip)}>

                                      <Edit className="w-4 h-4 mr-2 text-blue-600" />
                                      Edit Payslip
                                    </DropdownMenuItem> */}

															<DropdownMenuItem
																className="flex justify-start"
																onClick={() => navigateToPayslipItems(payslip.id)}
															>
																<FileText className="w-4 h-4 mr-2 text-blue-600" />
																View Payslip Items
															</DropdownMenuItem>

															{/* Rest of your existing menu items */}
															{scope.type === "default" ? (
																<>
																	{!payslip.is_paid && (
																		<DropdownMenuItem
																			className="!justify-start !items-start flex"
																			onClick={() => handleMarkAsPaid(payslip)}
																		>
																			<CheckCircle className="w-4 h-4 mr-2 text-green-600" />
																			Mark as Paid
																		</DropdownMenuItem>
																	)}
																	<DropdownMenuItem
																		className="flex !justify-start items-center text-red-600 focus:text-red-700"
																		onClick={() => setDeletingPayslip(payslip)}
																	>
																		<Trash2 className="w-4 h-4 mr-2" />
																		Delete
																	</DropdownMenuItem>
																</>
															) : (
																<></>
															)}
															<DropdownMenuItem
																onClick={() => handlePayslipDownLoad(payslip.id)}
																disabled={isPayslipDownLoading}
																className="flex items-center w-full"
															>
																<Download className="h-4 w-4 mr-2" />
																Download Payslip
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
													<Dialog
														open={deletingPayslip?.id === payslip.id}
														onOpenChange={(open: any) => !open && setDeletingPayslip(null)}
													>
														<DialogContent>
															<DialogHeader>
																<DialogTitle>Confirm Deletion</DialogTitle>
																<DialogDescription>
																	Are you sure you want to delete the payslip for{" "}
																	{payslip.employee?.name || ""} in {payslip.payroll_period.name}?
																	This action cannot be undone.
																</DialogDescription>
															</DialogHeader>
															<DialogFooter>
																<Button variant="outline" onClick={() => setDeletingPayslip(null)}>
																	Cancel
																</Button>
																<Button variant="destructive" onClick={handleDelete}>
																	Delete
																</Button>
															</DialogFooter>
														</DialogContent>
													</Dialog>
													{/* Add this Edit Modal Dialog after the delete confirmation dialog */}
													{editingPayslip && (
														<EditPayslipDialog
															isOpen={editModalOpen}
															onOpenChange={(open) => {
																if (!open) {
																	setEditingPayslip(null);
																}
																setEditModalOpen(open);
															}}
															paySlip={editingPayslip}
															isUpdating={isUpdating}
															setIsUpdating={setIsUpdating}
															onSuccess={onUpdatePayslipSuccess}
														/>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					);
				}}
			</PaginatedTableWrapper>
		</>
	);
}
