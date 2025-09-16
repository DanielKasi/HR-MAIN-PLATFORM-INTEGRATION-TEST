"use client";

import type { IAssetAllocation, IAssetAllocationFormData } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { X, Package, User, FileText, Edit } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { assetsAPI } from "@/lib/utils";

interface EditAssetAllocationDialogProps {
	allocation: IAssetAllocation;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (allocation: IAssetAllocation) => void;
}

export const EditAssetAllocationDialog = ({
	allocation,
	isOpen,
	onClose,
	onSuccess,
}: EditAssetAllocationDialogProps) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState<Partial<IAssetAllocationFormData>>({
		allocation_status: allocation.allocation_status,
	});

	useEffect(() => {
		if (isOpen && allocation) {
			setFormData({
				allocation_status: allocation.allocation_status,
			});
		}
	}, [isOpen, allocation]);

	const handleSubmit = async () => {
		if (!formData.allocation_status) {
			toast.error("Please select an allocation status");

			return;
		}

		try {
			setIsSubmitting(true);
			const updatedAllocation = await assetsAPI.updateAssetAllocation(allocation.id, formData);

			onSuccess(updatedAllocation);
		} catch (error: any) {
			console.error("Error updating asset allocation:", error);
			toast.error(error.response?.data?.message || "Failed to update asset allocation");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div className="flex items-center space-x-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Edit className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-gray-900">Edit Asset Allocation</h2>
							<p className="text-sm text-gray-600">Update allocation details</p>
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

				<div className="p-6 space-y-6">
					{/* Read-only Asset Information */}
					<div className="space-y-2">
						<Label className="text-sm font-medium text-gray-700">Asset</Label>
						<div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
							<Package className="h-4 w-4 text-gray-500" />
							<span className="font-medium">{allocation.asset?.asset_name}</span>
							<span className="text-gray-500 text-sm">({allocation.asset?.serial_number})</span>
						</div>
					</div>

					{/* Read-only Allocation Code */}
					<div className="space-y-2">
						<Label className="text-sm font-medium text-gray-700">Allocation Code</Label>
						<div className="p-3 bg-gray-50 rounded-lg">
							<span className="font-mono text-sm">{allocation.alloc_code}</span>
						</div>
					</div>

					{/* Read-only Allocated To */}
					<div className="space-y-2">
						<Label className="text-sm font-medium text-gray-700">Allocated To</Label>
						<div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
							<User className="h-4 w-4 text-gray-500" />
							<span>{allocation.allocated_to?.user.fullname}</span>
						</div>
					</div>

					{/* Read-only Allocated By */}
					<div className="space-y-2">
						<Label className="text-sm font-medium text-gray-700">Allocated By</Label>
						<div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
							<User className="h-4 w-4 text-gray-500" />
							<span>{allocation.allocated_by?.user.fullname}</span>
						</div>
					</div>

					{/* Read-only Request Information (if exists) */}
					{allocation.responding_to_request && (
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Responding to Request</Label>
							<div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
								<FileText className="h-4 w-4 text-gray-500" />
								<span className="font-mono text-sm">
									{allocation.responding_to_request.request_reference_code}
								</span>
							</div>
						</div>
					)}

					{/* Editable Status */}
					<div className="space-y-2">
						<Label htmlFor="status" className="text-sm font-medium text-gray-700">
							Allocation Status *
						</Label>
						<Select
							value={formData.allocation_status || ""}
							onValueChange={(value: string) =>
								setFormData({ ...formData, allocation_status: value as any })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="allocated">Allocated</SelectItem>
								<SelectItem value="rejected">Rejected</SelectItem>
								<SelectItem value="cancelled">Cancelled</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || !formData.allocation_status}
						className="bg-blue-500 hover:bg-blue-600 text-white"
					>
						{isSubmitting ? "Updating..." : "Update Allocation"}
					</Button>
				</div>
			</div>
		</div>
	);
};
