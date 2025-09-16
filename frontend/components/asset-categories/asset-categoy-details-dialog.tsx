import type { IAssetCategory } from "@/types/types.utils";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AssetCategoryDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	assetCategory: IAssetCategory | null;
	assetCount?: number;
}

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

export default function AssetCategoryDetailsModal({
	isOpen,
	onClose,
	assetCategory,
	assetCount = 0,
}: AssetCategoryDetailsModalProps) {
	if (!assetCategory) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px] ">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
						Asset Category Details
					</DialogTitle>
					<DialogDescription className="text-sm sm:text-base">
						View the details of this asset category
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 sm:space-y-6 mx-4 sm:mx-0 max-h-[60vh] overflow-y-auto">
					<div className="grid grid-cols-1 gap-4 sm:gap-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Name</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium text-sm sm:text-base">
									{assetCategory.category_name}
								</span>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Description</Label>
							<div className="p-3 bg-gray-50 rounded-md border min-h-[60px] sm:min-h-[80px]">
								{assetCategory.category_description ? (
									<span className="text-gray-700 text-sm sm:text-base">
										{assetCategory.category_description}
									</span>
								) : (
									<span className="text-gray-400 italic text-sm">No description provided</span>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Status</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<Badge className={getStatusColor(assetCategory.is_active)}>
									{assetCategory.is_active ? "Active" : "Inactive"}
								</Badge>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Assets Count</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium text-sm sm:text-base">
									{assetCount} Asset{assetCount !== 1 ? "s" : ""}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-start pt-8">
					<Button onClick={onClose} className="text-sm w-full rounded-full">
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
