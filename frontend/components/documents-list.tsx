"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { formatDistanceToNow } from "date-fns";
import { FileText, Download, Eye, Edit, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { institutionAPI, showErrorToast } from "@/lib/utils";
import { IKYCDocument } from "@/types/other";
import { EditDocumentModal } from "@/components/edit-document-modal";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface DocumentsListProps {
	className?: string;
	refreshTrigger?: number; // Add a trigger to refresh the list
	onDocumentChange?: () => void; // Callback for when documents are modified
}

export function DocumentsList({ className, refreshTrigger, onDocumentChange }: DocumentsListProps) {
	const [editModal, setEditModal] = useState<{
		isOpen: boolean;
		document: IKYCDocument | null;
	}>({
		isOpen: false,
		document: null,
	});

	const [deleteDialog, setDeleteDialog] = useState<{
		isOpen: boolean;
		document: IKYCDocument | null;
	}>({
		isOpen: false,
		document: null,
	});

	// Helper function to build full document URL
	const buildDocumentUrl = (documentFile: string): string => {
		let baseURL = process.env.NEXT_PUBLIC_API_URL;

		// Remove 'api' from the URL if it exists
		if (baseURL && baseURL.endsWith("/api")) {
			baseURL = baseURL.replace("/api", "");
		}

		return documentFile.startsWith("http") ? documentFile : `${baseURL}${documentFile}`;
	};

	const handleEditDocument = (document: IKYCDocument) => {
		setEditModal({ isOpen: true, document });
	};

	const handleDeleteDocument = (document: IKYCDocument) => {
		setDeleteDialog({ isOpen: true, document });
	};

	const handleDeleteConfirm = async () => {
		if (!deleteDialog.document) return;

		try {
			await institutionAPI.deleteKYCDocument({ documentId: deleteDialog.document.id });
			setDeleteDialog({ isOpen: false, document: null });
			onDocumentChange?.(); // Trigger refresh
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to delete document" });
		}
	};

	const handleEditSuccess = () => {
		setEditModal({ isOpen: false, document: null });
		onDocumentChange?.(); // Trigger refresh
	};

	return (
		<Card className={`rounded-2xl border-0 shadow-sm ${className}`}>
			<CardContent className="p-4 sm:p-6 lg:p-8">
				{/* <div className="border-b border-gray-200 mb-8">
          <div className="flex items-center space-x-2 pb-4">
            <Icon icon="hugeicons:file-02" className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">KYC Documents</h2>
          </div>
        </div> */}

				<PaginatedTableWrapper
					fetchFirstPage={institutionAPI.getKYCDocuments}
					fetchFromUrl={institutionAPI.getKYCDocumentsFromUrl}
					className="space-y-3 sm:space-y-4"
					deps={[refreshTrigger]} // Add refreshTrigger as a dependency
				>
					{({ data, loading, refresh }) => (
						<div className="space-y-3 sm:space-y-4">
							{loading ? (
								<div className="flex items-center justify-center py-8 sm:py-12">
									<div className="flex items-center space-x-2">
										<Icon
											icon="hugeicons:loading-03"
											className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-gray-500"
										/>
										<span className="text-gray-500 text-sm sm:text-base">Loading documents...</span>
									</div>
								</div>
							) : data?.results && data.results.length > 0 ? (
								<div className="space-y-3">
									{data.results.map((document: IKYCDocument) => (
										<div
											key={document.id}
											className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors space-y-3 sm:space-y-0"
										>
											<div className="flex items-center space-x-3 sm:space-x-4">
												<div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
													<FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
												</div>
												<div className="min-w-0 flex-1">
													<h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
														{document.document_title}
													</h3>
													<p className="text-xs sm:text-sm text-gray-500">
														Uploaded{" "}
														{formatDistanceToNow(new Date(document.created_at), {
															addSuffix: true,
														})}
													</p>
												</div>
											</div>
											<div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
												<Badge variant="secondary" className="rounded-lg text-xs w-fit">
													KYC Document
												</Badge>
												<div className="flex items-center space-x-1 sm:space-x-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															window.open(buildDocumentUrl(document.document_file), "_blank")
														}
														className="rounded-xl border-gray-200 hover:bg-gray-50 h-8 w-8 sm:h-9 sm:w-9 p-0"
														title="View document"
													>
														<Eye className="w-3 h-3 sm:w-4 sm:h-4" />
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															const link = window.document.createElement("a");

															link.href = buildDocumentUrl(document.document_file);
															link.download = document.document_title;
															link.click();
														}}
														className="rounded-xl border-gray-200 hover:bg-gray-50 h-8 w-8 sm:h-9 sm:w-9 p-0"
														title="Download document"
													>
														<Download className="w-3 h-3 sm:w-4 sm:h-4" />
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleEditDocument(document)}
														className="rounded-xl border-gray-200 hover:bg-gray-50 h-8 w-8 sm:h-9 sm:w-9 p-0"
														title="Edit document"
													>
														<Edit className="w-3 h-3 sm:w-4 sm:h-4" />
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleDeleteDocument(document)}
														className="rounded-xl border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 h-8 w-8 sm:h-9 sm:w-9 p-0"
														title="Delete document"
													>
														<Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
													</Button>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-8 sm:py-12">
									<div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
										<FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
									</div>
									<h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
										No documents found
									</h3>
									<p className="text-sm text-gray-500 mb-4 px-4 sm:px-0">
										You haven't uploaded any KYC documents yet. Use the "Manage Documents" button
										above to upload your first document.
									</p>
									<Button
										variant="outline"
										onClick={refresh}
										className="rounded-xl border-gray-200 hover:bg-gray-50 text-sm"
									>
										<Icon icon="hugeicons:refresh-01" className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
										Refresh
									</Button>
								</div>
							)}
						</div>
					)}
				</PaginatedTableWrapper>

				{/* Edit Document Modal */}
				<EditDocumentModal
					isOpen={editModal.isOpen}
					onClose={() => setEditModal({ isOpen: false, document: null })}
					document={editModal.document}
					onSuccess={handleEditSuccess}
				/>

				{/* Delete Confirmation Dialog */}
				<ConfirmationDialog
					isOpen={deleteDialog.isOpen}
					onClose={() => setDeleteDialog({ isOpen: false, document: null })}
					onConfirm={handleDeleteConfirm}
					title="Delete Document"
					description={`Are you sure you want to delete "${deleteDialog.document?.document_title}"? This action cannot be undone.`}
					confirmText="Delete"
					cancelText="Cancel"
				/>
			</CardContent>
		</Card>
	);
}
