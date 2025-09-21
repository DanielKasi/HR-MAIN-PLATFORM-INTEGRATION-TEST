"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Plus, Search } from "lucide-react";
import { ColumnDef } from "@/components/common/tables/paginated-table";
import { PaginatedTable } from "@/components/common/tables/paginated-table";
import { SKILL_ZONE_CATEGORIES_API } from "@/lib/api/recruitment.utils";
import type { ISkillZoneCategory, ISkillZoneCategoryFormData } from "@/types/recruitment.types"; // Adjust
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import FixedLoader from "@/components/fixed-loader";
import { Icon } from "@iconify/react";

export default function SkillZoneCategoriesPage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const [categories, setCategories] = useState<ISkillZoneCategory[]>([]); // Not needed if using PaginatedTable
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [saving, setSaving] = useState(false);

	// Dialog states
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<ISkillZoneCategory | null>(null);
	const [formData, setFormData] = useState<ISkillZoneCategoryFormData>({
		institution: currentInstitution?.id || 0,
		name: "",
		description: "",
	});

	// Delete confirmation
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [categoryToDelete, setCategoryToDelete] = useState<ISkillZoneCategory | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!currentInstitution) {
			setLoading(false);
			return;
		}
		setFormData((prev) => ({ ...prev, institution: currentInstitution.id }));
		setLoading(false);
	}, [currentInstitution]);

	const handleCreateOrUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}

		try {
			setSaving(true);
			if (selectedCategory) {
				// Update
				await SKILL_ZONE_CATEGORIES_API.update({ categoryId: selectedCategory.id, data: formData });
				showSuccessToast("Category updated successfully!");
			} else {
				// Create
				await SKILL_ZONE_CATEGORIES_API.create({ data: formData });
				showSuccessToast("Category created successfully!");
			}
			resetDialog();
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to save category" });
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!categoryToDelete) return;

		try {
			setDeleting(true);
			await SKILL_ZONE_CATEGORIES_API.delete({ categoryId: categoryToDelete.id });
			showSuccessToast("Category deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete category" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setCategoryToDelete(null);
		}
	};

	const resetDialog = () => {
		setOpenCreateEditDialog(false);
		setSelectedCategory(null);
		setFormData({
			institution: currentInstitution?.id || 0,
			name: "",
			description: "",
		});
	};

	const openEditDialog = (category: ISkillZoneCategory) => {
		setSelectedCategory(category);
		setFormData({
			institution: category.institution,
			name: category.name,
			description: category.description || "",
		});
		setOpenCreateEditDialog(true);
	};

	const openDetails = (category: ISkillZoneCategory) => {
		setSelectedCategory(category);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<ISkillZoneCategory>[] = [
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
			cell: (category) => category.description || "N/A",
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

	return (
		<div className="p-6 space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Skill Zone Categories</h1>
				<Dialog open={openCreateEditDialog} onOpenChange={setOpenCreateEditDialog}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" /> Create Category
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{selectedCategory ? "Edit Category" : "Create Category"}</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<Input
								placeholder="Name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							/>
							<Textarea
								placeholder="Description"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							/>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={resetDialog}>
								Cancel
							</Button>
							<Button onClick={handleCreateOrUpdate} disabled={saving}>
								{saving ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9"
						placeholder="Search categories..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<ISkillZoneCategory>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await SKILL_ZONE_CATEGORIES_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
					});
				}}
				fetchFromUrl={SKILL_ZONE_CATEGORIES_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch categories" })
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No categories found</p>
					</div>
				}
			/>

			{/* Details Dialog */}
			<Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Category Details</DialogTitle>
					</DialogHeader>
					{selectedCategory && (
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium">Name</label>
								<p>{selectedCategory.name}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Description</label>
								<p>{selectedCategory.description || "N/A"}</p>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpenDetailsDialog(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Category"
				description="Are you sure you want to delete this category? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
