"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import Link from "next/link";
import type { CustomField } from "@/types/types.utils";

import { QUESTION_TEMPLATES_API, showErrorToast } from "@/lib/utils";
import type { IQuestionTemplate } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

interface ReadOnlyFieldProps {
	field: CustomField;
}

function ReadOnlyField({ field }: ReadOnlyFieldProps) {
	const renderValue = () => {
		switch (field.type) {
			case "text":
				return <span className="text-sm text-slate-600">{field.value || "Not set"}</span>;
			case "rating":
				return (
					<div className="flex items-center gap-2">
						<span className="text-sm text-slate-600">{field.value || "Not set"}</span>
						{field.value && (
							<div className="flex">
								{[...Array(Math.min(Math.max(Math.round(Number(field.value)), 1), 10))].map(
									(_, i) => (
										<svg
											key={i}
											className="h-4 w-4 text-yellow-400"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.49 8.397c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.97z" />
										</svg>
									),
								)}
							</div>
						)}
					</div>
				);
			case "multiple_choice":
				return <span className="text-sm text-slate-600">{field.value || "Not selected"}</span>;
			case "yes_no":
				return (
					<div className="flex items-center space-x-2">
						<span className="h-4 w-4 border rounded-sm bg-green-100 flex items-center justify-center">
							{field.value && (
								<svg
									className="h-3 w-3 text-green-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							)}
						</span>
						<span className="text-sm text-slate-600">{field.value ? "Yes" : "No"}</span>
					</div>
				);
			default:
				return <span className="text-sm text-slate-600">Unknown field type</span>;
		}
	};

	return (
		<div className="space-y-2">
			<div className="flex items-start justify-between">
				<h3 className="font-medium text-slate-900">{field.name}</h3>
				{field.is_required && <Badge variant="secondary">Required</Badge>}
			</div>
			{field.description && <p className="text-sm text-slate-600">{field.description}</p>}
			<div className="text-xs text-slate-500">
				<span className="capitalize">Type: {field.type.replace(/_/g, " ")}</span>
				{field.options && field.options.length > 0 && (
					<>
						{" | "}
						<span>Options: {field.options.join(", ")}</span>
					</>
				)}
			</div>
			{renderValue()}
		</div>
	);
}

interface QuestionTemplateDetailPageProps {}

export default function QuestionTemplateDetailPage({}: QuestionTemplateDetailPageProps) {
	const params = useParams();
	const router = useRouter();
	const [template, setTemplate] = useState<IQuestionTemplate | null>(null);
	const [loading, setLoading] = useState(true);

	const templateId = params.id as string;

	const fetchTemplate = async () => {
		setLoading(true);
		try {
			const response = await QUESTION_TEMPLATES_API.getById({ templateId: Number(templateId) });
			setTemplate(response);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch question template" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!templateId) return;
		fetchTemplate();
	}, [templateId]);

	if (loading) {
		return (
			<div className="min-h-screen p-6 bg-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
					<p className="text-slate-600">Loading template...</p>
				</div>
			</div>
		);
	}

	if (!template) {
		return (
			<div className="min-h-screen p-6 bg-white flex items-center justify-center">
				<div className="text-center">
					<FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-slate-900 mb-2">Template not found</h2>
					<Button
						onClick={() => router.push("/performance/question-templates")}
						variant="outline"
						className="rounded-xl"
					>
						Back to Templates
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-6 bg-white mt-3">
			<ApprovableInstancePageLayout instance={template} onInstanceRefresh={fetchTemplate}>
				<div className="">
					{/* Header */}
					<div className="flex items-center justify-between mb-8">
						<div className="flex items-center gap-4">
							<Button
								variant="outline"
								className="!h-12 !w-12 !rounded-full !aspect-square"
								onClick={() => router.back()}
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<div>
								<h1 className="text-xl md:text-3xl font-bold text-slate-900">{template.name}</h1>
								<div className="flex items-center gap-2 mt-2">
									<Badge variant="secondary" className="capitalize">
										{template.category.replace(/_/g, " ")}
									</Badge>
									<span className="text-sm text-slate-500">
										{template.questions.length} Questions
									</span>
								</div>
							</div>
						</div>
						<div className="flex gap-2">
							<Link href={`/performance/question-templates/${template.id}/edit`}>
								<Button className="rounded-xl">
									<Edit className="h-4 w-4 md:mr-2" />
									<span className="hidden md:inline-block">Edit Template</span>
								</Button>
							</Link>
						</div>
					</div>

					{/* Description */}
					{template.description && (
						<div className="mb-8 p-4 bg-slate-50 rounded-xl">
							<p className="text-slate-700">{template.description}</p>
						</div>
					)}

					{/* Questions List */}
					<div className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900 mb-4">Questions</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{template.questions.map((field: CustomField) => (
								<div key={field.id} className="p-4 border rounded-xl">
									<ReadOnlyField field={field} />
								</div>
							))}
						</div>
						{template.questions.length === 0 && (
							<div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
								<FileText className="mx-auto h-12 w-12 mb-4" />
								<p className="text-lg">No questions in this template</p>
								<p className="text-sm">Add questions when editing the template.</p>
							</div>
						)}
					</div>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
