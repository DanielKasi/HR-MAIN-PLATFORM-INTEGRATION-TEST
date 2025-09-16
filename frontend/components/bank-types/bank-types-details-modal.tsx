import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
	DialogHeader,
} from "@/components/ui/dialog";
import { IBankType } from "@/types/types.utils";

// Bank Type Details Modal
interface BankTypeDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	bankType: IBankType | null;
}

export function BankTypeDetailsModal({ isOpen, onClose, bankType }: BankTypeDetailsModalProps) {
	if (!bankType) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">Bank Type Details</DialogTitle>
					<DialogDescription>View the details of this bank type</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Bank Full Name</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium">{bankType.bank_fullname}</span>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Bank Code</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									<Badge
										variant="outline"
										className="border-orange-200 bg-orange-50 text-orange-700"
									>
										{bankType.bank_code}
									</Badge>
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">BR Code</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									<Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
										{bankType.br_code}
									</Badge>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Created</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									{new Date(bankType.created_at).toLocaleDateString()}
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Updated</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									{new Date(bankType.updated_at).toLocaleDateString()}
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<Button onClick={onClose}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
