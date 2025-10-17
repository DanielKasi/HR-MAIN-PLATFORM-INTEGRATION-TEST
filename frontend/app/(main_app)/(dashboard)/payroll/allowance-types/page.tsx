"use client";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { MoreVertical, Edit, Trash2, Search, Settings, Plus, Eye } from "lucide-react";
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
import { IAllowanceType } from "@/types/types.utils";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { getPaginatedAllowanceTypes, getPaginatedAllowanceTypesFromUrl } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { CreateAllowanceTypeDialog } from "@/components/allowance-types/create-allowance-type-dialog";
import { EditAllowanceTypeDialog } from "@/components/allowance-types/edit-allowance-type-dialog";
import { DeleteAllowanceTypeDialog } from "@/components/allowance-types/delete-allowance-type-dialog";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { useRouter } from "next/navigation";

const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const getTaxableColor = (isTaxable: boolean) => {
	return isTaxable
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

const AllowanceTypesComponent = () => {
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingAllowanceType, setEditingAllowanceType] = useState<IAllowanceType | null>(null);
	const [deletingAllowanceType, setDeletingAllowanceType] = useState<IAllowanceType | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const refreshFunctionRef = useRef<(() => void) | null>(null);
	const [ordering, setOrdering] = useState("");
	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const handleCreateSuccess = () => {
		if (refreshFunctionRef.current) {
			refreshFunctionRef.current();
		}
	};

	const handleUpdateSuccess = () => {
		setEditingAllowanceType(null);
		if (refreshFunctionRef.current) {
			refreshFunctionRef.current();
		}
	};

	const handleDeleteSuccess = () => {
		setDeletingAllowanceType(null);
		if (refreshFunctionRef.current) {
			refreshFunctionRef.current();
		}
	};

	const handleViewAllowanceType = (allowanceType: IAllowanceType) => {
		router.push(`/payroll/allowance-types/${allowanceType.id}`);
	};
	const handleEditAllowanceType = (allowanceType: IAllowanceType) => {
		setEditingAllowanceType(allowanceType);
		setIsEditDialogOpen(true);
	};

	const handleDeleteAllowanceType = (allowanceType: IAllowanceType) => {
		setDeletingAllowanceType(allowanceType);
		setIsDeleteDialogOpen(true);
	};

	return (
		<div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
			{/* Header and Filters */}
			<div className="bg-white rounded-lg border shadow-sm min-h-screen">
				<div className="p-4 sm:p-6 border-gray-200">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 justify-between">
						<h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
							Allowance Types
						</h1>

						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_ALLOWANCE_TYPES}>
							<Button
								onClick={() => setIsCreateDialogOpen(true)}
								disabled={!selectedInstitution?.id}
								className="w-full sm:w-auto"
								size="sm"
							>
								<Plus className="h-4 w-4 mr-2" />
								<span className="sm:inline">Create Allowance Type</span>
							</Button>
						</ProtectedComponent>
					</div>
				</div>
				<div className="p-4 sm:p-6 border-gray-200">
					<div className="flex flex-col gap-3 sm:gap-4">
						<div className="flex items-center gap-3 sm:gap-4 w-full">
							<div className="relative flex-1 w-full">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search allowance types..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 w-full"
								/>
							</div>
						</div>
						<div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
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
				</div>
				<div className="p-4 sm:p-6">
					<PaginatedTableWrapper<IAllowanceType>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");

							return await getPaginatedAllowanceTypes({
								institutionId: selectedInstitution.id,
								page: 1,
								search: searchTerm || undefined,
								ordering,
							});
						}}
						fetchFromUrl={getPaginatedAllowanceTypesFromUrl}
						deps={[selectedInstitution?.id, searchTerm, ordering]}
						className="space-y-4"
						footerClassName="pt-4"
					>
						{({ data, loading, refresh }) => {
							refreshFunctionRef.current = refresh;

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
											No allowance types found
										</h3>
										<p className="text-sm sm:text-base text-muted-foreground mb-4">
											{searchTerm
												? "No allowance types match your search criteria."
												: "Get started by creating your first allowance type."}
										</p>
									</div>
								);
							}

							// Apply client-side filters (status filter)
							const filteredResults = data.results.filter((allowanceType) => {
								const matchesStatus =
									statusFilter === "all" ||
									(statusFilter === "active" && allowanceType.is_active) ||
									(statusFilter === "inactive" && !allowanceType.is_active);

								return matchesStatus;
							});

							if (filteredResults.length === 0) {
								return (
									<div className="p-8 sm:p-12 text-center">
										<Settings className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
										<h3 className="text-base sm:text-lg font-semibold mb-2">
											No allowance types found
										</h3>
										<p className="text-sm sm:text-base text-muted-foreground mb-4">
											No allowance types match the selected status filter.
										</p>
									</div>
								);
							}

							return (
								<>
									<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_ALLOWANCE_TYPES}>
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
															<TableHead className="min-w-[110px] sm:min-w-[120px]">
																<span className="text-xs sm:text-sm">Taxable</span>
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
														{filteredResults.map((allowanceType) => (
															<TableRow key={allowanceType.id}>
																<TableCell className="font-medium">
																	<div className="flex items-center gap-2 sm:gap-3">
																		<span className="text-xs sm:text-sm">{allowanceType.name}</span>
																	</div>
																</TableCell>
																<TableCell>
																	<Badge
																		className={`${getStatusColor(allowanceType.is_active)} text-[10px] sm:text-xs`}
																	>
																		{allowanceType.is_active ? "Active" : "Inactive"}
																	</Badge>
																</TableCell>
																<TableCell>
																	<Badge
																		className={`${getTaxableColor(allowanceType.is_taxable)} text-[10px] sm:text-xs`}
																	>
																		{allowanceType.is_taxable ? "Taxable" : "Non-taxable"}
																	</Badge>
																</TableCell>
																<TableCell>
																	<Badge
																		className={`${
																			allowanceType.is_recurring
																				? "bg-purple-100 text-purple-800 border-purple-200"
																				: "bg-gray-100 text-gray-800 border-gray-200"
																		} text-[10px] sm:text-xs`}
																	>
																		{allowanceType.is_recurring
																			? `Recurring${allowanceType.frequency ? ` (${allowanceType.frequency})` : ""}`
																			: "One-time"}
																	</Badge>
																</TableCell>
																<TableCell>
																	<div className="max-w-[150px] sm:max-w-xs truncate text-xs sm:text-sm text-muted-foreground">
																		{allowanceType.description}
																	</div>
																</TableCell>
																<TableCell>
																	<span className="text-xs sm:text-sm">
																		{formatDate(allowanceType.created_at)}
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
																				permissionCode={PERMISSION_CODES.CAN_VIEW_ALLOWANCE_TYPES}
																			>
																				<DropdownMenuItem
																					onClick={() => handleViewAllowanceType(allowanceType)}
																					className="text-xs sm:text-sm"
																				>
																					<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> View
																					Details
																				</DropdownMenuItem>
																			</ProtectedComponent>
																			<ProtectedComponent
																				permissionCode={PERMISSION_CODES.CAN_EDIT_ALLOWANCE_TYPES}
																			>
																				<DropdownMenuItem
																					onClick={() => handleEditAllowanceType(allowanceType)}
																					className="text-xs sm:text-sm"
																				>
																					<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
																					Edit
																				</DropdownMenuItem>
																			</ProtectedComponent>
																			<ProtectedComponent
																				permissionCode={PERMISSION_CODES.CAN_DELETE_ALLOWANCE_TYPES}
																			>
																				<DropdownMenuItem
																					onClick={() => handleDeleteAllowanceType(allowanceType)}
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
								</>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</div>

			<CreateAllowanceTypeDialog
				onOpenChange={setIsCreateDialogOpen}
				isOpen={isCreateDialogOpen}
				onSuccess={handleCreateSuccess}
				disabled={!selectedInstitution?.id}
			/>

			{editingAllowanceType && (
				<EditAllowanceTypeDialog
					isOpen={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
					allowanceType={editingAllowanceType}
					onSuccess={handleUpdateSuccess}
				/>
			)}

			{deletingAllowanceType && (
				<DeleteAllowanceTypeDialog
					isOpen={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					allowanceType={deletingAllowanceType}
					onSuccess={handleDeleteSuccess}
				/>
			)}
		</div>
	);
};

export default AllowanceTypesComponent;
