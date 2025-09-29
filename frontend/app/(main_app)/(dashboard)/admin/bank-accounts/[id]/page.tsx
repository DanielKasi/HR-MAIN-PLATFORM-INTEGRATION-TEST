"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Building, CreditCard, MapPin, Calendar, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { bankAccountsAPI, showErrorToast } from "@/lib/utils";
import type { IBankAccount } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const BankAccountDetailPage = () => {
	const [bankAccount, setBankAccount] = useState<IBankAccount | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const accountId = params?.id as string;

	const fetchBankAccountDetail = async () => {
		if (!accountId) return;

		try {
			setLoading(true);

			const accountData = await bankAccountsAPI.getById({
				bankAccountId: accountId,
			});
			setBankAccount(accountData);
		} catch (error) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch bank account details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBankAccountDetail();
	}, [accountId]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const getStatusBadge = (isActive: boolean) => {
		return isActive
			? "bg-green-100 text-green-800 border-green-200"
			: "bg-red-100 text-red-800 border-red-200";
	};

	if (loading) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
					<div className="grid gap-6 md:grid-cols-2">
						<div className="h-64 bg-gray-200 rounded"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!bankAccount) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Bank Account not found</h2>
					<p className="text-gray-600 mt-2">The bank account you're looking for doesn't exist.</p>
					<Button onClick={() => router.back()} className="mt-4">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6 bg-white">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Button
						variant="outline"
						size="sm"
						className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
						onClick={() => router.back()}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
					</Button>
					<div className="mt-4">
						<h1 className="text-2xl font-semibold tracking-tight">{bankAccount.account_name}</h1>
						<p className="text-muted-foreground">Bank Account Details</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<Shield className="h-4 w-4 text-blue-600" />
					<Badge className={`${getStatusBadge(bankAccount.is_active)} border`}>
						{bankAccount.is_active ? "Active" : "Inactive"}
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout
				instance={bankAccount}
				onInstanceRefresh={fetchBankAccountDetail}
			>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<CreditCard className="mr-2 h-5 w-5" />
							Bank Account Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Account Name */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-gray-700">Account Name</span>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium">{bankAccount.account_name}</span>
							</div>
						</div>

						{/* Account Number */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-gray-700">Account Number</span>
							<div className="p-3 bg-gray-50 rounded-md border">
								<Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
									{bankAccount.account_number}
								</Badge>
							</div>
						</div>

						{/* Created & Updated Dates */}
						<div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Created</span>
								<div className="p-3 bg-gray-50 rounded-md border">
									{formatDate(bankAccount.created_at)}
								</div>
							</div>
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Updated</span>
								<div className="p-3 bg-gray-50 rounded-md border">
									{formatDate(bankAccount.updated_at)}
								</div>
							</div>
						</div>

						{/* Attached Branches */}
						<div className="space-y-4">
							<h3 className="text-lg font-medium">Attached Branches</h3>
							<div className="flex flex-col items-start justify-start space-y-3">
								{bankAccount.paid_branches?.length ? (
									bankAccount.paid_branches.map((br, index) => (
										<div key={index} className="w-full space-y-2">
											<span className="text-sm font-medium text-gray-700">{br.branch_name}</span>
											<div className="p-3 bg-gray-50 rounded-md border w-full">
												{br.branch_name}
											</div>
										</div>
									))
								) : (
									<div className="text-center py-8 text-gray-500 w-full">
										<Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<span>No branches found on this account</span>
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default BankAccountDetailPage;
