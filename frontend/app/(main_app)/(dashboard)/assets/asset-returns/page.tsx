"use client";

import type { IAssetReturn } from "@/types/types.utils";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
	MoreVertical,
	Edit,
	Trash2,
	Search,
	Plus,
	Eye,
	CheckCircle,
	XCircle,
	AlertCircle,
	Users,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { PERMISSION_CODES } from "@/constants";
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
import { CreateAssetReturnDialog } from "@/components/asset-returns/create-asset-return-dialog";
import { EditAssetReturnDialog } from "@/components/asset-returns/edit-asset-return-dialog";
import { DeleteAssetReturnDialog } from "@/components/asset-returns/delete-asset-return-dialog";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { assetsAPI } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import ProtectedPage from "@/components/ProtectedPage";

const getConditionColor = (condition: string) => {
	switch (condition) {
		case "good":
			return "bg-green-100 text-green-800 border-green-200";
		case "damaged":
			return "bg-red-100 text-red-800 border-red-200";
		case "lost":
			return "bg-gray-100 text-gray-800 border-gray-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

const getConditionDisplay = (condition: string) => {
	switch (condition) {
		case "good":
			return "Good";
		case "damaged":
			return "Damaged";
		case "lost":
			return "Lost";
		default:
			return condition;
	}
};

const getConditionIcon = (condition: string) => {
	switch (condition) {
		case "good":
			return <CheckCircle className="h-4 w-4 text-green-500" />;
		case "damaged":
			return <AlertCircle className="h-4 w-4 text-red-500" />;
		case "lost":
			return <XCircle className="h-4 w-4 text-gray-500" />;
		default:
			return <AlertCircle className="h-4 w-4 text-gray-500" />;
	}
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const AssetReturnsComponent = () => {
	const router = useRouter();
	const isMobile = useMobile();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingAssetReturn, setEditingAssetReturn] = useState<IAssetReturn | null>(null);
	const [deletingAssetReturn, setDeletingAssetReturn] = useState<IAssetReturn | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [conditionFilter, setConditionFilter] = useState<string>("all");
	const [ordering, setOrdering] = useState("");
	const refreshTableRef = useRef<(() => void) | null>(null);

	const selectedInstitution = useSelector(selectSelectedInstitution);

	const handleEdit = (assetReturn: IAssetReturn) => {
		setEditingAssetReturn(assetReturn);
		setIsEditDialogOpen(true);
	};

	const handleDelete = (assetReturn: IAssetReturn) => {
		setDeletingAssetReturn(assetReturn);
		setIsDeleteDialogOpen(true);
	};

	const handleView = (assetReturn: IAssetReturn) => {
		router.push(`/assets/asset-returns/${assetReturn.id}`);
	};

	const handleEditSuccess = () => {
		setIsEditDialogOpen(false);
		setEditingAssetReturn(null);
		toast.success("Asset return updated successfully");
		refreshTableRef.current?.();
	};

	const handleDeleteSuccess = () => {
		setIsDeleteDialogOpen(false);
		setDeletingAssetReturn(null);
		toast.success("Asset return deleted successfully");
		refreshTableRef.current?.();
	};

	const handleCreateSuccess = () => {
		setIsCreateDialogOpen(false);
		toast.success("Asset return created successfully");
		refreshTableRef.current?.();
	};

	const hasFilters = searchTerm || conditionFilter !== "all";

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-white rounded-lg border shadow-sm min-h-screen">
				<div className="p-6 ">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Asset Returns</h1>
						</div>
					</div>
				</div>

				{/* Filters */}
				<div className="p-6">
					<div className="">
						<div className="flex items-center gap-4 justify-between">
							<div className="relative flex justify-between">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search returns..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
							<Select value={conditionFilter} onValueChange={setConditionFilter}>
								<SelectTrigger className="w-full sm:w-[130px] border-none shadow-none">
									<SelectValue placeholder="All Conditions" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Conditions</SelectItem>
									<SelectItem value="good">Good</SelectItem>
									<SelectItem value="damaged">Damaged</SelectItem>
									<SelectItem value="lost">Lost</SelectItem>
								</SelectContent>
							</Select>

							<ProtectedPage permissionCode={[PERMISSION_CODES.CAN_RETURN_ASSETS]}>
								<Button
									onClick={() => setIsCreateDialogOpen(true)}
									className="bg-primary text-white rounded-[11px]"
								>
									<Plus className="h-4 w-4 mr-2" />
									Return Asset
								</Button>
							</ProtectedPage>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					<PaginatedTableWrapper<IAssetReturn>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");

							return await assetsAPI.getPaginatedAssetReturns({
								institutionId: selectedInstitution.id,
								page: 1,
								search: searchTerm || undefined,
								ordering,
							});
						}}
						fetchFromUrl={assetsAPI.getPaginatedAssetReturnsFromUrl}
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
								return <TableSkeleton rows={10} columns={5} />;
							}

							if (!data || data.results.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500">
										{searchTerm
											? "No returns found matching your search criteria"
											: "No asset returns found"}
									</div>
								);
							}

							// Apply client-side filters (condition filter)
							const filteredResults = data.results.filter((returnItem) => {
								const matchesCondition =
									conditionFilter === "all" || returnItem.condition === conditionFilter;

								return matchesCondition;
							});

							if (filteredResults.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500">
										No returns found matching the selected condition filter.
									</div>
								);
							}

							return (
								<>
									{/* Desktop Table */}
									<div className="hidden sm:block">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Asset</span>
															<Button
																onClick={() =>
																	setOrdering(
																		ordering === "asset__asset_name" ? "" : "asset__asset_name",
																	)
																}
																size="sm"
																variant={ordering === "asset__asset_name" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Serial Number</span>
															<Button
																onClick={() =>
																	setOrdering(
																		ordering === "asset__serial_number"
																			? ""
																			: "asset__serial_number",
																	)
																}
																size="sm"
																variant={
																	ordering === "asset__serial_number" ? "default" : "outline"
																}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>Condition</TableHead>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Return Date</span>
															<Button
																onClick={() =>
																	setOrdering(ordering === "created_at" ? "" : "created_at")
																}
																size="sm"
																variant={ordering === "created_at" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead className="w-12">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredResults.map((assetReturn) => (
													<TableRow key={assetReturn.id}>
														<TableCell className="font-medium">
															{assetReturn.asset?.asset_name || "Unknown Asset"}
														</TableCell>
														<TableCell className="font-mono text-sm">
															{assetReturn.asset?.serial_number || "N/A"}
														</TableCell>
														<TableCell>
															<div className="flex items-center space-x-2">
																{getConditionIcon(assetReturn.condition)}
																<Badge className={getConditionColor(assetReturn.condition)}>
																	{getConditionDisplay(assetReturn.condition)}
																</Badge>
															</div>
														</TableCell>
														<TableCell>{formatDate(assetReturn.created_at)}</TableCell>
														<TableCell>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button variant="ghost" size="sm">
																		<Icon
																			icon="hugeicons:more-horizontal-circle-01"
																			className="!h-4 !w-4 text-dark"
																		/>
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem onClick={() => handleView(assetReturn)}>
																		<Eye className="h-4 w-4 mr-2" />
																		View Details
																	</DropdownMenuItem>
																	<ProtectedPage
																		permissionCode={[PERMISSION_CODES.CAN_EDIT_ASSET_RETURNS]}
																	>
																		<DropdownMenuItem onClick={() => handleEdit(assetReturn)}>
																			<Edit className="h-4 w-4 mr-2" />
																			Edit
																		</DropdownMenuItem>
																	</ProtectedPage>

																	<ProtectedPage
																		permissionCode={[PERMISSION_CODES.CAN_DELETE_ASSET_RETURNS]}
																	>
																		<DropdownMenuItem
																			onClick={() => handleDelete(assetReturn)}
																			className="text-red-600"
																		>
																			<Trash2 className="h-4 w-4 mr-2" />
																			Delete
																		</DropdownMenuItem>
																	</ProtectedPage>
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
										{filteredResults.map((assetReturn) => (
											<div key={assetReturn.id} className="bg-gray-50 rounded-lg p-4 border">
												<div className="flex items-start justify-between mb-3">
													<div className="flex-1">
														<div className="flex items-center gap-2 mb-2">
															<Users className="h-4 w-4 text-gray-500" />
															<h3 className="font-semibold text-gray-900">
																{assetReturn.asset?.asset_name || "Unknown Asset"}
															</h3>
														</div>
														<div className="space-y-1 mb-2">
															<p className="text-sm text-gray-600 font-mono">
																Serial: {assetReturn.asset?.serial_number || "N/A"}
															</p>
															<p className="text-sm text-gray-600">
																Batch: {assetReturn.asset?.batch_number || "N/A"}
															</p>
															<div className="flex items-center gap-2">
																<div className="flex items-center space-x-2">
																	{getConditionIcon(assetReturn.condition)}
																	<Badge className={getConditionColor(assetReturn.condition)}>
																		{getConditionDisplay(assetReturn.condition)}
																	</Badge>
																</div>
																<span className="text-sm text-gray-500">
																	Returned: {formatDate(assetReturn.created_at)}
																</span>
															</div>
														</div>
													</div>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="sm">
																<MoreVertical className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={() => handleView(assetReturn)}>
																<Eye className="h-4 w-4 mr-2" />
																View Details
															</DropdownMenuItem>
															<ProtectedPage
																permissionCode={[PERMISSION_CODES.CAN_EDIT_ASSET_RETURNS]}
															>
																<DropdownMenuItem onClick={() => handleEdit(assetReturn)}>
																	<Edit className="h-4 w-4 mr-2" />
																	Edit
																</DropdownMenuItem>
															</ProtectedPage>

															<ProtectedPage
																permissionCode={[PERMISSION_CODES.CAN_DELETE_ASSET_RETURNS]}
															>
																<DropdownMenuItem
																	onClick={() => handleDelete(assetReturn)}
																	className="text-red-600"
																>
																	<Trash2 className="h-4 w-4 mr-2" />
																	Delete
																</DropdownMenuItem>
															</ProtectedPage>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										))}
									</div>
								</>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</div>

			{/* Dialogs */}
			{editingAssetReturn && (
				<EditAssetReturnDialog
					open={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
					assetReturn={editingAssetReturn}
					onSuccess={handleEditSuccess}
				/>
			)}

			{deletingAssetReturn && (
				<DeleteAssetReturnDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					assetReturn={deletingAssetReturn}
					onSuccess={handleDeleteSuccess}
				/>
			)}

			<CreateAssetReturnDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onSuccess={handleCreateSuccess}
			/>
		</div>
	);
};

export default AssetReturnsComponent;
