"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef, PaginatedTable } from "../PaginatedTable";
import { SIGNATURES_API } from "@/lib/api/document-utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ISignature, ISignatureFormData } from "@/types/documents.types";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import SignaturePad from "@/app/(main_app)/(dashboard)/documents/signatures/_components/signature-pad";
import { Trash2, Edit, FileSignature, Plus } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { IEmployee } from "@/types/types.utils";
import { useSelector } from "react-redux";
import { selectUser } from "@/store/auth/selectors";
import { th } from "date-fns/locale";

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

	const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
		try {
			const response = await SIGNATURES_API.getPaginatedFromUrl({ url });
			setSignatures(response.results);
			setTotalSignatures(response.count);
			return response;
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to fetch signatures" });
			return undefined;
		}
	}, []);

	const handleCreateSignature = async (signatureDataUrl: string) => {
		if (!currentUser) {
			showErrorToast({ error: null, defaultMessage: "No user found" });
			return;
		}
		try {
			const blob = await fetch(signatureDataUrl).then((res) => res.blob());
			const data: ISignatureFormData = {
				user: currentUser.id,
				signature: blob,
			};
			await SIGNATURES_API.create({ data });
			showSuccessToast("Signature created successfully!");
			fetchSignatures();
			setShowSignaturePad(false);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to create signature" });
		}
	};

	const handleUpdateSignature = async (signatureDataUrl: string) => {
		if (!editingSignature || !currentUser) {
			showErrorToast({ error: null, defaultMessage: "No signature or user selected" });
			return;
		}
		try {
			const blob = await fetch(signatureDataUrl).then((res) => res.blob());
			const data: Partial<ISignatureFormData> = {
				user: currentUser.id,
				signature: blob,
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
				<img src={item.signature_image_url} alt="Signature" className="max-w-[200px] h-auto" />
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (item) => (
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setEditingSignature(item);
							setShowSignaturePad(true);
						}}
						className="rounded-xl"
					>
						<Edit className="h-4 w-4 mr-2" />
						Edit
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => {
							setSignatureToDelete(item.id);
							setDeleteConfirmOpen(true);
						}}
						className="rounded-xl"
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete
					</Button>
				</div>
			),
		},
	];

	useEffect(() => {
		fetchSignatures();
	}, [fetchSignatures]);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Signatures</CardTitle>
				<Button
					onClick={() => {
						setEditingSignature(null);
						setShowSignaturePad(true);
					}}
					className="rounded-xl"
				>
					<Plus className="h-4 w-4 mr-2" />
					Add Signature
				</Button>
			</CardHeader>
			<CardContent>
				<PaginatedTable<ISignature>
					fetchFirstPage={async () => {
						if (!currentUser) throw new Error("No user found");

						return await SIGNATURES_API.getPaginated({});
					}}
					fetchFromUrl={SIGNATURES_API.getPaginatedFromUrl}
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
							onSave={editingSignature ? handleUpdateSignature : handleCreateSignature}
						/>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setShowSignaturePad(false);
									setEditingSignature(null);
								}}
								className="rounded-xl"
							>
								Cancel
							</Button>
						</DialogFooter>
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
			</CardContent>
		</Card>
	);
}
