"use client";

import type { IAssetCategory, IAssetCategoryFormData } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { assetCategoriesAPI } from "@/lib/utils";

interface EditAssetCategoryDialogProps {
	assetCategory: IAssetCategory;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (updatedAssetCategory: IAssetCategory) => void;
}

export function EditAssetCategoryDialog({
	assetCategory,
	isOpen,
	onClose,
	onSuccess,
}: EditAssetCategoryDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState<IAssetCategoryFormData>({
		category_name: "",
		category_description: "",
	});

	useEffect(() => {
		if (assetCategory) {
			setFormData({
				category_name: assetCategory.category_name,
				category_description: assetCategory.category_description || "",
			});
		}
	}, [assetCategory]);

	const handleSubmit = async () => {
		if (!formData.category_name.trim()) {
			toast.error("Please enter a category name");

			return;
		}

		setIsSubmitting(true);
		try {
			const updatedAssetCategory = await assetCategoriesAPI.update(assetCategory.id, formData);

			onSuccess(updatedAssetCategory);
			toast.success("Asset category updated successfully");
			onClose();
		} catch (error: any) {
			console.error("Error updating asset category:", error);
			toast.error(error.message || "An error occurred while updating the asset category");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px] rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<DialogTitle className="text-2xl font-bold text-gray-900">
						Edit Asset Category
					</DialogTitle>
					<DialogDescription className="text-gray-600 text-base">
						Update the asset category information.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-6 py-6">
					<div className="space-y-3">
						<Label htmlFor="category_name" className="text-sm text-gray-800">
							Category Name *
						</Label>
						<Input
							id="category_name"
							value={formData.category_name}
							onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
							placeholder="e.g., Electronics, Furniture, Vehicles"
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
						/>
					</div>

					<div className="space-y-3">
						<Label htmlFor="category_description" className="text-sm text-gray-800">
							Description
						</Label>
						<Textarea
							id="category_description"
							value={formData.category_description || ""}
							onChange={(e) => setFormData({ ...formData, category_description: e.target.value })}
							placeholder="e.g., Electronic devices and equipment"
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base min-h-[100px]"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting}
						className="bg-primary rounded-full w-full"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Updating...
							</>
						) : (
							"Update Asset Category"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
