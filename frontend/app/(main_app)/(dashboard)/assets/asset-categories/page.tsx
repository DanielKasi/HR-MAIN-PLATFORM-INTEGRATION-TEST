"use client";

import type { IAsset } from "@/types/types.utils";
import { IAssetCategory } from "@/types/assets.types";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { MoreVertical, Edit, Trash2, Search, Eye } from "lucide-react";
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
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CreateAssetCategoryDialog } from "@/components/asset-categories/create-asset-category-dialog";
import { EditAssetCategoryDialog } from "@/components/asset-categories/edit-asset-category-dialog";
import { DeleteAssetCategoryDialog } from "@/components/asset-categories/delete-asset-category-dialog";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { assetCategoriesAPI, assetsAPI } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import ProtectedPage from "@/components/ProtectedPage";

const getStatusColor = (status: boolean) => {
	return status
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

const AssetCategoriesPage = () => {
	const router = useRouter();
	const isMobile = useMobile();
	const [assets, setAssets] = useState<IAsset[]>([]);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingAssetCategory, setEditingAssetCategory] = useState<IAssetCategory | null>(null);
	const [deletingAssetCategory, setDeletingAssetCategory] = useState<IAssetCategory | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	// const [statusFilter, setStatusFilter] = useState<string>("all");
	const [ordering, setOrdering] = useState("");
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const refreshTableRef = useRef<(() => void) | null>(null);

	// Fetch assets from API for counting
	const fetchAssets = useCallback(async () => {
		if (!selectedInstitution?.id) return;

		try {
			const data = await assetsAPI.getAll();

			setAssets(data);
		} catch (error) {
			console.warn("Error fetching assets:", error);
			setAssets([]);
		}
	}, [selectedInstitution?.id]);

	useEffect(() => {
		fetchAssets();
	}, [fetchAssets]);

	// Calculate asset count for each category
	const getAssetCount = useCallback(
		(categoryId: number) => {
			return assets.filter((asset) => asset.category?.id === categoryId).length;
		},
		[assets],
	);

	const handleCreateSuccess = (newAssetCategory: IAssetCategory) => {
		toast.success("Asset category created successfully");
		refreshTableRef.current?.();
	};

	const handleUpdateSuccess = (updatedAssetCategory: IAssetCategory) => {
		setIsEditDialogOpen(false);
		setEditingAssetCategory(null);
		toast.success("Asset category updated successfully");
		refreshTableRef.current?.();
	};

	const handleDeleteSuccess = (deletedId: number) => {
		setIsDeleteDialogOpen(false);
		setDeletingAssetCategory(null);
		toast.success("Asset category deleted successfully");
		refreshTableRef.current?.();
	};

	const handleEditAssetCategory = (assetCategory: IAssetCategory) => {
		setEditingAssetCategory(assetCategory);
		setIsEditDialogOpen(true);
	};

	const handleDeleteAssetCategory = (assetCategory: IAssetCategory) => {
		setDeletingAssetCategory(assetCategory);
		setIsDeleteDialogOpen(true);
	};

	const handleViewAssetCategoryDetails = (assetCategory: IAssetCategory) => {
		router.push(`/assets/asset-categories/${assetCategory.id}`);
	};
	return (
		<div className="space-y-6">
			{/* Header and Filters */}
			<div className="bg-white rounded-lg border shadow-sm min-h-screen">
				<div className="p-6 border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Asset Categories</h1>
						</div>
					</div>
				</div>
				<div className="p-6 border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex sm:flex-row sm:items-center gap-4 flex-1">
							<div className="relative flex-1 max-w-sm">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search asset categories..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<ProtectedPage permissionCode={[PERMISSION_CODES.CAN_CREATE_ASSET_CATEGORIES]}>
								<CreateAssetCategoryDialog
									onSuccess={handleCreateSuccess}
									disabled={!selectedInstitution?.id}
								/>
							</ProtectedPage>
						</div>
					</div>
				</div>
				<div className="p-6">
					<PaginatedTableWrapper<IAssetCategory>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");

							return await assetCategoriesAPI.getPaginated({
								institutionId: selectedInstitution.id,
								page: 1,
								search: searchTerm || undefined,
								ordering,
							});
						}}
						fetchFromUrl={assetCategoriesAPI.getPaginatedFromUrl}
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
									<div className="text-center py-8 text-gray-500">No asset categories found</div>
								);
							}

							return (
								<>
									{/* Desktop Table */}
									<div className=" rounded-md">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Category Name</span>
															<Button
																onClick={() =>
																	setOrdering(ordering === "category_name" ? "" : "category_name")
																}
																size="sm"
																variant={ordering === "category_name" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead className="text-center">
														<div className="flex items-center gap-2 justify-center">
															<span>Asset Count</span>
															<Button
																onClick={() =>
																	setOrdering(ordering === "asset_count" ? "" : "asset_count")
																}
																size="sm"
																variant={ordering === "asset_count" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Created</span>
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
												{data.results.map((category) => (
													<TableRow key={category.id}>
														<TableCell className="font-medium">{category.category_name}</TableCell>
														<TableCell className="text-center">
															<span className="font-medium text-gray-900">
																{getAssetCount(category.id)} Asset
																{getAssetCount(category.id) !== 1 ? "(s)" : ""}
															</span>
														</TableCell>
														<TableCell>
															<Badge className={getStatusColor(category.is_active)}>
																{category.is_active ? "Active" : "Inactive"}
															</Badge>
														</TableCell>
														<TableCell>{formatDate(category.created_at)}</TableCell>
														<TableCell>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button variant="ghost" size="sm">
																		<MoreVertical className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem
																		onClick={() => handleViewAssetCategoryDetails(category)}
																	>
																		<Eye className="h-4 w-4 mr-2" />
																		View Details
																	</DropdownMenuItem>

																	<ProtectedPage
																		permissionCode={[PERMISSION_CODES.CAN_EDIT_ASSET_CATEGORIES]}
																	>
																		<DropdownMenuItem
																			onClick={() => handleEditAssetCategory(category)}
																		>
																			<Edit className="h-4 w-4 mr-2" />
																			Edit
																		</DropdownMenuItem>
																	</ProtectedPage>

																	<ProtectedPage
																		permissionCode={[PERMISSION_CODES.CAN_DELETE_ASSET_CATEGORIES]}
																	>
																		<DropdownMenuItem
																			onClick={() => handleDeleteAssetCategory(category)}
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
								</>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</div>

			{/* Dialogs */}
			{editingAssetCategory && (
				<EditAssetCategoryDialog
					assetCategory={editingAssetCategory}
					isOpen={isEditDialogOpen}
					onClose={() => {
						setIsEditDialogOpen(false);
						setEditingAssetCategory(null);
					}}
					onSuccess={handleUpdateSuccess}
				/>
			)}

			{deletingAssetCategory && (
				<DeleteAssetCategoryDialog
					assetCategory={deletingAssetCategory}
					isOpen={isDeleteDialogOpen}
					onClose={() => {
						setIsDeleteDialogOpen(false);
						setDeletingAssetCategory(null);
					}}
					onSuccess={handleDeleteSuccess}
				/>
			)}
		</div>
	);
};

export default AssetCategoriesPage;
