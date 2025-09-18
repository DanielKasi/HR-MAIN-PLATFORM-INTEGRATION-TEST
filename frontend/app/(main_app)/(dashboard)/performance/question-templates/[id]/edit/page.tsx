"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import QuestionTemplateCreatePage from "../../create/page";
import { QUESTION_TEMPLATES_API } from "@/lib/utils";
import type { IQuestionTemplate } from "@/types/types.utils";

export default function QuestionTemplateEditPage() {
	const params = useParams();
	const [template, setTemplate] = useState<IQuestionTemplate | null>(null);
	const [loading, setLoading] = useState(true);

	const templateId = params.id as string;

	useEffect(() => {
		if (!templateId) return;

		const fetchTemplate = async () => {
			setLoading(true);
			try {
				const response = await QUESTION_TEMPLATES_API.getById({ templateId: Number(templateId) });
				setTemplate(response);
			} catch (error: any) {
				toast.error(error.message || "Failed to fetch question template");
			} finally {
				setLoading(false);
			}
		};

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
					<div className="text-slate-600 mb-4">Template not found</div>
					<QuestionTemplateCreatePage initialData={undefined} />
				</div>
			</div>
		);
	}

	const handleSuccess = () => {
		toast.success("Question template updated successfully");
	};

	return <QuestionTemplateCreatePage initialData={template} onSuccess={handleSuccess} />;
}
