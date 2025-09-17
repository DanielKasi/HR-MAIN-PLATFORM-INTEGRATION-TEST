"use client";

import { RefObject, useRef, useState } from "react";
import { Eye, Edit, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type IEmployee } from "@/types/types.utils";
import { PERMISSION_CODES } from "@/constants";
import {
	deleteEmployee,
	getPaginatedEmployees,
	getPaginatedEmployeesFromUrl,
	showErrorToast,
} from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProtectedComponent from "@/components/ProtectedComponent";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PaginatedTable, ColumnDef } from "@/components/common/tables/paginated-table";

interface EmployeesTableProps {
	refreshFunctionRef?: RefObject<(() => void) | null>;
	searchTerm?: string;
	positionSearchTerm?: string;
	departmentFilter?: string;
	minSalary?: string;
	maxSalary?: string;
}

export function EmployeesTable({
	refreshFunctionRef,
	searchTerm,
	positionSearchTerm,
	departmentFilter,
	minSalary,
	maxSalary,
}: EmployeesTableProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = refreshFunctionRef || useRef<(() => void) | null>(null);
	const [employeeToDelete, setEmployeeToDelete] = useState<IEmployee | null>(null);
	const [ordering, setOrdering] = useState("");
	const router = useRouter();
	const removeCommas = (value: string) => value.replace(/,/g, "");

	const handleDelete = async () => {
		if (!currentInstitution) {
			toast.error("No institution selected");

			return;
		}
		if (!employeeToDelete) {
			toast.error("No employee to delete!");

			return;
		}
		try {
			await deleteEmployee({
				employeeId: employeeToDelete.id,
				institutionId: currentInstitution.id,
			});
			tableRefreshRef.current?.();
			toast.success("Employee deleted successfully");
		} catch (error: unknown) {
			showErrorToast({ error, defaultMessage: "Failed to delete employee" });
		} finally {
			setEmployeeToDelete(null);
		}
	};

	const getStatusBadge = (isActive: boolean) => {
		return isActive ? (
			<Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Active</Badge>
		) : (
			<Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
		);
	};

	const columns: ColumnDef<IEmployee>[] = [
		{
			key: "name",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Name</span>
				</div>
			),
			cell: (employee) => employee.user?.fullname || "N/A",
		},
		{
			key: "email",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Email</span>
					<Button
						onClick={() => {
							setOrdering((prev) => (prev === "email" ? "" : "email"));
						}}
						size="sm"
						variant={ordering === "email" ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (employee) => employee.email,
		},
		{
			key: "department",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Department</span>
					<Button
						onClick={() => {
							setOrdering((prev) => (prev === "department" ? "" : "department"));
						}}
						size="sm"
						variant={ordering === "department" ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (employee) => employee.department.name,
		},
		{
			key: "position",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Position</span>
					<Button
						onClick={() => {
							setOrdering((prev) => (prev === "position" ? "" : "position"));
						}}
						size="sm"
						variant={ordering === "position" ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (employee) => employee.position.name,
		},
		{
			key: "status",
			header: "Status",
			cell: (employee) => getStatusBadge(employee.is_active),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (employee) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem className="p-0">
							<Link
								className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
								href={`/employees/profile/${employee.id}`}
							>
								<Eye className="h-4 w-4 mr-2" /> View Details
							</Link>
						</DropdownMenuItem>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}>
							<DropdownMenuItem className="p-0">
								<Link
									className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
									href={`/employees/update-employee/${employee.id}`}
								>
									<Edit className="h-4 w-4 mr-2" /> Edit
								</Link>
							</DropdownMenuItem>
						</ProtectedComponent>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_EMPLOYEES}>
							<DropdownMenuItem
								onClick={() => setEmployeeToDelete(employee)}
								className="text-red-600 p-0"
							>
								<span className="text-red-600 hover:text-red-700 text-xs w-full h-full px-2 py-1.5 flex items-center">
									<Trash2 className="h-4 w-4 mr-2" /> Delete
								</span>
							</DropdownMenuItem>
						</ProtectedComponent>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<>
			<PaginatedTable<IEmployee>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");

					return await getPaginatedEmployees({
						institutionId: currentInstitution.id,
						page: 1,
						ordering,
						search: searchTerm || undefined,
						positionSearch: positionSearchTerm !== "all" ? positionSearchTerm : undefined,
						departmentSearch: departmentFilter !== "all" ? departmentFilter : undefined,
						minSalary: minSalary ? removeCommas(minSalary) : undefined,
						maxSalary: maxSalary ? removeCommas(maxSalary) : undefined,
					});
				}}
				fetchFromUrl={getPaginatedEmployeesFromUrl}
				deps={[
					currentInstitution?.id,
					searchTerm,
					positionSearchTerm,
					departmentFilter,
					minSalary,
					maxSalary,
					ordering,
				]}
				query={searchTerm}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch employees" })
				}
				className="space-y-4"
				tableClassName="min-w-[800px]"
				footerClassName="pt-4"
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No employees found</p>
					</div>
				}
			/>
			{employeeToDelete && (
				<AlertDialog
					open={!!employeeToDelete}
					onOpenChange={(open) => {
						if (!open) setEmployeeToDelete(null);
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Employee</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete{" "}
								{employeeToDelete.user?.fullname ? (
									<b>{employeeToDelete.user?.fullname}</b>
								) : (
									"this employee"
								)}{" "}
								? This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</>
	);
}
