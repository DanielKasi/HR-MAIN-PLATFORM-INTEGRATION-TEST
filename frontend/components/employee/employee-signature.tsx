"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ColumnDef, PaginatedTable } from "../PaginatedTable";
import { SIGNATURES_API } from "@/lib/api/document-utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ISignature, ISignatureFormData } from "@/types/documents.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignaturePad from "@/app/(main_app)/(dashboard)/documents/signatures/_components/signature-pad";
import { Trash2, Edit, FileSignature, Plus, MoreHorizontal } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { IEmployee } from "@/types/types.utils";
import { useSelector } from "react-redux";
import { selectUser } from "@/store/auth/selectors";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmployeeSignaturesProps {
	employee: IEmployee;
}

export default function EmployeeSignatures({ employee }: EmployeeSignaturesProps) {
	const [signatures, setSignatures] = useState<ISignature[]>([]);
	const [totalSignatures, setTotalSignatures] = useState(0);
	const [loading, setLoading] = useState(false);
	const [showSignaturePad, setShowSignaturePad] = useState(false);
	const [editingSignature, setEditingSignature] = useState<ISignature | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [signatureToDelete, setSignatureToDelete] = useState<number | null>(null);
	const currentUser = useSelector(selectUser);

	const fetchSignatures = useCallback(async (page: number = 1) => {
		if (!currentUser) {
			throw new Error("No user found");
		}
		const response = await SIGNATURES_API.getPaginated({ page });
		return response;
	}, []);

	const handleCreateSignature = async (signatureDataString: string) => {
		if (!currentUser) {
			showErrorToast({ error: null, defaultMessage: "No user found" });
			return;
		}
		try {
			const data: ISignatureFormData = {
				user: currentUser.id,
				signature: signatureDataString,
			};
			await SIGNATURES_API.create({ data });
			showSuccessToast("Signature created successfully!");
			fetchSignatures();
			setShowSignaturePad(false);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to create signature" });
		}
	};

	const handleUpdateSignature = async (signatureDataString: string) => {
		if (!editingSignature || !currentUser) {
			showErrorToast({ error: null, defaultMessage: "No signature or user selected" });
			return;
		}
		try {
			const data: Partial<ISignatureFormData> = {
				user: currentUser.id,
				signature: signatureDataString,
			};
			await SIGNATURES_API.update({ id: editingSignature.id, data });
			showSuccessToast("Signature updated successfully!");
			fetchSignatures();
			setShowSignaturePad(false);
			setEditingSignature(null);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to update signature" });
		}
	};

	const handleDeleteSignature = async () => {
		if (!signatureToDelete) return;
		try {
			await SIGNATURES_API.delete({ id: signatureToDelete });
			showSuccessToast("Signature deleted successfully!");
			fetchSignatures();
			setDeleteConfirmOpen(false);
			setSignatureToDelete(null);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to delete signature" });
		}
	};

	const columns: ColumnDef<ISignature>[] = [
		{
			key: "signature",
			header: "Signature",
			cell: (item) => (
				<div className="flex items-center justify-start">
					<img src={item.signature_image_url} alt="Signature" className="max-w-[200px] h-auto" />
				</div>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (item) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem
							className=""
							onClick={() => {
								setEditingSignature(item);
								setShowSignaturePad(true);
							}}
						>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-destructive hover::bg-destructive/10"
							onClick={() => {
								setSignatureToDelete(item.id);
								setDeleteConfirmOpen(true);
							}}
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
		<div className="border-none shadow-none">
			<div className="flex flex-row items-center justify-between">
				<h1>Signatures</h1>
				{currentUser && employee.user?.id === currentUser.id && (
					<Button
						onClick={() => {
							setEditingSignature(null);
							setShowSignaturePad(true);
						}}
						size={"sm"}
						className="rounded-full"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Signature
					</Button>
				)}
			</div>
			<div>
				<PaginatedTable<ISignature>
					paginated={false}
					fetchFirstPage={async () => {
						if (!currentUser) throw new Error("No user found");
						return await SIGNATURES_API.getPaginated({ user_id: employee.user?.id });
					}}
					columns={columns}
					emptyState={
						<div className="text-center py-8">
							<FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p className="text-muted-foreground">No signatures found</p>
						</div>
					}
				/>
				<Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
					<DialogContent className="sm:max-w-[500px] rounded-2xl">
						<DialogHeader>
							<DialogTitle>{editingSignature ? "Edit Signature" : "Create Signature"}</DialogTitle>
						</DialogHeader>
						<SignaturePad
							isOpen={showSignaturePad}
							onOpenChange={setShowSignaturePad}
							onSave={editingSignature ? handleUpdateSignature : handleCreateSignature}
						/>
					</DialogContent>
				</Dialog>
				<ConfirmationDialog
					isOpen={deleteConfirmOpen}
					onClose={() => {
						setDeleteConfirmOpen(false);
						setSignatureToDelete(null);
					}}
					onConfirm={handleDeleteSignature}
					title="Delete Signature"
					description="Are you sure you want to delete this signature? This action cannot be undone."
					confirmText="Delete"
					cancelText="Cancel"
				/>
			</div>
		</div>
	);
}
