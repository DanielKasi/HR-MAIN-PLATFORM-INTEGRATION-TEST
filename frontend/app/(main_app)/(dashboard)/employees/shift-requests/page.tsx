"use client";

import type {
	IEmployeeShift,
	IBranchShift,
	IEmployee,
	IPaginatedResponse,
} from "@/types/types.utils";

import { useRef, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/table-skeleton";
import apiRequest from "@/lib/apiRequest";
import { selectSelectedBranch, selectSelectedInstitution } from "@/store/auth/selectors";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";
import { showErrorToast } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface IAllocationFormData {
	employee_id: string;
	shift_id: string;
	date: string;
}

const EmployeeShiftsPage = () => {
	const [ordering, setOrdering] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [contextFilter, setContextFilter] = useState("all");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedShift, setSelectedShift] = useState<IEmployeeShift | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [shifts, setShifts] = useState<IBranchShift[]>([]);
	const [formData, setFormData] = useState<IAllocationFormData>({
		employee_id: "",
		shift_id: "",
		date: "",
	});

	const refreshRef = useRef<(() => void) | null>(null);
	const router = useRouter();
	const selectedBranch = useSelector(selectSelectedBranch);
	const currentInstitutionId = useSelector(selectSelectedInstitution)?.id;

	const fetchEmployeesAndShifts = async () => {
		try {
			const [employeesRes, shiftsRes] = await Promise.all([
				apiRequest.get(`employee/${currentInstitutionId}/employee`),
				apiRequest.get(`institution/branch-shifts/${selectedBranch?.id}/`),
			]);

			setEmployees(employeesRes.data.results || []);
			setShifts(shiftsRes.data.results || []);
		} catch (error) {
			console.error("Failed to fetch employees and shifts:", error);
		}
	};

	const handleAddAllocation = async () => {
		if (!formData.employee_id || !formData.shift_id || !formData.date) {
			console.error("Please fill in all required fields");

			return;
		}

		setIsSubmitting(true);
		try {
			await apiRequest.post("employee/employee-shifts/", {
				employee: formData.employee_id,
				shift: formData.shift_id,
				context: "ALLOCATION",
				date: formData.date,
			});

			// console.log("Allocation created successfully");
			setIsAddDialogOpen(false);
			setFormData({ employee_id: "", shift_id: "", date: "" });
			if (refreshRef.current) {
				refreshRef.current();
			}
		} catch (error) {
			console.error("Failed to create allocation:", error);
			showErrorToast({ error: error, defaultMessage: "Failed to create allocation." });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditAllocation = async () => {
		if (!selectedShift || !formData.employee_id || !formData.shift_id || !formData.date) {
			console.error("Please fill in all required fields");

			return;
		}

		setIsSubmitting(true);
		try {
			await apiRequest.patch(`employee/employee-shifts/detail/${selectedShift.id}/`, {
				employee: formData.employee_id,
				shift: formData.shift_id,
				context: "ALLOCATION",
				date: formData.date,
			});

			// console.log("Allocation updated successfully");
			setIsEditDialogOpen(false);
			setSelectedShift(null);
		} catch (error) {
			console.error("Failed to update allocation:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteAllocation = async () => {
		if (!selectedShift) return;

		setIsSubmitting(true);
		try {
			await apiRequest.delete(`employee/employee-shifts/detail/${selectedShift.id}/`);
			// console.log("Allocation deleted successfully");
			setIsDeleteDialogOpen(false);
			setSelectedShift(null);
		} catch (error) {
			console.error("Failed to delete allocation:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const openEditDialog = (shift: IEmployeeShift) => {
		setSelectedShift(shift);
		setFormData({
			employee_id:
				typeof shift.employee === "object"
					? shift.employee?.id?.toString() || shift.employee?.user?.id?.toString() || ""
					: shift.employee || "",
			shift_id: typeof shift.shift === "object" ? shift.shift?.id?.toString() : shift.shift || "",
			date: shift.date,
		});
		fetchEmployeesAndShifts();
		setIsEditDialogOpen(true);
	};

	const openAddDialog = () => {
		setFormData({ employee_id: "", shift_id: "", date: "" });
		fetchEmployeesAndShifts();
		setIsAddDialogOpen(true);
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "APPROVED":
				return "default";
			case "PENDING":
				return "secondary";
			case "REJECTED":
				return "destructive";
			default:
				return "outline";
		}
	};

	return (
		<div className="space-y-6 p-6 bg-white">
			<div className="flex items-center justify-between pt-5">
				<div className="ml-5">
					<h1 className="text-2xl font-semibold tracking-tight">Employee Shifts</h1>
					<p className="text-muted-foreground">
						Manage employee shift allocations and requests for your institution
					</p>
				</div>
				<Button onClick={openAddDialog}>
					<Plus className="mr-2 h-4 w-4" />
					New Allocation
				</Button>
			</div>

			<Card className="border-none">
				<CardHeader>
					<CardTitle>Shifts Management</CardTitle>
					<div className="flex items-center justify-between space-x-4">
						<Input
							placeholder="Search employees..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="max-w-sm"
						/>
						<Tabs value={contextFilter} onValueChange={setContextFilter}>
							<TabsList>
								<TabsTrigger value="all">All</TabsTrigger>
								<TabsTrigger value="allocation">Allocations</TabsTrigger>
								<TabsTrigger value="request">Requests</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</CardHeader>
				<CardContent>
					<PaginatedTableWrapper<IEmployeeShift>
						fetchFirstPage={async () => {
							const params = [
								searchTerm.trim() ? `search=${encodeURIComponent(searchTerm.trim())}` : "",
								contextFilter === "all" ? "" : `context=${contextFilter.toUpperCase()}`,
								ordering ? `ordering=${ordering}` : "",
							]
								.filter(Boolean)
								.join("&");

							const queryString = params ? `?${params}` : "";

							const response = await apiRequest.get(`employee/employee-shifts/${queryString}`);

							return response.data;
						}}
						fetchFromUrl={async ({ url }: { url: string }) => {
							const response = await apiRequest.get(url);

							return response.data;
						}}
						deps={[searchTerm, ordering]}
						key={`${contextFilter}-${searchTerm}`}
					>
						{({ data, loading, goNext, goPrev, refresh }) => (
							(refreshRef.current = refresh),
							(
								<>
									{loading ? (
										<TableSkeleton />
									) : (
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Employee</span>
															<Button
																onClick={() =>
																	setOrdering(ordering === "employee" ? "" : "employee")
																}
																size="sm"
																variant={ordering === "employee" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>Shift</TableHead>
													<TableHead>Date</TableHead>
													<TableHead>Start Time</TableHead>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>End Time</span>
															<Button
																onClick={() =>
																	setOrdering(ordering === "end_time" ? "" : "end_time")
																}
																size="sm"
																variant={ordering === "end_time" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>Type</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>Created By</TableHead>
													<TableHead className="text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data?.results?.map((shift) => {
													return (
														<TableRow key={shift.id}>
															<TableCell className="font-medium">
																{shift.employee?.user?.fullname || "Unknown"}
															</TableCell>
															<TableCell>
																<div>
																	<div className="font-medium">
																		{typeof shift.shift === "object"
																			? shift.shift?.name
																			: `Shift #`}
																	</div>
																	<div className="text-sm text-muted-foreground">
																		{typeof shift.shift === "object"
																			? shift.shift?.shift_day?.day_name
																			: ""}
																	</div>
																</div>
															</TableCell>
															<TableCell>{shift.date}</TableCell>
															<TableCell>{shift.shift.start_time || "Unkown"}</TableCell>
															<TableCell>{shift.shift.end_time || "Unknown"}`</TableCell>
															<TableCell>
																<Badge
																	variant={shift.context === "ALLOCATION" ? "default" : "secondary"}
																>
																	{shift.context === "ALLOCATION" ? "Allocation" : "Request"}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge variant={getStatusBadgeVariant(shift.shift_status)}>
																	{shift.shift_status}
																</Badge>
															</TableCell>
															<TableCell>
																{typeof shift.created_by === "object"
																	? shift.created_by?.fullname
																	: `User ID: ${shift.created_by}`}
															</TableCell>
															<TableCell className="text-right">
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button variant="ghost" className="h-8 w-8 p-0">
																			<MoreHorizontal className="h-4 w-4" />
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuItem
																			onClick={() =>
																				router.push(`/employees/shift-requests/${shift.id}`)
																			}
																		>
																			<Eye className="mr-2 h-4 w-4" />
																			View
																		</DropdownMenuItem>
																		<DropdownMenuItem onClick={() => openEditDialog(shift)}>
																			<Edit className="mr-2 h-4 w-4" />
																			Edit
																		</DropdownMenuItem>
																		<DropdownMenuItem
																			onClick={() => {
																				setSelectedShift(shift);
																				setIsDeleteDialogOpen(true);
																			}}
																			className="text-destructive"
																		>
																			<Trash2 className="mr-2 h-4 w-4" />
																			Delete
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																</DropdownMenu>
															</TableCell>
														</TableRow>
													);
												})}
												{(data as IPaginatedResponse<IEmployeeShift>)?.results?.length === 0 && (
													<TableRow>
														<TableCell
															colSpan={8}
															className="text-center py-8 text-muted-foreground"
														>
															No shifts found. Try adjusting your search or filter criteria.
														</TableCell>
													</TableRow>
												)}
											</TableBody>
										</Table>
									)}
								</>
							)
						)}
					</PaginatedTableWrapper>
				</CardContent>
			</Card>

			<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Allocation</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="employee">Employee</Label>
							<EmployeeSearchableSelect
								value={formData.employee_id ? [formData.employee_id] : []}
								onValueChange={(value) =>
									setFormData({
										...formData,
										employee_id: value[0]?.toString() || "",
									})
								}
								disabled={isSubmitting}
								placeholder="Search and select employee"
								showEmployeeId={false}
								showDepartment={false}
								multiple={false}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="shift">Shift</Label>
							<Select
								value={formData.shift_id}
								onValueChange={(value) => setFormData({ ...formData, shift_id: value })}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select shift" />
								</SelectTrigger>
								<SelectContent>
									{shifts.map((shift) => (
										<SelectItem key={shift.id} value={shift.id.toString()}>
											{shift.name} ({shift.shift_day?.day_name} BTN {shift.start_time} -{" "}
											{shift.end_time})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="date">Date</Label>
							<Input
								id="date"
								type="date"
								value={formData.date}
								onChange={(e) => setFormData({ ...formData, date: e.target.value })}
							/>
						</div>
					</div>
					<div className="flex justify-end space-x-2">
						<Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleAddAllocation} disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Allocation"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Allocation</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="employee">Employee</Label>
							<Select
								value={formData.employee_id}
								onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select employee" />
								</SelectTrigger>
								<SelectContent>
									{employees.map((employee) => (
										<SelectItem key={employee.id} value={employee.id.toString()}>
											{employee?.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="shift">Shift</Label>
							<Select
								value={formData.shift_id}
								onValueChange={(value) => setFormData({ ...formData, shift_id: value })}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select shift" />
								</SelectTrigger>
								<SelectContent>
									{shifts.map((shift) => (
										<SelectItem key={shift.id} value={shift.id.toString()}>
											{shift.name} ({shift.start_time} - {shift.end_time})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="date">Date</Label>
							<Input
								id="date"
								type="date"
								value={formData.date}
								onChange={(e) => setFormData({ ...formData, date: e.target.value })}
							/>
						</div>
					</div>
					<div className="flex justify-end space-x-2">
						<Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleEditAllocation} disabled={isSubmitting}>
							{isSubmitting ? "Updating..." : "Update Allocation"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the allocation for{" "}
							{selectedShift?.employee?.user?.fullname}.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteAllocation}
							disabled={isSubmitting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isSubmitting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default EmployeeShiftsPage;
