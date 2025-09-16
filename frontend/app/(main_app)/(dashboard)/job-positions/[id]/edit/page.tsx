"use client";

import type React from "react";
import type {
	JobPositionFormData,
	IDepartment,
	IJobPosition,
	CreateJobPositionData,
	IEmployee,
} from "@/types/types.utils";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
	Briefcase,
	ArrowLeft,
	Check,
	FileText,
	Loader2,
	Users,
	AlertCircle,
	Search,
	ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { getDepartments, getJobPositions, getJobPosition, updateJobPosition } from "@/lib/utils";
import { SearchableSelect } from "@/components/searchable-select";
import { apiGet } from "@/lib/apiRequest";

const VirtualizedEmployeeList: React.FC<{
	employees: IEmployee[];
	selectedEmployees: Set<number>;
	onEmployeeToggle: (employee: IEmployee, checked: boolean) => void;
	searchTerm: string;
	containerHeight: number;
}> = ({ employees, selectedEmployees, onEmployeeToggle, searchTerm, containerHeight }) => {
	const [startIndex, setStartIndex] = useState(0);
	const scrollElementRef = useRef<HTMLDivElement>(null);

	const ITEM_HEIGHT = 60;
	const BUFFER_SIZE = 5;

	const filteredEmployees = useMemo(() => {
		if (!searchTerm.trim()) return employees;

		const searchLower = searchTerm.toLowerCase();

		return employees.filter(
			(employee) =>
				employee.user?.fullname.toLowerCase().includes(searchLower) ||
				employee.email.toLowerCase().includes(searchLower) ||
				employee.department.name.toLowerCase().includes(searchLower),
		);
	}, [employees, searchTerm]);

	const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
	const endIndex = Math.min(startIndex + visibleCount + BUFFER_SIZE, filteredEmployees.length);
	const visibleEmployees = filteredEmployees.slice(Math.max(0, startIndex - BUFFER_SIZE), endIndex);

	const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		const scrollTop = e.currentTarget.scrollTop;
		const newStartIndex = Math.floor(scrollTop / ITEM_HEIGHT);

		setStartIndex(newStartIndex);
	}, []);

	const totalHeight = filteredEmployees.length * ITEM_HEIGHT;
	const offsetY = Math.max(0, startIndex - BUFFER_SIZE) * ITEM_HEIGHT;

	return (
		<div
			ref={scrollElementRef}
			className="relative overflow-auto"
			style={{ height: containerHeight }}
			onScroll={handleScroll}
		>
			<div style={{ height: totalHeight, position: "relative" }}>
				<div style={{ transform: `translateY(${offsetY}px)` }}>
					{visibleEmployees.map((employee, index) => {
						const actualIndex = Math.max(0, startIndex - BUFFER_SIZE) + index;
						const isSelected = selectedEmployees.has(employee.id);

						return (
							<div
								key={employee.id}
								className={`flex items-center space-x-3 p-3 border-b hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? "bg-primary/5 border-primary/20" : "border-border"}`}
								style={{ height: ITEM_HEIGHT }}
								onClick={() => onEmployeeToggle(employee, !isSelected)}
							>
								<Checkbox
									checked={isSelected}
									onCheckedChange={(checked) => onEmployeeToggle(employee, checked as boolean)}
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between">
										<div className="min-w-0 flex-1">
											<Label className="font-medium cursor-pointer block truncate text-sm">
												{employee.user?.fullname}
											</Label>
											<p className="text-xs text-muted-foreground truncate">
												{employee.department.name} • {employee.email}
											</p>
										</div>
										{isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

// Employee Selection Modal Component
const EmployeeSelectionModal: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	employees: IEmployee[];
	selectedEmployees: { id: number; name: string }[];
	onConfirm: (selectedEmployees: { id: number; name: string }[]) => void;
	isLoading?: boolean;
}> = ({
	isOpen,
	onClose,
	employees,
	selectedEmployees: initialSelectedEmployees,
	onConfirm,
	isLoading = false,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(
		new Set(initialSelectedEmployees.map((emp) => emp.id)),
	);
	const [isSelectMode, setIsSelectMode] = useState(false);

	// Reset state when modal opens
	useEffect(() => {
		if (isOpen) {
			setSelectedEmployees(new Set(initialSelectedEmployees.map((emp) => emp.id)));
			setSearchTerm("");
			setIsSelectMode(false);
		}
	}, [isOpen, initialSelectedEmployees]);

	// Filter employees based on search
	const filteredEmployees = useMemo(() => {
		if (!searchTerm.trim()) return employees;

		const searchLower = searchTerm.toLowerCase();

		return employees.filter(
			(employee) =>
				employee.user?.fullname.toLowerCase().includes(searchLower) ||
				employee.email.toLowerCase().includes(searchLower) ||
				employee.department.name.toLowerCase().includes(searchLower),
		);
	}, [employees, searchTerm]);

	// Group employees by department for better organization
	const employeesByDepartment = useMemo(() => {
		const groups: Record<string, IEmployee[]> = {};

		filteredEmployees.forEach((employee) => {
			const deptName = employee.department.name;

			if (!groups[deptName]) {
				groups[deptName] = [];
			}
			groups[deptName].push(employee);
		});

		return groups;
	}, [filteredEmployees]);

	const handleEmployeeToggle = useCallback((employee: IEmployee, checked: boolean) => {
		setSelectedEmployees((prev) => {
			const newSet = new Set(prev);

			if (checked) {
				newSet.add(employee.id);
			} else {
				newSet.delete(employee.id);
			}

			return newSet;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		if (selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0) {
			// Deselect all filtered employees
			setSelectedEmployees((prev) => {
				const newSet = new Set(prev);

				filteredEmployees.forEach((emp) => newSet.delete(emp.id));

				return newSet;
			});
		} else {
			// Select all filtered employees
			setSelectedEmployees((prev) => {
				const newSet = new Set(prev);

				filteredEmployees.forEach((emp) => newSet.add(emp.id));

				return newSet;
			});
		}
	}, [filteredEmployees, selectedEmployees.size]);

	const handleDepartmentSelect = useCallback(
		(departmentEmployees: IEmployee[], select: boolean) => {
			setSelectedEmployees((prev) => {
				const newSet = new Set(prev);

				departmentEmployees.forEach((emp) => {
					if (select) {
						newSet.add(emp.id);
					} else {
						newSet.delete(emp.id);
					}
				});

				return newSet;
			});
		},
		[],
	);

	const handleConfirm = () => {
		const selectedEmployeesList = employees
			.filter((emp) => selectedEmployees.has(emp.id))
			.map((emp) => ({
				id: emp.id,
				name: emp.user?.fullname || "",
			}));

		onConfirm(selectedEmployeesList);
	};

	const selectedCount = selectedEmployees.size;
	const allFilteredSelected =
		filteredEmployees.length > 0 && filteredEmployees.every((emp) => selectedEmployees.has(emp.id));

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Select Employees for Salary Update
					</DialogTitle>
					<p className="text-sm text-muted-foreground">
						Choose employees who will receive the new salary. This is optional - if no employees are
						selected, only the position's base salary will be updated.
					</p>
				</DialogHeader>

				<div className="flex-1 overflow-hidden flex flex-col space-y-4">
					{/* Search and Controls */}
					<div className="space-y-3">
						{/* Search Bar */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by name, email, or department..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Selection Controls */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<div className="flex items-center space-x-2">
									<Checkbox
										checked={allFilteredSelected}
										onCheckedChange={handleSelectAll}
										disabled={filteredEmployees.length === 0}
									/>
									<Label className="text-sm cursor-pointer" onClick={handleSelectAll}>
										Select All {searchTerm ? "Filtered" : ""} ({filteredEmployees.length})
									</Label>
								</div>

								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsSelectMode(!isSelectMode)}
									className="text-xs"
								>
									{isSelectMode ? "List View" : "Bulk Select"}
								</Button>
							</div>

							<div className="flex items-center space-x-2">
								<Badge variant="secondary" className="text-xs">
									{selectedCount} selected
								</Badge>
								{selectedCount > 0 && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setSelectedEmployees(new Set())}
										className="text-xs text-muted-foreground hover:text-foreground"
									>
										Clear All
									</Button>
								)}
							</div>
						</div>
					</div>

					{/* Employee List */}
					<div className="flex-1 overflow-hidden border rounded-lg">
						{isLoading ? (
							<div className="flex items-center justify-center h-64">
								<div className="text-center">
									<Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
									<p className="text-sm text-muted-foreground">Loading employees...</p>
								</div>
							</div>
						) : filteredEmployees.length === 0 ? (
							<div className="flex items-center justify-center h-64">
								<div className="text-center">
									<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<h3 className="text-lg font-medium text-muted-foreground mb-2">
										{searchTerm ? "No employees found" : "No employees available"}
									</h3>
									<p className="text-sm text-muted-foreground">
										{searchTerm
											? "Try adjusting your search terms"
											: "No employees are available for selection."}
									</p>
								</div>
							</div>
						) : isSelectMode ? (
							// Department-grouped view for bulk selection
							<ScrollArea className="h-96">
								<div className="p-4 space-y-4">
									{Object.entries(employeesByDepartment).map(([deptName, deptEmployees]) => {
										const deptSelectedCount = deptEmployees.filter((emp) =>
											selectedEmployees.has(emp.id),
										).length;
										const allDeptSelected = deptSelectedCount === deptEmployees.length;

										return (
											<div key={deptName} className="border rounded-lg p-3">
												<div className="flex items-center justify-between mb-3">
													<div className="flex items-center space-x-2">
														<Checkbox
															checked={allDeptSelected}
															onCheckedChange={(checked) =>
																handleDepartmentSelect(deptEmployees, checked as boolean)
															}
														/>
														<Label className="font-medium cursor-pointer">{deptName}</Label>
														<Badge variant="outline" className="text-xs">
															{deptSelectedCount}/{deptEmployees.length}
														</Badge>
													</div>
													<ChevronDown className="h-4 w-4 text-muted-foreground" />
												</div>

												<div className="pl-6 space-y-2">
													{deptEmployees.map((employee) => (
														<div key={employee.id} className="flex items-center space-x-2 py-1">
															<Checkbox
																checked={selectedEmployees.has(employee.id)}
																onCheckedChange={(checked) =>
																	handleEmployeeToggle(employee, checked as boolean)
																}
															/>
															<Label className="text-sm cursor-pointer flex-1">
																{employee.user?.fullname}
															</Label>
														</div>
													))}
												</div>
											</div>
										);
									})}
								</div>
							</ScrollArea>
						) : (
							// Virtualized list view for performance
							<VirtualizedEmployeeList
								employees={filteredEmployees}
								selectedEmployees={selectedEmployees}
								onEmployeeToggle={handleEmployeeToggle}
								searchTerm={searchTerm}
								containerHeight={384} // 96 * 4 = 384px
							/>
						)}
					</div>
				</div>

				<DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
					<div className="flex items-center text-sm text-muted-foreground mr-auto">
						{selectedCount > 0 ? (
							<span>
								{selectedCount} employee{selectedCount !== 1 ? "s" : ""} selected
								{searchTerm && ` (${filteredEmployees.length} shown)`}
							</span>
						) : (
							<span className="text-blue-600">
								No employees selected - only position base salary will be updated
							</span>
						)}
					</div>
					<Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
						Cancel
					</Button>
					<Button type="button" onClick={handleConfirm} className="w-full sm:w-auto">
						<Check className="h-4 w-4 mr-2" />
						{selectedCount > 0
							? `Apply to ${selectedCount} Employee${selectedCount !== 1 ? "s" : ""}`
							: "Update Position Only"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default function EditJobPositionPage() {
	const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null);
	const [formData, setFormData] = useState<JobPositionFormData>({
		name: "",
		description: "",
		department: null,
		reports_to: null,
		offer_letter_template: null,
		salary_min: "",
		salary_max: "",
		job_position_status: "inactive",
	});
	const [departments, setDepartments] = useState<IDepartment[]>([]);
	const [jobPositions, setJobPositions] = useState<IJobPosition[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<keyof JobPositionFormData, string>>>({});

	// Employee selection state
	const [showEmployeeModal, setShowEmployeeModal] = useState(false);
	const [selectedEmployees, setSelectedEmployees] = useState<{ id: number; name: string }[]>([]);
	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
	const [employeesSelected, setEmployeesSelected] = useState(false);
	const [originalSalary, setOriginalSalary] = useState("");
	const [isSalaryChanged, setIsSalaryChanged] = useState(false);

	const router = useRouter();
	const params = useParams();
	const jobPositionId = Number.parseInt(params.id as string);

	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);

	useEffect(() => {
		if (!selectedInstitution || !selectedBranch) {
			router.push("/dashboard");

			return;
		}

		if (isNaN(jobPositionId)) {
			toast.error("Invalid job position/title ID");
			router.push("/job-positions");

			return;
		}

		fetchInitialData();
	}, [selectedInstitution, selectedBranch, jobPositionId, router]);

	const fetchInitialData = async () => {
		if (!selectedInstitution) return;

		try {
			setIsLoading(true);
			const [fetchedJobPosition, fetchedDepartments, fetchedJobPositions] = await Promise.all([
				getJobPosition({ jobPositionId }),
				getDepartments({ institutionId: selectedInstitution.id }),
				getJobPositions({ institutionId: selectedInstitution.id }),
			]);

			if (fetchedJobPosition) {
				setJobPosition(fetchedJobPosition);
				const salaryMinValue = fetchedJobPosition.salary_min?.toString() || "0";
				const salaryMaxValue = fetchedJobPosition.salary_max?.toString() || "0";

				setOriginalSalary(salaryMinValue);
				setFormData({
					name: fetchedJobPosition.name,
					description: fetchedJobPosition.description || "",
					department: fetchedJobPosition.department,
					reports_to: fetchedJobPosition.reports_to || null,
					offer_letter_template: null,
					salary_min: salaryMinValue,
					salary_max: salaryMaxValue,
					job_position_status: "inactive",
				});
			} else {
				toast.error("Job position not found");
				router.push("/job-positions");

				return;
			}

			if (fetchedDepartments) {
				setDepartments(fetchedDepartments);
			}
			if (fetchedJobPositions) {
				setJobPositions(fetchedJobPositions.filter((pos) => pos.id !== jobPositionId));
			}
		} catch (error) {
			console.error("Error fetching initial data:", error);
			toast.error("Failed to load job position/title data");
			router.push("/job-positions");
		} finally {
			setIsLoading(false);
		}
	};

	const fetchEmployeesForPosition = async () => {
		if (!jobPosition || !selectedInstitution) return;

		setIsLoadingEmployees(true);
		try {
			let allEmployees: IEmployee[] = [];

			if (jobPosition.employees && jobPosition.employees.length > 0) {
				allEmployees = jobPosition.employees;
			} else {
				try {
					const response = await apiGet(`/employee/${selectedInstitution.id}/employee`);

					if (response.status === 200) {
						allEmployees = await response.data.results;
					} else {
						allEmployees = jobPosition.employees || [];
					}
				} catch (apiError) {
					console.warn("API call failed, using job position/title employees:", apiError);
					allEmployees = jobPosition.employees || [];
				}
			}

			setEmployees(allEmployees);
		} catch (error) {
			console.error("Error fetching employees:", error);
			toast.error("Failed to load employees");
		} finally {
			setIsLoadingEmployees(false);
		}
	};

	const handleSalaryFieldClick = () => {
		setShowEmployeeModal(true);
		fetchEmployeesForPosition();
	};

	const handleReopenEmployeeSelection = () => {
		setShowEmployeeModal(true);
		fetchEmployeesForPosition();
	};

	const handleConfirmEmployeeSelection = (newSelectedEmployees: { id: number; name: string }[]) => {
		setSelectedEmployees(newSelectedEmployees);
		setEmployeesSelected(newSelectedEmployees.length > 0);
		setShowEmployeeModal(false);

		if (newSelectedEmployees.length > 0) {
			toast.success(`${newSelectedEmployees.length} employee(s) selected for salary update`);
		} else {
			toast.info("Only position base salary will be updated");
		}
	};

	const clearEmployeeSelection = () => {
		setSelectedEmployees([]);
		setEmployeesSelected(false);
	};

	const updateFormData = (field: keyof JobPositionFormData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		// Track salary changes
		if (field === "salary_min" || field === "salary_max") {
			const currentMin = formData.salary_min || originalSalary;
			const currentMax = formData.salary_max || originalSalary;
			const newMin = field === "salary_min" ? value : currentMin;
			const newMax = field === "salary_max" ? value : currentMax;

			const salaryChanged =
				(newMin !== originalSalary || newMax !== originalSalary) &&
				(newMin.trim() !== "" || newMax.trim() !== "");

			setIsSalaryChanged(salaryChanged);

			// Only auto-clear employee selection if reverting to original or empty
			if (
				(newMin === originalSalary && newMax === originalSalary) ||
				(newMin.trim() === "" && newMax.trim() === "")
			) {
				clearEmployeeSelection();
				setShowEmployeeModal(false);
			}
		}

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const revertSalaryToOriginal = () => {
		updateFormData("salary_min", originalSalary);
		updateFormData("salary_max", originalSalary);
		setIsSalaryChanged(false);
		clearEmployeeSelection();
		setShowEmployeeModal(false);
		toast.info("Salary reverted to original value");
	};

	const removeFile = (field: "offer_letter_template") => {
		updateFormData(field, null);
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof JobPositionFormData, string>> = {};

		if (!formData.name.trim()) {
			newErrors.name = "Job position name is required";
		} else if (formData.name.trim().length < 2) {
			newErrors.name = "Job position name must be at least 2 characters";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Job description is required";
		} else if (formData.description.trim().length < 10) {
			newErrors.description = "Description must be at least 10 characters";
		}

		if (!formData.department) {
			newErrors.department = "Please select a department";
		}

		if (!formData.salary_min.trim()) {
			newErrors.salary_min = "Minimum salary is required";
		} else if (isNaN(Number(formData.salary_min)) || Number(formData.salary_min) <= 0) {
			newErrors.salary_min = "Please enter a valid minimum salary amount";
		}

		if (!formData.salary_max.trim()) {
			newErrors.salary_max = "Maximum salary is required";
		} else if (isNaN(Number(formData.salary_max)) || Number(formData.salary_max) <= 0) {
			newErrors.salary_max = "Please enter a valid maximum salary amount";
		}

		if (
			formData.salary_min &&
			formData.salary_max &&
			Number(formData.salary_min) > Number(formData.salary_max)
		) {
			newErrors.salary_max = "Maximum salary must be greater than minimum salary";
		}

		// Removed mandatory employee selection validation - now optional

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedInstitution || !selectedBranch || !jobPosition) {
			toast.error("Missing required information");

			return;
		}

		if (!validateForm()) {
			toast.error("Please fix the form errors before submitting");

			return;
		}

		setIsSubmitting(true);

		try {
			const updateData: CreateJobPositionData = {
				name: formData.name.trim(),
				description: formData.description.trim(),
				department: formData.department!,
				salary_min: Number(formData.salary_min),
				salary_max: Number(formData.salary_max),
				affected_employees: [],
				job_position_status: "active",
			};

			// Only include affected employees if salary changed AND employees were selected
			if (isSalaryChanged && selectedEmployees.length > 0) {
				updateData.affected_employees = selectedEmployees.map((emp) => emp.id);
			}

			if (formData.reports_to) {
				updateData.reports_to = formData.reports_to;
			}

			if (formData.offer_letter_template) {
				updateData.offer_letter_template = formData.offer_letter_template;
			}

			const updatedJobPosition = await updateJobPosition({
				jobPositionId,
				jobPositionData: updateData,
			});

			if (updatedJobPosition) {
				let message = "Job position updated successfully!";

				if (isSalaryChanged) {
					if (selectedEmployees.length > 0) {
						message = `Job position updated successfully! Salary changes applied to ${selectedEmployees.length} employee(s).`;
					} else {
						message =
							"Job position updated successfully! Position salary updated for future hires.";
					}
				}

				toast.success(message);
				router.push(`/job-positions/`);
			} else {
				toast.error("Failed to update job position. Please try again.");
			}
		} catch (error) {
			console.error("Error updating job position:", error);
			toast.error("Failed to update job position. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleBack = () => {
		router.back();
	};

	if (!selectedInstitution || !selectedBranch) {
		return <div>Loading...</div>;
	}

	if (isLoading) {
		return (
			<div className="w-full h-full p-6">
				<div className="w-full space-y-6">
					<div className="flex items-center gap-4">
						<Skeleton className="h-9 w-32" />
					</div>
					<Card className="w-full">
						<CardHeader>
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-full" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-48" />
									<Skeleton className="h-4 w-64" />
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{[...Array(4)].map((_, i) => (
									<div key={i} className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-10 w-full" />
									</div>
								))}
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-24 w-full" />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	function handleFileChange(arg0: string, arg1: File | null): void {
		throw new Error("Function not implemented.");
	}

	return (
		<div className="w-full max-h-full p-6">
			<div className="w-full space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleBack}
						className="flex items-center gap-2 rounded-full aspect-square"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Job Position / Title
					</Button>
				</div>

				<Card className="w-full">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
								<Briefcase className="h-5 w-5 text-primary" />
							</div>
							<div>
								<CardTitle className="text-xl">Edit Job Position / Title </CardTitle>
								<p className="text-sm text-muted-foreground">
									Update job position / title details for {selectedBranch.branch_name} -{" "}
									{selectedInstitution.institution_name}
								</p>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Enhanced Information Alert */}
							{isSalaryChanged && (
								<Alert className="border-blue-200 bg-blue-50 text-blue-800">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										<strong>Salary Updated:</strong> The position's base salary has been changed.
										You can optionally select employees to apply this change to their current
										records.
									</AlertDescription>
								</Alert>
							)}

							{/* Form Fields */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Job Position/ Title  Name */}
								<div className="space-y-2">
									<Label htmlFor="name" className="text-sm font-medium">
										Job Position / Title Name *
									</Label>
									<Input
										id="name"
										type="text"
										placeholder="e.g., Software Engineer, HR Manager, Sales Representative"
										value={formData.name}
										onChange={(e) => updateFormData("name", e.target.value)}
										className={errors.name ? "border-destructive" : ""}
									/>
									{errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
								</div>

								{/* <div className="space-y-2">
                  <Label htmlFor="salary_min" className="text-sm font-medium">
                    Salary Range *
                  </Label>
                  <div className="grid grid-cols-2 gap-2">

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">From </span>
                  <Input
                    id="salary_min"
                    type="text"
                    inputMode="numeric"
                    placeholder="50,000"
                    value={salaryMinDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const numeric = unformat(raw);

                      if (!/^\d*$/.test(numeric)) return;

                      setSalaryMinDisplay(formatWithCommas(numeric));
                      updateFormData("salary_min", numeric);
                    }}
                    className={errors.salary_min ? "border-destructive" : ""}
                  />
                  {errors.salary_min && <p className="text-sm text-destructive">{errors.salary_min}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">To </span>
                    <Input
                    id="salary_max"
                    type="text"
                    inputMode="numeric"
                    placeholder="75,000"
                    value={salaryMaxDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const numeric = unformat(raw);

                      if (!/^\d*$/.test(numeric)) return;

                      setSalaryMaxDisplay(formatWithCommas(numeric));
                      updateFormData("salary_max", numeric);
                    }}
                    className={errors.salary_max ? "border-destructive" : ""}
                  />
                  {errors.salary_max && <p className="text-sm text-destructive">{errors.salary_max}</p>}
                  </div>
                  </div>
                  
                </div> */}
								{/* Salary Range with Employee Selection */}
								<div className="space-y-2">
									<Label htmlFor="salary_min" className="text-sm font-medium">
										Salary Range *{" "}
										{isSalaryChanged && (
											<span className="text-xs text-amber-600">(Changed - Select employees)</span>
										)}
									</Label>
									<div className="grid grid-cols-2 gap-2">
										<div className="relative flex items-center gap-2">
											<span className="text-sm text-muted-foreground">From </span>
											<Input
												id="salary_min"
												type="text"
												inputMode="numeric"
												placeholder="50,000"
												value={
													formData.salary_min !== undefined && formData.salary_min !== null
														? Number(formData.salary_min).toLocaleString("en-US")
														: ""
												}
												onChange={(e) => {
													const rawValue = e.target.value.replace(/,/g, "");

													if (/^\d*$/.test(rawValue)) {
														updateFormData("salary_min", rawValue);
													}
												}}
												className={`pr-10 ${errors.salary_min ? "border-destructive" : ""} ${
													isSalaryChanged ? "border-amber-300 bg-amber-50" : ""
												}`}
											/>
										</div>
										<div className="relative flex items-center gap-2">
											<span className="text-sm text-muted-foreground">To </span>
											<Input
												id="salary_max"
												type="text"
												inputMode="numeric"
												placeholder="75,000"
												value={
													formData.salary_max !== undefined && formData.salary_max !== null
														? Number(formData.salary_max).toLocaleString("en-US")
														: ""
												}
												onChange={(e) => {
													const rawValue = e.target.value.replace(/,/g, "");

													if (/^\d*$/.test(rawValue)) {
														updateFormData("salary_max", rawValue);
													}
												}}
												className={`pr-10 ${errors.salary_max ? "border-destructive" : ""} ${
													isSalaryChanged ? "border-amber-300 bg-amber-50" : ""
												}`}
											/>
										</div>
									</div>

									{/* Simple Salary Update Detection */}
									{isSalaryChanged && (
										<div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
											<div className="flex items-center justify-between mb-3">
												<span className="text-sm font-medium text-orange-800">
													Salary Update Detected
												</span>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={revertSalaryToOriginal}
													className="text-xs text-myOrange hover:text-orange-700"
												>
													Revert
												</Button>
											</div>

											{/* Employee Selection */}
											{employeesSelected && selectedEmployees.length > 0 ? (
												<div className="space-y-2">
													<div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
														✓ {selectedEmployees.length} employee(s) selected for salary update
													</div>
													<div className="flex gap-2">
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={handleReopenEmployeeSelection}
															className="text-xs"
														>
															Change Selection
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => {
																setSelectedEmployees([]);
																setEmployeesSelected(false);
															}}
															className="text-xs"
														>
															Clear
														</Button>
													</div>
												</div>
											) : (
												<div className="space-y-2">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={handleSalaryFieldClick}
														className="text-xs border-orange-300 text-orange-700"
													>
														Select Employees (Optional)
													</Button>
													<p className="text-xs text-myOrange">
														Skip to only update position base salary
													</p>
												</div>
											)}
										</div>
									)}

									{/* Show original salary when unchanged */}
									{!isSalaryChanged && originalSalary && (
										<p className="text-xs text-muted-foreground">
											Current salary range: ${Number(originalSalary).toLocaleString()} - $
											{Number(formData.salary_max || originalSalary).toLocaleString()}
										</p>
									)}

									{errors.salary_min && (
										<p className="text-sm text-destructive">{errors.salary_min}</p>
									)}
									{errors.salary_max && (
										<p className="text-sm text-destructive">{errors.salary_max}</p>
									)}
								</div>

								{/* Department */}
								<div className="space-y-2">
									<Label htmlFor="department" className="text-sm font-medium">
										Department *
									</Label>
									<SearchableSelect
										items={departments.map((dept) => ({
											id: dept.id,
											label: dept.name,
											value: dept.name.toLowerCase(),
										}))}
										selectedItems={formData.department ? [formData.department] : []}
										placeholder="Select a department"
										searchPlaceholder="Search departments..."
										emptyMessage="No departments found."
										onSelect={(itemId) => updateFormData("department", Number(itemId))}
										multiple={false}
										triggerClassName={errors.department ? "border-destructive" : ""}
										popoverClassName="w-[400px]"
									/>
									{errors.department && (
										<p className="text-sm text-destructive">{errors.department}</p>
									)}
								</div>

								{/* Reports To */}
								<div className="space-y-2">
									<Label htmlFor="reportsTo" className="text-sm font-medium">
										Reports To (Optional)
									</Label>
									<SearchableSelect
										items={[
											{ id: 0, label: "None", value: "none" },
											...jobPositions.map((position) => ({
												id: position.id,
												label: `${position.name} - ${position.department_details?.name}`,
												value:
													`${position.name} ${position.department_details?.name}`.toLowerCase(),
											})),
										]}
										selectedItems={formData.reports_to ? [formData.reports_to] : [0]}
										placeholder="Select a position (optional)"
										searchPlaceholder="Search positions..."
										emptyMessage="No positions found."
										onSelect={(itemId) =>
											updateFormData("reports_to", Number(itemId) === 0 ? null : Number(itemId))
										}
										multiple={false}
										popoverClassName="w-[500px]"
									/>
								</div>
							</div>

							{/* Job Description */}
							<div className="space-y-2">
								<Label htmlFor="description" className="text-sm font-medium">
									Job Description *
								</Label>
								<Textarea
									id="description"
									placeholder="Describe the job responsibilities, requirements, and qualifications..."
									value={formData.description}
									onChange={(e) => updateFormData("description", e.target.value)}
									rows={4}
									className={errors.description ? "border-destructive" : ""}
								/>
								{errors.description && (
									<p className="text-sm text-destructive">{errors.description}</p>
								)}
							</div>

							{/* Current Files Display */}
							{(jobPosition?.contract_template || jobPosition?.offer_letter_template) && (
								<div className="space-y-4">
									<h4 className="font-medium text-sm">Current Templates</h4>
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
										{jobPosition.contract_template && (
											<div className="border rounded-lg p-3 bg-muted/30">
												<div className="flex items-center gap-2">
													<FileText className="h-4 w-4 text-primary" />
													<span className="text-sm font-medium">Current Contract Template</span>
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													Upload a new file to replace
												</p>
											</div>
										)}
										{jobPosition.offer_letter_template && (
											<div className="border rounded-lg p-3 bg-muted/30">
												<div className="flex items-center gap-2">
													<FileText className="h-4 w-4 text-primary" />
													<span className="text-sm font-medium">Current Offer Letter Template</span>
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													Upload a new file to replace
												</p>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Form Actions */}
							<div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
								<Button
									type="button"
									variant="outline"
									onClick={handleBack}
									disabled={isSubmitting}
									className="w-full sm:w-auto"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting}
									className="flex items-center justify-center gap-2 w-full sm:w-auto"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Updating...
										</>
									) : (
										<>
											<Check className="h-4 w-4" />
											Update Job Position/ Title
											{isSalaryChanged && selectedEmployees.length > 0 && (
												<Badge variant="secondary" className="ml-2 text-xs">
													+{selectedEmployees.length} salary updates
												</Badge>
											)}
										</>
									)}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				{/* Employee Selection Modal */}
				<EmployeeSelectionModal
					isOpen={showEmployeeModal}
					onClose={() => setShowEmployeeModal(false)}
					employees={employees}
					selectedEmployees={selectedEmployees}
					onConfirm={handleConfirmEmployeeSelection}
					isLoading={isLoadingEmployees}
				/>
			</div>
		</div>
	);
}
