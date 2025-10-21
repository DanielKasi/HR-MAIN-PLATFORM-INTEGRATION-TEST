"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, MoreVertical, Search, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { cn, OffboardingStagesAPI, SeparationPolicyTypesAPI } from "@/lib/utils";
import { ISeparationType, IOffboardingStage, ISupportedStage } from "@/types/types.utils";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";

const formSchema = z.object({
	separation_type: z.string().min(2, "Type name must be at least 2 characters"),
	description: z.string().min(2, "Description must be at least 2 characters"),
	supported_stages: z.array(z.number()),
	is_active: z.boolean().optional(),
	requires_handover_report: z.boolean().optional(),
});

export default function SeparationPolicyTypesPage() {
	const router = useRouter();
	const [stages, setStages] = useState<IOffboardingStage[]>([]);
	const [editingPolicyType, setEditingPolicyType] = useState<ISeparationType | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [policyTypeToDelete, setPolicyTypeToDelete] = useState<ISeparationType | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const refreshTableRef = useRef<(() => void) | null>(null);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [ordering, setOrdering] = useState("");
	const searchParams = useSearchParams();
	const from = searchParams.get("from");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			separation_type: "",
			description: "",
			supported_stages: [],
			is_active: true,
			requires_handover_report: false,
		},
	});

	const fetchStages = async () => {
		if (!selectedInstitution?.id) return;
		try {
			const data = await OffboardingStagesAPI.getAll({ institutionId: selectedInstitution.id });
			setStages(data.results);
		} catch (error) {
			toast.error("Failed to fetch offboarding stages");
		}
	};

	useEffect(() => {
		fetchStages();
	}, [selectedInstitution?.id]);

	const handleCreateSuccess = (newPolicyType: ISeparationType) => {
		toast.success("Termination type created successfully");
		setIsCreateDialogOpen(false);
		form.reset();
		if (from) {
			router.push(from);
		} else {
			refreshTableRef.current?.();
		}
	};

	const handleUpdateSuccess = (updatedPolicyType: ISeparationType) => {
		setIsEditDialogOpen(false);
		setEditingPolicyType(null);
		form.reset();
		toast.success("Termination type updated successfully");
		refreshTableRef.current?.();
	};

	const handleDeleteSuccess = (deletedId: number) => {
		setPolicyTypeToDelete(null);
		toast.success("Termination type deleted successfully");
		refreshTableRef.current?.();
	};

	const handleSubmit = async (values: z.infer<typeof formSchema>) => {
		if (!selectedInstitution) {
			toast.error("No institution selected");
			return;
		}
		try {
			if (editingPolicyType) {
				await SeparationPolicyTypesAPI.update({
					policyTypeId: editingPolicyType.id,
					policyTypeData: {
						...values,
						institution: selectedInstitution.id,
					},
				});
				handleUpdateSuccess(editingPolicyType);
			} else {
				// For creation, make sure to include institution
				await SeparationPolicyTypesAPI.create({
					policyTypeData: {
						...values,
						institution: selectedInstitution.id,
					},
				});
				handleCreateSuccess({} as ISeparationType);
			}
		} catch (error) {
			toast.error(
				editingPolicyType
					? "Failed to update termination type"
					: "Failed to create termination type",
			);
		}
	};

	const handleDelete = async (policyType: ISeparationType) => {
		try {
			await SeparationPolicyTypesAPI.delete(policyType.id);
			handleDeleteSuccess(policyType.id);
		} catch (error) {
			toast.error("Failed to delete termination type");
		}
	};

	const handleEdit = (policyType: ISeparationType) => {
		setEditingPolicyType(policyType);

		// Extract stage IDs from the supported_stages array
		const stageIds =
			policyType.supported_stages?.map((supportedStage) =>
				typeof supportedStage.stage === "number" ? supportedStage.stage : supportedStage.stage.id,
			) || [];

		form.reset({
			separation_type: policyType.name, // Use 'name' field from new API
			description: policyType.description,
			supported_stages: stageIds,
			is_active: policyType.is_active,
			requires_handover_report: policyType.requires_handover_report,
		});
		setIsEditDialogOpen(true);
	};

	const removeStage = (stageId: number) => {
		const currentValues = form.getValues("supported_stages") || [];
		form.setValue(
			"supported_stages",
			currentValues.filter((v) => v !== stageId),
		);
	};

	const clearFilters = () => {
		setSearchTerm("");
	};

	const hasFilters = searchTerm;

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Termination Types</h1>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg mb-6">
				<div className="border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex items-center gap-4 justify-between">
							<div className="relative flex-1 max-w-sm">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
								<Input
									placeholder="Search termination types..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{hasFilters && (
								<Button variant="outline" onClick={clearFilters}>
									Clear Filters
								</Button>
							)}
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_SEPARATION_TYPES}>
								<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
									<DialogTrigger asChild>
										<Button>
											<Plus className="h-4 w-4 mr-2" />
											Add Termination Type
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Add New Termination Type</DialogTitle>
											<DialogDescription>Create a new termination type</DialogDescription>
										</DialogHeader>
										<Form {...form}>
											<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
												<FormField
													control={form.control}
													name="separation_type"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Type Name</FormLabel>
															<FormControl>
																<Input placeholder="Enter termination type name" {...field} />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="description"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Description</FormLabel>
															<FormControl>
																<Textarea placeholder="Enter description" {...field} />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="supported_stages"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Supported Stages</FormLabel>
															<Select
																onValueChange={(value: string) => {
																	const currentValues = field.value || [];
																	const numValue = parseInt(value);
																	const index = currentValues.indexOf(numValue);

																	if (index === -1) {
																		field.onChange([...currentValues, numValue]);
																	} else {
																		field.onChange(currentValues.filter((v) => v !== numValue));
																	}
																}}
															>
																<FormControl>
																	<SelectTrigger>
																		<SelectValue placeholder="Select stages" />
																	</SelectTrigger>
																</FormControl>
																<SelectContent>
																	{stages.map((stage) => (
																		<SelectItem key={stage.id} value={stage.id.toString()}>
																			{stage.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															<FormDescription>
																Selected stages: {field.value?.length || 0}
															</FormDescription>
															{field.value && field.value.length > 0 && (
																<div className="flex flex-wrap gap-2 mt-2">
																	{field.value.map((stageId) => {
																		const stage = stages.find((s) => s.id === stageId);
																		return stage ? (
																			<Badge
																				key={stageId}
																				variant="secondary"
																				className="flex items-center gap-1"
																			>
																				{stage.name}
																				<X
																					className="h-3 w-3 cursor-pointer"
																					onClick={() => removeStage(stageId)}
																				/>
																			</Badge>
																		) : null;
																	})}
																</div>
															)}
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="requires_handover_report"
													render={({ field }) => (
														<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
															<div className="space-y-0.5">
																<FormLabel className="text-base">
																	Requires Handover Report
																</FormLabel>
																<FormDescription>
																	Require employees to submit a handover report
																</FormDescription>
															</div>
															<FormControl>
																<Switch checked={field.value} onCheckedChange={field.onChange} />
															</FormControl>
														</FormItem>
													)}
												/>
												<DialogFooter>
													<Button type="submit">Create Termination Type</Button>
												</DialogFooter>
											</form>
										</Form>
									</DialogContent>
								</Dialog>
							</ProtectedComponent>
						</div>
					</div>
				</div>
			</div>

			{/* Edit Dialog */}
			<Dialog
				open={isEditDialogOpen}
				onOpenChange={(open: any) => {
					if (!open) {
						setEditingPolicyType(null);
						setIsEditDialogOpen(false);
						form.reset();
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Termination Type</DialogTitle>
						<DialogDescription>Update the details of this termination type</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="separation_type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Type Name</FormLabel>
										<FormControl>
											<Input placeholder="Enter termination type name" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea placeholder="Enter description" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="supported_stages"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Supported Stages</FormLabel>
										<Select
											onValueChange={(value: string) => {
												const currentValues = field.value || [];
												const numValue = parseInt(value);
												const index = currentValues.indexOf(numValue);

												if (index === -1) {
													field.onChange([...currentValues, numValue]);
												} else {
													field.onChange(currentValues.filter((v) => v !== numValue));
												}
											}}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select stages" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{stages.map((stage) => (
													<SelectItem key={stage.id} value={stage.id.toString()}>
														{stage.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>Selected stages: {field.value?.length || 0}</FormDescription>
										{field.value && field.value.length > 0 && (
											<div className="flex flex-wrap gap-2 mt-2">
												{field.value.map((stageId) => {
													const stage = stages.find((s) => s.id === stageId);
													return stage ? (
														<Badge
															key={stageId}
															variant="secondary"
															className="flex items-center gap-1"
														>
															{stage.name}
															<X
																className="h-3 w-3 cursor-pointer"
																onClick={() => removeStage(stageId)}
															/>
														</Badge>
													) : null;
												})}
											</div>
										)}
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="is_active"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">Active Status</FormLabel>
											<FormDescription>
												Determine if this termination type is currently active
											</FormDescription>
										</div>
										<FormControl>
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="requires_handover_report"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">Requires Handover Report</FormLabel>
											<FormDescription>
												Require employees to submit a handover report
											</FormDescription>
										</div>
										<FormControl>
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>
							<DialogFooter>
								<Button type="submit">Update Termination Type</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			{/* Table */}
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_SEPARATION_TYPES}>
				<div>
					<CardContent className="p-0">
						<PaginatedTableWrapper<ISeparationType>
							fetchFirstPage={async () => {
								if (!selectedInstitution) throw new Error("No institution selected");

								return await SeparationPolicyTypesAPI.getPaginated({
									institutionId: selectedInstitution.id,
									page: 1,
									search: searchTerm || undefined,
									ordering: ordering || undefined,
								});
							}}
							fetchFromUrl={SeparationPolicyTypesAPI.getPaginatedFromUrl}
							deps={[selectedInstitution?.id, searchTerm, ordering]}
							className="space-y-4"
							footerClassName="pt-4"
						>
							{({ data, loading, refresh }) => {
								useEffect(() => {
									refreshTableRef.current = refresh;
								}, [refresh]);

								if (loading) {
									return <TableSkeleton rows={10} columns={5} />;
								}

								if (!data || data.results.length === 0) {
									return (
										<div className="text-center py-8 text-gray-500">No termination types found</div>
									);
								}

								return (
									<div className="overflow-x-auto mt-10">
										<Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
											<TableHeader className="bg-gray-50/50">
												<TableRow>
													<TableHead>
														Type Name
														<Button
															size="sm"
															variant={ordering === "name" ? "default" : "outline"}
															onClick={() => setOrdering(ordering === "name" ? "" : "name")}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</TableHead>
													<TableHead>Description</TableHead>
													<TableHead>Supported Stages</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>Created At</TableHead>
													<TableHead className="text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data.results.map((policyType) => (
													<TableRow key={policyType.id}>
														<TableCell className="font-medium">{policyType.name}</TableCell>
														<TableCell className="text-muted-foreground">
															{policyType.description}
														</TableCell>
														<TableCell>
															<div className="flex flex-wrap gap-1">
																{policyType.supported_stages?.slice(0, 3).map((supportedStage) => (
																	<Badge
																		key={supportedStage.id}
																		variant="outline"
																		className="text-xs"
																	>
																		{typeof supportedStage.stage === "object"
																			? supportedStage.stage.name
																			: "Stage"}
																	</Badge>
																))}
																{policyType.supported_stages?.length > 3 && (
																	<Badge variant="outline" className="text-xs">
																		+{policyType.supported_stages.length - 3} more
																	</Badge>
																)}
															</div>
														</TableCell>
														<TableCell>
															<Badge
																variant={policyType.is_active ? "default" : "secondary"}
																className={cn(
																	"flex w-fit items-center gap-1",
																	policyType.is_active
																		? "bg-green-100 text-green-800 hover:bg-green-200"
																		: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
																)}
															>
																{policyType.is_active ? (
																	<CheckCircle2 className="h-3 w-3" />
																) : (
																	<XCircle className="h-3 w-3" />
																)}
																{policyType.is_active ? "Active" : "Inactive"}
															</Badge>
														</TableCell>
														<TableCell className="text-muted-foreground">
															{new Date(policyType.created_at).toLocaleDateString()}
														</TableCell>
														<TableCell className="text-right">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button variant="ghost" size="sm">
																		<MoreVertical className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_EDIT_SEPARATION_TYPES}
																	>
																		<DropdownMenuItem onClick={() => handleEdit(policyType)}>
																			<Pencil className="h-4 w-4 mr-2" />
																			Edit
																		</DropdownMenuItem>
																	</ProtectedComponent>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_DELETE_SEPARATION_TYPES}
																	>
																		<DropdownMenuItem
																			onClick={() => setPolicyTypeToDelete(policyType)}
																			className="text-destructive focus:text-destructive"
																		>
																			<Trash2 className="h-4 w-4 mr-2" />
																			Delete
																		</DropdownMenuItem>
																	</ProtectedComponent>
																</DropdownMenuContent>
															</DropdownMenu>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								);
							}}
						</PaginatedTableWrapper>
					</CardContent>
				</div>
			</ProtectedComponent>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={!!policyTypeToDelete}
				onOpenChange={(open: any) => !open && setPolicyTypeToDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Termination Type</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this termination type? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setPolicyTypeToDelete(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => policyTypeToDelete && handleDelete(policyTypeToDelete)}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
