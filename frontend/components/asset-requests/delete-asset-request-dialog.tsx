"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { assetsAPI } from "@/lib/utils";
import type { IAssetRequest } from "@/types/types.utils";

interface DeleteAssetRequestDialogProps {
	request: IAssetRequest;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (deletedId: number) => void;
}

export const DeleteAssetRequestDialog = ({
	request,
	isOpen,
	onClose,
	onSuccess,
}: DeleteAssetRequestDialogProps) => {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			await assetsAPI.deleteAssetRequest(request.id);
			onSuccess(request.id);
		} catch (error: any) {
			console.error("Error deleting asset request:", error);
			const errorMessage = error.response?.data?.message || "Failed to delete asset request";
			toast.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleClose = () => {
		if (!isDeleting) {
			onClose();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center space-x-2 text-red-600">
						<Trash2 className="h-5 w-5" />
						<span>Delete Asset Request</span>
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this asset request? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Warning */}
					<div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
						<AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
						<div className="text-sm text-red-700">
							<p className="font-medium">This action is irreversible</p>
							<p className="mt-1">
								Deleting this request will permanently remove it from the system and cannot be
								recovered.
							</p>
						</div>
					</div>

					{/* Request Details */}
					<div className="space-y-3">
						<h4 className="font-medium text-gray-900">Request Details</h4>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600">Reference:</span>
								<span className="font-mono text-gray-900">{request.request_reference_code}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Asset:</span>
								<span className="text-gray-900">{request.asset.asset_name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Requester:</span>
								<span className="text-gray-900">{request.requester?.fullname || "Unknown"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Status:</span>
								<span
									className={`px-2 py-1 rounded-full text-xs font-medium ${
										request.asset_request_status === "pending"
											? "bg-yellow-100 text-yellow-800"
											: request.asset_request_status === "approved"
												? "bg-green-100 text-green-800"
												: request.asset_request_status === "rejected"
													? "bg-red-100 text-red-800"
													: "bg-gray-100 text-gray-800"
									}`}
								>
									{request.asset_request_status.charAt(0).toUpperCase() +
										request.asset_request_status.slice(1)}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end space-x-3 pt-4 border-t">
					<Button
						variant="outline"
						onClick={handleClose}
						disabled={isDeleting}
						className="rounded-xl"
					>
						Cancel
					</Button>
					<Button
						onClick={handleDelete}
						disabled={isDeleting}
						variant="destructive"
						className="rounded-xl"
					>
						{isDeleting ? "Deleting..." : "Delete Request"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
