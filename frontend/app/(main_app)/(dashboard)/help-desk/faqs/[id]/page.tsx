"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, HelpCircle, Tag, MessageSquare } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FAQ_API } from "@/lib/api/help-desk.utils";
import type { FAQ } from "@/types/help-desk.types";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const FAQDetailPage = () => {
	const [faq, setFAQ] = useState<FAQ | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const faqId = params?.id as string;

	const fetchFAQDetail = async () => {
		if (!faqId) return;

		try {
			setLoading(true);
			const numericId = Number(faqId);

			if (isNaN(numericId)) {
				throw new Error("Invalid FAQ ID format");
			}

			const faqData = await FAQ_API.getById({ faqId: numericId });
			setFAQ(faqData);
		} catch (error) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch FAQ details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchFAQDetail();
	}, [faqId]);

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
					<div className="grid gap-6">
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!faq) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">FAQ not found</h2>
					<p className="text-gray-600 mt-2">The FAQ you're looking for doesn't exist.</p>
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
						<h1 className="text-2xl font-semibold tracking-tight">FAQ Details</h1>
						<p className="text-muted-foreground">Frequently Asked Question</p>
					</div>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={faq} onInstanceRefresh={fetchFAQDetail}>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<HelpCircle className="mr-2 h-5 w-5" />
							FAQ Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Question */}
						<div className="space-y-2">
							<Label className="text-sm font-medium flex items-center gap-2">
								<MessageSquare className="h-4 w-4" />
								Question
							</Label>
							<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<p className="text-sm font-medium text-blue-900">{faq.question}</p>
							</div>
						</div>

						{/* Category */}
						<div className="space-y-2">
							<Label className="text-sm font-medium flex items-center gap-2">
								<Tag className="h-4 w-4" />
								Category
							</Label>
							<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
								<p className="text-sm text-gray-700">{faq.category?.name || "Unknown"}</p>
							</div>
						</div>

						{/* Answer */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Answer</Label>
							<Textarea
								value={faq.answer || "No answer provided"}
								disabled
								rows={6}
								className="resize-none bg-gray-50 border-gray-200"
							/>
						</div>

						{/* System Information */}
						<div className="pt-4 border-t border-gray-200">
							<h3 className="text-sm font-medium text-gray-700 mb-3">System Information</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-1">
									<Label className="text-xs text-gray-500">FAQ ID</Label>
									<p className="text-sm">#{faq.id}</p>
								</div>
								<div className="space-y-1">
									<Label className="text-xs text-gray-500">Created Date</Label>
									<p className="text-sm">{faq.created_at ? formatDate(faq.created_at) : "N/A"}</p>
								</div>
								<div className="space-y-1">
									<Label className="text-xs text-gray-500">Last Updated</Label>
									<p className="text-sm">{faq.updated_at ? formatDate(faq.updated_at) : "N/A"}</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default FAQDetailPage;
