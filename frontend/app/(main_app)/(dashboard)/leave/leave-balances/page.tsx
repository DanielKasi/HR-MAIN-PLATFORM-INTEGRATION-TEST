"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Eye, User, Settings, Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { LeaveBalancesAPI, getPaginatedEmployees, getLeaveTypes } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ILeaveBalance, IEmployee, ILeaveType } from "@/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { Icon } from "@iconify/react";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";

// Define grouped employee interface
interface GroupedEmployee {
	employeeId: number;
	employeeName: string;
	employeeCode: string;
	leaveBalances: ILeaveBalance[];
	totalAvailable: number;
	status: "good" | "low" | "overused";
}

// Color utilities
const getStatusColor = (status: "good" | "low" | "overused") => {
	switch (status) {
		case "overused":
			return "bg-red-100 text-red-800 border-red-200";
		case "low":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		default:
			return "bg-green-100 text-green-800 border-green-200";
	}
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

export default function LeaveBalanceComponent() {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();

	// State management
	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [filterType, setFilterType] = useState("all");
	const [filterYear, setFilterYear] = useState("all");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ILeaveBalance | null>(null);
	const [deletingEmployee, setDeletingEmployee] = useState<GroupedEmployee | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const refreshTableRef = useRef<(() => void) | null>(null);

	const [formData, setFormData] = useState({
		employee: "",
		leave_type: "",
		year: new Date().getFullYear().toString(),
		allocated_days: "",
		used_days: "",
		pending_days: "",
		carried_forward_days: "",
	});

	// Calculate available days
	const calculateAvailable = (item: typeof formData) => {
		const allocated = parseFloat(item.allocated_days) || 0;
		const used = parseFloat(item.used_days) || 0;
		const pending = parseFloat(item.pending_days) || 0;
		const carriedForward = parseFloat(item.carried_forward_days) || 0;
		return allocated + carriedForward - used - pending;
	};

	// Success handlers
	const handleCreateSuccess = (newBalance: ILeaveBalance) => {
		toast.success("Leave balance created successfully");
		refreshTableRef.current?.();
	};

	const handleUpdateSuccess = (updatedBalance: ILeaveBalance) => {
		toast.success("Leave balance updated successfully");
		refreshTableRef.current?.();
	};

	const handleDeleteSuccess = () => {
		toast.success("Leave balance deleted successfully");
		refreshTableRef.current?.();
	};

	// Fetch employees and leave types when institution changes
	useEffect(() => {
		const fetchData = async () => {
			if (!selectedInstitution?.id) {
				setEmployees([]);
				setLeaveTypes([]);
				return;
			}

			try {
				const [employeesData, leaveTypesData] = await Promise.all([
					getPaginatedEmployees({ institutionId: selectedInstitution.id }),
					getLeaveTypes({ institutionId: selectedInstitution.id }),
				]);

				setEmployees(employeesData.results);
				setLeaveTypes(leaveTypesData.filter((type) => type.is_active !== false));
			} catch (error: any) {
				console.error("Error fetching data:", error);
				toast.error(error.message || "Failed to load data");
				setEmployees([]);
				setLeaveTypes([]);
			}
		};

		fetchData();
	}, [selectedInstitution?.id]);

	// Memoized helper functions
	const getEmployeeName = useCallback(
		(employee: any) => {
			if (typeof employee === "object" && employee?.user?.fullname) {
				return employee.user.fullname;
			}
			const emp = employees.find((emp) => emp.id === employee);
			return emp?.user?.fullname || "Unknown Employee";
		},
		[employees],
	);

	const getEmployeeCode = useCallback(
		(employee: any) => {
			if (typeof employee === "object" && employee?.employee_id !== undefined) {
				return employee.employee_id || "N/A"; // return here
			}
			const emp = employees.find((emp) => emp.id === employee);
			return emp?.employee_id || "N/A"; // and here
		},
		[employees],
	);

	const getLeaveTypeName = useCallback(
		(leaveType: any) => {
			if (typeof leaveType === "object" && leaveType?.name) {
				return leaveType.name;
			}
			const type = leaveTypes.find((type) => type.id === leaveType);
			return type ? type.name : "Unknown Leave Type";
		},
		[leaveTypes],
	);

	const getEmployeeId = (employee: any) => {
		return typeof employee === "object" ? employee.id : employee;
	};

	const getLeaveTypeId = (leaveType: any) => {
		return typeof leaveType === "object" ? leaveType.id : leaveType;
	};

	// Clear filters function
	const clearFilters = () => {
		setSearchTerm("");
		setFilterType("all");
		setFilterYear("all");
	};

	// Check if filters are applied
	const hasFilters = searchTerm.trim() !== "" || filterType !== "all" || filterYear !== "all";

	// Fetch functions for PaginatedTableWrapper
	const fetchFirstPage = async (search?: string) => {
		if (!selectedInstitution?.id) {
			return { results: [], count: 0, next: null, previous: null };
		}

		return LeaveBalancesAPI.getPaginated({
			institutionId: selectedInstitution.id,
			page: 1,
			search,
			ordering: ordering || undefined,
		});
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return LeaveBalancesAPI.getPaginatedFromUrl({ url });
	};

	// Form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedInstitution?.id) {
			toast.error("Institution not selected");
			return;
		}

		if (!formData.employee || !formData.leave_type || !formData.year) {
			toast.error("Please fill in all required fields");
			return;
		}

		setIsSubmitting(true);
		try {
			const leaveBalanceData: Partial<ILeaveBalance> = {
				employee: { id: parseInt(formData.employee) } as IEmployee,
				leave_type: { id: parseInt(formData.leave_type) } as ILeaveType,
				year: parseInt(formData.year),
				institution: selectedInstitution.id,
				allocated_days: (parseFloat(formData.allocated_days) || 0).toString(),
				used_days: (parseFloat(formData.used_days) || 0).toString(),
				pending_days: (parseFloat(formData.pending_days) || 0).toString(),
				carried_forward_days: (parseFloat(formData.carried_forward_days) || 0).toString(),
			};

			if (editingItem) {
				const updatedBalance = await LeaveBalancesAPI.update({
					balanceId: editingItem.id,
					leaveBalanceData,
				});
				if (updatedBalance) {
					handleUpdateSuccess(updatedBalance);
				} else {
					toast.error("Failed to update leave balance");
				}
			} else {
				const newBalance = await LeaveBalancesAPI.create({
					institutionId: selectedInstitution.id,
					leaveBalanceData,
				});
				if (newBalance) {
					handleCreateSuccess(newBalance);
				} else {
					toast.error("Failed to create leave balance");
				}
			}

			setFormData({
				employee: "",
				leave_type: "",
				year: new Date().getFullYear().toString(),
				allocated_days: "",
				used_days: "",
				pending_days: "",
				carried_forward_days: "",
			});
			setEditingItem(null);
			setIsAddDialogOpen(false);
			setIsEditDialogOpen(false);
		} catch (error: any) {
			console.error("Error saving leave balance:", error);
			toast.error(error.message || "Failed to save leave balance");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle view
	const handleView = (employeeId: number) => {
		toast.loading("Loading employee details...", { id: `loading-${employeeId}` });
		router.push(`/leave/leave-balances/${employeeId}`);
	};

	// Handle edit
	const handleEdit = (group: GroupedEmployee) => {
		const firstBalance = group.leaveBalances[0];
		if (firstBalance) {
			setEditingItem(firstBalance);
			setFormData({
				employee: getEmployeeId(firstBalance.employee).toString(),
				leave_type: getLeaveTypeId(firstBalance.leave_type).toString(),
				year: firstBalance.year.toString(),
				allocated_days: firstBalance.allocated_days.toString(),
				used_days: firstBalance.used_days.toString(),
				pending_days: firstBalance.pending_days.toString(),
				carried_forward_days: firstBalance.carried_forward_days.toString(),
			});
			setIsEditDialogOpen(true);
		}
	};

	// Handle delete
	const handleDelete = async () => {
		if (!deletingEmployee) return;

		setIsSubmitting(true);
		try {
			await Promise.all(
				deletingEmployee.leaveBalances.map((balance) => LeaveBalancesAPI.delete(balance.id)),
			);
			handleDeleteSuccess();
			setIsDeleteDialogOpen(false);
			setDeletingEmployee(null);
		} catch (error: any) {
			console.error("Error deleting leave balances:", error);
			toast.error(error.message || "Failed to delete leave balances");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Get unique years and leave types from static data
	const availableYears = useMemo(() => {
		const currentYear = new Date().getFullYear();
		return [currentYear, currentYear - 1, currentYear - 2, currentYear + 1];
	}, []);

	const uniqueLeaveTypes = useMemo(() => {
		return leaveTypes.map((type) => type.name);
	}, [leaveTypes]);

	if (!selectedInstitution?.id) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="flex flex-col items-center space-y-4 text-center">
					<div className="relative">
						<div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
						<Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-gray-800">No Institution Selected</h3>
						<p className="text-gray-600">Please select an institution to manage leave balances.</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_BALANCES}>
			<div className="flex flex-col w-full min-h-screen bg-white">
				{/* Header */}
				<div className="flex flex-col gap-6 p-6">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Leave Balances</h1>
						</div>
					</div>

					{/* Search and Filters */}
					<div className="flex flex-col sm:flex-row gap-4 items-center sm:items-center justify-between">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								placeholder="Search leave balances..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
						<div className="flex gap-2">
							<Select value={filterType} onValueChange={(value: string) => setFilterType(value)}>
								<SelectTrigger className="w-full sm:w-[180px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
									<SelectValue placeholder="All Leave Types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all" className="text-sm sm:text-base">
										All Leave Types
									</SelectItem>
									{uniqueLeaveTypes.map((type) => (
										<SelectItem key={type} value={type} className="text-sm sm:text-base">
											{type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={filterYear} onValueChange={(value: string) => setFilterYear(value)}>
								<SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
									<SelectValue placeholder="All Years" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all" className="text-sm sm:text-base">
										All Years
									</SelectItem>
									{availableYears.map((year) => (
										<SelectItem key={year} value={year.toString()} className="text-sm sm:text-base">
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_LEAVE_BALANCES}>
								<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
									<DialogTrigger asChild>
										<Button className="flex items-center gap-2 rounded-[12px]">
											<Plus className="h-4 w-4" />
											Add Leave Balance
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
										<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
											<DialogTitle className="text-2xl font-bold text-gray-900">
												Add Leave Balance
											</DialogTitle>
											<DialogDescription className="text-gray-600 text-base">
												Create a new leave balance record for an employee.
											</DialogDescription>
										</DialogHeader>
										<form
											onSubmit={handleSubmit}
											className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 items-end"
										>
											<div className="space-y-3">
												<Label htmlFor="employee" className="text-sm font-semibold text-gray-800">
													Employee *
												</Label>
												<EmployeeSearchableSelect
													value={formData.employee ? [formData.employee] : []}
													onValueChange={(value) =>
														setFormData({
															...formData,
															employee: value[0]?.toString() || "",
														})
													}
													disabled={isSubmitting}
													placeholder="Search and select employee"
													showEmployeeId={false}
													showDepartment={false}
													multiple={false}
												/>
											</div>
											<div className="space-y-3">
												<Label htmlFor="leave_type" className="text-sm font-semibold text-gray-800">
													Leave Type *
												</Label>
												<Select
													value={formData.leave_type}
													onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
													disabled={isSubmitting}
												>
													<SelectTrigger className="h-12 rounded-xl">
														<SelectValue placeholder="Select leave type" />
													</SelectTrigger>
													<SelectContent>
														{leaveTypes.map((type) => (
															<SelectItem key={type.id} value={type.id.toString()}>
																{type.name} ({type.max_days_per_year} days/year)
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-3">
												<Label htmlFor="year" className="text-sm font-semibold text-gray-800">
													Year *
												</Label>
												<Select
													value={formData.year}
													onValueChange={(value) => setFormData({ ...formData, year: value })}
													disabled={isSubmitting}
												>
													<SelectTrigger className="h-12 rounded-xl">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{availableYears.map((year) => (
															<SelectItem key={year} value={year.toString()}>
																{year}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-3">
												<Label
													htmlFor="allocated_days"
													className="text-sm font-semibold text-gray-800"
												>
													Allocated Days
												</Label>
												<Input
													id="allocated_days"
													type="number"
													step="0.01"
													value={formData.allocated_days}
													onChange={(e) =>
														setFormData({ ...formData, allocated_days: e.target.value })
													}
													placeholder="e.g., 21"
													disabled={isSubmitting}
													className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
												/>
											</div>
											<div className="space-y-3">
												<Label htmlFor="used_days" className="text-sm font-semibold text-gray-800">
													Used Days
												</Label>
												<Input
													id="used_days"
													type="number"
													step="0.01"
													value={formData.used_days}
													onChange={(e) => setFormData({ ...formData, used_days: e.target.value })}
													placeholder="e.g., 5"
													disabled={isSubmitting}
													className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
												/>
											</div>
											<div className="space-y-3">
												<Label
													htmlFor="pending_days"
													className="text-sm font-semibold text-gray-800"
												>
													Pending Days
												</Label>
												<Input
													id="pending_days"
													type="number"
													step="0.01"
													value={formData.pending_days}
													onChange={(e) =>
														setFormData({ ...formData, pending_days: e.target.value })
													}
													placeholder="e.g., 2"
													disabled={isSubmitting}
													className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
												/>
											</div>
											<div className="space-y-3">
												<Label
													htmlFor="carried_forward_days"
													className="text-sm font-semibold text-gray-800"
												>
													Carried Forward Days
												</Label>
												<Input
													id="carried_forward_days"
													type="number"
													step="0.01"
													value={formData.carried_forward_days}
													onChange={(e) =>
														setFormData({ ...formData, carried_forward_days: e.target.value })
													}
													placeholder="e.g., 3"
													disabled={isSubmitting}
													className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
												/>
											</div>
											<div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
												<div className="flex justify-between items-center">
													<span className="text-sm font-semibold text-gray-800">
														Available Days:
													</span>
													<span className="text-lg font-bold text-myOrange">
														{calculateAvailable(formData)}
													</span>
												</div>
											</div>
										</form>
										<DialogFooter>
											<Button
												variant="outline"
												onClick={() => setIsAddDialogOpen(false)}
												disabled={isSubmitting}
											>
												Cancel
											</Button>
											<Button onClick={handleSubmit} disabled={isSubmitting}>
												{isSubmitting ? (
													<>
														<Loader2 className="mr-2 h-5 w-5 animate-spin" />
														Creating...
													</>
												) : (
													"Create Leave Balance"
												)}
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</ProtectedComponent>
						</div>
					</div>
				</div>

				{/* Table Content */}
				<div className="flex-1 px-6 pb-6 min-h-0">
					<PaginatedTableWrapper<ILeaveBalance>
						fetchFirstPage={() => fetchFirstPage(searchTerm)}
						fetchFromUrl={fetchFromUrl}
						deps={[selectedInstitution?.id, searchTerm, ordering]}
					>
						{({ data, loading, refresh }) => {
							// Store refresh function in ref when component mounts/updates
							useEffect(() => {
								refreshTableRef.current = refresh;
							}, [refresh]);
							if (loading) return <TableSkeleton rows={10} columns={6} />;
							if (!data?.results?.length) {
								return (
									<div className="text-center py-12">
										<Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
										<h3 className="text-lg font-semibold mb-2">No leave balances found</h3>
										<p className="text-muted-foreground mb-4">
											{searchTerm
												? "No leave balances match your search."
												: "Get started by adding your first leave balance."}
										</p>
										<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_LEAVE_BALANCES}>
											<Button
												onClick={() => setIsAddDialogOpen(true)}
												className="flex items-center gap-2"
											>
												<Plus className="h-4 w-4" />
												Add First Leave Balance
											</Button>
										</ProtectedComponent>
									</div>
								);
							}

							// Apply client-side filtering
							const filteredResults = data.results.filter((balance) => {
								const leaveTypeName = getLeaveTypeName(balance.leave_type);
								const matchesType = filterType === "all" || leaveTypeName === filterType;
								const matchesYear = filterYear === "all" || balance.year.toString() === filterYear;
								return matchesType && matchesYear;
							});

							// Group by employee
							const groupedEmployees = filteredResults.reduce(
								(acc, balance) => {
									const employeeId = getEmployeeId(balance.employee);
									if (!acc[employeeId]) {
										acc[employeeId] = {
											employeeId,
											employeeName: getEmployeeName(balance.employee),
											employeeCode: getEmployeeCode(balance.employee),
											leaveBalances: [],
											totalAvailable: 0,
											status: "good" as const,
										};
									}
									acc[employeeId].leaveBalances.push(balance);
									return acc;
								},
								{} as Record<number, GroupedEmployee>,
							);

							// Calculate totals and status for each group
							const groupedArray = Object.values(groupedEmployees).map((group) => {
								const totalAvailable = group.leaveBalances.reduce((sum, balance) => {
									const available =
										typeof balance.available_days === "string"
											? parseFloat(balance.available_days)
											: balance.available_days || 0;
									return sum + available;
								}, 0);

								let status: "good" | "low" | "overused" = "good";
								if (totalAvailable < 0) {
									status = "overused";
								} else if (totalAvailable <= 5) {
									status = "low";
								}

								return {
									...group,
									totalAvailable,
									status,
								};
							});

							return (
								<div className="space-y-4">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>
													<div className="flex items-center gap-2">
														<span>Employee</span>
														<Button
															size="sm"
															variant={ordering === "employee" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() => setOrdering(ordering === "employee" ? "" : "employee")}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead className="text-center">
													<div className="flex items-center justify-center gap-2">
														<span>Leave Types</span>
														<Button
															size="sm"
															variant={ordering === "leave_types" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() =>
																setOrdering(ordering === "leave_types" ? "" : "leave_types")
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead className="text-center">Total Available</TableHead>
												<TableHead className="text-center">
													<div className="flex items-center justify-center gap-2">
														<span>Status</span>
														<Button
															size="sm"
															variant={ordering === "status" ? "default" : "outline"}
															className="h-6 w-6 p-0"
															onClick={() => setOrdering(ordering === "status" ? "" : "status")}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</div>
												</TableHead>
												<TableHead className="text-center">Last Updated</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{groupedArray.map((group) => (
												<TableRow key={group.employeeId}>
													<TableCell>
														<div className="flex items-center gap-3">
															<div
																className={`h-8 w-8 rounded-full ${
																	group.status === "good"
																		? "bg-green-50"
																		: group.status === "low"
																			? "bg-yellow-50"
																			: "bg-red-50"
																} flex items-center justify-center`}
															>
																<User
																	className={`h-4 w-4 ${
																		group.status === "good"
																			? "text-green-600"
																			: group.status === "low"
																				? "text-yellow-600"
																				: "text-red-600"
																	}`}
																/>
															</div>
															<div>
																<div className="font-medium">{group.employeeName}</div>
																<div className="text-sm text-muted-foreground">
																	{group.employeeCode}
																</div>
															</div>
														</div>
													</TableCell>
													<TableCell className="text-center">
														<Badge className="bg-blue-100 text-blue-800 border-blue-200">
															{group.leaveBalances.length}{" "}
															{group.leaveBalances.length === 1 ? "Type" : "Types"}
														</Badge>
													</TableCell>
													<TableCell
														className={`text-center font-bold text-lg ${
															group.status === "overused"
																? "text-red-600"
																: group.status === "low"
																	? "text-yellow-600"
																	: "text-green-600"
														}`}
													>
														{group.totalAvailable}
													</TableCell>
													<TableCell className="text-center">
														<Badge className={getStatusColor(group.status)}>
															{group.status.charAt(0).toUpperCase() + group.status.slice(1)}
														</Badge>
													</TableCell>
													<TableCell className="text-center">
														{formatDate(
															group.leaveBalances.reduce((latest, balance) =>
																new Date(balance.updated_at) > new Date(latest.updated_at)
																	? balance
																	: latest,
															).updated_at,
														)}
													</TableCell>
													<TableCell className="text-right">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
																	<MoreVertical className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem onClick={() => handleView(group.employeeId)}>
																	<Eye className="h-4 w-4 mr-2" />
																	View
																</DropdownMenuItem>
																<ProtectedComponent
																	permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_BALANCES}
																>
																	<DropdownMenuItem
																		onClick={() => {
																			setDeletingEmployee(group);
																			setIsDeleteDialogOpen(true);
																		}}
																		className="text-destructive"
																	>
																		<Trash2 className="h-4 w-4 mr-2" />
																		Delete
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
							);
						}}
					</PaginatedTableWrapper>
				</div>

				{/* Edit Dialog */}
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_LEAVE_BALANCES}>
					<Dialog
						open={isEditDialogOpen}
						onOpenChange={(open) => {
							setIsEditDialogOpen(open);
							if (!open) {
								setEditingItem(null);
								setFormData({
									employee: "",
									leave_type: "",
									year: new Date().getFullYear().toString(),
									allocated_days: "",
									used_days: "",
									pending_days: "",
									carried_forward_days: "",
								});
							}
						}}
					>
						<DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
							<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
								<DialogTitle className="text-2xl font-bold text-gray-900">
									Edit Leave Balance
								</DialogTitle>
								<DialogDescription className="text-gray-600 text-base">
									Update the leave balance record for the selected employee.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
								<div className="space-y-3">
									<Label htmlFor="edit-employee" className="text-sm font-semibold text-gray-800">
										Employee *
									</Label>
									<Select
										value={formData.employee}
										onValueChange={(value) => setFormData({ ...formData, employee: value })}
										disabled={isSubmitting}
									>
										<SelectTrigger className="h-12 rounded-xl">
											<SelectValue placeholder="Select employee" />
										</SelectTrigger>
										<SelectContent>
											{employees.map((employee) => (
												<SelectItem key={employee.id} value={employee.id.toString()}>
													{employee.user?.fullname || "Unknown Employee"}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-3">
									<Label htmlFor="edit-leave_type" className="text-sm font-semibold text-gray-800">
										Leave Type *
									</Label>
									<Select
										value={formData.leave_type}
										onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
										disabled={isSubmitting}
									>
										<SelectTrigger className="h-12 rounded-xl">
											<SelectValue placeholder="Select leave type" />
										</SelectTrigger>
										<SelectContent>
											{leaveTypes.map((type) => (
												<SelectItem key={type.id} value={type.id.toString()}>
													{type.name} ({type.max_days_per_year} days/year)
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-3">
									<Label htmlFor="edit-year" className="text-sm font-semibold text-gray-800">
										Year *
									</Label>
									<Select
										value={formData.year}
										onValueChange={(value) => setFormData({ ...formData, year: value })}
										disabled={isSubmitting}
									>
										<SelectTrigger className="h-12 rounded-xl">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{availableYears.map((year) => (
												<SelectItem key={year} value={year.toString()}>
													{year}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-3">
									<Label
										htmlFor="edit-allocated_days"
										className="text-sm font-semibold text-gray-800"
									>
										Allocated Days
									</Label>
									<Input
										id="edit-allocated_days"
										type="number"
										step="0.01"
										value={formData.allocated_days}
										onChange={(e) => setFormData({ ...formData, allocated_days: e.target.value })}
										placeholder="e.g., 21"
										disabled={isSubmitting}
										className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
									/>
								</div>
								<div className="space-y-3">
									<Label htmlFor="edit-used_days" className="text-sm font-semibold text-gray-800">
										Used Days
									</Label>
									<Input
										id="edit-used_days"
										type="number"
										step="0.01"
										value={formData.used_days}
										onChange={(e) => setFormData({ ...formData, used_days: e.target.value })}
										placeholder="e.g., 5"
										disabled={isSubmitting}
										className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
									/>
								</div>
								<div className="space-y-3">
									<Label
										htmlFor="edit-pending_days"
										className="text-sm font-semibold text-gray-800"
									>
										Pending Days
									</Label>
									<Input
										id="edit-pending_days"
										type="number"
										step="0.01"
										value={formData.pending_days}
										onChange={(e) => setFormData({ ...formData, pending_days: e.target.value })}
										placeholder="e.g., 2"
										disabled={isSubmitting}
										className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
									/>
								</div>
								<div className="space-y-3">
									<Label
										htmlFor="edit-carried_forward_days"
										className="text-sm font-semibold text-gray-800"
									>
										Carried Forward Days
									</Label>
									<Input
										id="edit-carried_forward_days"
										type="number"
										step="0.01"
										value={formData.carried_forward_days}
										onChange={(e) =>
											setFormData({ ...formData, carried_forward_days: e.target.value })
										}
										placeholder="e.g., 3"
										disabled={isSubmitting}
										className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
									/>
								</div>
								<div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
									<div className="flex justify-between items-center">
										<span className="text-sm font-semibold text-gray-800">Available Days:</span>
										<span className="text-lg font-bold text-myOrange">
											{calculateAvailable(formData)}
										</span>
									</div>
								</div>
							</form>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsEditDialogOpen(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button onClick={handleSubmit} disabled={isSubmitting}>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-5 w-5 animate-spin" />
											Updating...
										</>
									) : (
										"Update Leave Balance"
									)}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</ProtectedComponent>

				{/* Delete Confirmation Dialog */}
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_LEAVE_BALANCES}>
					<Dialog
						open={isDeleteDialogOpen}
						onOpenChange={(open) => {
							setIsDeleteDialogOpen(open);
							if (!open) {
								setDeletingEmployee(null);
							}
						}}
					>
						<DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
							<DialogHeader className="space-y-4 pb-6">
								<div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
									<Trash2 className="w-8 h-8 text-red-600" />
								</div>
								<DialogTitle className="text-2xl font-bold text-gray-900 text-center">
									Delete Leave Balances
								</DialogTitle>
								<DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
									Are you sure you want to delete all leave balance records for{" "}
									<span className="font-semibold text-gray-900">
										"{deletingEmployee?.employeeName}"
									</span>
									? This action cannot be undone.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsDeleteDialogOpen(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
									{isSubmitting ? (
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
				</ProtectedComponent>
			</div>
		</ProtectedComponent>
	);
}
