"use client";

import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Search, Plus } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { DOCUMENT_REQUESTS_API } from "@/lib/api/document-utils";
import { IDocumentRequest } from "@/types/documents.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function DocumentRequestListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [requestToDelete, setRequestToDelete] = useState<IDocumentRequest | null>(null);
	const [deleting, setDeleting] = useState(false);
	const router = useRouter();

	const handleDelete = async () => {
		if (!requestToDelete) return;
		try {
			setDeleting(true);
			await DOCUMENT_REQUESTS_API.delete({ requestId: requestToDelete.id });
			showSuccessToast("Document request deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete document request" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setRequestToDelete(null);
		}
	};

	const openEdit = (request: IDocumentRequest) => {
		router.push(`/employees/document-requests/${request.id}/edit`);
	};

	const openDetails = (request: IDocumentRequest) => {
		router.push(`/employees/document-requests/${request.id}`);
	};

	const columns: ColumnDef<IDocumentRequest>[] = [
		{
			key: "document_type",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Document Type</span>
					<Button
						onClick={() =>
							setOrdering((prev) => (prev === "document_type" ? "-document_type" : "document_type"))
						}
						size="sm"
						variant={ordering.includes("document_type") ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (request) => <span className="capitalize">{request.document_type}</span>,
		},
		{
			key: "description",
			header: "Description",
			cell: (request) =>
				request.description?.substring(0, 50) +
					(request.description && request.description.length > 50 ? "..." : "") || "Unknown",
		},
		{
			key: "document_format",
			header: "Document Format",
			cell: (request) => <span className="capitalize">{request.document_format}</span>,
		},
		{
			key: "due_date",
			header: "Due Date",
			cell: (request) => request.due_date || "Unknown",
		},
		{
			key: "requested_to",
			header: "Requested to",
			cell: (request) => (
				<Badge variant={"secondary"}>
					{request.employees.length} employee{request.employees.length > 1 ? `s` : ""}
				</Badge>
			),
		},

		{
			key: "actions",
			header: "Actions",
			cell: (request) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(request)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEdit(request)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setRequestToDelete(request);
								setDeleteConfirmOpen(true);
							}}
							className="text-red-600"
						>
							<Trash2 className="h-4 w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Document Requests</h1>
				<div className="flex items-center justify-end gap-4">
					<Button
						onClick={() => router.push("/employees/document-requests/create")}
						className="rounded-xl"
					>
						<Plus className="h-4 w-4 mr-2" />
						Create Request
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search requests..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<IDocumentRequest>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await DOCUMENT_REQUESTS_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
					});
				}}
				fetchFromUrl={DOCUMENT_REQUESTS_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch document requests" })
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No document requests found</p>
					</div>
				}
			/>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Document Request"
				description="Are you sure you want to delete this document request? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
