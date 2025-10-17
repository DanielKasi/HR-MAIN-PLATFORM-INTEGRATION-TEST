"use client";

import type { IEmployeeType, IEmployeeTypeFormData } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, Search, Plus, Edit, Trash2, Loader2, Eye, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	getEmployeeTypes,
	createEmployeeType,
	updateEmployeeType,
	deleteEmployeeType,
	getPaginatedEmployeeTypesFromUrl,
} from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useRouter } from "next/navigation";

interface EmployeeTypeModalProps {
	isOpen: boolean;
	onClose: () => void;
	editingType: IEmployeeType | null;
	onSave: (data: IEmployeeTypeFormData) => Promise<void>;
	isSubmitting: boolean;
	existingTypes: IEmployeeType[];
}

function EmployeeTypeModal({
	isOpen,
	onClose,
	editingType,
	onSave,
	isSubmitting,
	existingTypes,
}: EmployeeTypeModalProps) {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IEmployeeTypeFormData>({
		name: "",
		description: "",
		code: "",
		institution: selectedInstitution?.id || 0,
	});
	const [errors, setErrors] = useState<Partial<Record<keyof IEmployeeTypeFormData, string>>>({});

	useEffect(() => {
		if (isOpen) {
			if (editingType) {
				setFormData({
					name: editingType.name,
					description: editingType.description || "",
					code: editingType.code || "",
					institution: editingType.institution || selectedInstitution?.id || 0,
				});
			}
			setErrors({});
		}
	}, [isOpen, editingType]);

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof IEmployeeTypeFormData, string>> = {};

		if (!formData.name?.trim()) {
			newErrors.name = "Name is required";
		} else if (formData.name.length > 100) {
			newErrors.name = "Name must be 100 characters or less";
		}

		const duplicateName = existingTypes.find(
			(type) =>
				type.name.toLowerCase() === formData.name?.toLowerCase() && type.id !== editingType?.id,
		);

		if (duplicateName) {
			newErrors.name = "An employee type with this name already exists";
		}

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		try {
			await onSave(formData);
			onClose();
		} catch (error) {}
	};

	const handleInputChange = (field: keyof IEmployeeTypeFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{editingType ? "Edit Employee Type" : "Create Employee Type"}</DialogTitle>
					<DialogDescription>
						{editingType
							? "Update the employee type information below."
							: "Add a new employee type to your organization."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="grid grid-cols-1 gap-4 sm:gap-6">
						<div className="space-y-2">
							<Label htmlFor="name">
								Name <span className="text-red-500">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name || ""}
								onChange={(e) => handleInputChange("name", e.target.value)}
								placeholder="e.g., Full-time, Part-time, Contractor"
								maxLength={100}
								className={errors.name ? "border-red-500" : ""}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description || ""}
							onChange={(e) => handleInputChange("description", e.target.value)}
							placeholder="Describe this employee type..."
							className="min-h-[100px] resize-none"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
							className="w-full sm:w-auto text-sm bg-transparent"
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto text-sm">
							{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{isSubmitting
								? "Saving..."
								: editingType
									? "Update Employee Type"
									: "Create Employee Type"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

interface EmployeeTypeDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	employeeType: IEmployeeType | null;
}

function EmployeeTypeDetailsModal({
	isOpen,
	onClose,
	employeeType,
}: EmployeeTypeDetailsModalProps) {
	if (!employeeType) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">Employee Type Details</DialogTitle>
					<DialogDescription>View the details of this employee type</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Name</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium">{employeeType.name}</span>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Description</Label>
							<div className="p-3 bg-gray-50 rounded-md border min-h-[80px]">
								{employeeType.description ? (
									<span className="text-gray-700">{employeeType.description}</span>
								) : (
									<span className="text-gray-400 italic">No description provided</span>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<Button onClick={onClose}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default function EmployeeTypeManagement() {
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const [searchTerm, setSearchTerm] = useState("");
	const [employeeTypeToDelete, setEmployeeTypeToDelete] = useState<IEmployeeType | null>(null);
	const [isDeleting, setIsDeleting] = useState<boolean>(false);

	const [showFormModal, setShowFormModal] = useState(false);
	const [editingType, setEditingType] = useState<IEmployeeType | null>(null);
	const [viewingType, setViewingType] = useState<IEmployeeType | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [ordering, setOrdering] = useState("");
	const router = useRouter();
	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
	};

	const handleCreate = () => {
		setEditingType(null);
		setShowFormModal(true);
	};

	const handleEdit = (type: IEmployeeType) => {
		setEditingType(type);
		setShowFormModal(true);
	};

	const handleCloseFormModal = () => {
		setShowFormModal(false);
		setEditingType(null);
	};

	if (!selectedInstitution) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-600">Please select an institution to manage employee types.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-full p-4 sm:p-6 lg:p-8 bg-white rounded-lg min-h-screen">
			<div className="w-full bg-white">
				<CardHeader className="space-y-4 p-0 mb-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<CardTitle className="w-full">
							<h1 className="text-xl sm:text-2xl font-bold">Employee Types</h1>
						</CardTitle>
						<Button onClick={handleCreate} className="w-full sm:w-auto">
							<Plus className="h-4 w-4 mr-0 sm:mr-2" />
							<span className="hidden sm:inline">Add Employee Type</span>
							<span className="sm:hidden">Add New</span>
						</Button>
					</div>
					<div className="relative w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search employee types..."
							value={searchTerm}
							onChange={(e) => handleSearchChange(e.target.value)}
							className="pl-10 text-sm w-full"
						/>
					</div>
				</CardHeader>

				<PaginatedTableWrapper<IEmployeeType>
					fetchFirstPage={async () => {
						return await getEmployeeTypes({
							institutionId: selectedInstitution.id,
							page: 1,
							search: searchTerm || undefined,
							ordering,
						});
					}}
					fetchFromUrl={async ({ url }) => await getPaginatedEmployeeTypesFromUrl({ url })}
					deps={[selectedInstitution.id, searchTerm, ordering]}
				>
					{({ data, loading, refresh }) => {
						const list = data?.results || [];

						const handleSave = async (formData: IEmployeeTypeFormData) => {
							setIsSubmitting(true);
							try {
								if (editingType) {
									await updateEmployeeType({
										institutionId: selectedInstitution.id,
										employeeTypeId: editingType.id,
										employeeTypeData: formData,
									});
									toast.success("Employee type updated successfully!");
								} else {
									await createEmployeeType({
										institutionId: selectedInstitution.id,
										employeeTypeData: formData,
									});
									toast.success("Employee type created successfully!");
								}
								await refresh();
							} catch (error) {
								toast.error(`Failed to ${editingType ? "update" : "create"} employee type`);
								throw error;
							} finally {
								setIsSubmitting(false);
							}
						};

						const handleDelete = async (employeeType: IEmployeeType) => {
							try {
								setIsDeleting(true);
								await deleteEmployeeType({
									institutionId: selectedInstitution.id,
									employeeTypeId: employeeType.id,
								});
								await refresh();
								toast.success("Employee type deleted successfully!");
							} catch (error) {
								toast.error("Failed to delete employee type");
							} finally {
								setIsDeleting(false);
								setEmployeeTypeToDelete(null);
							}
						};

						if (loading) {
							return <TableSkeleton rows={8} columns={3} />;
						}

						return (
							<div className="overflow-x-auto">
								<div className="min-w-[600px] lg:min-w-0">
									<Table className="w-full [&_th]:border-0 [&_td]:border-0 mt-6">
										<TableHeader className="bg-gray-50/50">
											<TableRow>
												<TableHead className="font-semibold text-gray-900 py-3 px-3 sm:px-4 text-xs sm:text-sm">
													<div className="flex items-center gap-2">
														<span>Name</span>
														<Button
															onClick={() => setOrdering(ordering === "name" ? "" : "name")}
															size="sm"
															variant={ordering === "name" ? "default" : "outline"}
															type="button"
															className="h-6 w-6 p-0 hidden xs:inline-flex"
														>
															<Icon icon="hugeicons:sorting-02" className="!h-3 !w-3" />
														</Button>
													</div>
												</TableHead>
												<TableHead className="font-semibold text-gray-900 py-3 px-3 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">
													Description
												</TableHead>
												<TableHead className="font-semibold text-gray-900 py-3 px-3 sm:px-4 w-[80px] sm:w-[100px] text-center text-xs sm:text-sm">
													Actions
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{list.length === 0 ? (
												<TableRow>
													<TableCell
														colSpan={3}
														className="text-center py-8 sm:py-12 text-gray-500 bg-white"
													>
														<div className="flex flex-col items-center gap-2">
															<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
																<Search className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
															</div>
															<span className="text-sm sm:text-base text-center px-4">
																{searchTerm
																	? "No employee types found matching your search."
																	: "No employee types found."}
															</span>
															{!searchTerm && (
																<Button
																	onClick={handleCreate}
																	variant="outline"
																	size="sm"
																	className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent text-xs sm:text-sm"
																>
																	<Plus className="h-4 w-4 mr-2" />
																	Add your first employee type
																</Button>
															)}
														</div>
													</TableCell>
												</TableRow>
											) : (
												list.map((type) => (
													<TableRow
														key={type.id}
														className="bg-white hover:bg-gray-50 transition-colors duration-150"
													>
														<TableCell className="py-3 px-3 sm:px-4">
															<div className="font-medium text-gray-900 text-sm sm:text-base">
																{type.name}
															</div>
															<div className="text-gray-600 text-xs mt-1 sm:hidden">
																{type.description ? (
																	<span className="line-clamp-2">{type.description}</span>
																) : (
																	<span className="text-gray-400 italic">
																		No description provided
																	</span>
																)}
															</div>
														</TableCell>
														<TableCell className="py-3 px-3 sm:px-4 max-w-xs sm:max-w-md hidden sm:table-cell">
															<div className="text-gray-700 leading-relaxed text-xs sm:text-sm">
																{type.description ? (
																	<span className="line-clamp-2">{type.description}</span>
																) : (
																	<span className="text-gray-400 italic">
																		No description provided
																	</span>
																)}
															</div>
														</TableCell>
														<TableCell className="py-3 px-3 sm:px-4 text-center">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 rounded-full mx-auto"
																		disabled={employeeTypeToDelete?.id === type.id}
																	>
																		{employeeTypeToDelete?.id === type.id ? (
																			<Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-gray-600" />
																		) : (
																			<MoreVertical className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
																		)}
																		<span className="sr-only">Actions</span>
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent
																	align="end"
																	className="w-40 sm:w-48 bg-white border border-gray-200 shadow-lg"
																>
																	<DropdownMenuItem
																		onClick={() =>
																			router.push(`/employees/employee-types/${type.id}`)
																		}
																		className="flex items-center px-2 sm:px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm"
																	>
																		<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500" />
																		View details
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => handleEdit(type)}
																		className="flex items-center px-2 sm:px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm"
																	>
																		<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500" />
																		Edit
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => setEmployeeTypeToDelete(type)}
																		className="flex items-center px-2 sm:px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer text-xs sm:text-sm"
																	>
																		<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-red-500" />
																		Delete
																	</DropdownMenuItem>
																</DropdownMenuContent>
															</DropdownMenu>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</div>

								<EmployeeTypeModal
									isOpen={showFormModal}
									onClose={handleCloseFormModal}
									editingType={editingType}
									onSave={handleSave}
									isSubmitting={isSubmitting}
									existingTypes={list}
								/>

								{employeeTypeToDelete && (
									<ConfirmationDialog
										description="Are you sure you want to delete this employee type? This action cannot be undone."
										disabled={isDeleting}
										isOpen={!!employeeTypeToDelete}
										title={`Delete ${employeeTypeToDelete.name}`}
										onConfirm={() => handleDelete(employeeTypeToDelete)}
										onClose={() => {
											setEmployeeTypeToDelete(null);
											setIsDeleting(false);
										}}
									/>
								)}
							</div>
						);
					}}
				</PaginatedTableWrapper>
			</div>
		</div>
	);
}
