"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmployeesTable } from "./employees-table";
import { BulkUploadEmployeesDialog } from "@/components/dialogs/bulk-upload-employees-dialog";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, UserPlus, ChevronDown, Upload, Search, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import ProtectedPage from "@/components/ProtectedPage";
import { useSelector } from "react-redux";
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors";
import { getJobPositions, showErrorToast } from "@/lib/utils";
import { IJobPosition } from "@/types/types.utils";
import JobPositionSearchableSelect from "@/components/selects/job-positions-select";
import DepartmentSearchableSelect from "@/components/selects/department-searchable-select";
import FormatNumberInput from "@/components/format-number-input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from '@iconify/react';

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
			<div className="flex flex-col w-full h-full p-4 bg-white rounded-lg min-h-screen">
				<CardHeader className="space-y-4">
					<CardTitle className="flex flex-row items-center justify-between">
						<h1 className="text-xl md:text-2xl font-bold">Employees</h1>

						<div className="flex flex-row items-center gap-2">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_EMPLOYEES}>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button>
											<Plus className="h-4 w-4 md:mr-2" />
											<span className="hidden md:inline">Add Employee</span>
											<UserPlus className="md:hidden" />
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
									className="rounded-xl"
									onClick={handleExportEmployees}
								>
									{isExportingToExcel ? (
										<Loader />
									) : (
										<Icon icon="hugeicons:file-export" className="!w-5 !h-5" />
									)}
									<span className="text">
										{isExportingToExcel ? "Exporting" : "Export to Excel"}
									</span>
								</Button>
							</ProtectedComponent>
						</div>
					</CardTitle>

					<div className="flex flex-col md:grid md:grid-cols-3 lg:flex lg:flex-row gap-4 items-start lg:items-center mt-12 overflow-visible">
						<div className="relative w-full md:max-w-lg lg:max-w-xl ">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								placeholder="Search employees, departments, positions, or emails..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 text-sm"
							/>
						</div>
						<div className="flex gap-1 sm:gap-2 w-full overflow-visible md:contents">
							<JobPositionSearchableSelect
								value={positionSearchTerm}
								onValueChange={setPositionSearchTerm}
								placeholder="Job positions..."
								className="flex-1 min-w-[150px] md:max-w-xl lg:max-w-2xl xl:max-w-4xl"
								multiple={false}
								showSelectedItems={true}
							/>
							<DepartmentSearchableSelect
								value={departmentSearchTerm}
								onValueChange={setDepartmentSearchTerm}
								placeholder="Departments..."
								className="flex-1 min-w-[150px] md:max-w-xl lg:max-w-2xl xl:max-w-4xl"
								multiple={false}
								showSelectedItems={true}
							/>
						</div>

						{/* Salary Range Inputs */}
						<div className="flex gap-2 items-center">
							<FormatNumberInput
								placeholder="Min salary"
								value={minSalary}
								onChange={(formatted, numericValue) => setMinSalary(formatted)}
							/>
							<span className="text-gray-400">-</span>
							<FormatNumberInput
								placeholder="Max salary"
								value={maxSalary}
								onChange={(formatted, numericValue) => setMaxSalary(formatted)}
							/>
						</div>
						{/* Add Employee Dropdown */}
						<div className="flex-shrink-0 lg:flex-[0.2]"></div>
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
