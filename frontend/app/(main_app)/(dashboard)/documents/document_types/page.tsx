"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, FileText, ArrowLeft } from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { IDocumentType, IDocumentTypeFormData } from "@/types/types.utils";
import {
	createDocumentType,
	getDocumentTypes,
	updateDocumentType,
	deleteDocumentType,
} from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";

export default function DocumentTypesPage() {
	const [documentTypes, setDocumentTypes] = useState<IDocumentType[]>([]);
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingDocumentType, setEditingDocumentType] = useState<IDocumentType | null>(null);
	const [formData, setFormData] = useState<IDocumentTypeFormData>({ name: "", description: "" });
	const [submitting, setSubmitting] = useState(false);
	const { toast } = useToast();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();

	const institutionId = selectedInstitution?.id;

	useEffect(() => {
		fetchDocumentTypes();
	}, []);

	const fetchDocumentTypes = async () => {
		setLoading(true);
		try {
			const types = await getDocumentTypes({ institutionId: Number(institutionId) });

			setDocumentTypes(types);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch document types",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async () => {
		if (!formData.name.trim()) {
			toast({
				title: "Validation Error",
				description: "Document type name is required",
				variant: "destructive",
			});

			return;
		}

		setSubmitting(true);
		try {
			const newDocumentType = await createDocumentType({
				institutionId: Number(institutionId),
				documentTypeData: formData,
			});

			if (newDocumentType) {
				setDocumentTypes((prev) => [...prev, newDocumentType]);
				setIsCreateDialogOpen(false);
				setFormData({ name: "", description: "" });
				toast({
					title: "Success",
					description: "Document type created successfully",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to create document type",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleEdit = async () => {
		if (!editingDocumentType || !formData.name.trim()) {
			toast({
				title: "Validation Error",
				description: "Document type name is required",
				variant: "destructive",
			});

			return;
		}

		setSubmitting(true);
		try {
			const updatedDocumentType = await updateDocumentType({
				institutionId: Number(institutionId),
				documentTypeId: editingDocumentType.id,
				documentTypeData: formData,
			});

			if (updatedDocumentType) {
				setDocumentTypes((prev) =>
					prev.map((type) => (type.id === editingDocumentType.id ? updatedDocumentType : type)),
				);
				setIsEditDialogOpen(false);
				setEditingDocumentType(null);
				setFormData({ name: "", description: "" });
				toast({
					title: "Success",
					description: "Document type updated successfully",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update document type",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (documentType: IDocumentType) => {
		try {
			const success = await deleteDocumentType({
				institutionId: Number(institutionId),
				documentTypeId: documentType.id,
			});

			if (success) {
				setDocumentTypes((prev) => prev.filter((type) => type.id !== documentType.id));
				toast({
					title: "Success",
					description: "Document type deleted successfully",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete document type",
				variant: "destructive",
			});
		}
	};

	const openEditDialog = (documentType: IDocumentType) => {
		setEditingDocumentType(documentType);
		setFormData({
			name: documentType.name,
			description: documentType.description,
		});
		setIsEditDialogOpen(true);
	};

	const resetForm = () => {
		setFormData({ name: "", description: "" });
		setEditingDocumentType(null);
	};

	if (loading) {
		return (
			<div className="container mx-auto py-8">
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
						<p className="text-muted-foreground">Loading document types...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full py-8 bg-white">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 ml-5">
					<Button
						size="sm"
						className="rounded-full aspect-square"
						variant="outline"
						onClick={() => router.push("/admin")}
					>
						<ArrowLeft />
					</Button>
					<div className="mt-5 ml-3">
						<h1 className="text-3xl font-bold">Document Types</h1>
						<p className="text-muted-foreground">Manage document types for your institution</p>
					</div>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_DOCUMENT_TYPES}>
							<Button onClick={resetForm}>
								<Plus className="h-4 w-4 mr-2" />
								Add Document Type
							</Button>
						</ProtectedComponent>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Document Type</DialogTitle>
							<DialogDescription>Add a new document type to your institution</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor="create-name">Name</Label>
								<Input
									id="create-name"
									value={formData.name}
									onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
									placeholder="Enter document type name"
								/>
							</div>
							<div>
								<Label htmlFor="create-description">Description</Label>
								<Textarea
									id="create-description"
									value={formData.description}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, description: e.target.value }))
									}
									placeholder="Enter document type description"
									rows={3}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setIsCreateDialogOpen(false);
									resetForm();
								}}
							>
								Cancel
							</Button>
							<Button onClick={handleCreate} disabled={submitting}>
								{submitting ? "Creating..." : "Create"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_DOCUMENT_TYPES}>
				<Card className="mt-6 border-none">
					<CardHeader className="ml-3">
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Document Types ({documentTypes.length})
						</CardTitle>
						<CardDescription>View and manage all document types in your system</CardDescription>
					</CardHeader>
					<CardContent>
						{documentTypes.length === 0 ? (
							<div className="text-center py-8">
								<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<h3 className="text-lg font-semibold mb-2">No document types found</h3>
								<p className="text-muted-foreground mb-4">
									Get started by creating your first document type
								</p>
								<Button onClick={() => setIsCreateDialogOpen(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Add Document Type
								</Button>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Description</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{documentTypes.map((documentType) => (
										<TableRow key={documentType.id}>
											<TableCell className="font-medium">{documentType.name}</TableCell>
											<TableCell className="max-w-md">
												<p className="truncate">{documentType.description}</p>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-2">
													<ProtectedComponent
														permissionCode={PERMISSION_CODES.CAN_VIEW_DOCUMENT_TYPES}
													>
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																router.push(`/documents/document_types/${documentType.id}`)
															}
														>
															<FileText className="h-4 w-4" />
														</Button>
													</ProtectedComponent>
													<ProtectedComponent
														permissionCode={PERMISSION_CODES.CAN_EDIT_DOCUMENT_TYPES}
													>
														<Button
															variant="outline"
															size="sm"
															onClick={() => openEditDialog(documentType)}
														>
															<Edit className="h-4 w-4" />
														</Button>
													</ProtectedComponent>
													<ProtectedComponent
														permissionCode={PERMISSION_CODES.CAN_DELETE_DOCUMENT_TYPES}
													>
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button variant="outline" size="sm">
																	<Trash2 className="h-4 w-4" />
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>Delete Document Type</AlertDialogTitle>
																	<AlertDialogDescription>
																		Are you sure you want to delete "{documentType.name}"? This
																		action cannot be undone.
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>Cancel</AlertDialogCancel>
																	<AlertDialogAction
																		onClick={() => handleDelete(documentType)}
																		className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																	>
																		Delete
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</ProtectedComponent>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</ProtectedComponent>
			{/* Edit Dialog */}
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_DOCUMENT_TYPES}>
				<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Document Type</DialogTitle>
							<DialogDescription>Update the document type information</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor="edit-name">Name</Label>
								<Input
									id="edit-name"
									value={formData.name}
									onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
									placeholder="Enter document type name"
								/>
							</div>
							<div>
								<Label htmlFor="edit-description">Description</Label>
								<Textarea
									id="edit-description"
									value={formData.description}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, description: e.target.value }))
									}
									placeholder="Enter document type description"
									rows={3}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setIsEditDialogOpen(false);
									resetForm();
								}}
							>
								Cancel
							</Button>
							<Button onClick={handleEdit} disabled={submitting}>
								{submitting ? "Updating..." : "Update"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</ProtectedComponent>
		</div>
	);
}
