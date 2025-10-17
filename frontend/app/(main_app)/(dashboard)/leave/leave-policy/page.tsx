"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, MoreVertical, Edit, Trash2, Settings, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ILeavePolicyResponse, ILeavePolicyFormData, ILeaveType } from "@/types/types.utils";
import { LeavePoliciesAPI, getLeaveTypes } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import FormatNumberInput from "@/components/format-number-input";
import { useRouter } from "next/navigation";

type LeavePolicy = ILeavePolicyResponse & {
	leave_type: ILeaveType;
};

// Color utilities
const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const getCategoryColor = (category: string) => {
	const colors = {
		annual: "bg-blue-100 text-blue-800 border-blue-200",
		sick: "bg-red-100 text-red-800 border-red-200",
		maternity: "bg-pink-100 text-pink-800 border-pink-200",
		paternity: "bg-indigo-100 text-indigo-800 border-indigo-200",
		study: "bg-purple-100 text-purple-800 border-purple-200",
		compassionate: "bg-green-100 text-green-800 border-green-200",
		unpaid: "bg-gray-100 text-gray-800 border-gray-200",
	};

	return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getApprovalColor = (requiresApproval: boolean) => {
	return requiresApproval
		? "bg-orange-100 text-orange-800 border-orange-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const LeavePolicyComponent = () => {
	const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
	const [deletingPolicy, setDeletingPolicy] = useState<LeavePolicy | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [ordering, setOrdering] = useState("");
	const refreshTableRef = useRef<(() => void) | null>(null);
	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		leave_type: "",
		min_notice_days: "",
		max_consecutive_days: "",
		requires_manager_approval: false,
		requires_hr_approval: false,
		applicable_after_probation_months: "",
	});

	// Success handlers
	const handleCreateSuccess = (newPolicy: LeavePolicy) => {
		toast.success("Leave policy created successfully");
		refreshTableRef.current?.();
	};

	const handleUpdateSuccess = (updatedPolicy: LeavePolicy) => {
		toast.success("Leave policy updated successfully");
		refreshTableRef.current?.();
	};

	const handleDeleteSuccess = () => {
		toast.success("Leave policy deleted successfully");
		refreshTableRef.current?.();
	};

	// Clear filters
	const clearFilters = () => {
		setSearchTerm("");
		setStatusFilter("all");
		setCategoryFilter("all");
	};

	const hasFilters = searchTerm || statusFilter !== "all" || categoryFilter !== "all";

	// Fetch leave types when institution changes
	useEffect(() => {
		const fetchLeaveTypes = async () => {
			if (!selectedInstitution?.id) {
				setLeaveTypes([]);

				return;
			}

			try {
				const leaveTypesData = await getLeaveTypes({ institutionId: selectedInstitution.id });
				const activeLeaveTypes = leaveTypesData.filter((type) => type.is_active !== false);

				setLeaveTypes(activeLeaveTypes);
			} catch (error) {
				console.error("Error fetching leave types:", error);
				toast.error("Failed to load leave types");
				setLeaveTypes([]);
			}
		};

		fetchLeaveTypes();
	}, [selectedInstitution?.id]);

	const resetForm = () => {
		setFormData({
			name: "",
			description: "",
			leave_type: "",
			min_notice_days: "",
			max_consecutive_days: "",
			requires_manager_approval: false,
			requires_hr_approval: false,
			applicable_after_probation_months: "",
		});
	};

	const handleAddPolicy = async () => {
		if (
			!formData.name ||
			!formData.description ||
			!formData.leave_type ||
			!formData.min_notice_days ||
			!formData.applicable_after_probation_months
		) {
			toast.error("Please fill in all required fields");

			return;
		}

		setIsSubmitting(true);
		try {
			const policyData: ILeavePolicyFormData = {
				name: formData.name,
				description: formData.description,
				leave_type: parseInt(formData.leave_type),
				min_notice_days: parseInt(formData.min_notice_days),
				max_consecutive_days: formData.max_consecutive_days
					? parseInt(formData.max_consecutive_days)
					: 0,
				requires_manager_approval: formData.requires_manager_approval,
				requires_hr_approval: formData.requires_hr_approval,
				applicable_after_probation_months: parseInt(formData.applicable_after_probation_months),
				is_active: true,
			};

			const newPolicy = await LeavePoliciesAPI.create({
				institutionId: selectedInstitution!.id,
				leavePolicyData: policyData,
			});

			if (newPolicy) {
				const selectedLeaveType = leaveTypes.find((lt) => lt.id.toString() === formData.leave_type);
				const policyWithLeaveType = {
					...newPolicy,
					leave_type: {
						id: selectedLeaveType?.id || formData.leave_type,
						name: selectedLeaveType?.name || "",
						category: selectedLeaveType?.category || "",
						max_days_per_year: selectedLeaveType?.max_days_per_year || 0,
					},
				};

				handleCreateSuccess(policyWithLeaveType as LeavePolicy);
				resetForm();
				setIsAddDialogOpen(false);
			} else {
				toast.error("Failed to create leave policy");
			}
		} catch (error: any) {
			console.error("Error creating leave policy:", error);
			toast.error(error.message || "An error occurred while creating the leave policy");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditPolicy = async () => {
		if (!editingPolicy) return;

		if (
			!formData.name ||
			!formData.description ||
			!formData.leave_type ||
			!formData.min_notice_days ||
			!formData.applicable_after_probation_months
		) {
			toast.error("Please fill in all required fields");

			return;
		}

		setIsSubmitting(true);
		try {
			const policyData: ILeavePolicyFormData = {
				name: formData.name,
				description: formData.description,
				leave_type: parseInt(formData.leave_type),
				min_notice_days: parseInt(formData.min_notice_days),
				max_consecutive_days: formData.max_consecutive_days
					? parseInt(formData.max_consecutive_days)
					: 0,
				requires_manager_approval: formData.requires_manager_approval,
				requires_hr_approval: formData.requires_hr_approval,
				applicable_after_probation_months: parseInt(formData.applicable_after_probation_months),
				is_active: true,
			};

			const updatedPolicy = await LeavePoliciesAPI.update({
				leavePolicyId: editingPolicy.id,
				leavePolicyData: policyData,
			});

			if (updatedPolicy) {
				const selectedLeaveType = leaveTypes.find((lt) => lt.id.toString() === formData.leave_type);
				const policyWithLeaveType = {
					...updatedPolicy,
					leave_type: {
						id: selectedLeaveType?.id || formData.leave_type,
						name: selectedLeaveType?.name || "",
						category: selectedLeaveType?.category || "",
						max_days_per_year: selectedLeaveType?.max_days_per_year || 0,
					},
				};

				handleUpdateSuccess(policyWithLeaveType as LeavePolicy);
				resetForm();
				setIsEditDialogOpen(false);
				setEditingPolicy(null);
			} else {
				toast.error("Failed to update leave policy");
			}
		} catch (error: any) {
			console.error("Error updating leave policy:", error);
			toast.error(error.message || "An error occurred while updating the leave policy");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeletePolicy = async () => {
		if (!deletingPolicy) return;

		setIsSubmitting(true);
		try {
			const success = await LeavePoliciesAPI.delete(deletingPolicy.id);

			if (success) {
				handleDeleteSuccess();
				setIsDeleteDialogOpen(false);
				setDeletingPolicy(null);
			} else {
				toast.error("Failed to delete leave policy");
			}
		} catch (error: any) {
			console.error("Error deleting leave policy:", error);
			toast.error(error.message || "An error occurred while deleting the leave policy");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!selectedInstitution) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="flex flex-col items-center space-y-4 text-center">
					<div className="relative">
						<div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
						<Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-gray-800">Loading Institution Data</h3>
						<p className="text-gray-600">Please wait while we set up your workspace...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_POLICIES}>
			<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
				{/* Header and Filters */}
				<div className="bg-white rounded-lg border shadow-sm min-h-screen">
					<div className="p-4 sm:p-6 border-gray-200">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
							<div>
								<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
									Leave Policies
								</h1>
							</div>
						</div>
					</div>
					<div className="p-4 sm:p-6 border-gray-200">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
							<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
								<div className="relative flex-1 min-w-0">
									<Icon
										icon="hugeicons:search-01"
										className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-4 !w-4 sm:!h-5 sm:!w-5"
									/>
									<Input
										placeholder="Search"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="pl-9 sm:pl-10 text-sm"
									/>
								</div>
								<div className="flex gap-2">
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none text-sm">
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all" className="text-sm">
												All Status
											</SelectItem>
											<SelectItem value="active" className="text-sm">
												Active
											</SelectItem>
											<SelectItem value="inactive" className="text-sm">
												Inactive
											</SelectItem>
										</SelectContent>
									</Select>
									<Select value={categoryFilter} onValueChange={setCategoryFilter}>
										<SelectTrigger className="w-full sm:w-[140px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none text-sm">
											<SelectValue placeholder="All Categories" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all" className="text-sm">
												All Categories
											</SelectItem>
											<SelectItem value="annual" className="text-sm">
												Annual
											</SelectItem>
											<SelectItem value="sick" className="text-sm">
												Sick
											</SelectItem>
											<SelectItem value="maternity" className="text-sm">
												Maternity
											</SelectItem>
											<SelectItem value="paternity" className="text-sm">
												Paternity
											</SelectItem>
											<SelectItem value="study" className="text-sm">
												Study
											</SelectItem>
											<SelectItem value="unpaid" className="text-sm">
												Unpaid
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_POLICIES}>
									<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
										<DialogTrigger asChild>
											<Button className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm">
												<Plus className="h-3 w-3 sm:h-4 sm:w-4" />
												<span className="hidden sm:inline">Create Leave Policy</span>
												<span className="sm:hidden">Create</span>
											</Button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-[980px] w-[95vw] rounded-2xl border-0 shadow-2xl overflow-y-auto max-h-[80vh] md:max-h-[65svh]">
											<DialogHeader className="space-y-3 pb-4 sm:pb-6 border-b border-gray-100">
												<DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
													Add Leave Policy
												</DialogTitle>
												<DialogDescription className="text-gray-600 text-sm sm:text-base">
													Create a new leave policy to manage employee leave requests and approval
													workflows.
												</DialogDescription>
											</DialogHeader>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
												<div className="space-y-3">
													<Label htmlFor="name" className="text-sm font-semibold text-gray-800">
														Policy Name *
													</Label>
													<Input
														id="name"
														value={formData.name}
														onChange={(e) => setFormData({ ...formData, name: e.target.value })}
														placeholder="e.g., Annual Leave Policy"
														disabled={isSubmitting}
														className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
													/>
												</div>
												<div className="space-y-3">
													<Label
														htmlFor="leave_type"
														className="text-sm font-semibold text-gray-800"
													>
														Leave Type *
													</Label>
													<Select
														value={formData.leave_type}
														onValueChange={(value) =>
															setFormData({ ...formData, leave_type: value })
														}
														disabled={isSubmitting}
													>
														<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
															<SelectValue placeholder="Select leave type" />
														</SelectTrigger>
														<SelectContent>
															{leaveTypes.map((type) => (
																<SelectItem
																	key={type.id}
																	value={type.id.toString()}
																	className="text-sm sm:text-base"
																>
																	{type.name} ({type.max_days_per_year} days/year)
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												<div className="space-y-3 md:col-span-2">
													<Label
														htmlFor="description"
														className="text-sm font-semibold text-gray-800"
													>
														Description *
													</Label>
													<Textarea
														id="description"
														value={formData.description}
														onChange={(e) =>
															setFormData({ ...formData, description: e.target.value })
														}
														rows={3}
														placeholder="Provide a detailed description of this leave policy..."
														disabled={isSubmitting}
														className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base resize-none"
													/>
												</div>
												<div className="space-y-3">
													<Label
														htmlFor="min_notice_days"
														className="text-sm font-semibold text-gray-800"
													>
														Minimum Notice Days *
													</Label>
													<FormatNumberInput
														id="min_notice_days"
														value={formData.min_notice_days?.toString() || ""}
														onChange={(formatted, numeric) =>
															setFormData({ ...formData, min_notice_days: numeric.toString() })
														}
														placeholder="e.g., 7"
														disabled={isSubmitting}
														className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
													/>
												</div>
												<div className="space-y-3">
													<Label
														htmlFor="max_consecutive_days"
														className="text-sm font-semibold text-gray-800"
													>
														Max Consecutive Days
													</Label>
													<FormatNumberInput
														id="max_consecutive_days"
														value={formData.max_consecutive_days?.toString() || ""}
														onChange={(formatted, numeric) =>
															setFormData({ ...formData, max_consecutive_days: numeric.toString() })
														}
														placeholder="Leave empty for no limit"
														disabled={isSubmitting}
														className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
													/>
												</div>
												<div className="space-y-3">
													<Label
														htmlFor="applicable_after_probation_months"
														className="text-sm font-semibold text-gray-800"
													>
														Applicable After Probation (Months) *
													</Label>
													<Input
														id="applicable_after_probation_months"
														type="number"
														value={formData.applicable_after_probation_months}
														onChange={(e) =>
															setFormData({
																...formData,
																applicable_after_probation_months: e.target.value,
															})
														}
														placeholder="e.g., 3"
														disabled={isSubmitting}
														className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
													/>
												</div>
												<div className="space-y-4 md:col-span-2">
													<div className="flex items-center space-x-3">
														<input
															id="requires_manager_approval"
															type="checkbox"
															checked={formData.requires_manager_approval}
															onChange={(e) =>
																setFormData({
																	...formData,
																	requires_manager_approval: e.target.checked,
																})
															}
															disabled={isSubmitting}
															className="h-4 w-4 sm:h-5 sm:w-5 text-myOrange focus:ring-orange-500 border-gray-300 rounded"
														/>
														<Label
															htmlFor="requires_manager_approval"
															className="text-sm font-medium text-gray-800"
														>
															Requires Manager Approval
														</Label>
													</div>
													<div className="flex items-center space-x-3">
														<input
															id="requires_hr_approval"
															type="checkbox"
															checked={formData.requires_hr_approval}
															onChange={(e) =>
																setFormData({ ...formData, requires_hr_approval: e.target.checked })
															}
															disabled={isSubmitting}
															className="h-4 w-4 sm:h-5 sm:w-5 text-myOrange focus:ring-orange-500 border-gray-300 rounded"
														/>
														<Label
															htmlFor="requires_hr_approval"
															className="text-sm font-medium text-gray-800"
														>
															Requires HR Approval
														</Label>
													</div>
												</div>
											</div>
											<DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-gray-100">
												<Button
													variant="outline"
													onClick={() => {
														resetForm();
														setIsAddDialogOpen(false);
													}}
													disabled={isSubmitting}
													className="w-full sm:flex-1 text-sm"
												>
													Cancel
												</Button>
												<Button
													onClick={handleAddPolicy}
													disabled={isSubmitting}
													className="w-full sm:flex-1 text-sm"
												>
													{isSubmitting ? (
														<>
															<Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
															Creating...
														</>
													) : (
														"Create Policy"
													)}
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</ProtectedComponent>
							</div>
						</div>
					</div>
					<div className="p-4 sm:p-6">
						<PaginatedTableWrapper<LeavePolicy>
							fetchFirstPage={async () => {
								if (!selectedInstitution) throw new Error("No institution selected");
								const response = await LeavePoliciesAPI.getPaginated({
									institutionId: selectedInstitution.id,
									page: 1,
									search: searchTerm || undefined,
									ordering: ordering || undefined,
								});

								// Transform the data to include populated leave_type
								const transformedResults = response.results.map((policy) => {
									if (typeof policy.leave_type === "object" && policy.leave_type !== null) {
										return {
											...policy,
											leave_type: policy.leave_type,
										} as LeavePolicy;
									}
									const leaveType =
										leaveTypes.find((lt) => lt.id === policy.leave_type) ||
										({
											id: policy.leave_type as number,
											name: "Unknown",
											category: "unknown" as any,
											max_days_per_year: 0,
											description: "Unknown leave type",
											carry_forward_allowed: false,
											max_carry_forward_days: 0,
											is_active: true,
											requires_document: false,
											gender_specific: null,
											created_at: new Date().toISOString(),
											updated_at: new Date().toISOString(),
										} as ILeaveType);

									return {
										...policy,
										leave_type: leaveType,
									} as LeavePolicy;
								});

								return {
									...response,
									results: transformedResults,
								};
							}}
							fetchFromUrl={async ({ url }) => {
								const response = await LeavePoliciesAPI.getPaginatedFromUrl({ url });

								// Transform the data to include populated leave_type
								const transformedResults = response.results.map((policy) => {
									if (typeof policy.leave_type === "object" && policy.leave_type !== null) {
										return {
											...policy,
											leave_type: policy.leave_type,
										} as LeavePolicy;
									}
									const leaveType =
										leaveTypes.find((lt) => lt.id === policy.leave_type) ||
										({
											id: policy.leave_type as number,
											name: "Unknown",
											category: "unknown" as any,
											max_days_per_year: 0,
											description: "Unknown leave type",
											carry_forward_allowed: false,
											max_carry_forward_days: 0,
											is_active: true,
											requires_document: false,
											gender_specific: null,
											created_at: new Date().toISOString(),
											updated_at: new Date().toISOString(),
										} as ILeaveType);

									return {
										...policy,
										leave_type: leaveType,
									} as LeavePolicy;
								});

								return {
									...response,
									results: transformedResults,
								};
							}}
							deps={[selectedInstitution?.id, searchTerm, leaveTypes, ordering]}
							className="space-y-4"
							footerClassName="pt-4"
						>
							{({ data, loading, refresh }) => {
								// Store refresh function in ref when component mounts/updates
								useEffect(() => {
									refreshTableRef.current = refresh;
								}, [refresh]);

								if (loading) {
									return <TableSkeleton rows={8} columns={6} />;
								}

								if (!data || data.results.length === 0) {
									return (
										<div className="text-center py-8 text-gray-500 text-sm sm:text-base">
											{searchTerm
												? "No leave policies found matching your search criteria"
												: "No leave policies found"}
										</div>
									);
								}

								// Apply client-side filters (status and category filters)
								const filteredResults = data.results.filter((policy) => {
									const matchesStatus =
										statusFilter === "all" || policy.is_active === (statusFilter === "active");
									const matchesCategory =
										categoryFilter === "all" || policy.leave_type?.category === categoryFilter;

									return matchesStatus && matchesCategory;
								});

								if (filteredResults.length === 0) {
									return (
										<div className="text-center py-8 text-gray-500 text-sm sm:text-base">
											No leave policies found matching the selected filters.
										</div>
									);
								}

								return (
									<>
										{/* Desktop Table */}
										<div className="hidden sm:block overflow-x-auto">
											<Table className="min-w-[800px] lg:min-w-full">
												<TableHeader>
													<TableRow>
														<TableHead className="text-sm">
															<div className="flex items-center gap-1 sm:gap-2">
																<span>Policy Name</span>
																<Button
																	size="sm"
																	variant={ordering === "name" ? "default" : "outline"}
																	className="h-6 w-6 p-0"
																	onClick={() => setOrdering(ordering === "name" ? "" : "name")}
																>
																	<Icon
																		icon="hugeicons:sorting-02"
																		className="!h-3 !w-3 sm:!h-4 sm:!w-4"
																	/>
																</Button>
															</div>
														</TableHead>
														<TableHead className="text-sm">
															<div className="flex items-center gap-1 sm:gap-2">
																<span>Leave Type</span>
																<Button
																	size="sm"
																	variant={ordering === "leave_type" ? "default" : "outline"}
																	className="h-6 w-6 p-0"
																	onClick={() =>
																		setOrdering(ordering === "leave_type" ? "" : "leave_type")
																	}
																>
																	<Icon
																		icon="hugeicons:sorting-02"
																		className="!h-3 !w-3 sm:!h-4 sm:!w-4"
																	/>
																</Button>
															</div>
														</TableHead>
														<TableHead className="text-sm">
															<div className="flex items-center gap-1 sm:gap-2">
																<span>Category</span>
																<Button
																	size="sm"
																	variant={ordering === "category" ? "default" : "outline"}
																	className="h-6 w-6 p-0"
																	onClick={() =>
																		setOrdering(ordering === "category" ? "" : "category")
																	}
																>
																	<Icon
																		icon="hugeicons:sorting-02"
																		className="!h-3 !w-3 sm:!h-4 sm:!w-4"
																	/>
																</Button>
															</div>
														</TableHead>
														<TableHead className="text-sm">Status</TableHead>
														<TableHead className="text-sm">
															<div className="flex items-center gap-1 sm:gap-2">
																<span>Notice Days</span>
																<Button
																	size="sm"
																	variant={ordering === "min_notice_days" ? "default" : "outline"}
																	className="h-6 w-6 p-0"
																	onClick={() =>
																		setOrdering(
																			ordering === "min_notice_days" ? "" : "min_notice_days",
																		)
																	}
																>
																	<Icon
																		icon="hugeicons:sorting-02"
																		className="!h-3 !w-3 sm:!h-4 sm:!w-4"
																	/>
																</Button>
															</div>
														</TableHead>
														<TableHead className="text-sm">HR Approval</TableHead>
														<TableHead className="text-sm">Manager Approval</TableHead>
														<TableHead className="text-sm w-12">Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredResults.map((policy) => (
														<TableRow key={policy.id}>
															<TableCell className="font-medium text-sm">{policy.name}</TableCell>
															<TableCell className="text-sm">
																{policy.leave_type?.name || "Unknown"}
															</TableCell>
															<TableCell>
																<Badge
																	className={`text-xs ${getCategoryColor(policy.leave_type?.category || "")}`}
																>
																	{policy.leave_type?.category || "Unknown"}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge className={`text-xs ${getStatusColor(policy.is_active)}`}>
																	{policy.is_active ? "Active" : "Inactive"}
																</Badge>
															</TableCell>
															<TableCell className="text-sm">
																{policy.min_notice_days} days
															</TableCell>
															<TableCell>
																<Badge
																	className={`text-xs ${getApprovalColor(policy.requires_hr_approval)}`}
																>
																	{policy.requires_hr_approval ? "Required" : "Not Required"}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge
																	className={`text-xs ${getApprovalColor(policy.requires_manager_approval)}`}
																>
																	{policy.requires_manager_approval ? "Required" : "Not Required"}
																</Badge>
															</TableCell>
															<TableCell>
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
																			<MoreVertical className="h-4 w-4" />
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end" className="w-40">
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_POLICIES}
																		>
																			<DropdownMenuItem
																				onClick={() =>
																					router.push(`/leave/leave-policy/${policy.id}`)
																				}
																				className="flex items-center px-3 py-2 text-xs sm:text-sm"
																			>
																				<Eye className="h-4 w-4 mr-2" />
																				View details
																			</DropdownMenuItem>
																		</ProtectedComponent>
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_EDIT_LEAVE_POLICIES}
																		>
																			<DropdownMenuItem
																				onClick={() => {
																					const policyWithLeaveType = {
																						...policy,
																						leave_type:
																							leaveTypes.find(
																								(lt) => lt.id === policy.leave_type,
																							) || ({} as ILeaveType),
																					} as LeavePolicy;

																					setEditingPolicy(policyWithLeaveType);
																					setFormData({
																						name: policy.name,
																						description: policy.description,
																						leave_type: policy.leave_type?.toString() || "",
																						min_notice_days: policy.min_notice_days.toString(),
																						max_consecutive_days:
																							policy.max_consecutive_days?.toString() || "",
																						requires_manager_approval:
																							policy.requires_manager_approval,
																						requires_hr_approval: policy.requires_hr_approval,
																						applicable_after_probation_months:
																							policy.applicable_after_probation_months.toString(),
																					});
																					setIsEditDialogOpen(true);
																				}}
																				className="text-xs sm:text-sm"
																			>
																				<Edit className="h-4 w-4 mr-2" />
																				Edit
																			</DropdownMenuItem>
																		</ProtectedComponent>

																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_DELETE_LEAVE_POLICIES}
																		>
																			<DropdownMenuItem
																				onClick={() => {
																					const policyWithLeaveType = {
																						...policy,
																						leave_type:
																							leaveTypes.find(
																								(lt) => lt.id === policy.leave_type,
																							) || ({} as ILeaveType),
																					} as LeavePolicy;

																					setDeletingPolicy(policyWithLeaveType);
																					setIsDeleteDialogOpen(true);
																				}}
																				className="text-red-600 text-xs sm:text-sm"
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

										{/* Mobile Cards */}
										<div className="sm:hidden space-y-3">
											{filteredResults.map((policy) => (
												<Card key={policy.id} className="p-3">
													<div className="flex justify-between items-start mb-3">
														<div className="flex-1 min-w-0">
															<h3 className="font-medium text-sm truncate">{policy.name}</h3>
															<p className="text-xs text-gray-500 mt-1 truncate">
																{policy.leave_type?.name || "Unknown"}
															</p>
														</div>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0 flex-shrink-0 ml-2"
																>
																	<MoreVertical className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" className="w-40">
																<ProtectedComponent
																	permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_POLICIES}
																>
																	<DropdownMenuItem
																		onClick={() => router.push(`/leave/leave-policy/${policy.id}`)}
																		className="text-xs"
																	>
																		<Eye className="h-4 w-4 mr-2" />
																		View details
																	</DropdownMenuItem>
																</ProtectedComponent>
																<ProtectedComponent
																	permissionCode={PERMISSION_CODES.CAN_EDIT_LEAVE_POLICIES}
																>
																	<DropdownMenuItem
																		onClick={() => {
																			const policyWithLeaveType = {
																				...policy,
																				leave_type:
																					leaveTypes.find((lt) => lt.id === policy.leave_type) ||
																					({} as ILeaveType),
																			} as LeavePolicy;

																			setEditingPolicy(policyWithLeaveType);
																			setFormData({
																				name: policy.name,
																				description: policy.description,
																				leave_type: policy.leave_type?.toString() || "",
																				min_notice_days: policy.min_notice_days.toString(),
																				max_consecutive_days:
																					policy.max_consecutive_days?.toString() || "",
																				requires_manager_approval: policy.requires_manager_approval,
																				requires_hr_approval: policy.requires_hr_approval,
																				applicable_after_probation_months:
																					policy.applicable_after_probation_months.toString(),
																			});
																			setIsEditDialogOpen(true);
																		}}
																		className="text-xs"
																	>
																		<Edit className="h-4 w-4 mr-2" />
																		Edit
																	</DropdownMenuItem>
																</ProtectedComponent>

																<ProtectedComponent
																	permissionCode={PERMISSION_CODES.CAN_DELETE_LEAVE_POLICIES}
																>
																	<DropdownMenuItem
																		onClick={() => {
																			const policyWithLeaveType = {
																				...policy,
																				leave_type:
																					leaveTypes.find((lt) => lt.id === policy.leave_type) ||
																					({} as ILeaveType),
																			} as LeavePolicy;

																			setDeletingPolicy(policyWithLeaveType);
																			setIsDeleteDialogOpen(true);
																		}}
																		className="text-red-600 text-xs"
																	>
																		<Trash2 className="h-4 w-4 mr-2" />
																		Delete
																	</DropdownMenuItem>
																</ProtectedComponent>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
													<div className="grid grid-cols-2 gap-2 text-xs">
														<div className="flex items-center">
															<span className="text-gray-500 mr-1">Status:</span>
															<Badge className={`${getStatusColor(policy.is_active)} text-xs`}>
																{policy.is_active ? "Active" : "Inactive"}
															</Badge>
														</div>
														<div className="flex items-center">
															<span className="text-gray-500 mr-1">Category:</span>
															<Badge
																className={`${getCategoryColor(policy.leave_type?.category || "")} text-xs`}
															>
																{policy.leave_type?.category || "Unknown"}
															</Badge>
														</div>
														<div>
															<span className="text-gray-500">Notice:</span>
															<span className="ml-1">{policy.min_notice_days} days</span>
														</div>
														<div>
															<span className="text-gray-500">HR Approval:</span>
															<span className="ml-1">
																{policy.requires_hr_approval ? "Yes" : "No"}
															</span>
														</div>
													</div>
												</Card>
											))}
										</div>
									</>
								);
							}}
						</PaginatedTableWrapper>
					</div>
				</div>

				{/* Edit Dialog */}
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_LEAVE_POLICIES}>
					<Dialog
						open={isEditDialogOpen}
						onOpenChange={(open) => {
							setIsEditDialogOpen(open);
							if (!open) {
								resetForm();
								setEditingPolicy(null);
							}
						}}
					>
						<DialogContent className="sm:max-w-[980px] w-[95vw] rounded-2xl border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
							<DialogHeader className="space-y-3 pb-4 sm:pb-6 border-b border-gray-100">
								<DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
									Edit Leave Policy
								</DialogTitle>
								<DialogDescription className="text-gray-600 text-sm sm:text-base">
									Make changes to the existing leave policy configuration.
								</DialogDescription>
							</DialogHeader>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
								{/* Edit form content - similar to Add dialog but with existing values */}
								<div className="space-y-3">
									<Label htmlFor="edit-name" className="text-sm font-semibold text-gray-800">
										Policy Name *
									</Label>
									<Input
										id="edit-name"
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
										placeholder="e.g., Annual Leave Policy"
										disabled={isSubmitting}
										className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
									/>
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
										<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
											<SelectValue placeholder="Select leave type" />
										</SelectTrigger>
										<SelectContent>
											{leaveTypes.map((type) => (
												<SelectItem
													key={type.id}
													value={type.id.toString()}
													className="text-sm sm:text-base"
												>
													{type.name} ({type.max_days_per_year} days/year)
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-3 md:col-span-2">
									<Label htmlFor="edit-description" className="text-sm font-semibold text-gray-800">
										Description *
									</Label>
									<Textarea
										id="edit-description"
										value={formData.description}
										onChange={(e) => setFormData({ ...formData, description: e.target.value })}
										rows={3}
										placeholder="Provide a detailed description of this leave policy..."
										disabled={isSubmitting}
										className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base resize-none"
									/>
								</div>
								<div className="space-y-3">
									<Label
										htmlFor="edit-min_notice_days"
										className="text-sm font-semibold text-gray-800"
									>
										Minimum Notice Days *
									</Label>
									<Input
										id="edit-min_notice_days"
										type="number"
										value={formData.min_notice_days}
										onChange={(e) => setFormData({ ...formData, min_notice_days: e.target.value })}
										placeholder="e.g., 7"
										disabled={isSubmitting}
										className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
									/>
								</div>
								<div className="space-y-3">
									<Label
										htmlFor="edit-max_consecutive_days"
										className="text-sm font-semibold text-gray-800"
									>
										Max Consecutive Days
									</Label>
									<Input
										id="edit-max_consecutive_days"
										type="number"
										value={formData.max_consecutive_days}
										onChange={(e) =>
											setFormData({ ...formData, max_consecutive_days: e.target.value })
										}
										placeholder="Leave empty for no limit"
										disabled={isSubmitting}
										className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
									/>
								</div>
								<div className="space-y-3">
									<Label
										htmlFor="edit-applicable_after_probation_months"
										className="text-sm font-semibold text-gray-800"
									>
										Applicable After Probation (Months) *
									</Label>
									<Input
										id="edit-applicable_after_probation_months"
										type="number"
										value={formData.applicable_after_probation_months}
										onChange={(e) =>
											setFormData({
												...formData,
												applicable_after_probation_months: e.target.value,
											})
										}
										placeholder="e.g., 3"
										disabled={isSubmitting}
										className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
									/>
								</div>
								<div className="space-y-4 md:col-span-2">
									<div className="flex items-center space-x-3">
										<input
											id="edit-requires_manager_approval"
											type="checkbox"
											checked={formData.requires_manager_approval}
											onChange={(e) =>
												setFormData({
													...formData,
													requires_manager_approval: e.target.checked,
												})
											}
											disabled={isSubmitting}
											className="h-4 w-4 sm:h-5 sm:w-5 text-myOrange focus:ring-orange-500 border-gray-300 rounded"
										/>
										<Label
											htmlFor="edit-requires_manager_approval"
											className="text-sm font-medium text-gray-800"
										>
											Requires Manager Approval
										</Label>
									</div>
									<div className="flex items-center space-x-3">
										<input
											id="edit-requires_hr_approval"
											type="checkbox"
											checked={formData.requires_hr_approval}
											onChange={(e) =>
												setFormData({ ...formData, requires_hr_approval: e.target.checked })
											}
											disabled={isSubmitting}
											className="h-4 w-4 sm:h-5 sm:w-5 text-myOrange focus:ring-orange-500 border-gray-300 rounded"
										/>
										<Label
											htmlFor="edit-requires_hr_approval"
											className="text-sm font-medium text-gray-800"
										>
											Requires HR Approval
										</Label>
									</div>
								</div>
							</div>
							<DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-gray-100">
								<Button
									variant="outline"
									onClick={() => {
										resetForm();
										setIsEditDialogOpen(false);
										setEditingPolicy(null);
									}}
									disabled={isSubmitting}
									className="w-full sm:flex-1 text-sm"
								>
									Cancel
								</Button>
								<Button
									onClick={handleEditPolicy}
									disabled={isSubmitting}
									className="w-full sm:flex-1 text-sm"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
											Updating...
										</>
									) : (
										"Update Policy"
									)}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</ProtectedComponent>

				{/* Delete Dialog */}
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_LEAVE_POLICIES}>
					<Dialog
						open={isDeleteDialogOpen}
						onOpenChange={(open) => {
							setIsDeleteDialogOpen(open);
							if (!open) {
								setDeletingPolicy(null);
							}
						}}
					>
						<DialogContent className="sm:max-w-[500px] w-[95vw] rounded-2xl border-0 shadow-2xl">
							<DialogHeader className="space-y-4 pb-6">
								<div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
									<Trash2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
								</div>
								<DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 text-center">
									Delete Leave Policy
								</DialogTitle>
								<DialogDescription className="text-gray-600 text-center text-sm sm:text-base">
									Are you sure you want to delete "{deletingPolicy?.name}"? This action cannot be
									undone and will permanently remove the policy from your system.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
								<Button
									variant="outline"
									onClick={() => {
										setIsDeleteDialogOpen(false);
										setDeletingPolicy(null);
									}}
									disabled={isSubmitting}
									className="w-full sm:w-auto text-sm"
								>
									Cancel
								</Button>
								<Button
									variant="destructive"
									onClick={handleDeletePolicy}
									disabled={isSubmitting}
									className="w-full sm:w-auto text-sm"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
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
};

export default LeavePolicyComponent;
