"use client";
import type { Role } from "@/types/user.types";

import { Search, Plus, Eye, Trash2, ArrowLeft, Edit, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { Button } from "@/platform/v1/components";
import { Card, CardContent, CardDescription, CardHeader } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/platform/v1/components";
import { capitalizeEachWord, getDefaultInstitutionId } from "@/lib/helpers";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/platform/v1/components";
import apiRequest, { apiDelete } from "@/lib/apiRequest";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PageSizeSelector } from "@/components/ui/page-size-selector";
import ProtectedPage from "@/components/ProtectedPage";
import { PERMISSION_CODES } from "@/constants";
import { handleApiError } from "@/lib/apiErrorHandler";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import { ProtectedComponent } from "@/platform/v1/components";

export default function RolesPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [roles, setRoles] = useState<Role[]>([]);
	const [errorMessage, setErrorMessage] = useState("");
	const [pageSize, setPageSize] = useState(10);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [pagination, setPagination] = useState({
		next: null,
		previous: null,
		count: 0,
	});
	const router = useModuleNavigation();

	const fetchRoles = async (url: string | null = null) => {
		setLoading(true);
		try {
			const response = await apiRequest.get(
				`user/role/?Institution_id=${getDefaultInstitutionId()}&page_size=${pageSize}`,
			);

			const data = response.data;

			// Check if the response is paginated
			if (data.results && data.count !== undefined) {
				setRoles(data.results);
				setPagination({
					next: data.next,
					previous: data.previous,
					count: data.count,
				});
			} else {
				// Handle non-paginated response
				setRoles(data);
				setPagination({
					next: null,
					previous: null,
					count: data.length,
				});
			}
			setLoading(false);
		} catch (error: any) {
			setErrorMessage(error.message);
			handleApiError(error);
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRoles();
	}, [pageSize]);

	const handlePageSizeChange = (newSize: number) => {
		setPageSize(newSize);
	};

	const handlePageChange = (url: string | null) => {
		if (url) {
			fetchRoles(url);
		}
	};

	const filteredRoles = roles.filter(
		(role) =>
			role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			role.description.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleDeleteClick = (role: Role) => {
		setRoleToDelete(role);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!roleToDelete) return;

		setIsDeleting(true);
		try {
			await apiDelete(`user/role/${roleToDelete.id}/`);
			setRoles(roles.filter((role) => role.id !== roleToDelete.id));
			setDeleteDialogOpen(false);
			setRoleToDelete(null);
		} catch (error: any) {
			setErrorMessage(`Failed to delete role: ${error.message}`);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_STAFF_ROLES}>
			<div className="flex flex-col gap-4 mt-1 px-1 sm:px-0 overflow-x-hidden">
				<Card className="overflow-hidden">
					<CardHeader className="pb-3 px-4 sm:px-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									className="rounded-full aspect-square"
									onClick={() => router.push("/admin")}
								>
									<ArrowLeft className="h-4 w-4" />
								</Button>
								<h1 className="text-xl sm:text-2xl font-bold tracking-tight">Staff Roles</h1>
							</div>
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_ADD_STAFF_ROLES}>
								<Button
									onClick={() => router.push("/users/roles/add")}
									className="w-full sm:w-auto"
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Role
								</Button>
							</ProtectedComponent>
						</div>
						<CardDescription className="py-3 sm:ml-3">
							Manage your account's roles and permissions
						</CardDescription>
					</CardHeader>

					<CardContent className="px-4 sm:px-6 overflow-x-hidden">
						<div className="mb-4 flex flex-col gap-3">
							<div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
								<div className="relative flex-1">
									<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										className="w-full pl-8"
										placeholder="Search roles..."
										type="search"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<PageSizeSelector
									disabled={loading}
									pageSize={pageSize}
									onPageSizeChange={handlePageSizeChange}
								/>
							</div>
							{errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
						</div>

						{/* Desktop Table */}
						<div className="hidden sm:block rounded-md border overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Staff Role Name</TableHead>
										<TableHead>Description</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{loading ? (
										<TableRow>
											<TableCell className="h-24 text-center" colSpan={3}>
												Loading roles...
											</TableCell>
										</TableRow>
									) : filteredRoles.length > 0 ? (
										filteredRoles.map((role) => (
											<TableRow key={role.id}>
												<TableCell className="font-medium">
													{capitalizeEachWord(role.name)}
												</TableCell>
												<TableCell className="max-w-md truncate">{role.description}</TableCell>
												<TableCell className="text-right">
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
																permissionCode={PERMISSION_CODES.CAN_VIEW_STAFF_ROLES}
															>
																<DropdownMenuItem
																	onClick={() => router.push(`/users/roles/${role.id}`)}
																	className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
																>
																	<Eye className="h-4 w-4 mr-3 text-gray-500" />
																	View details
																</DropdownMenuItem>
															</ProtectedComponent>
															<ProtectedComponent
																permissionCode={PERMISSION_CODES.CAN_EDIT_STAFF_ROLES}
															>
																<DropdownMenuItem
																	onClick={() => router.push(`/users/roles/edit/${role.id}`)}
																	className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
																>
																	<Edit className="h-4 w-4 mr-3 text-gray-500" />
																	Edit
																</DropdownMenuItem>
															</ProtectedComponent>
															<ProtectedComponent
																permissionCode={PERMISSION_CODES.CAN_DELETE_STAFF_ROLES}
															>
																<DropdownMenuItem
																	onClick={() => handleDeleteClick(role)}
																	className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
																>
																	<Trash2 className="h-4 w-4 mr-3 text-red-500" />
																	Delete
																</DropdownMenuItem>
															</ProtectedComponent>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell className="h-24 text-center" colSpan={3}>
												No Roles found.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>

						{/* Mobile Cards */}
						<div className="sm:hidden space-y-3">
							{loading ? (
								<div className="text-center py-8 text-gray-500">Loading roles...</div>
							) : filteredRoles.length > 0 ? (
								filteredRoles.map((role) => (
									<div key={role.id} className="bg-gray-50 rounded-lg p-4 border">
										<div className="flex items-start justify-between gap-3">
											<div className="flex-1 min-w-0">
												<h3 className="font-semibold text-gray-900 mb-2">
													{capitalizeEachWord(role.name)}
												</h3>
												<p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0">
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-48">
													<ProtectedComponent
														permissionCode={PERMISSION_CODES.CAN_VIEW_STAFF_ROLES}
													>
														<DropdownMenuItem
															onClick={() => router.push(`/users/roles/${role.id}`)}
															className="flex items-center"
														>
															<Eye className="h-4 w-4 mr-3" />
															View details
														</DropdownMenuItem>
													</ProtectedComponent>
													<ProtectedComponent
														permissionCode={PERMISSION_CODES.CAN_EDIT_STAFF_ROLES}
													>
														<DropdownMenuItem
															onClick={() => router.push(`/users/roles/edit/${role.id}`)}
															className="flex items-center"
														>
															<Edit className="h-4 w-4 mr-3" />
															Edit
														</DropdownMenuItem>
													</ProtectedComponent>
													<ProtectedComponent
														permissionCode={PERMISSION_CODES.CAN_DELETE_STAFF_ROLES}
													>
														<DropdownMenuItem
															onClick={() => handleDeleteClick(role)}
															className="flex items-center text-red-600"
														>
															<Trash2 className="h-4 w-4 mr-3" />
															Delete
														</DropdownMenuItem>
													</ProtectedComponent>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								))
							) : (
								<div className="text-center py-8 text-gray-500">No Roles found.</div>
							)}
						</div>

						<div className="mt-4">
							<PaginationControls
								currentItems={filteredRoles.length}
								isLoading={loading}
								pagination={pagination}
								onPageChange={handlePageChange}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Delete Confirmation Dialog */}
				<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
					<AlertDialogContent className="max-w-[90vw] sm:max-w-md">
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This will permanently delete the role "{roleToDelete?.name}". This action cannot be
								undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="flex-col sm:flex-row gap-2">
							<AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-500 hover:bg-red-600 w-full sm:w-auto"
								disabled={isDeleting}
								onClick={handleConfirmDelete}
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</ProtectedPage>
	);
}
