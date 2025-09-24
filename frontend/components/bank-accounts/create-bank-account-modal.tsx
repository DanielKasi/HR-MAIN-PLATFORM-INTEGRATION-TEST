"use client";

import type React from "react";
import type { IBankAccount, IBankAccountFormData } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { BankTypeSearchableSelect } from "../bank-types/bank-types-select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import BankAccountSearchableSelect from "../selects/bank-accounts-select";

interface BankAccountFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	editingAccount: IBankAccount | null;
	onSave: (data: IBankAccountFormData) => Promise<void>;
	isSubmitting: boolean;
	existingAccounts: IBankAccount[];
}

export function BankAccountFormModal({
	isOpen,
	onClose,
	editingAccount,
	onSave,
	isSubmitting,
	existingAccounts,
}: BankAccountFormModalProps) {
	const [formData, setFormData] = useState<IBankAccountFormData>({
		institution_bank: "",
		account_name: "",
		account_number: "",
	});
	const [errors, setErrors] = useState<Partial<Record<keyof IBankAccountFormData, string>>>({});

	// Reset form when modal opens/closes or editing account changes
	useEffect(() => {
		if (isOpen) {
			if (editingAccount) {
				setFormData({
					institution_bank: editingAccount.institution_bank,
					account_name: editingAccount.account_name,
					account_number: editingAccount.account_number,
				});
			} else {
				setFormData({ institution_bank: "", account_name: "", account_number: "" });
			}
			setErrors({});
		}
	}, [isOpen, editingAccount]);

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof IBankAccountFormData, string>> = {};

		if (!formData.institution_bank) {
			newErrors.institution_bank = "Bank type is required";
		}

		if (!formData.account_name?.trim()) {
			newErrors.account_name = "Account name is required";
		} else if (formData.account_name.length > 200) {
			newErrors.account_name = "Account name must be 200 characters or less";
		}

		if (!formData.account_number?.trim()) {
			newErrors.account_number = "Account number is required";
		} else if (formData.account_number.length > 50) {
			newErrors.account_number = "Account number must be 50 characters or less";
		}

		// Check for duplicate account numbers (excluding current editing item)
		const duplicateAccountNumber = existingAccounts.find(
			(account) =>
				account.account_number.toLowerCase() === formData.account_number?.toLowerCase() &&
				account.id !== editingAccount?.id,
		);

		if (duplicateAccountNumber) {
			newErrors.account_number = "A bank account with this account number already exists";
		}

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		try {
			await onSave(formData);
			onClose();
		} catch (error) {
			// Error is handled in parent component
		}
	};

	const handleInputChange = (field: keyof IBankAccountFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const handleBankTypeChange = (value: string | number) => {
		setFormData((prev) => ({ ...prev, institution_bank: value }));

		if (errors.institution_bank) {
			setErrors((prev) => ({ ...prev, institution_bank: undefined }));
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{editingAccount ? "Edit Bank Account" : "Create Bank Account"}</DialogTitle>
					<DialogDescription>
						{editingAccount
							? "Update the bank account information below."
							: "Add a new bank account to your organization."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-4">
						<BankAccountSearchableSelect
							value={[formData.institution_bank]}
							onValueChange={(values) => {
								if (values.length) {
									handleBankTypeChange(Number(values[0]));
								}
							}}
							disabled={isSubmitting}
							required
						/>

						<div className="space-y-2">
							<Label htmlFor="account_name">
								Account Name <span className="text-red-500">*</span>
							</Label>
							<Input
								id="account_name"
								value={formData.account_name || ""}
								onChange={(e) => handleInputChange("account_name", e.target.value)}
								placeholder="e.g., Main Operating Account"
								maxLength={200}
								className={errors.account_name ? "border-red-500" : ""}
							/>
							{errors.account_name && <p className="text-sm text-red-500">{errors.account_name}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="account_number">
								Account Number <span className="text-red-500">*</span>
							</Label>
							<Input
								id="account_number"
								value={formData.account_number || ""}
								onChange={(e) => handleInputChange("account_number", e.target.value)}
								placeholder="e.g., 1234567890"
								maxLength={50}
								className={errors.account_number ? "border-red-500" : ""}
							/>
							{errors.account_number && (
								<p className="text-sm text-red-500">{errors.account_number}</p>
							)}
						</div>
					</div>

					<div className="flex items-center justify-start gap-4 pt-4">
						<Button className="w-full rounded-full" type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{isSubmitting
								? "Saving..."
								: editingAccount
									? "Update Bank Account"
									: "Create Bank Account"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
