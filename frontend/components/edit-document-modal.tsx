"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Upload, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IKYCDocument } from "@/types";
import { institutionAPI, showErrorToast } from "@/lib/utils";

interface EditDocumentModalProps {
	isOpen: boolean;
	onClose: () => void;
	document: IKYCDocument | null;
	onSuccess: () => void;
}

export function EditDocumentModal({
	isOpen,
	onClose,
	document,
	onSuccess,
}: EditDocumentModalProps) {
	const [formData, setFormData] = useState({
		document_title: "",
		document_file: null as File | null,
	});
	const [fileName, setFileName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Update form data when document changes
	React.useEffect(() => {
		if (document) {
			setFormData({
				document_title: document.document_title,
				document_file: null,
			});
			setFileName("");
		}
	}, [document]);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];

		if (file) {
			if (file.size > 10 * 1024 * 1024) {
				toast.error("File size must be less than 10MB");

				return;
			}
			const allowedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
			const fileExtension = file.name.split(".").pop()?.toLowerCase();

			if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
				toast.error("File type not allowed. Allowed types: PDF, DOC, DOCX, JPG, PNG");

				return;
			}
			setFormData((prev) => ({ ...prev, document_file: file }));
			setFileName(file.name);
		}
	};

	const handleSubmit = async () => {
		if (!document) return;

		if (!formData.document_title.trim()) {
			toast.error("Please provide a document title");

			return;
		}

		setIsLoading(true);
		try {
			await institutionAPI.updateKYCDocument({
				documentId: document.id,
				data: {
					document_title: formData.document_title.trim(),
					document_file: formData.document_file || undefined,
				},
			});

			toast.success("Document updated successfully");
			onSuccess();
			onClose();
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to update document" });
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setFormData({
			document_title: "",
			document_file: null,
		});
		setFileName("");
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center space-x-2">
						<Icon icon="hugeicons:edit-01" className="w-5 h-5" />
						<span>Edit Document</span>
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="document_title" className="text-sm font-medium text-gray-700">
							Document Title
						</Label>
						<Input
							id="document_title"
							value={formData.document_title}
							onChange={(e) => handleInputChange("document_title", e.target.value)}
							placeholder="Enter document title"
							className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400"
						/>
					</div>

					<div className="space-y-2">
						<Label className="text-sm font-medium text-gray-700">
							Replace Document File (Optional)
						</Label>
						<div className="space-y-2">
							<div className="flex items-center space-x-2">
								<label htmlFor="file-upload" className="cursor-pointer">
									<div className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50">
										<Upload className="w-4 h-4 text-gray-500" />
										<span className="text-sm text-gray-600">{fileName || "Choose new file"}</span>
									</div>
								</label>
								<input
									id="file-upload"
									type="file"
									accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
									onChange={handleFileChange}
									className="hidden"
								/>
								{formData.document_file && (
									<div className="flex items-center space-x-1 text-green-600">
										<Check className="w-4 h-4" />
										<span className="text-xs">Selected</span>
									</div>
								)}
							</div>
							<p className="text-xs text-gray-500">
								Leave empty to keep the current file. Supported formats: PDF, DOC, DOCX, JPG, PNG
								(max 10MB)
							</p>
						</div>
					</div>

					<div className="flex items-center justify-end space-x-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isLoading}
							className="rounded-xl border-gray-200 hover:bg-gray-50"
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleSubmit}
							disabled={isLoading}
							className="bg-primary hover:bg-primary text-white rounded-xl px-6"
						>
							{isLoading ? (
								<div className="flex items-center space-x-2">
									<Icon icon="hugeicons:loading-03" className="w-4 h-4 animate-spin" />
									<span>Updating...</span>
								</div>
							) : (
								"Update Document"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
