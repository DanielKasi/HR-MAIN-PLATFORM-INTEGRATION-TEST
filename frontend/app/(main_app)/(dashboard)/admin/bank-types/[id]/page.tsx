"use client";

import type React from "react";
import type { IBankType } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import {
	ArrowLeft,
	Edit,
	Trash2,
	Building2,
	Shield,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { bankTypesAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function BankTypeViewPage() {
	const router = useRouter();
	const params = useParams();
	const bankTypeId = params?.id as string;
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const [bankType, setBankType] = useState<IBankType | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (bankTypeId && selectedInstitution?.id) {
			fetchBankType();
		}
	}, [bankTypeId, selectedInstitution?.id]);

	const fetchBankType = async () => {
		if (!bankTypeId || !selectedInstitution?.id) return;

		try {
			setLoading(true);
			const response = await bankTypesAPI.getById({ bankTypeId });
			setBankType(response);
		} catch (error) {
			toast.error("Failed to load bank type details");
			router.push("/admin/bank-types");
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
					<div className="grid gap-6 md:grid-cols-1">
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!bankType) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Bank Type not found</h2>
					<p className="text-gray-600 mt-2">The bank type you're looking for doesn't exist.</p>
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
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="mt-4">
						<h1 className="text-2xl font-semibold tracking-tight">{bankType.bank_fullname}</h1>
						<p className="text-muted-foreground">Bank Type Details</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<Shield className="h-4 w-4 text-blue-600" />
					<Badge className="bg-green-100 text-green-800 border-green-200 border">
						Active
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={bankType} onInstanceRefresh={fetchBankType}>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Building2 className="mr-2 h-5 w-5" />
							Bank Type Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Bank Full Name */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-gray-700">Bank Full Name</span>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium">{bankType.bank_fullname}</span>
							</div>
						</div>

						{/* Bank Code */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-gray-700">Bank Code</span>
							<div className="p-3 bg-gray-50 rounded-md border">
								<Badge
									variant="outline"
									className="border-orange-200 bg-orange-50 text-orange-700"
								>
									{bankType.bank_code}
								</Badge>
							</div>
						</div>

						{/* BR Code */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-gray-700">BR Code</span>
							<div className="p-3 bg-gray-50 rounded-md border">
								<Badge
									variant="outline"
									className="border-blue-200 bg-blue-50 text-blue-700"
								>
									{bankType.br_code}
								</Badge>
							</div>
						</div>

						{/* Bank ID */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-gray-700">Bank ID</span>
							<div className="p-3 bg-gray-50 rounded-md border">
								<Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
									#{bankType.id}
								</Badge>
							</div>
						</div>

						{/* Created & Updated Dates */}
						<div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Created</span>
								<div className="p-3 bg-gray-50 rounded-md border">
									{formatDate(bankType.created_at)}
								</div>
							</div>
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Updated</span>
								<div className="p-3 bg-gray-50 rounded-md border">
									{formatDate(bankType.updated_at)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</ApprovableInstancePageLayout>
		</div>
	);
}
