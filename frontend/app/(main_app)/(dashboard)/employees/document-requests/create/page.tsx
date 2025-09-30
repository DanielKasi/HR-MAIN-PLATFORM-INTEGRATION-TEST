"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { DOCUMENT_REQUESTS_API } from "@/lib/api/document-utils";
import { DocumentFormat, IDocumentRequestFormData } from "@/types/documents.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { Input } from "@/components/ui/input";

const FORMAT_CHOICES: Array<{ value: DocumentFormat; label: string }> = [
	{ value: "pdf", label: "PDF" },
	{ value: "word", label: "Word" },
	{ value: "excel", label: "Excel" },
	{ value: "jpg", label: "JPG" },
	{ value: "any", label: "Any" },
	{ value: "jpeg", label: "JPEG" },
	{ value: "png", label: "PNG" },
];

export default function DocumentRequestCreatePage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const [formData, setFormData] = useState<IDocumentRequestFormData>({
		requested_by: 0,
		employees: [],
		document_type: "",
		document_format: "pdf",
		description: "",
		due_date: "",
	});
	const [saving, setSaving] = useState(false);

	const handleCreate = async () => {
		if (!currentInstitution || !currentUser) {
			showErrorToast({ error: null, defaultMessage: "No user or institution found" });
			return;
		}
		if (!formData.document_type.trim()) {
			showErrorToast({ error: null, defaultMessage: "Document type is required" });
			return;
		}
		if (formData.employees.length === 0) {
			showErrorToast({ error: null, defaultMessage: "At least one employee is required" });
			return;
		}
		if (!formData.due_date) {
			showErrorToast({ error: null, defaultMessage: "Due date is required" });
			return;
		}
		try {
			setSaving(true);

			await DOCUMENT_REQUESTS_API.create({ data: { ...formData, requested_by: currentUser.id } });
			showSuccessToast("Document request created successfully!");
			router.push("/employees/document-requests");
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to create document request" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href="/employees/document-requests">
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">Create Document Request</h1>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1  md:grid-cols-2 gap-8 items-end">
					<div className="space-y-2">
						<Label>Employees *</Label>
						<EmployeeSearchableSelect
							value={formData.employees}
							onValueChange={(values) =>
								setFormData((prev) => ({ ...prev, employees: values.map(Number) }))
							}
							placeholder="Select employees..."
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
							multiple={true}
						/>
					</div>
					<div className="space-y-2">
						<Label>Document Type *</Label>
						<Input
							placeholder="e.g., ID, Certificate"
							value={formData.document_type}
							onChange={(e) => setFormData((prev) => ({ ...prev, document_type: e.target.value }))}
							className="rounded-2xl"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1  md:grid-cols-2 gap-8 items-end">
					<div className="space-y-2">
						<Label>Document Format *</Label>
						<Select
							value={formData.document_format}
							onValueChange={(value) =>
								setFormData((prev) => ({ ...prev, document_format: value as DocumentFormat }))
							}
						>
							<SelectTrigger className="rounded-2xl">
								<SelectValue placeholder="Select format" />
							</SelectTrigger>
							<SelectContent>
								{FORMAT_CHOICES.map((choice) => (
									<SelectItem key={choice.value} value={choice.value}>
										{choice.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Due Date *</Label>
						<Input
							type="date"
							value={formData.due_date}
							onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
							className="rounded-2xl"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
					<div className="space-y-2 col-span-1">
						<Label>Description</Label>
						<Textarea
							placeholder="Additional details..."
							value={formData.description}
							onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
							className="rounded-2xl"
							rows={4}
						/>
					</div>
				</div>
			</div>
			<div className="flex justify-end gap-2 mt-8">
				<Button className="rounded-full w-full max-w-xs" onClick={handleCreate} disabled={saving}>
					{saving ? "Creating..." : "Create Request"}
				</Button>
			</div>
		</div>
	);
}
