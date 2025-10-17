"use client";

import type {
	ILeaveTypeGender,
	ILeaveType,
	ILeaveTypeCategory,
	ILeaveTypeFormData,
} from "@/types/types.utils";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, MoreVertical, Edit, Trash2, Search, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LeaveTypesAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import FormatNumberInput from "@/components/format-number-input";
import { LeaveTypeDetailsDialog } from "@/components/dialogs/leave-type-details-dilaog";
import { LeaveTypeFormDialog } from "@/components/dialogs/leave-type-form-dialog";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";

const LEAVE_CATEGORIES: Array<{ value: ILeaveTypeCategory; label: string }> = [
	{ value: "annual", label: "Annual Leave" },
	{ value: "sick", label: "Sick Leave" },
	{ value: "maternity", label: "Maternity Leave" },
	{ value: "paternity", label: "Paternity Leave" },
	// { value: "compassionate", label: "Compassionate Leave" },
	// { value: "study", label: "Study Leave" },
	{ value: "unpaid", label: "Unpaid Leave" },
];

const GENDER_CHOICES: Array<{ value: ILeaveTypeGender; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
];

const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const getCarryForwardColor = (carryForward: boolean) => {
	return carryForward
		? "bg-blue-100 text-blue-800 border-blue-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const getRequiresDocumentColor = (requiresDocument: boolean) => {
	return requiresDocument
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

const LeaveTypesPage = () => {
	const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingLeaveType, setEditingLeaveType] = useState<ILeaveType | null>(null);
	const [deletingLeaveType, setDeletingLeaveType] = useState<ILeaveType | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const refreshTableRef = useRef<(() => void) | null>(null);
	const [ordering, setOrdering] = useState("");
	const [viewingLeaveType, setViewingLeaveType] = useState<ILeaveType | null>(null);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();

	const handleFormSuccess = (leaveType: ILeaveType) => {
		refreshTableRef.current?.();
		setEditingLeaveType(null);
	};

	const handleDeleteSuccess = () => {
		toast.success("Leave type deleted successfully");
		refreshTableRef.current?.();
	};

	const handleDeleteLeaveType = async () => {
		if (!deletingLeaveType) return;

		setIsSubmitting(true);
		try {
			const success = await LeaveTypesAPI.delete(deletingLeaveType.id);

			if (success) {
				handleDeleteSuccess();
				setIsDeleteDialogOpen(false);
				setDeletingLeaveType(null);
			} else {
				toast.error("Failed to delete leave type");
			}
		} catch (error: any) {
			console.error("Error deleting leave type:", error);
			toast.error(error.message || "An error occurred while deleting the leave type");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditLeaveType = (leaveType: ILeaveType) => {
		setEditingLeaveType(leaveType);
		setIsFormDialogOpen(true);
	};

	const handleCreateLeaveType = () => {
		setEditingLeaveType(null);
		setIsFormDialogOpen(true);
	};

	const handleFormDialogClose = (open: boolean) => {
		setIsFormDialogOpen(open);
		if (!open) {
			setEditingLeaveType(null);
		}
	};

	const clearFilters = () => {
		setSearchTerm("");
		setStatusFilter("all");
		setCategoryFilter("all");
	};

	const hasFilters = searchTerm || statusFilter !== "all" || categoryFilter !== "all";

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-4 sm:py-6 md:py-8 min-h-screen">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
				<div>
					<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Leave Types</h1>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="mb-4 sm:mb-6">
				<div className="border-gray-200">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
						<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
							{/* Search bar */}
							<div className="relative flex-1 min-w-0">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
								<Input
									placeholder="Search leave types..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-8 sm:pl-10 text-xs sm:text-sm"
								/>
							</div>

							{/* Filters */}
							<div className="flex gap-2 flex-shrink-0">
								<Select
									value={statusFilter}
									onValueChange={(value: string) =>
										setStatusFilter(value as "all" | "active" | "inactive")
									}
								>
									<SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none text-xs sm:text-sm">
										<SelectValue placeholder="All Statuses" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all" className="text-xs sm:text-sm">
											All Statuses
										</SelectItem>
										<SelectItem value="active" className="text-xs sm:text-sm">
											Active
										</SelectItem>
										<SelectItem value="inactive" className="text-xs sm:text-sm">
											Inactive
										</SelectItem>
									</SelectContent>
								</Select>

								<Select
									value={categoryFilter}
									onValueChange={(value: string) =>
										setCategoryFilter(
											value as
												| "all"
												| "annual"
												| "sick"
												| "maternity"
												| "paternity"
												| "study"
												| "unpaid",
										)
									}
								>
									<SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none text-xs sm:text-sm">
										<SelectValue placeholder="All Categories" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all" className="text-xs sm:text-sm">
											All Categories
										</SelectItem>
										{LEAVE_CATEGORIES.map((category) => (
											<SelectItem
												key={category.value}
												value={category.value}
												className="text-xs sm:text-sm"
											>
												{category.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
								<Button
									className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-[12px] w-full sm:w-auto"
									onClick={handleCreateLeaveType}
									size="sm"
								>
									<Plus className="h-3 w-3 sm:h-4 sm:w-4" />
									<span className="hidden sm:inline">Create Leave Type</span>
									<span className="sm:hidden">Create</span>
								</Button>
							</ProtectedComponent>
						</div>
					</div>
				</div>
			</div>

			{/* Leave Types Table */}
			<div>
				<CardContent className="p-0 -ml-3 sm:-ml-4">
					<PaginatedTableWrapper<ILeaveType>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");

							return await LeaveTypesAPI.getPaginated({
								institutionId: selectedInstitution.id,
								page: 1,
								search: searchTerm || undefined,
								ordering: ordering || undefined,
							});
						}}
						fetchFromUrl={LeaveTypesAPI.getPaginatedFromUrl}
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
								return <TableSkeleton rows={8} columns={6} />;
							}

							if (!data || data.results.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500 text-sm sm:text-base">
										{searchTerm
											? "No leave types found matching your search criteria"
											: "No leave types found"}
									</div>
								);
							}

							// Apply client-side filters (status and category filters)
							const filteredResults = data.results.filter((leaveType) => {
								const matchesStatus =
									statusFilter === "all" || leaveType.is_active === (statusFilter === "active");
								const matchesCategory =
									categoryFilter === "all" || leaveType.category === categoryFilter;

								return matchesStatus && matchesCategory;
							});

							if (filteredResults.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500 text-sm sm:text-base">
										No leave types found matching the selected filters.
									</div>
								);
							}

							return (
								<div className="overflow-x-auto mt-6 sm:mt-10">
									<Table className="min-w-[1000px] lg:min-w-full [&_th]:border-0 [&_td]:border-0">
										<TableHeader className="bg-gray-50/50">
											<TableRow>
												<TableHead className="text-xs sm:text-sm">
													Name
													<Button
														size="sm"
														variant={ordering === "name" ? "default" : "outline"}
														className="ml-1 sm:ml-2 h-6 w-6 sm:h-8 sm:w-8 p-0"
														onClick={() => setOrdering(ordering === "name" ? "" : "name")}
													>
														<Icon
															icon="hugeicons:sorting-02"
															className="!h-3 !w-3 sm:!h-4 sm:!w-4"
														/>
													</Button>
												</TableHead>

												<TableHead className="text-xs sm:text-sm">
													Category
													<Button
														size="sm"
														variant={ordering === "category" ? "default" : "outline"}
														className="ml-1 sm:ml-2 h-6 w-6 sm:h-8 sm:w-8 p-0"
														onClick={() => setOrdering(ordering === "category" ? "" : "category")}
													>
														<Icon
															icon="hugeicons:sorting-02"
															className="!h-3 !w-3 sm:!h-4 sm:!w-4"
														/>
													</Button>
												</TableHead>

												<TableHead className="text-xs sm:text-sm">
													Status
													<Button
														size="sm"
														variant={ordering === "is_active" ? "default" : "outline"}
														className="ml-1 sm:ml-2 h-6 w-6 sm:h-8 sm:w-8 p-0"
														onClick={() => setOrdering(ordering === "is_active" ? "" : "is_active")}
													>
														<Icon
															icon="hugeicons:sorting-02"
															className="!h-3 !w-3 sm:!h-4 sm:!w-4"
														/>
													</Button>
												</TableHead>

												<TableHead className="text-xs sm:text-sm">
													Max Days
													<Button
														size="sm"
														variant={ordering === "max_days_per_year" ? "default" : "outline"}
														className="ml-1 sm:ml-2 h-6 w-6 sm:h-8 sm:w-8 p-0"
														onClick={() =>
															setOrdering(
																ordering === "max_days_per_year" ? "" : "max_days_per_year",
															)
														}
													>
														<Icon
															icon="hugeicons:sorting-02"
															className="!h-3 !w-3 sm:!h-4 sm:!w-4"
														/>
													</Button>
												</TableHead>

												<TableHead className="text-xs sm:text-sm">
													Carry Forward
													<Button
														size="sm"
														variant={ordering === "carry_forward_allowed" ? "default" : "outline"}
														className="ml-1 sm:ml-2 h-6 w-6 sm:h-8 sm:w-8 p-0"
														onClick={() =>
															setOrdering(
																ordering === "carry_forward_allowed" ? "" : "carry_forward_allowed",
															)
														}
													>
														<Icon
															icon="hugeicons:sorting-02"
															className="!h-3 !w-3 sm:!h-4 sm:!w-4"
														/>
													</Button>
												</TableHead>

												<TableHead className="text-xs sm:text-sm">Requires Doc</TableHead>
												<TableHead className="text-xs sm:text-sm">Gender</TableHead>

												<TableHead className="text-xs sm:text-sm">
													Created Date
													<Button
														size="sm"
														variant={ordering === "created_at" ? "default" : "outline"}
														className="ml-1 sm:ml-2 h-6 w-6 sm:h-8 sm:w-8 p-0"
														onClick={() =>
															setOrdering(ordering === "created_at" ? "" : "created_at")
														}
													>
														<Icon
															icon="hugeicons:sorting-02"
															className="!h-3 !w-3 sm:!h-4 sm:!w-4"
														/>
													</Button>
												</TableHead>

												<TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredResults.map((leaveType) => (
												<TableRow key={leaveType.id}>
													<TableCell className="font-medium">
														<div className="flex items-center gap-1 sm:gap-2">
															<span className="text-xs sm:text-sm">{leaveType.name}</span>
														</div>
													</TableCell>
													<TableCell>
														<Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
															{LEAVE_CATEGORIES.find((cat) => cat.value === leaveType.category)
																?.label || leaveType.category}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge className={`${getStatusColor(leaveType.is_active)} text-xs`}>
															{leaveType.is_active ? "Active" : "Inactive"}
														</Badge>
													</TableCell>
													<TableCell className="text-xs sm:text-sm">
														{leaveType.max_days_per_year} days
													</TableCell>
													<TableCell>
														<Badge
															className={`${getCarryForwardColor(leaveType.carry_forward_allowed)} text-xs`}
														>
															{leaveType.carry_forward_allowed ? "Yes" : "No"}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge
															className={`${getRequiresDocumentColor(leaveType.requires_document)} text-xs`}
														>
															{leaveType.requires_document ? "Yes" : "No"}
														</Badge>
													</TableCell>
													<TableCell className="text-xs sm:text-sm">
														{leaveType.gender_specific || "All"}
													</TableCell>
													<TableCell className="text-xs sm:text-sm">
														{formatDate(leaveType.created_at ?? "")}
													</TableCell>
													<TableCell className="text-right">
														<ProtectedComponent
															permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}
														>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-6 w-6 sm:h-8 sm:w-8 p-0"
																	>
																		<MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end" className="w-40 sm:w-48">
																	<DropdownMenuItem
																		onClick={() =>
																			router.push(`/leave/leave-types/${leaveType.id}`)
																		}
																		className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm"
																	>
																		<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-gray-500" />
																		View Details
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => handleEditLeaveType(leaveType)}
																		className="text-xs sm:text-sm py-1.5 sm:py-2"
																	>
																		<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
																		Edit
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => {
																			setDeletingLeaveType(leaveType);
																			setIsDeleteDialogOpen(true);
																		}}
																		className="text-destructive text-xs sm:text-sm py-1.5 sm:py-2"
																	>
																		<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
																		Delete
																	</DropdownMenuItem>
																</DropdownMenuContent>
															</DropdownMenu>
														</ProtectedComponent>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							);
						}}
					</PaginatedTableWrapper>
				</CardContent>
			</div>

			{/* Form Dialog */}
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
				<LeaveTypeFormDialog
					isOpen={isFormDialogOpen}
					onOpenChange={handleFormDialogClose}
					editingLeaveType={editingLeaveType}
					onSuccess={handleFormSuccess}
				/>
			</ProtectedComponent>

			{/* View Dialog */}
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
				<LeaveTypeDetailsDialog
					isOpen={isViewDialogOpen}
					onOpenChange={(open) => {
						setIsViewDialogOpen(open);
						if (!open) {
							setViewingLeaveType(null);
						}
					}}
					leaveType={viewingLeaveType}
					approvals={viewingLeaveType?.approvals}
					instanceApprovalStatus={viewingLeaveType?.approval_status}
					onRefresh={() => refreshTableRef.current?.()}
				/>
			</ProtectedComponent>

			{/* Delete Confirmation Dialog */}
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
				<Dialog
					open={isDeleteDialogOpen}
					onOpenChange={(open) => {
						setIsDeleteDialogOpen(open);
						if (!open) {
							setDeletingLeaveType(null);
						}
					}}
				>
					<DialogContent className="sm:max-w-[500px] w-[95vw] sm:w-full rounded-2xl border-0 shadow-2xl">
						<DialogHeader className="space-y-4 pb-6">
							<div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
								<Trash2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
							</div>
							<DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 text-center">
								Delete Leave Type
							</DialogTitle>
							<DialogDescription className="text-sm sm:text-base text-gray-600 text-center leading-relaxed">
								Are you sure you want to delete{" "}
								<span className="font-semibold text-gray-900">"{deletingLeaveType?.name}"</span>?
								This action cannot be undone and will permanently remove this leave type from your
								system.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter className="flex flex-col sm:flex-row gap-3">
							<Button
								variant="outline"
								onClick={() => setIsDeleteDialogOpen(false)}
								disabled={isSubmitting}
								className="w-full sm:w-auto text-xs sm:text-sm"
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={handleDeleteLeaveType}
								disabled={isSubmitting}
								className="w-full sm:w-auto text-xs sm:text-sm"
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
	);
};

export default LeaveTypesPage;
