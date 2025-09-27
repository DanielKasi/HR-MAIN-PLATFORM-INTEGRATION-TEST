"use client";

import type { IBankAccount, IBankAccountFormData } from "@/types/types.utils";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { bankAccountsAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { BankAccountFormModal } from "@/components/bank-accounts/create-bank-account-modal";
import { BankAccountDetailsModal } from "@/components/bank-accounts/bank-account-details-modal";
import { BankAccountsTable } from "@/components/bank-accounts/bank-accounts-table";
import { PaginationControls } from "@/components/bank-accounts/pagination-controls";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useRouter } from "next/navigation";

export default function BankAccountManagement() {
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const [bankAccounts, setBankAccounts] = useState<IBankAccount[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [bankAccountToDelete, setBankAccountToDelete] = useState<IBankAccount | null>(null);
	const [isDeleting, setIsDeleting] = useState<boolean>(false);

	// Server-side pagination states
	const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null);
	const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
	const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null);
	const [totalCount, setTotalCount] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);

	// Modal states
	const [showFormModal, setShowFormModal] = useState(false);
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [editingAccount, setEditingAccount] = useState<IBankAccount | null>(null);
	const [viewingAccount, setViewingAccount] = useState<IBankAccount | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	// Debounced search
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

	// Debounce search term
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Fetch bank accounts on component mount
	useEffect(() => {
		if (selectedInstitution?.id) {
			fetchBankAccounts();
		}
	}, [selectedInstitution]);

	const fetchBankAccounts = useCallback(
		async (pageUrl?: string | null) => {
			if (!selectedInstitution?.id) return;

			try {
				setLoading(true);

				let searchParams = "";

				if (pageUrl) {
					const url = new URL(pageUrl);

					searchParams = url.search;
				} else if (debouncedSearchTerm) {
					searchParams = `?search=${encodeURIComponent(debouncedSearchTerm)}`;
				}

				const response = await bankAccountsAPI.getAll(searchParams);

				setBankAccounts(response.results);
				setTotalCount(response.count);
				setNextPageUrl(response.next);
				setPreviousPageUrl(response.previous);
				setCurrentPageUrl(pageUrl || null);
			} catch (error) {
				toast.error("Failed to load bank accounts");
			} finally {
				setLoading(false);
			}
		},
		[selectedInstitution?.id],
	);

	const handleSave = async (formData: IBankAccountFormData) => {
		if (!selectedInstitution?.id) return;

		setIsSubmitting(true);

		try {
			if (editingAccount) {
				// Update existing
				await bankAccountsAPI.update({
					bankAccountId: editingAccount.id.toString(),
					data: formData,
				});

				// Refresh current page
				await fetchBankAccounts(currentPageUrl);
				toast.success("Bank account updated successfully!");
			} else {
				// Create new
				await bankAccountsAPI.create({
					bankAccount: formData,
				});

				// Reset to first page and refresh
				setCurrentPage(1);
				setCurrentPageUrl(null);
				setSearchTerm("");
				setDebouncedSearchTerm("");
				await fetchBankAccounts();
				toast.success("Bank account created successfully!");
			}
		} catch (error) {
			toast.error(`Failed to ${editingAccount ? "update" : "create"} bank account`);
			throw error;
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCreate = () => {
		setEditingAccount(null);
		setShowFormModal(true);
	};

	const handleEdit = (account: IBankAccount) => {
		setEditingAccount(account);
		setShowFormModal(true);
	};
	const handleView = (account: IBankAccount) => {
		router.push(`/admin/bank-accounts/${account.id}`);
	};
	const handleDelete = async (bankAccount: IBankAccount) => {
		if (!selectedInstitution?.id) return;

		try {
			setIsDeleting(true);

			await bankAccountsAPI.delete({
				bankAccountId: bankAccount.id.toString(),
			});

			// Refresh current page
			await fetchBankAccounts(currentPageUrl);
			toast.success("Bank account deleted successfully!");
		} catch (error) {
			toast.error("Failed to delete bank account");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleNextPage = () => {
		if (nextPageUrl) {
			setCurrentPage((prev) => prev + 1);
			fetchBankAccounts(nextPageUrl);
		}
	};

	const handlePreviousPage = () => {
		if (previousPageUrl) {
			setCurrentPage((prev) => prev - 1);
			fetchBankAccounts(previousPageUrl);
		}
	};

	const handleCloseFormModal = () => {
		setShowFormModal(false);
		setEditingAccount(null);
	};

	const handleCloseDetailsModal = () => {
		setShowDetailsModal(false);
		setViewingAccount(null);
	};

	if (!selectedInstitution) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<div className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-600">Please select an institution to manage bank accounts.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Bank Accounts List */}
			<Card className="w-full bg-white shadow-sm border border-gray-200">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Bank Accounts</CardTitle>
							<CardDescription>Manage bank accounts in your organization</CardDescription>
						</div>
						<Button onClick={handleCreate}>
							<Plus className="h-4 w-4 mr-2" />
							Add Bank Account
						</Button>
					</div>
				</CardHeader>

				<CardContent className="p-6">
					<div className="flex items-center gap-4 mb-6">
						<div className="relative flex-1 max-w-sm">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search bank accounts..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
						<Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
							{totalCount} account{totalCount !== 1 ? "s" : ""}
						</Badge>
					</div>

					<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
						<BankAccountsTable
							bankAccounts={bankAccounts}
							loading={loading}
							bankAccountToDelete={bankAccountToDelete}
							onView={handleView}
							onEdit={handleEdit}
							onDelete={setBankAccountToDelete}
							onCreate={handleCreate}
							searchTerm={searchTerm}
						/>

						<PaginationControls
							currentPage={currentPage}
							totalCount={totalCount}
							nextPageUrl={nextPageUrl}
							previousPageUrl={previousPageUrl}
							loading={loading}
							onNextPage={handleNextPage}
							onPreviousPage={handlePreviousPage}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Form Modal */}
			<BankAccountFormModal
				isOpen={showFormModal}
				onClose={handleCloseFormModal}
				editingAccount={editingAccount}
				onSave={handleSave}
				isSubmitting={isSubmitting}
				existingAccounts={bankAccounts}
			/>

			{bankAccountToDelete && (
				<ConfirmationDialog
					description="Are you sure you want to delete this bank account? This action cannot be undone."
					disabled={isDeleting}
					isOpen={!!bankAccountToDelete}
					title={`Delete ${bankAccountToDelete.account_name}`}
					onConfirm={() => handleDelete(bankAccountToDelete)}
					onClose={() => {
						setBankAccountToDelete(null);
						setIsDeleting(false);
					}}
				/>
			)}
		</div>
	);
}
