"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmployeesTable } from "./employees-table";
import { BulkUploadEmployeesDialog } from "@/components/dialogs/bulk-upload-employees-dialog";
import { CardHeader, CardTitle } from "@/components/ui/card";

import { UserPlus, ChevronDown, Upload, Search, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import ProtectedPage from "@/components/ProtectedPage";
import { useSelector } from "react-redux";
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast } from "@/lib/utils";
import { IJobPosition } from "@/types/types.utils";
import JobPositionSearchableSelect from "@/components/selects/job-positions-select";
import DepartmentSearchableSelect from "@/components/selects/department-searchable-select";
import FormatNumberInput from "@/components/format-number-input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@iconify/react";

export default function EmployeesPage() {
	const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const router = useRouter();
	const institutionId = useSelector(selectSelectedInstitution)?.id;
	const accessToken = useSelector(selectAccessToken);
	const [positionSearchTerm, setPositionSearchTerm] = useState<(string | number)[]>([]);
	const [jobPositions, setJobPositions] = useState<IJobPosition[]>([]);
	const refreshFunctionRef = useRef<(() => void) | null>(null);
	const [minSalary, setMinSalary] = useState<string>("");
	const [maxSalary, setMaxSalary] = useState<string>("");
	const [departmentSearchTerm, setDepartmentSearchTerm] = useState<(string | number)[]>([]);
	const [showFilters, setShowFilters] = useState(false);

	const clearJobPosition = () => {
		setPositionSearchTerm([]);
	};

	const [isExportingToExcel, setIsExportingToExcel] = useState(false);

	const clearFilters = () => {
		setSearchTerm("");
		setDepartmentSearchTerm([]);
		setStatusFilter("all");
		setPositionSearchTerm([]);
		setMinSalary("");
		setMaxSalary("");
	};

	const handleExportEmployees = async () => {
		try {
			setIsExportingToExcel(true);
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/employee/export-employee-excel/${institutionId}/`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Failed to export employees.");
			}

			const blob = await response.blob();

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");

			link.href = url;
			link.download = "employees.xlsx";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			window.URL.revokeObjectURL(url);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Export failed. Please try again" });
		} finally {
			setIsExportingToExcel(false);
		}
	};

	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_EMPLOYEES}>
			<div className="flex flex-col w-full h-full p-3 sm:p-4 bg-white rounded-lg min-h-screen">
				<CardHeader className="space-y-4 mb-4 p-0 sm:p-6">
					<CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<h1 className="text-xl md:text-2xl font-bold">Employees</h1>

						<div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full sm:w-auto">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_EMPLOYEES}>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button className="rounded-2xl w-full xs:w-auto">
											<span className="hidden sm:inline">Add Employee</span>
											<UserPlus className="sm:hidden" />
											<ChevronDown className="h-4 w-4 ml-2" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => router.push("/employees/add-employee")}>
											<UserPlus className="w-4 h-4 mr-2" />
											Add Single Employee
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => setIsBulkUploadDialogOpen(true)}>
											<Upload className="w-4 h-4 mr-2" />
											Bulk Upload Employees
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</ProtectedComponent>

							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EXPORT_EMPLOYEES}>
								<Button
									disabled={isExportingToExcel}
									className="rounded-xl w-full xs:w-auto"
									onClick={handleExportEmployees}
								>
									{isExportingToExcel ? (
										<Loader className="h-4 w-4" />
									) : (
										<Icon icon="hugeicons:file-export" className="!w-4 !h-4 sm:!w-5 sm:!h-5" />
									)}
									<span className="ml-2 hidden sm:inline">
										{isExportingToExcel ? "Exporting" : "Export to Excel"}
									</span>
									<span className="ml-2 sm:hidden">
										{isExportingToExcel ? "Exporting" : "Export"}
									</span>
								</Button>
							</ProtectedComponent>
						</div>
					</CardTitle>

					{/* Search and Filters Section */}
					<div className="flex flex-col xl:flex-row gap-4 mt-6 sm:mt-12 overflow-visible">
						{/* Search Bar */}
						<div className="relative w-full">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								placeholder="Search employees, departments, positions, or emails..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 text-sm"
							/>
						</div>

						{/* Filter Toggle for Mobile */}
						<Button
							variant="outline"
							onClick={() => setShowFilters(!showFilters)}
							className="sm:hidden flex items-center gap-2"
						>
							<Icon icon="hugeicons:filter" className="h-4 w-4" />
							Filters
							{(positionSearchTerm.length > 0 ||
								departmentSearchTerm.length > 0 ||
								minSalary ||
								maxSalary) && <span className="ml-1 h-2 w-2 bg-blue-500 rounded-full"></span>}
						</Button>

						{/* Filters - Hidden on mobile by default, shown when toggled */}
						<div
							className={`${showFilters ? "flex flex-col" : "hidden"} sm:flex sm:flex-col lg:!flex-row gap-4 items-start lg:items-end`}
						>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
								<JobPositionSearchableSelect
									value={positionSearchTerm}
									onValueChange={setPositionSearchTerm}
									placeholder="Job positions..."
									className="w-full"
									multiple={false}
									showSelectedItems={true}
								/>
								<DepartmentSearchableSelect
									value={departmentSearchTerm}
									onValueChange={setDepartmentSearchTerm}
									placeholder="Departments..."
									className="w-full"
									multiple={false}
									showSelectedItems={true}
								/>
							</div>

							{/* Salary Range Inputs */}
							<div className="flex flex-col xs:flex-row gap-2 items-start xs:items-center w-full xs:w-auto">
								<div className="flex gap-2 items-center w-full xs:w-auto">
									<FormatNumberInput
										placeholder="Min salary"
										value={minSalary}
										onChange={(formatted, numericValue) => setMinSalary(formatted)}
										className="w-full xs:w-[120px]"
									/>
									<span className="text-gray-400">-</span>
									<FormatNumberInput
										placeholder="Max salary"
										value={maxSalary}
										onChange={(formatted, numericValue) => setMaxSalary(formatted)}
										className="w-full xs:w-[120px]"
									/>
									{(searchTerm ||
										positionSearchTerm.length > 0 ||
										departmentSearchTerm.length > 0 ||
										minSalary ||
										maxSalary) && (
										<Button
											variant="outline"
											onClick={clearFilters}
											className="w-full xs:w-auto mt-2 xs:mt-0 rounded-2xl h-12"
										>
											Clear Filters
										</Button>
									)}
								</div>

								{/* Clear Filters Button */}
							</div>
						</div>
					</div>
				</CardHeader>
				<EmployeesTable
					searchTerm={searchTerm}
					refreshFunctionRef={refreshFunctionRef}
					positionSearchTerm={positionSearchTerm}
					departmentFilter={
						departmentSearchTerm.length > 0 ? departmentSearchTerm.join(",") : "all"
					}
					minSalary={minSalary}
					maxSalary={maxSalary}
				/>
				<BulkUploadEmployeesDialog
					isOpen={isBulkUploadDialogOpen}
					onClose={() => setIsBulkUploadDialogOpen(false)}
					onUploadSuccess={() => {
						setIsBulkUploadDialogOpen(false);
						if (refreshFunctionRef.current) {
							refreshFunctionRef.current();
						}
					}}
				/>
			</div>
		</ProtectedPage>
	);
}
