"use client";

import type { ITax } from "@/types/types.utils";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { taxesAPI } from "@/lib/utils";

interface DeleteTaxDialogProps {
	tax: ITax;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (deletedId: number) => void;
}

export function DeleteTaxDialog({ tax, isOpen, onClose, onSuccess }: DeleteTaxDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			// Use actual API call
			await taxesAPI.delete(tax.id);
			onSuccess(tax.id);
			toast.success("Tax deleted successfully");
			onClose();
		} catch (error: any) {
			console.error("Error deleting tax:", error);
			toast.error(error.message || "An error occurred while deleting the tax");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
				<AlertDialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0">
							<div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
								<AlertTriangle className="h-5 w-5 text-red-600" />
							</div>
						</div>
						<div>
							<AlertDialogTitle className="text-xl font-bold text-gray-900">
								Delete Tax
							</AlertDialogTitle>
							<AlertDialogDescription className="text-gray-600 mt-1">
								Are you sure you want to delete this tax? This action cannot be undone.
							</AlertDialogDescription>
						</div>
					</div>
				</AlertDialogHeader>

				<div className="py-6">
					<div className="bg-gray-50 rounded-xl p-4">
						<h4 className="font-semibold text-gray-900 mb-2">Tax Details</h4>
						<div className="space-y-2 text-sm text-gray-600">
							<div>
								<span className="font-medium">Name:</span> {tax.tax_name}
							</div>
							<div>
								<span className="font-medium">Status:</span>
								<span
									className={`ml-2 px-2 py-1 rounded-full text-xs ${
										tax.tax_status ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
									}`}
								>
									{tax.tax_status ? "Active" : "Inactive"}
								</span>
							</div>
						</div>
					</div>

					<div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
						<div className="flex items-start gap-3">
							<AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-red-800">
								<p className="font-medium mb-1">Warning</p>
								<p>
									Deleting this tax will permanently remove it from the system. Any associated data
									may be affected.
								</p>
							</div>
						</div>
					</div>
				</div>

				<AlertDialogFooter className="gap-3">
					<AlertDialogCancel
						onClick={onClose}
						disabled={isDeleting}
						className="border-gray-300 text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-red-600 hover:bg-red-700 text-white"
					>
						{isDeleting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Deleting...
							</>
						) : (
							"Delete Tax"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
