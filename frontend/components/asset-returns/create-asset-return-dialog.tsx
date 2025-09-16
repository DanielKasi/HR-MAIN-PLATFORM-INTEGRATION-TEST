"use client";

import type { IAsset, IAssetAllocation } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { assetsAPI } from "@/lib/utils";
import { IAssetReturnFormData } from "@/types/types.utils";

interface CreateAssetReturnDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function CreateAssetReturnDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateAssetReturnDialogProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [assets, setAssets] = useState<IAsset[]>([]);
	const [allocations, setAllocations] = useState<IAssetAllocation[]>([]);
	const [selectedAssetId, setSelectedAssetId] = useState<string>("");
	const [selectedAllocationId, setSelectedAllocationId] = useState<string>("");
	const [formData, setFormData] = useState({
		asset: 0,
		allocation: 0,
		condition: "good" as "good" | "damaged" | "lost",
		notes: "",
	});

	// Fetch assets and allocations
	useEffect(() => {
		if (open) {
			fetchAssets();
			fetchAllocations();
		}
	}, [open]);

	const fetchAssets = async () => {
		try {
			const data = await assetsAPI.getAll();

			setAssets(data);
		} catch (error) {
			console.error("Error fetching assets:", error);
			toast.error("Failed to fetch assets");
		}
	};

	const fetchAllocations = async () => {
		try {
			const data = await assetsAPI.getAssetAllocations();

			setAllocations(data);
		} catch (error) {
			console.error("Error fetching allocations:", error);
			toast.error("Failed to fetch allocations");
		}
	};

	// Filter allocations based on selected asset
	const filteredAllocations = allocations.filter(
		(allocation) => allocation.asset?.id === Number(selectedAssetId),
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedAssetId || !selectedAllocationId) {
			toast.error("Please select both asset and allocation");

			return;
		}

		if (!formData.condition) {
			toast.error("Please select asset condition");

			return;
		}

		setIsLoading(true);
		try {
			const submitData: IAssetReturnFormData = {
				asset: Number(selectedAssetId),
				allocation: Number(selectedAllocationId),
				condition: formData.condition,
				notes: formData.notes || "",
			};

			await assetsAPI.createAssetReturn(submitData);
			toast.success("Asset return created successfully");
			onSuccess();
			onOpenChange(false);
			resetForm();
		} catch (error) {
			console.error("Error creating asset return:", error);
			toast.error("Failed to create asset return");
		} finally {
			setIsLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({
			asset: 0,
			allocation: 0,
			condition: "good",
			notes: "",
		});
		setSelectedAssetId("");
		setSelectedAllocationId("");
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			resetForm();
		}
		onOpenChange(open);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create Asset Return</DialogTitle>
					<DialogDescription>
						Record the return of an allocated asset. This will update the asset status and create a
						return record.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Asset Selection */}
					<div className="space-y-2">
						<Label htmlFor="asset">Asset *</Label>
						<Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
							<SelectTrigger>
								<SelectValue placeholder="Select an asset" />
							</SelectTrigger>
							<SelectContent>
								{assets
									.filter((asset) => asset.status === "allocated")
									.map((asset) => (
										<SelectItem key={asset.id} value={asset.id.toString()}>
											<div className="flex flex-col">
												<span className="font-medium">{asset.asset_name}</span>
												<span className="text-xs text-muted-foreground">
													{asset.serial_number} • {asset.batch_number}
												</span>
											</div>
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>

					{/* Allocation Selection */}
					{selectedAssetId && (
						<div className="space-y-2">
							<Label htmlFor="allocation">Allocation *</Label>
							<Select value={selectedAllocationId} onValueChange={setSelectedAllocationId}>
								<SelectTrigger>
									<SelectValue placeholder="Select an allocation" />
								</SelectTrigger>
								<SelectContent>
									{filteredAllocations.map((allocation) => (
										<SelectItem key={allocation.id} value={allocation.id.toString()}>
											<div className="flex flex-col">
												<span className="font-medium">
													Allocated to: {allocation.allocated_to?.user?.fullname || "Unknown"}
												</span>
												<span className="text-xs text-muted-foreground">
													{allocation.allocated_by?.user?.fullname || "Unknown"} •{" "}
													{new Date(allocation.created_at).toLocaleDateString()}
												</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Asset Condition */}
					<div className="space-y-2">
						<Label htmlFor="condition">Asset Condition *</Label>
						<Select
							value={formData.condition}
							onValueChange={(value: string) =>
								setFormData({ ...formData, condition: value as "good" | "damaged" | "lost" })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="good">Good - Asset is in excellent condition</SelectItem>
								<SelectItem value="damaged">Damaged - Asset has visible damage</SelectItem>
								<SelectItem value="lost">Lost - Asset cannot be located</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							placeholder="Additional notes about the return..."
							value={formData.notes}
							onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
							rows={3}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Creating..." : "Create Return"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
