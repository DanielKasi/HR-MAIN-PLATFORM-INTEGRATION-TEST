"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Plus, Search } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { FAQ_CATEGORIES_API } from "@/lib/api/help-desk.utils";
import type { FAQCategory } from "@/types/help-desk.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import FixedLoader from "@/components/fixed-loader";
import { Icon } from "@iconify/react";
import FAQCategoryCreateEditDialog from "./_components/faq-category-create-edit-dialog";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function FAQCategoriesPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");

	// Dialog states
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<FAQCategory | null>(null);

	// Delete confirmation
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [categoryToDelete, setCategoryToDelete] = useState<FAQCategory | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!currentInstitution) {
			setLoading(false);
			return;
		}
		setLoading(false);
	}, [currentInstitution]);

	const handleDelete = async () => {
		if (!categoryToDelete) return;

		try {
			setDeleting(true);
			await FAQ_CATEGORIES_API.delete({ categoryId: categoryToDelete.id });
			showSuccessToast("FAQ Category deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete FAQ category" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setCategoryToDelete(null);
		}
	};

	const openEditDialog = (category: FAQCategory) => {
		setSelectedCategory(category);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (category: FAQCategory) => {
		setSelectedCategory(category);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<FAQCategory>[] = [
		{
			key: "name",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Name</span>
					<Button
						onClick={() => setOrdering((prev) => (prev === "name" ? "-name" : "name"))}
						size="sm"
						variant={ordering.includes("name") ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (category) => category.name,
		},
		{
			key: "description",
			header: "Description",
			cell: (category) => category.description || "Unknown",
		},
		{
			key: "actions",
			header: "Actions",
			cell: (category) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(category)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(category)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setCategoryToDelete(category);
								setDeleteConfirmOpen(true);
							}}
							className="text-red-600"
						>
							<Trash2 className="h-4 w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	if (loading) return <FixedLoader />;

	const renderDetailsContent = (category: FAQCategory) => (
		<div className="space-y-4">
			<div>
				<Label className="text-sm font-medium">Name</Label>
				<Input
					value={category.name}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div>
				<Label className="text-sm font-medium">Description</Label>
				<Textarea
					value={category.description || "Unknown"}
					disabled
					rows={4}
					className="rounded-xl border-gray-200 text-sm sm:text-base resize-none bg-gray-50"
				/>
			</div>
		</div>
	);

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">FAQ Categories</h1>
				<div className="flex items-center justify-end gap-4">
					<Button
						className="rounded-xl"
						onClick={() => {
							setSelectedCategory(null);
							setOpenCreateEditDialog(true);
						}}
					>
						<Plus className="h-4 w-4 mr-2" /> Create FAQ Category
					</Button>
					<FAQCategoryCreateEditDialog
						open={openCreateEditDialog}
						onOpenChange={(open) => {
							setOpenCreateEditDialog(open);
							if (!open) setSelectedCategory(null);
						}}
						selectedCategory={selectedCategory}
						onSuccess={() => {
							if (tableRefreshRef.current) tableRefreshRef.current();
						}}
					/>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search FAQ categories..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<FAQCategory>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await FAQ_CATEGORIES_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
					});
				}}
				fetchFromUrl={FAQ_CATEGORIES_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch FAQ categories" })
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No FAQ categories found</p>
					</div>
				}
			/>

			{selectedCategory && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedCategory(null);
					}}
					title={`FAQ Category Details: ${selectedCategory.name}`}
					description="View the details for this FAQ category."
					approvals={selectedCategory.approvals}
					instanceApprovalStatus={selectedCategory.approval_status}
					onRefresh={() => tableRefreshRef.current?.()}
				>
					{renderDetailsContent(selectedCategory)}
				</ApprovableDialog>
			)}

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete FAQ Category"
				description="Are you sure you want to delete this FAQ category? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
