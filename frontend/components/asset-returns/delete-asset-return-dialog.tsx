"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { assetsAPI } from "@/lib/utils";
import type { IAssetReturn } from "@/types/types.utils";

interface DeleteAssetReturnDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	assetReturn: IAssetReturn;
	onSuccess: () => void;
}

export function DeleteAssetReturnDialog({
	open,
	onOpenChange,
	assetReturn,
	onSuccess,
}: DeleteAssetReturnDialogProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handleDelete = async () => {
		setIsLoading(true);
		try {
			await assetsAPI.deleteAssetReturn(assetReturn.id);
			toast.success("Asset return deleted successfully");
			onSuccess();
			onOpenChange(false);
		} catch (error) {
			console.error("Error deleting asset return:", error);
			toast.error("Failed to delete asset return");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Delete Asset Return</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this asset return? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="bg-muted p-4 rounded-lg">
						<h4 className="font-medium mb-2">Asset Return Details:</h4>
						<div className="space-y-1 text-sm text-muted-foreground">
							<p>
								<strong>Asset:</strong> {assetReturn.asset?.asset_name}
							</p>
							<p>
								<strong>Serial Number:</strong> {assetReturn.asset?.serial_number}
							</p>
							<p>
								<strong>Condition:</strong> {assetReturn.asset_condition}
							</p>
							<p>
								<strong>Return Date:</strong>{" "}
								{new Date(assetReturn.created_at).toLocaleDateString()}
							</p>
							{assetReturn.notes && (
								<p>
									<strong>Notes:</strong> {assetReturn.notes}
								</p>
							)}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
						{isLoading ? "Deleting..." : "Delete Return"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
