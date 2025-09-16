"use client";

import type { IBankAccount } from "@/types/types.utils";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface BankAccountDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	bankAccount: IBankAccount | null;
}

export function BankAccountDetailsModal({
	isOpen,
	onClose,
	bankAccount,
}: BankAccountDetailsModalProps) {
	if (!bankAccount) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">Bank Account Details</DialogTitle>
					<DialogDescription>View the details of this bank account</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Account Name</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium">{bankAccount.account_name}</span>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Account Number</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
									{bankAccount.account_number}
								</Badge>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Created</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									{new Date(bankAccount.created_at).toLocaleDateString()}
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Updated</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									{new Date(bankAccount.updated_at).toLocaleDateString()}
								</div>
							</div>
						</div>
					</div>
				</div>

				<p className="py-4 text-lg">Attached Branches</p>
				<div className="flex flex-col items-center justify-start">
					{bankAccount.paid_branches?.length ? (
						bankAccount.paid_branches.map((br) => (
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">{br.branch_name}</Label>
								<div className="p-3 bg-gray-50 rounded-md border">{br.branch_name}</div>
							</div>
						))
					) : (
						<span>No branches found on this account</span>
					)}
				</div>

				<div className="flex justify-end pt-4">
					<Button onClick={onClose}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
