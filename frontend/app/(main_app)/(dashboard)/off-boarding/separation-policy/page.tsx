"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Search, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ISeparationPolicy } from "@/types/types.utils";
import { SeparationPoliciesAPI } from "@/lib/utils";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";

export default function SeparationPoliciesPage() {
	const [ordering, setOrdering] = useState("");
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		policy: ISeparationPolicy | null;
	}>({
		open: false,
		policy: null,
	});
	const [searchTerm, setSearchTerm] = useState("");
	const refreshTableRef = useRef<(() => void) | null>(null);
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const router = useRouter();

	const handleDeleteSuccess = (deletedId: number) => {
		setDeleteDialog({ open: false, policy: null });
		refreshTableRef.current?.();
	};

	const handleDelete = async (policy: ISeparationPolicy) => {
		try {
			await SeparationPoliciesAPI.delete(policy.id);
			handleDeleteSuccess(policy.id);
		} catch (error) {
			console.error(error);
		}
	};

	const clearFilters = () => {
		setSearchTerm("");
	};

	const hasFilters = searchTerm;

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 -ml-2">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="mb-6">
					<h1 className="text-3xl font-bold">Separation Policies</h1>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg">
				<div className=" border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="flex items-center gap-4 justify-between">
							<div className="relative flex-1 max-w-sm">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
								<Input
									placeholder="Search policies..."
									value={searchTerm}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setSearchTerm(e.target.value)
									}
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
						</div>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_SEPARATION_POLICIES}>
							<Link href="/off-boarding/separation-policy/add">
								<Button>
									<Plus className="h-4 w-4 mr-2" />
									Create Policy
								</Button>
							</Link>
						</ProtectedComponent>
					</div>
				</div>
			</div>

			{/* Table */}
			<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_SEPARATION_POLICIES}>
				<div className="-ml-4">
					<CardHeader />
					<CardContent>
						<PaginatedTableWrapper<ISeparationPolicy>
							fetchFirstPage={async () => {
								if (!selectedInstitution) throw new Error("No institution selected");

								return await SeparationPoliciesAPI.getPaginated({
									institutionId: selectedInstitution.id,
									page: 1,
									search: searchTerm || undefined,
									ordering: ordering || undefined,
								});
							}}
							fetchFromUrl={SeparationPoliciesAPI.getPaginatedFromUrl}
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
												? "No policies found matching your search criteria"
												: "No policies found."}
										</div>
									);
								}

								return (
									<div className="overflow-x-auto mt-10 -ml-2">
										<Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
											<TableHeader className="bg-gray-50/50">
												<TableRow>
													<TableHead>
														Policy Name
														<Button
															size="sm"
															variant={ordering === "policy_name" ? "default" : "outline"}
															onClick={() =>
																setOrdering(ordering === "policy_name" ? "" : "policy_name")
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</TableHead>

													<TableHead>
														Separation Type
														<Button
															size="sm"
															variant={
																ordering === "separation_type__separation_type"
																	? "default"
																	: "outline"
															}
															onClick={() =>
																setOrdering(
																	ordering === "separation_type__separation_type"
																		? ""
																		: "separation_type__separation_type",
																)
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</TableHead>

													<TableHead>
														Notice Period
														<Button
															size="sm"
															variant={ordering === "min_notice_days" ? "default" : "outline"}
															onClick={() =>
																setOrdering(ordering === "min_notice_days" ? "" : "min_notice_days")
															}
														>
															<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
														</Button>
													</TableHead>

													<TableHead>Status</TableHead>
													<TableHead>Enforcement</TableHead>
													<TableHead>Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data.results.map((policy) => (
													<TableRow key={policy.id}>
														<TableCell>{policy.policy_name || "Unknown"}</TableCell>
														<TableCell>
															{policy.separation_type?.separation_type || "Unknown"}
														</TableCell>
														<TableCell>
															{policy.min_notice_days} - {policy.max_notice_days} days
														</TableCell>
														<TableCell>
															<Badge variant={policy.is_active ? "default" : "secondary"}>
																{policy.is_active ? "Active" : "Inactive"}
															</Badge>
														</TableCell>
														<TableCell>
															<Badge variant={policy.enforce_policy ? "destructive" : "outline"}>
																{policy.enforce_policy ? "Enforced" : "Not Enforced"}
															</Badge>
														</TableCell>
														<TableCell>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
																	>
																		<MoreVertical className="h-4 w-4 text-gray-600" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent
																	align="end"
																	className="w-48 bg-white border border-gray-200 shadow-lg"
																>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_VIEW_SEPARATION_POLICIES}
																	>
																		<DropdownMenuItem
																			onClick={() => {
																				router.push(`/off-boarding/separation-policy/${policy.id}`);
																			}}
																			className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
																		>
																			<Eye className="h-4 w-4" /> View Details
																		</DropdownMenuItem>
																	</ProtectedComponent>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_EDIT_SEPARATION_POLICIES}
																	>
																		<DropdownMenuItem
																			onClick={() => {
																				router.push(
																					`/off-boarding/separation-policy/edit/${policy.id}/`,
																				);
																			}}
																			className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
																		>
																			<Edit className="h-4 w-4" /> Edit
																		</DropdownMenuItem>
																	</ProtectedComponent>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_DELETE_SEPARATION_POLICIES}
																	>
																		<DropdownMenuItem
																			onClick={() => setDeleteDialog({ open: true, policy })}
																			className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
																		>
																			<Trash2 className="h-4 w-4" /> Delete
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

			<Dialog
				open={deleteDialog.open}
				onOpenChange={(open) => setDeleteDialog({ open, policy: null })}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Policy</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this separation policy? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialog({ open: false, policy: null })}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => deleteDialog.policy && handleDelete(deleteDialog.policy)}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
