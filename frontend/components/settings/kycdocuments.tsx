"use client";

import { useState } from "react";
import { Upload, FileText, X, Check } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentsList } from "@/components/documents-list";
import { institutionAPI, showErrorToast } from "@/lib/utils";

interface DocumentFile {
	id: string;
	title: string;
	file: File | null;
	fileName: string;
}

interface KYCDocumentsProps {
	documentsRefreshTrigger: number;
	onDocumentChange: () => void;
}

export const KYCDocuments = ({ documentsRefreshTrigger, onDocumentChange }: KYCDocumentsProps) => {
	const [documents, setDocuments] = useState<DocumentFile[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	// Document management functions
	const addDocument = () => {
		const newDoc: DocumentFile = {
			id: Date.now().toString(),
			title: "",
			file: null,
			fileName: "",
		};

		setDocuments((prev) => [...prev, newDoc]);
	};

	const updateDocument = (id: string, field: keyof DocumentFile, value: any) => {
		setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc)));
	};

	const removeDocument = (id: string) => {
		setDocuments((prev) => prev.filter((doc) => doc.id !== id));
	};

	const handleFileChange = (id: string, file: File | null) => {
		if (file) {
			// Validate file size (10MB limit)
			if (file.size > 10 * 1024 * 1024) {
				toast.error("File size must be less than 10MB");

				return;
			}

			// Validate file type
			const allowedTypes = [
				"application/pdf",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"image/jpeg",
				"image/jpg",
				"image/png",
			];

			if (!allowedTypes.includes(file.type)) {
				toast.error("Only PDF, DOC, DOCX, JPG, and PNG files are allowed");

				return;
			}

			updateDocument(id, "file", file);
			updateDocument(id, "fileName", file.name);
		}
	};

	const handleSubmit = async () => {
		setIsLoading(true);
		try {
			const validDocuments = documents.filter((doc) => doc.file && doc.title.trim());

			if (validDocuments.length > 0) {
				// Handle KYC document upload
				const kycDocuments = validDocuments.map((doc) => ({
					document_title: doc.title.trim(),
					document_file: doc.file!,
				}));

				await institutionAPI.createKYCDocuments(kycDocuments);

				setDocuments([]); // Clear documents after successful submission
				setIsEditing(false); // Close document editing mode
				onDocumentChange(); // Trigger documents list refresh
				toast.success("KYC documents uploaded successfully");
			}
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to upload KYC documents" });
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = () => {
		// Check if we're uploading KYC documents
		const validDocuments = documents.filter((doc) => doc.file && doc.title.trim());
		const invalidDocuments = documents.filter((doc) => doc.file && !doc.title.trim());

		if (validDocuments.length > 0) {
			// Validate KYC documents
			if (invalidDocuments.length > 0) {
				toast.error("Please provide titles for all uploaded documents");

				return;
			}

			handleSubmit();
		}
	};

	const toggleEdit = () => {
		setIsEditing(!isEditing);
		if (isEditing) {
			setDocuments([]); // Clear documents when canceling
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 space-y-2 sm:space-y-0">
				<h2 className="text-xl sm:text-2xl font-bold text-gray-900">KYC Documents</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={toggleEdit}
					className="rounded-lg border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
				>
					{isEditing ? "Cancel" : "Manage Documents"}
				</Button>
			</div>

			<div>
				<p className="text-sm text-gray-600 mb-4">Submit and review your KYC files</p>
				<DocumentsList
					refreshTrigger={documentsRefreshTrigger}
					onDocumentChange={onDocumentChange}
				/>
			</div>

			{isEditing && (
				<div className="space-y-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
						<h4 className="text-sm font-medium text-gray-700">Upload Documents</h4>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addDocument}
							className="rounded-lg border-gray-200 hover:bg-gray-50 flex items-center justify-center space-x-2 bg-transparent w-full sm:w-auto"
						>
							<Upload className="w-4 h-4" />
							<span>Add Document</span>
						</Button>
					</div>

					{documents.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
							<p className="text-sm">No documents added yet</p>
							<p className="text-xs">Click "Add Document" to upload KYC documents</p>
						</div>
					) : (
						<div className="space-y-3 max-w-full overflow-hidden">
							{documents.map((doc) => (
								<div
									key={doc.id}
									className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-3 p-3 bg-white rounded-lg border border-gray-200"
								>
									<div className="flex-1 space-y-2 min-w-0">
										<Input
											placeholder="Document title (e.g., Business License, Tax Certificate)"
											value={doc.title}
											onChange={(e) => updateDocument(doc.id, "title", e.target.value)}
											className="rounded-lg border-gray-200 focus:border-orange-400 focus:ring-orange-400 w-full"
										/>
										<div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
											<label htmlFor={`file-${doc.id}`} className="cursor-pointer flex-1">
												<div className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 w-full">
													<Upload className="w-4 h-4 text-gray-500 flex-shrink-0" />
													<span className="text-sm text-gray-600 truncate">
														{doc.fileName || "Choose file"}
													</span>
												</div>
											</label>
											<input
												id={`file-${doc.id}`}
												type="file"
												accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
												onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
												className="hidden"
											/>
											{doc.file && (
												<div className="flex items-center space-x-1 text-green-600 flex-shrink-0">
													<Check className="w-4 h-4" />
													<span className="text-xs">Selected</span>
												</div>
											)}
										</div>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => removeDocument(doc.id)}
										className="rounded-lg border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 w-full sm:w-auto flex-shrink-0"
									>
										<X className="w-4 h-4" />
									</Button>
								</div>
							))}
						</div>
					)}

					{documents.length > 0 && (
						<div className="pt-4 border-t border-gray-200">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
								<div className="text-xs text-gray-500 space-y-1">
									<p>• Supported formats: PDF, DOC, DOCX, JPG, PNG</p>
									<p>• Maximum file size: 10MB per document</p>
								</div>
								<Button
									type="button"
									onClick={handleSave}
									disabled={isLoading}
									className="bg-primary hover:bg-primary text-white rounded-lg px-6"
								>
									{isLoading ? (
										<div className="flex items-center space-x-2">
											<Icon icon="hugeicons:loading-03" className="w-4 h-4 animate-spin" />
											<span>Uploading...</span>
										</div>
									) : (
										"Upload Documents"
									)}
								</Button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
