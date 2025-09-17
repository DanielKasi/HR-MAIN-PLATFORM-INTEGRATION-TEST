"use client";

import type { IAsset } from "@/types/types.utils";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { assetsAPI } from "@/lib/utils";

interface DeleteAssetDialogProps {
	asset: IAsset;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (deletedId: number) => void;
}

export function DeleteAssetDialog({ asset, isOpen, onClose, onSuccess }: DeleteAssetDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleDelete = async () => {
		setIsSubmitting(true);
		try {
			await assetsAPI.delete(asset.id);
			onSuccess(asset.id);
			toast.success("Asset deleted successfully");
			onClose();
		} catch (error: any) {
			console.error("Error deleting asset:", error);
			toast.error(error.message || "An error occurred while deleting the asset");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0">
							<AlertTriangle className="h-6 w-6 text-red-500" />
						</div>
						<div>
							<DialogTitle className="text-2xl font-bold text-gray-900">Delete Asset</DialogTitle>
							<DialogDescription className="text-gray-600 text-base mt-1">
								Are you sure you want to delete this asset?
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="py-6">
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<h3 className="font-semibold text-red-800 mb-2">Asset to be deleted:</h3>
						<div className="space-y-2">
							<p className="text-red-700 font-medium">{asset.asset_name}</p>
							<p className="text-red-600 text-sm">Serial: {asset.serial_number}</p>
							<p className="text-red-600 text-sm">Batch: {asset.batch_number}</p>
							{asset.description && <p className="text-red-600 text-sm">{asset.description}</p>}
						</div>
					</div>

					<div className="mt-4 text-sm text-gray-600">
						<p className="font-medium text-red-600">Warning:</p>
						<ul className="list-disc list-inside mt-2 space-y-1">
							<li>This action cannot be undone</li>
							<li>All asset history will be permanently deleted</li>
							<li>Related allocations and requests will be affected</li>
							<li>This may impact ongoing asset management workflows</li>
						</ul>
					</div>
				</div>

				<DialogFooter className="flex flex-col sm:flex-row gap-3">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={isSubmitting}
						className="w-full sm:w-auto"
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={isSubmitting}
						className="w-full sm:w-auto"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Deleting...
							</>
						) : (
							"Delete Asset"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
