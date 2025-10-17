"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { MoreVertical, Edit, Trash2, Search, Settings, Eye } from "lucide-react";
import { Icon } from "@iconify/react";

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
import { IDeductionType } from "@/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent";
import { getPaginatedDeductionTypes, getPaginatedDeductionTypesFromUrl } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { CreateDeductionTypeDialog } from "@/components/deduction-types/create-deduction-type-dialog";
import { EditDeductionTypeDialog } from "@/components/deduction-types/edit-deduction-type-dialog";
import { DeleteDeductionTypeDialog } from "@/components/deduction-types/delete-deduction-type-dialog";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { ALLOWANCE_FREQUENCIES, PERMISSION_CODES } from "@/constants";
import { useMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";

const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const getMandatoryColor = (isMandatory: boolean) => {
	return isMandatory
		? "bg-red-100 text-red-800 border-red-200"
		: "bg-blue-100 text-blue-800 border-blue-200";
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const DeductionTypesComponent = () => {
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingDeductionType, setEditingDeductionType] = useState<IDeductionType | null>(null);
	const [deletingDeductionType, setDeletingDeductionType] = useState<IDeductionType | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const refreshTableRef = useRef<(() => void) | null>(null);
	const isMobile = useMobile();
	const [ordering, setOrdering] = useState("");
	const router = useRouter();

	const selectedInstitution = useSelector(selectSelectedInstitution);

	const handleCreateSuccess = (newDeductionType: IDeductionType) => {
		refreshTableRef.current?.();
	};

	const handleUpdateSuccess = (updatedDeductionType: IDeductionType) => {
		setEditingDeductionType(null);
		refreshTableRef.current?.();
	};

	const handleDeleteSuccess = (deletedId: number) => {
		setDeletingDeductionType(null);
		refreshTableRef.current?.();
	};

	const handleEditDeductionType = (deductionType: IDeductionType) => {
		setEditingDeductionType(deductionType);
		setIsEditDialogOpen(true);
	};

	const handleViewDeductionType = (deductionType: IDeductionType) => {
		router.push(`/payroll/deduction-types/${deductionType.id}`);
	};

	const handleDeleteDeductionType = (deductionType: IDeductionType) => {
		setDeletingDeductionType(deductionType);
		setIsDeleteDialogOpen(true);
	};

	return (
		<div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
			{/* Header and Filters */}
			<div className="bg-white rounded-lg border shadow-sm min-h-screen">
				<div className="p-4 sm:p-6 border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Deduction Types</h1>
						</div>
					</div>
				</div>

				<div className="p-4 sm:p-6 border-gray-200">
					<div className="flex w-full flex-col gap-3 sm:gap-4">
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
							<div className="relative flex-1 w-full">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search deduction types..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 w-full"
								/>
							</div>
							<div className="flex items-center gap-2 sm:gap-4">
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className="w-full sm:w-[140px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
										<SelectValue placeholder="All Statuses" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Statuses</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex items-center gap-2 w-full sm:w-auto">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_DEDUCTION_TYPES}>
								<div className="w-full sm:w-auto">
									<CreateDeductionTypeDialog
										onSuccess={handleCreateSuccess}
										disabled={!selectedInstitution?.id}
									/>
								</div>
							</ProtectedComponent>
						</div>
					</div>
				</div>

				<div className="p-4 sm:p-6">
					<PaginatedTableWrapper<IDeductionType>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");

							return await getPaginatedDeductionTypes({
								institutionId: selectedInstitution.id,
								page: 1,
								search: searchTerm || undefined,
								ordering,
							});
						}}
						fetchFromUrl={getPaginatedDeductionTypesFromUrl}
						deps={[selectedInstitution?.id, searchTerm, ordering]}
						className="space-y-4"
						footerClassName="pt-4"
					>
						{({ data, loading, refresh }) => {
							useEffect(() => {
								refreshTableRef.current = refresh;
							}, [refresh]);

							if (loading) {
								return (
									<div className="space-y-3 sm:space-y-4">
										{[...Array(5)].map((_, i) => (
											<div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
										))}
									</div>
								);
							}

							if (!data || data.results.length === 0) {
								return (
									<div className="p-8 sm:p-12 text-center">
										<Settings className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
										<h3 className="text-base sm:text-lg font-semibold mb-2">
											No deduction types found
										</h3>
										<p className="text-sm sm:text-base text-muted-foreground mb-4">
											{searchTerm
												? "No deduction types match your search criteria."
												: "Get started by creating your first deduction type."}
										</p>
									</div>
								);
							}

							// Apply client-side filters (status filter)
							const filteredResults = data.results.filter((deductionType) => {
								const matchesStatus =
									statusFilter === "all" ||
									(statusFilter === "active" && deductionType.is_active) ||
									(statusFilter === "inactive" && !deductionType.is_active);

								return matchesStatus;
							});

							if (filteredResults.length === 0) {
								return (
									<div className="p-8 sm:p-12 text-center">
										<Settings className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
										<h3 className="text-base sm:text-lg font-semibold mb-2">
											No deduction types found
										</h3>
										<p className="text-sm sm:text-base text-muted-foreground mb-4">
											No deduction types match the selected status filter.
										</p>
									</div>
								);
							}

							return (
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_DEDUCTION_TYPES}>
									<div className="overflow-x-auto -mx-4 sm:mx-0">
										<div className="inline-block min-w-full align-middle">
											<Table className="min-w-[900px] [&_th]:border-0 [&_td]:border-0">
												<TableHeader className="bg-gray-50/50">
													<TableRow>
														<TableHead className="min-w-[150px] sm:min-w-[180px]">
															<div className="flex items-center justify-start gap-2 sm:gap-4">
																<span className="text-xs sm:text-sm">Name</span>
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
																	className="h-6 w-6 sm:h-7 sm:w-7 p-0"
																>
																	<Icon
																		icon="hugeicons:sorting-02"
																		className="!h-3 !w-3 sm:!h-4 sm:!w-4"
																	/>
																</Button>
															</div>
														</TableHead>
														<TableHead className="min-w-[90px] sm:min-w-[100px]">
															<span className="text-xs sm:text-sm">Status</span>
														</TableHead>
														<TableHead className="min-w-[100px] sm:min-w-[110px]">
															<span className="text-xs sm:text-sm">Mandatory</span>
														</TableHead>
														<TableHead className="min-w-[150px] sm:min-w-[180px]">
															<div className="flex items-center justify-start gap-2 sm:gap-4">
																<span className="text-xs sm:text-sm">Recurrence</span>
																<Button
																	onClick={() => {
																		if (ordering === "frequency") {
																			setOrdering("");
																		} else {
																			setOrdering("frequency");
																		}
																	}}
																	size={"sm"}
																	variant={ordering === "frequency" ? "default" : "outline"}
																	type="button"
																	className="h-6 w-6 sm:h-7 sm:w-7 p-0"
																>
																	<Icon
																		icon="hugeicons:sorting-02"
																		className="!h-3 !w-3 sm:!h-4 sm:!w-4"
																	/>
																</Button>
															</div>
														</TableHead>
														<TableHead className="min-w-[180px] sm:min-w-[200px]">
															<span className="text-xs sm:text-sm">Description</span>
														</TableHead>
														<TableHead className="min-w-[120px] sm:min-w-[130px]">
															<span className="text-xs sm:text-sm">Created Date</span>
														</TableHead>
														<TableHead className="text-right min-w-[70px] sm:min-w-[80px]">
															<span className="text-xs sm:text-sm">Actions</span>
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredResults.map((deductionType) => (
														<TableRow key={deductionType.id}>
															<TableCell className="font-medium">
																<div className="flex items-center gap-2 sm:gap-3">
																	<span className="text-xs sm:text-sm">{deductionType.name}</span>
																</div>
															</TableCell>
															<TableCell>
																<Badge
																	className={`${getStatusColor(deductionType.is_active)} text-[10px] sm:text-xs`}
																>
																	{deductionType.is_active ? "Active" : "Inactive"}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge
																	className={`${getMandatoryColor(deductionType.is_mandatory)} text-[10px] sm:text-xs`}
																>
																	{deductionType.is_mandatory ? "Mandatory" : "Optional"}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge
																	className={`${
																		deductionType.is_recurring
																			? "bg-purple-100 text-purple-800 border-purple-200"
																			: "bg-gray-100 text-gray-800 border-gray-200"
																	} text-[10px] sm:text-xs`}
																>
																	{deductionType.is_recurring
																		? `Recurring${deductionType.frequency ? ` (${ALLOWANCE_FREQUENCIES[deductionType.frequency as keyof typeof ALLOWANCE_FREQUENCIES]})` : ""}`
																		: "One-time"}
																</Badge>
															</TableCell>
															<TableCell>
																<div className="max-w-[150px] sm:max-w-xs truncate text-xs sm:text-sm text-muted-foreground">
																	{deductionType.description}
																</div>
															</TableCell>
															<TableCell>
																<span className="text-xs sm:text-sm">
																	{formatDate(deductionType.created_at)}
																</span>
															</TableCell>
															<TableCell className="text-right">
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-7 w-7 sm:h-8 sm:w-8 p-0"
																		>
																			<MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_VIEW_DEDUCTION_TYPES}
																		>
																			<DropdownMenuItem
																				onClick={() => handleViewDeductionType(deductionType)}
																				className="text-xs sm:text-sm"
																			>
																				<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> View Details
																			</DropdownMenuItem>
																		</ProtectedComponent>
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_EDIT_DEDUCTION_TYPES}
																		>
																			<DropdownMenuItem
																				onClick={() => handleEditDeductionType(deductionType)}
																				className="text-xs sm:text-sm"
																			>
																				<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
																				Edit
																			</DropdownMenuItem>
																		</ProtectedComponent>
																		<ProtectedComponent
																			permissionCode={PERMISSION_CODES.CAN_DELETE_DEDUCTION_TYPES}
																		>
																			<DropdownMenuItem
																				onClick={() => handleDeleteDeductionType(deductionType)}
																				className="text-destructive text-xs sm:text-sm"
																			>
																				<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
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
									</div>
								</ProtectedComponent>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</div>

			{/* Dialogs */}
			{editingDeductionType && (
				<EditDeductionTypeDialog
					isOpen={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
					deductionType={editingDeductionType}
					onSuccess={handleUpdateSuccess}
				/>
			)}

			{deletingDeductionType && (
				<DeleteDeductionTypeDialog
					isOpen={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					deductionType={deletingDeductionType}
					onSuccess={handleDeleteSuccess}
				/>
			)}
		</div>
	);
};

export default DeductionTypesComponent;
