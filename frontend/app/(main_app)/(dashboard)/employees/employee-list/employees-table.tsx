"use client";

import { RefObject, useRef, useState, useMemo } from "react";
import { Eye, Edit, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSelector, useDispatch } from "react-redux";
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
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { selectValidCachedEmployeesPage } from "@/store/miscellaneous/selectors";
import { cacheEmployeesPage } from "@/store/miscellaneous/actions";

const shouldCacheResults = (
	searchTerm: string | undefined,
	positionSearchTerm: (string | number)[] | undefined,
	departmentFilter: string | undefined,
	minSalary: string | undefined,
	maxSalary: string | undefined,
	ordering: string,
) => {
	return (
		!searchTerm &&
		!positionSearchTerm?.length &&
		(departmentFilter === "all" || !departmentFilter) &&
		!minSalary &&
		!maxSalary &&
		!ordering
	);
};

interface EmployeesTableProps {
	refreshFunctionRef?: RefObject<(() => void) | null>;
	searchTerm?: string;
	positionSearchTerm?: (string | number)[];
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
	const cachedEmployeesPage = useSelector(selectValidCachedEmployeesPage);
	const dispatch = useDispatch();

	const tableRefreshRef = refreshFunctionRef || useRef<(() => void) | null>(null);
	const [employeeToDelete, setEmployeeToDelete] = useState<IEmployee | null>(null);
	const [ordering, setOrdering] = useState("");
	const [hasUsedCache, setHasUsedCache] = useState(false);
	const removeCommas = (value: string) => value.replace(/,/g, "");
	const router = useRouter();

	const departmentSearchTerm = useMemo(() => {
		return departmentFilter !== "all" && departmentFilter
			? departmentFilter.split(",").map((id) => id.trim())
			: [];
	}, [departmentFilter]);

	const positionSearchTermString = useMemo(() => {
		return positionSearchTerm?.join(",") || "";
	}, [positionSearchTerm]);

	const shouldUseCache = useMemo(() => {
		return (
			!hasUsedCache &&
			cachedEmployeesPage &&
			shouldCacheResults(
				searchTerm,
				positionSearchTerm,
				departmentFilter,
				minSalary,
				maxSalary,
				ordering,
			)
		);
	}, [
		hasUsedCache,
		cachedEmployeesPage,
		searchTerm,
		positionSearchTerm,
		departmentFilter,
		minSalary,
		maxSalary,
		ordering,
	]);

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
			<Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">Active</Badge>
		) : (
			<Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs">Inactive</Badge>
		);
	};

	const columns: ColumnDef<IEmployee>[] = [
		{
			key: "name",
			header: (
				<div className="flex items-center justify-start gap-2">
					<span className="text-xs sm:text-sm">Name</span>
				</div>
			),
			cell: (employee) => (
				<div className="text-xs sm:text-sm">
					{employee.name || employee?.user?.fullname || "Unknown"}
				</div>
			),
		},
		{
			key: "email",
			header: (
				<div className="flex items-center justify-start gap-2">
					<span className="text-xs sm:text-sm">Email</span>
					<Button
						onClick={() => {
							setOrdering((prev) => (prev === "email" ? "" : "email"));
						}}
						size="sm"
						variant={ordering === "email" ? "default" : "outline"}
						type="button"
						className="h-6 w-6 p-0"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-3 !w-3 sm:!h-4 sm:!w-4" />
					</Button>
				</div>
			),
			cell: (employee) => (
				<div className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
					{employee.email || employee.user?.email || ""}
				</div>
			),
		},
		{
			key: "department",
			header: (
				<div className="flex items-center justify-start gap-2">
					<span className="text-xs sm:text-sm">Department</span>
					<Button
						onClick={() => {
							setOrdering((prev) => (prev === "department" ? "" : "department"));
						}}
						size="sm"
						variant={ordering === "department" ? "default" : "outline"}
						type="button"
						className="h-6 w-6 p-0"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-3 !w-3 sm:!h-4 sm:!w-4" />
					</Button>
				</div>
			),
			cell: (employee) => (
				<div className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
					{employee.department.name}
				</div>
			),
		},
		{
			key: "position",
			header: (
				<div className="flex items-center justify-start gap-2">
					<span className="text-xs sm:text-sm">Position</span>
					<Button
						onClick={() => {
							setOrdering((prev) => (prev === "position" ? "" : "position"));
						}}
						size="sm"
						variant={ordering === "position" ? "default" : "outline"}
						type="button"
						className="h-6 w-6 p-0"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-3 !w-3 sm:!h-4 sm:!w-4" />
					</Button>
				</div>
			),
			cell: (employee) => (
				<div className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
					{employee.position.name}
				</div>
			),
		},
		{
			key: "status",
			header: <div className="text-xs sm:text-sm">Status</div>,
			cell: (employee) => getStatusBadge(employee.is_active),
		},
		{
			key: "actions",
			header: <div className="text-xs sm:text-sm">Actions</div>,
			cell: (employee) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
							<MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="text-xs sm:text-sm">
						<DropdownMenuItem className="p-0">
							<Link
								className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
								href={`/employees/profile/${employee.id}`}
							>
								<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> View Details
							</Link>
						</DropdownMenuItem>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}>
							<DropdownMenuItem className="p-0">
								<Link
									className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
									href={`/employees/update-employee/${employee.id}`}
								>
									<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Edit
								</Link>
							</DropdownMenuItem>
						</ProtectedComponent>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_EMPLOYEES}>
							<DropdownMenuItem
								onClick={() => setEmployeeToDelete(employee)}
								className="text-red-600 p-0"
							>
								<span className="text-red-600 hover:text-red-700 text-xs w-full h-full px-2 py-1.5 flex items-center">
									<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Delete
								</span>
							</DropdownMenuItem>
						</ProtectedComponent>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	const fetchFirstPageWithCache = async () => {
		console.log("\n\n Fetch called on employees  with should use cache : ", shouldUseCache);
		if (!currentInstitution) throw new Error("No institution selected");
		if (shouldUseCache) {
			console.log("\n\n Using cache ");
			setHasUsedCache(true);
			const cachedData = cachedEmployeesPage;

			setTimeout(async () => {
				try {
					const freshData = await getPaginatedEmployees({
						institutionId: currentInstitution.id,
						page: 1,
						ordering,
						search: searchTerm || undefined,
						position_id: positionSearchTermString || undefined,
						department_id:
							departmentSearchTerm && departmentSearchTerm.length > 0
								? departmentSearchTerm.join(",")
								: undefined,
						salary_min: minSalary ? removeCommas(minSalary) : undefined,
						salary_max: maxSalary ? removeCommas(maxSalary) : undefined,
					});

					if (
						shouldCacheResults(
							searchTerm,
							positionSearchTerm,
							departmentFilter,
							minSalary,
							maxSalary,
							ordering,
						)
					) {
						dispatch(cacheEmployeesPage(freshData));
					}

					if (tableRefreshRef.current) {
						tableRefreshRef.current();
					}
				} catch (error) {
					showErrorToast({ error, defaultMessage: "Background refresh failed" });
				}
			}, 0);

			return cachedData!;
		}

		console.log("'n'n Fetching without 'shouldUseCache' with search value : ", searchTerm);
		const result = await getPaginatedEmployees({
			institutionId: currentInstitution.id,
			page: 1,
			ordering,
			search: searchTerm || undefined,
			position_id: positionSearchTermString || undefined,
			department_id:
				departmentSearchTerm && departmentSearchTerm.length > 0
					? departmentSearchTerm.join(",")
					: undefined,
			salary_min: minSalary ? removeCommas(minSalary) : undefined,
			salary_max: maxSalary ? removeCommas(maxSalary) : undefined,
		});

		if (
			shouldCacheResults(
				searchTerm,
				positionSearchTerm,
				departmentFilter,
				minSalary,
				maxSalary,
				ordering,
			)
		) {
			dispatch(cacheEmployeesPage(result));
			setHasUsedCache(true);
		}

		return result;
	};

	const deps = useMemo(() => {
		return [
			currentInstitution?.id,
			searchTerm,
			positionSearchTermString,
			departmentFilter,
			minSalary,
			maxSalary,
			ordering,
			hasUsedCache,
		];
	}, [
		searchTerm,
		positionSearchTermString,
		departmentFilter,
		minSalary,
		maxSalary,
		ordering,
		hasUsedCache,
	]);

	return (
		<>
			<PaginatedTable<IEmployee>
				fetchFirstPage={fetchFirstPageWithCache}
				fetchFromUrl={getPaginatedEmployeesFromUrl}
				deps={deps}
				query={searchTerm}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch employees" })
				}
				className="space-y-4"
				tableClassName="min-w-0"
				footerClassName="pt-4"
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-8 sm:py-12">
						<p className="text-muted-foreground mb-4 text-sm sm:text-base">No employees found</p>
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
					<AlertDialogContent className="max-w-[95vw] sm:max-w-md">
						<AlertDialogHeader>
							<AlertDialogTitle className="text-lg sm:text-xl">Delete Employee</AlertDialogTitle>
							<AlertDialogDescription className="text-sm sm:text-base">
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
							<AlertDialogCancel onClick={() => setEmployeeToDelete(null)} className="text-sm">
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
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
