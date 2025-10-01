"use client";

import { RefObject, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Search, Plus, Upload } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { DOCUMENT_REQUESTS_API } from "@/lib/api/document-utils";
import type { DocumentFormat, IDocumentRequest } from "@/types/documents.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IEmployee } from "@/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";

interface EmployeeDocumentRequestsTableProps {
	employee: IEmployee;
	className?: string;
	documentRequestsTableRefreshRef?: RefObject<(() => void) | null>;
	context?: "employee_profile" | "general";
}

export default function EmployeeDocumentRequestsTable({
	employee,
	className = "",
	documentRequestsTableRefreshRef,
	context,
}: EmployeeDocumentRequestsTableProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const tableRefreshRef = documentRequestsTableRefreshRef || useRef<(() => void) | null>(null);
	// const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [requestToDelete, setRequestToDelete] = useState<IDocumentRequest | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [openSubmit, setOpenSubmit] = useState(false);
	const [selectedRequest, setSelectedRequest] = useState<IDocumentRequest | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [remarks, setRemarks] = useState("");
	const [uploading, setUploading] = useState(false);
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

	const handleSubmitDocument = async () => {
		if (!file || !selectedRequest || !selectedRequest.employee_requests?.[0]) {
			showErrorToast({ error: null, defaultMessage: "File is required" });
			return;
		}
		const matchingEmployeeRequest = selectedRequest.employee_requests.find(
			(emp_req) => emp_req.employee === employee.id,
		);
		if (!matchingEmployeeRequest) {
			return;
		}
		try {
			setUploading(true);
			await DOCUMENT_REQUESTS_API.uploadDocument({
				requestEmployeeId: matchingEmployeeRequest.id,
				thisEmployee: employee.id,
				data: { file, remarks },
			});
			showSuccessToast("Document submitted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
			setOpenSubmit(false);
			setFile(null);
			setRemarks("");
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to submit document" });
		} finally {
			setUploading(false);
		}
	};

	const openEdit = (request: IDocumentRequest) => {
		router.push(`/employees/document-requests/${request.id}/edit`);
	};

	const openDetails = (request: IDocumentRequest) => {
		router.push(`/employees/document-requests/${request.id}`);
	};

	const openSubmitDialog = (request: IDocumentRequest) => {
		setSelectedRequest(request);
		setOpenSubmit(true);
	};

	const getAcceptForFormat = (format: DocumentFormat): string => {
		switch (format) {
			case "pdf":
				return ".pdf,application/pdf";
			case "word":
				return ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
			case "excel":
				return ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			case "jpg":
			case "jpeg":
				return ".jpg,.jpeg,image/jpeg";
			case "png":
				return ".png,image/png";
			case "any":
				return "*/*";
			default:
				return "*/*";
		}
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
		...(context === "general"
			? [
					{
						key: "requested_to",
						header: "Requested to",
						cell: (request: IDocumentRequest) => (
							<Badge variant={"secondary"}>
								{request.employees.length} employee{request.employees.length > 1 ? `s` : ""}
							</Badge>
						),
					},
				]
			: []),
		{
			key: "status",
			header: "Status",
			cell: (request) => (
				<Badge
					variant={request.employee_requests?.[0]?.status === "pending" ? "secondary" : "default"}
				>
					{request.employee_requests?.[0]?.status || "Unknown"}
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
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_DOCUMENT_REQUESTS}>
							<DropdownMenuItem onClick={() => openDetails(request)}>
								<Eye className="h-4 w-4 mr-2" /> View Details
							</DropdownMenuItem>
						</ProtectedComponent>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_DOCUMENT_REQUESTS}>
							<DropdownMenuItem onClick={() => openEdit(request)}>
								<Edit className="h-4 w-4 mr-2" /> Edit
							</DropdownMenuItem>
						</ProtectedComponent>
						{request.employee_requests?.find((req) => req.employee === employee.id)?.status ===
							"pending" &&
							currentUser &&
							currentUser.id === employee.user?.id && (
								<DropdownMenuItem onClick={() => openSubmitDialog(request)}>
									<Upload className="h-4 w-4 mr-2" /> Submit Document
								</DropdownMenuItem>
							)}
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_DOCUMENT_REQUESTS}>
							<DropdownMenuItem
								onClick={() => {
									setRequestToDelete(request);
									setDeleteConfirmOpen(true);
								}}
								className="text-red-600"
							>
								<Trash2 className="h-4 w-4 mr-2" /> Delete
							</DropdownMenuItem>
						</ProtectedComponent>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className={`${className}`}>
			<div className="flex justify-between items-center">
				<div className="flex items-center w-full justify-end gap-4 mb-4">
					<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_DOCUMENT_REQUESTS}>
						<Button
							size={"sm"}
							onClick={() => router.push("/employees/document-requests/create")}
							className="rounded-full"
						>
							<Plus className="h-4 w-4 mr-2" />
							Create Request
						</Button>
					</ProtectedComponent>
				</div>
			</div>

			<PaginatedTable<IDocumentRequest>
				fetchFirstPage={async () => {
					if (!currentInstitution || !employee) throw new Error("No institution or user selected");
					return await DOCUMENT_REQUESTS_API.getPaginated({
						page: 1,
						ordering,
						employee_id: employee.id,
					});
				}}
				fetchFromUrl={DOCUMENT_REQUESTS_API.getPaginatedFromUrl}
				deps={[ordering]}
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

			{selectedRequest && (
				<Dialog open={openSubmit} onOpenChange={setOpenSubmit}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Submit Document</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<span>Document</span>
								<Label
									htmlFor="document_file"
									className="flex flex-col items-center cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary transition-colors"
								>
									<Upload className="h-10 w-10 text-primary mb-2" />
									<span className="text-sm font-medium text-primary">Click to Upload</span>
									{/* <span className="text-xs text-muted-foreground mt-1">or drag and drop</span> */}
								</Label>
								<Input
									name="document_file"
									id="document_file"
									type="file"
									accept={getAcceptForFormat(selectedRequest.document_format)}
									className="hidden"
									onChange={(e) => setFile(e.target.files?.[0] || null)}
								/>
								{file && (
									<div className="mt-2 text-sm text-gray-700">
										Selected file: <span className="font-medium">{file.name}</span>
									</div>
								)}
							</div>

							<div className="space-y-2">
								<Label>Remarks</Label>
								<Textarea
									placeholder="Additional remarks..."
									value={remarks}
									onChange={(e) => setRemarks(e.target.value)}
									rows={4}
									className="rounded-xl"
								/>
							</div>
							<Button
								className="w-full rounded-full"
								type="button"
								onClick={handleSubmitDocument}
								disabled={uploading || !file}
							>
								{uploading ? "Submitting..." : "Submit"}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
