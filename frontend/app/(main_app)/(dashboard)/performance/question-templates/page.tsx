"use client";

import type { IQuestionTemplate } from "@/types/types.utils";
import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { FileText, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import Link from "next/link";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import { QUESTION_TEMPLATES_API } from "@/lib/utils";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface QuestionTemplatesPageProps {}

export default function QuestionTemplatesPage({}: QuestionTemplatesPageProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [templateToDelete, setTemplateToDelete] = useState<IQuestionTemplate | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const router = useRouter();

	const handleDelete = async (template: IQuestionTemplate) => {
		setSubmitting(true);
		try {
			await QUESTION_TEMPLATES_API.delete({ templateId: template.id });
			toast.success("Question template deleted successfully");
		} catch (error: any) {
			toast.error(error.message || "Failed to delete question template");
		} finally {
			setSubmitting(false);
			setTemplateToDelete(null);
		}
	};

	const openPath = (path: string) => {
		router.push(path);
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	const columns: ColumnDef<IQuestionTemplate>[] = [
		{
			key: "name",
			header: "Template Name",
			cell: (template) => template.name,
		},
		{
			key: "category",
			header: "Category",
			cell: (template) => (
				<span className="capitalize">{template.category.replace(/_/g, " ")}</span>
			),
		},
		{
			key: "description",
			header: "Description",
			cell: (template) => template.description || "No description",
		},
		{
			key: "question_count",
			header: "Questions",
			cell: (template) => template.questions.length,
		},
		{
			key: "actions",
			header: "Actions",
			cell: (template) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => openPath(`/performance/question-templates/${template.id}`)}
						>
							<Eye className="h-4 w-4 mr-2" />
							View
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => openPath(`/performance/question-templates/${template.id}/edit`)}
						>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setTemplateToDelete(template)}
							className="text-red-600 focus:text-red-600"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className="min-h-screen p-6 bg-white">
			<div className="mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								Question Templates
							</h1>
							<p className="text-slate-600 text-lg">
								Manage reusable question templates for interviews, reviews, feedback and more
							</p>
						</div>
					</div>
				</div>
				<div className="flex justify-between items-center mb-4">
					<Input
						type="text"
						placeholder="Search templates..."
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						className="max-w-sm md:max-w-lg lg:max-w-xl rounded-xl"
					/>
					<Link href="/performance/question-templates/create">
						<Button className="rounded-2xl">
							<Plus className="h-4 w-4 lg:mr-2" />
							<span className="hidden lg:inline-block">Create Template</span>
						</Button>
					</Link>
				</div>

				{/* Table */}
				<PaginatedTable<IQuestionTemplate>
					fetchFirstPage={async () =>
						await QUESTION_TEMPLATES_API.getPaginated({
							page: 1,
							search: searchQuery || undefined,
						})
					}
					fetchFromUrl={QUESTION_TEMPLATES_API.getPaginatedFromUrl}
					deps={[searchQuery]}
					className="space-y-4"
					tableClassName="min-w-full"
					footerClassName="pt-4"
					columns={columns}
					skeletonRows={5}
					emptyState={
						<div className="text-center py-12">
							<FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<p className="text-muted-foreground mb-4">No question templates found</p>
						</div>
					}
				/>

				{/* Delete Confirmation */}
				{templateToDelete && (
					<ConfirmationDialog
						isOpen={!!templateToDelete}
						onClose={() => setTemplateToDelete(null)}
						onConfirm={() => handleDelete(templateToDelete)}
						title="Delete Question Template"
						description={`Are you sure you want to delete "${templateToDelete.name}"? This action cannot be undone.`}
						confirmText="Delete"
						cancelText="Cancel"
						disabled={submitting}
					/>
				)}
			</div>
		</div>
	);
}
