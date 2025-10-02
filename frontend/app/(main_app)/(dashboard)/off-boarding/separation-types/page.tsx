"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, MoreVertical, Search } from "lucide-react";
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
import { ISeparationType, IOffboardingStage } from "@/types/types.utils";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";

const SEPARATION_CATEGORIES = [
	{ value: "resignation", label: "Resignation" },
	{ value: "termination", label: "Termination" },
	{ value: "retirement", label: "Retirement" },
	{ value: "contract_end", label: "Contract End" },
	{ value: "other", label: "Other" },
] as const;

const formSchema = z.object({
	separation_type: z.string().min(2, "Type name must be at least 2 characters"),
	description: z.string().min(2, "Description must be at least 2 characters"),
	supported_stages: z.array(z.number()),
	category: z.enum(["resignation", "termination", "retirement", "contract_end", "other"]),
	is_active: z.boolean().optional(),
});

export default function SeparationPolicyTypesPage() {
	const router = useRouter();
	const [stages, setStages] = useState<IOffboardingStage[]>([]);
	const [editingPolicyType, setEditingPolicyType] = useState<ISeparationType | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [policyTypeToDelete, setPolicyTypeToDelete] = useState<ISeparationType | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const refreshTableRef = useRef<(() => void) | null>(null);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [ordering, setOrdering] = useState("");
	const searchParams = useSearchParams();
	const from = searchParams.get("from");

	// console.log("From query param:", from);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			separation_type: "",
			description: "",
			supported_stages: [],
			category: "resignation",
			is_active: true,
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
		toast.success("Policy type created successfully");
		if (from) {
			// Redirect to the page specified in the "from" query param
			router.push(from);
		} else {
			refreshTableRef.current?.();
		}
	};

	const handleUpdateSuccess = (updatedPolicyType: ISeparationType) => {
		setIsEditDialogOpen(false);
		setEditingPolicyType(null);
		toast.success("Policy type updated successfully");
		refreshTableRef.current?.();
	};

	const handleDeleteSuccess = (deletedId: number) => {
		setPolicyTypeToDelete(null);
		toast.success("Policy type deleted successfully");
		refreshTableRef.current?.();
	};

	const handleSubmit = async (values: z.infer<typeof formSchema>) => {
		if (!selectedInstitution) {
			return;
		}
		try {
			if (editingPolicyType) {
				await SeparationPolicyTypesAPI.update({
					policyTypeId: editingPolicyType.id,
					policyTypeData: values,
				});
				handleUpdateSuccess(editingPolicyType);
			} else {
				await SeparationPolicyTypesAPI.create({
					policyTypeData: { ...values },
				});
				handleCreateSuccess({} as ISeparationType); // We don't have the created policy type here, but the refresh will show it
			}
			form.reset();
			setEditingPolicyType(null);
			setIsEditDialogOpen(false);
		} catch (error) {
			toast.error(
				editingPolicyType ? "Failed to update policy type" : "Failed to create policy type",
			);
		}
	};

	const handleDelete = async (policyType: ISeparationType) => {
		try {
			await SeparationPolicyTypesAPI.delete(policyType.id);
			handleDeleteSuccess(policyType.id);
		} catch (error) {
			toast.error("Failed to delete policy type");
		}
	};

	const handleEdit = (policyType: ISeparationType) => {
		setEditingPolicyType(policyType);
		form.reset({
			separation_type: policyType.separation_type,
			description: policyType.description,
			supported_stages: Array.isArray(policyType.supported_stages)
				? policyType.supported_stages.map((stage) => (typeof stage === "number" ? stage : stage.id))
				: [],
			category: policyType.category,
			is_active: policyType.is_active,
		});
		setIsEditDialogOpen(true);
	};

	const clearFilters = () => {
		setSearchTerm("");
	};

	const hasFilters = searchTerm;

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Separation Policy Types</h1>
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
									placeholder="Search policy types..."
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
								<Dialog>
									<DialogTrigger asChild>
										<Button>
											<Plus className="h-4 w-4 mr-2" />
											Add Policy Type
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Add New Policy Type</DialogTitle>
											<DialogDescription>Create a new separation policy type</DialogDescription>
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
																<Input placeholder="Enter policy type name" {...field} />
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
													name="category"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Category</FormLabel>
															<Select onValueChange={field.onChange} defaultValue={field.value}>
																<FormControl>
																	<SelectTrigger>
																		<SelectValue placeholder="Select a category" />
																	</SelectTrigger>
																</FormControl>
																<SelectContent>
																	{SEPARATION_CATEGORIES.map((category) => (
																		<SelectItem key={category.value} value={category.value}>
																			{category.label}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
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
																			{stage.stage_name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															<FormDescription>
																Selected stages: {field.value?.length || 0}
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
												<DialogFooter>
													<Button type="submit">Create Policy Type</Button>
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
						<DialogTitle>Edit Policy Type</DialogTitle>
						<DialogDescription>Update the details of this separation policy type</DialogDescription>
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
											<Input placeholder="Enter policy type name" {...field} />
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
								name="category"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Category</FormLabel>
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a category" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{SEPARATION_CATEGORIES.map((category) => (
													<SelectItem key={category.value} value={category.value}>
														{category.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
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
														{stage.stage_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>Selected stages: {field.value?.length || 0}</FormDescription>
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
												Determine if this policy type is currently active
											</FormDescription>
										</div>
										<FormControl>
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>
							<DialogFooter>
								<Button type="submit">Update Policy Type</Button>
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
								// Store refresh function in ref when component mounts/updates
								useEffect(() => {
									refreshTableRef.current = refresh;
								}, [refresh]);

								if (loading) {
									return <TableSkeleton rows={10} columns={6} />;
								}

								if (!data || data.results.length === 0) {
									return (
										<div className="text-center py-8 text-gray-500">
											{searchTerm
												? "No policy types found matching your search criteria"
												: "No separation policy types found. Create one to get started."}
										</div>
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
															variant={ordering === "separation_type" ? "default" : "outline"}
															onClick={() =>
																setOrdering(ordering === "separation_type" ? "" : "separation_type")
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</TableHead>

													<TableHead>Description</TableHead>

													<TableHead>
														Category
														<Button
															size="sm"
															variant={ordering === "category" ? "default" : "outline"}
															onClick={() => setOrdering(ordering === "category" ? "" : "category")}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</TableHead>

													<TableHead>Status</TableHead>
													<TableHead>Created At</TableHead>
													<TableHead className="text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data.results.map((policyType) => (
													<TableRow key={policyType.id}>
														<TableCell className="font-medium">
															{policyType.separation_type}
														</TableCell>
														<TableCell className="text-muted-foreground">
															{policyType.description}
														</TableCell>
														<TableCell>
															{
																SEPARATION_CATEGORIES.find(
																	(cat) => cat.value === policyType.category,
																)?.label
															}
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
						<DialogTitle>Delete Policy Type</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this separation policy type? This action cannot be
							undone.
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
