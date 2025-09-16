"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { IAsset, IAssetReturnFormData } from "@/types/types.utils";
import { apiRequest } from "@/lib/apiRequest";

interface AssetReturnDialogProps {
	asset: IAsset;
	onReturn: () => void;
	trigger?: React.ReactNode;
}

export function AssetReturnDialog({ asset, onReturn, trigger }: AssetReturnDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<IAssetReturnFormData>({
		asset_id: asset.id,
		return_reason: "",
		asset_condition: "good",
		notes: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.return_reason.trim()) {
			toast.error("Please provide a return reason");

			return;
		}

		setLoading(true);

		try {
			const response = await apiRequest({
				url: `/assets/asset-returns/`,
				method: "POST",
				data: formData,
			});

			if (response.success) {
				toast.success("Asset returned successfully");
				setOpen(false);
				onReturn();
				// Reset form
				setFormData({
					asset_id: asset.id,
					return_reason: "",
					asset_condition: "good",
					notes: "",
				});
			} else {
				toast.error(response.message || "Failed to return asset");
			}
		} catch (error) {
			toast.error("An error occurred while returning the asset");
			console.error("Asset return error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof IAssetReturnFormData, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen && !loading) {
			setOpen(false);
			// Reset form when closing
			setFormData({
				asset_id: asset.id,
				return_reason: "",
				asset_condition: "good",
				notes: "",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						Return Asset
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Return Asset</DialogTitle>
					<DialogDescription>
						Return the asset "{asset.asset_name}" and update its status.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="asset_name" className="text-right">
								Asset Name
							</Label>
							<Input id="asset_name" value={asset.asset_name} disabled className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="serial_number" className="text-right">
								Serial Number
							</Label>
							<Input
								id="serial_number"
								value={asset.serial_number || "N/A"}
								disabled
								className="col-span-3"
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="return_reason" className="text-right">
								Return Reason <span className="text-red-500">*</span>
							</Label>
							<Textarea
								id="return_reason"
								value={formData.return_reason}
								onChange={(e) => handleInputChange("return_reason", e.target.value)}
								placeholder="Enter reason for return..."
								className="col-span-3"
								required
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="asset_condition" className="text-right">
								Asset Condition
							</Label>
							<Select
								value={formData.asset_condition}
								onValueChange={(value) => handleInputChange("asset_condition", value as any)}
							>
								<SelectTrigger className="col-span-3">
									<SelectValue placeholder="Select condition" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="good">Good - Asset is in excellent condition</SelectItem>
									<SelectItem value="fair">Fair - Asset has minor wear and tear</SelectItem>
									<SelectItem value="poor">Poor - Asset has significant wear and tear</SelectItem>
									<SelectItem value="damaged">
										Damaged - Asset is damaged or non-functional
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="notes" className="text-right">
								Additional Notes
							</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) => handleInputChange("notes", e.target.value)}
								placeholder="Additional notes, observations, or special instructions..."
								className="col-span-3"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Returning..." : "Return Asset"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
