"use client";

import type { IAssetAllocation } from "@/types/types.utils";

import { useState } from "react";
import { X, Trash2, Package, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { assetsAPI } from "@/lib/utils";

interface DeleteAssetAllocationDialogProps {
	allocation: IAssetAllocation;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (deletedId: number) => void;
}

export const DeleteAssetAllocationDialog = ({
	allocation,
	isOpen,
	onClose,
	onSuccess,
}: DeleteAssetAllocationDialogProps) => {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			const success = await assetsAPI.deleteAssetAllocation(allocation.id);

			if (success) {
				onSuccess(allocation.id);
			} else {
				toast.error("Failed to delete asset allocation");
			}
		} catch (error: any) {
			console.error("Error deleting asset allocation:", error);
			toast.error(error.response?.data?.message || "Failed to delete asset allocation");
		} finally {
			setIsDeleting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div className="flex items-center space-x-3">
						<div className="p-2 bg-red-100 rounded-lg">
							<Trash2 className="h-5 w-5 text-red-600" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-gray-900">Delete Asset Allocation</h2>
							<p className="text-sm text-gray-600">This action cannot be undone</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X className="h-5 w-5" />
					</Button>
				</div>

				<div className="p-6">
					<div className="flex items-start space-x-3 mb-6">
						<AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
						<div>
							<h3 className="text-sm font-medium text-gray-900">
								Are you sure you want to delete this allocation?
							</h3>
							<p className="text-sm text-gray-600 mt-1">
								This will permanently remove the asset allocation and cannot be undone.
							</p>
						</div>
					</div>

					{/* Allocation Details */}
					<div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
						<div className="flex items-center space-x-2">
							<Package className="h-4 w-4 text-gray-500" />
							<span className="font-medium">{allocation.asset?.asset_name}</span>
							<span className="text-gray-500 text-sm">({allocation.asset?.serial_number})</span>
						</div>

						<div className="flex items-center space-x-2">
							<User className="h-4 w-4 text-gray-500" />
							<span>Allocated to: {allocation.allocated_to?.user.fullname}</span>
						</div>

						<div className="text-sm text-gray-600 font-mono">
							Allocation Code: {allocation.alloc_code}
						</div>

						<div className="text-sm text-gray-600">Status: {allocation.allocation_status}</div>
					</div>
				</div>

				<div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
					<Button variant="outline" onClick={onClose} disabled={isDeleting}>
						Cancel
					</Button>
					<Button
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-red-500 hover:bg-red-600 text-white"
					>
						{isDeleting ? "Deleting..." : "Delete Allocation"}
					</Button>
				</div>
			</div>
		</div>
	);
};
