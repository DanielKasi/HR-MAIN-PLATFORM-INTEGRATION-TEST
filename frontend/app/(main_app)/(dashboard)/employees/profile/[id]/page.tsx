"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { IAttendance, ICompanyEmail, IMaritalStatus } from "@/types/types.utils";
import EmployeeLeaveBalances from "@/components/employee/employee-leave-balances";
import EmployeeLeaveApplications from "@/components/employee/employee-leave-applications";
import EmployeeDiscipline from "@/components/employee/employee-discipline";
import AssetRequests from "@/components/employee/asset-request";
import EmployeeAssetAllocations from "@/components/employee/asset-allocation";
import { DocumentGenerationDialog } from "@/components/document-generation-dialog";
import {
	Mail,
	Phone,
	MapPin,
	Building,
	GraduationCap,
	Award,
	Edit,
	ArrowLeft,
	Trash2,
	FileText,
	Plus,
	Clock,
	Settings,
} from "lucide-react";
import Link from "next/link";
import { AttendanceAPI, employeeAPI, getEmployeeById, spotcheckAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import type {
	IEmployee,
	IEmployeeSpotCheckSetting,
	IEmployeeSpotCheckSettingFormData,
} from "@/types/types.utils";
import { toast } from "sonner";
import { EmployeePayrollTable } from "@/components/employee/employee-payroll";
import ContractsTable from "@/components/contracts/contracts-table";
import EmployeeAttendance from "@/components/attendance/employee-attendance";
import { formatCurrency, getFileUrl } from "@/lib/helpers";
import { useMobile } from "@/hooks/use-mobile";
import EmployeeSpotchecks from "@/components/common/tables/spotchecks/employee-spotchecks";
import EmployeeShifts from "@/components/common/tables/shifts/employee-shifts";
import EmployeePenalties from "@/components/common/tables/penalties/employee-penalties";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { EmployeeBonusPointsTable } from "@/components/performance/bonus-points/bonus-points-table";

export default function EmployeeProfile() {
	const params = useParams();
	const employeeId = params.id as string;
	const [employee, setEmployee] = useState<IEmployee | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showDocumentDialog, setShowDocumentDialog] = useState(false);
	const [activeTab, setActiveTab] = useState<
		| "attendance"
		| "payroll"
		| "assets"
		| "projects"
		| "documents"
		| "discipline"
		| "leave"
		| "spotchecks"
		| "shifts"
		| "penalties"
		| "general_info"
		| "performance"
		| "company_email"
	>("general_info");
	const [attendanceRecords, setAttendanceRecords] = useState<IAttendance[]>([]);
	const [attendancePage, setAttendancePage] = useState(1);
	const [totalAttendanceRecords, setTotalAttendanceRecords] = useState(0);
	const [loadingAttendance, setLoadingAttendance] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [leaveSubTab, setLeaveSubTab] = useState<"balances" | "applications">("balances");
	const [documentsSubTab, setDocumentsSubTab] = useState<"contracts">("contracts");
	const [assetSubTab, setAssetSubTab] = useState<"requests" | "allocations">("requests");
	const [spotcheckSubTab, setSpotcheckSubTab] = useState<"spotchecks" | "configs">("spotchecks");
	const [statusFilter, setStatusFilter] = useState("all");

	// Spotcheck Configuration state
	const [spotcheckSetting, setSpotcheckSetting] = useState<IEmployeeSpotCheckSetting | null>(null);
	const [spotcheckFormData, setSpotcheckFormData] = useState<IEmployeeSpotCheckSettingFormData>({
		lower_threshold: 0,
		upper_threshold: 0,
		expires_after_minutes: 0,
		late_starts_after_minutes: 0,
		employee: 0,
	});
	const [isSpotcheckFormOpen, setIsSpotcheckFormOpen] = useState(false);
	const [loadingSpotcheckConfig, setLoadingSpotcheckConfig] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [generatingEmail, setGeneratingEmail] = useState(false);
	// Company Email state
	const [companyEmail, setCompanyEmail] = useState<{
		id: number;
		employee: number;
		email: string;
		provider: string;
		status: string;
	} | null>(null);

	// Cache for tab data to prevent re-fetching
	const [tabDataCache, setTabDataCache] = useState<Record<string, any>>({});

	const isMobile = useMobile();

	const selectedInstitution = useSelector(selectSelectedInstitution);

	// console.log("Spot check setting", spotcheckSetting);

	// Memoized utility functions
	const formatDate = useCallback((dateString: string | null) => {
		if (!dateString) return null;
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}, []);

	const getMaritalStatusLabel = useCallback((status: IMaritalStatus) => {
		if (!status) return null;
		const statusMap: { [key: string]: string } = {
			single: "Single",
			married: "Married",
			divorced: "Divorced",
			widowed: "Widowed",
		};
		return statusMap[status] || status;
	}, []);

	const getEmployeeInitials = useCallback((employee: IEmployee) => {
		if (employee?.name) {
			const names = employee?.name.split(" ").filter((name) => name.length > 0);
			if (names.length >= 2) {
				return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
			} else if (names.length === 1) {
				return names[0][0]?.toUpperCase() || "E";
			}
		}
		return employee.email?.[0]?.toUpperCase() || "E";
	}, []);

	const handleTabChange = useCallback(
		(newTab: typeof activeTab) => {
			if (newTab === activeTab) return;

			setActiveTab(newTab);

			if (newTab === "attendance" && !tabDataCache.attendance) {
				fetchAttendanceRecords();
			}
		},
		[activeTab, tabDataCache],
	);

	const fetchAttendanceRecords = useCallback(async () => {
		if (!employeeId || loadingAttendance) return;

		// Check cache first
		if (tabDataCache.attendance) {
			setAttendanceRecords(tabDataCache.attendance.records);
			setTotalAttendanceRecords(tabDataCache.attendance.total);
			return;
		}

		setLoadingAttendance(true);
		try {
			const response = await AttendanceAPI.fetchEmployeeAttendanceRecords(employeeId);

			if (response) {
				const attendanceData = {
					records: response.results,
					total: response.count,
				};

				setAttendanceRecords(attendanceData.records);
				setTotalAttendanceRecords(attendanceData.total);

				// Cache the data
				setTabDataCache((prev) => ({
					...prev,
					attendance: attendanceData,
				}));
			}
		} catch (error: any) {
			let errorMessage = "Failed to fetch employee attendance records";
			if (error?.message || error?.detail) {
				errorMessage = error.message || error.detail;
			}
			toast.error(`${errorMessage}`);
		} finally {
			setLoadingAttendance(false);
		}
	}, [employeeId, loadingAttendance, tabDataCache.attendance]);

	const fetchEmployee = useCallback(async () => {
		if (!selectedInstitution || !employeeId) {
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const fetchedEmployee = await getEmployeeById({ employeeId });
			setEmployee(fetchedEmployee);
		} catch (error: any) {
			let errorMessage = "Failed to fetch employee";
			if (error?.message || error?.detail) {
				errorMessage = error.message || error.detail;
			}
			toast.error(`${errorMessage}`);
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [selectedInstitution, employeeId]);

	// Spotcheck Configuration helper functions
	const handleSpotcheckInputChange = (
		field: keyof IEmployeeSpotCheckSettingFormData,
		value: number,
	) => {
		setSpotcheckFormData((prev) => ({ ...prev, [field]: value }));
	};

	const resetSpotcheckForm = () => {
		setSpotcheckFormData({
			lower_threshold: 0,
			upper_threshold: 0,
			expires_after_minutes: 0,
			late_starts_after_minutes: 0,
			employee: employee?.id || 0,
		});
		setIsSpotcheckFormOpen(false);
	};

	const handleCreateSpotcheckConfig = () => {
		if (spotcheckSetting) {
			// Prefill form with existing data when updating
			setSpotcheckFormData({
				lower_threshold: spotcheckSetting.lower_threshold,
				upper_threshold: spotcheckSetting.upper_threshold,
				expires_after_minutes: spotcheckSetting.expires_after_minutes,
				late_starts_after_minutes: spotcheckSetting.late_starts_after_minutes,
				employee: employee?.id || 0,
			});
		} else {
			// Reset form for new configuration
			resetSpotcheckForm();
		}
		setIsSpotcheckFormOpen(true);
	};

	const handleSaveSpotcheckConfig = async () => {
		if (!employee?.id) return;

		setLoadingSpotcheckConfig(true);
		try {
			if (spotcheckSetting) {
				await spotcheckAPI.CONFIGS.EMPLOYEE.update({
					employeeId: employee.id,
					data: spotcheckFormData,
				});
				toast.success("Employee spotcheck configuration updated successfully");
			} else {
				await spotcheckAPI.CONFIGS.EMPLOYEE.create({
					employeeId: employee.id,
					data: spotcheckFormData,
				});
				toast.success("Employee spotcheck configuration created successfully");
			}
			resetSpotcheckForm();
			// Refresh spotcheck setting
			await fetchSpotcheckSetting();
		} catch (error) {
			toast.error("Failed to save employee spotcheck configuration");
		} finally {
			setLoadingSpotcheckConfig(false);
		}
	};

	const fetchSpotcheckSetting = async () => {
		if (!employee?.id) return;
		try {
			const setting = await spotcheckAPI.CONFIGS.EMPLOYEE.getByEmployee({
				employeeId: employee.id,
			});
			setSpotcheckSetting(setting);
			// Initialize form data with the fetched setting
			setSpotcheckFormData({
				lower_threshold: setting.lower_threshold,
				upper_threshold: setting.upper_threshold,
				expires_after_minutes: setting.expires_after_minutes,
				late_starts_after_minutes: setting.late_starts_after_minutes,
				employee: employee.id,
			});
		} catch (error) {
			// Setting doesn't exist yet, that's okay
			setSpotcheckSetting(null);
			// Reset form data to default values
			setSpotcheckFormData({
				lower_threshold: 0,
				upper_threshold: 0,
				expires_after_minutes: 0,
				late_starts_after_minutes: 0,
				employee: employee.id,
			});
		}
	};

	const handleDeleteSpotcheckConfig = () => {
		if (!employee?.id || !spotcheckSetting) return;
		setIsDeleteModalOpen(true);
	};

	const confirmDeleteSpotcheckConfig = async () => {
		if (!employee?.id || !spotcheckSetting) return;

		setLoadingSpotcheckConfig(true);
		try {
			// await spotcheckAPI.CONFIGS.EMPLOYEE.delete(employee.id);
			setSpotcheckSetting(null);
			resetSpotcheckForm();
			setIsDeleteModalOpen(false);
			toast.success("Employee spotcheck configuration deleted successfully");
		} catch (error) {
			toast.error("Failed to delete employee spotcheck configuration");
		} finally {
			setLoadingSpotcheckConfig(false);
		}
	};

	useEffect(() => {
		fetchEmployee();
	}, [fetchEmployee]);

	useEffect(() => {
		if (employee && spotcheckSubTab === "configs") {
			fetchSpotcheckSetting();
		}
	}, [employee, spotcheckSubTab]);

	useEffect(() => {
		if (activeTab === "attendance" && !tabDataCache.attendance) {
			fetchAttendanceRecords();
		}
	}, [activeTab, fetchAttendanceRecords, tabDataCache.attendance]);

	// Tab configuration with lazy loading indicators
	const tabConfig: Array<{ id: typeof activeTab; label: string; hasData: boolean }> = useMemo(
		() => [
			{ id: "general_info", label: "General Information", hasData: true }, // Component handles own loading
			{ id: "attendance", label: "Attendance", hasData: !!tabDataCache.attendance },
			{ id: "discipline", label: "Discipline", hasData: true }, // Component handles own loading
			{ id: "leave", label: "Leave", hasData: true }, // Component handles own loading
			{ id: "assets", label: "Assets", hasData: true }, // Component handles own loading
			{ id: "payroll", label: "Payroll", hasData: true }, // Component handles own loading
			{ id: "documents", label: "Documents", hasData: true }, // Component handles own loading
			{ id: "spotchecks", label: "Spotchecks", hasData: true }, // Component handles own loading
			{ id: "penalties", label: "Penalties", hasData: true }, // Component handles own loading
			{ id: "shifts", label: "Shifts", hasData: true }, // Component handles own loading
			{ id: "performance", label: "Performance", hasData: true },
		],
		[tabDataCache],
	);

	const handleGenerateCompanyEmail = useCallback(async () => {
		if (!employeeId || generatingEmail) return;
		setGeneratingEmail(true);
		try {
			const company_email = await employeeAPI.generateCompanyEmail({
				employee_id: Number(employeeId),
			});
			setEmployee((prev) => ({ ...prev, company_email: company_email }) as IEmployee);
			toast.success("Company email generated successfully!");
		} catch (error: any) {
			let errorMessage = "Failed to generate company email";
			if (error?.message || error?.detail) {
				errorMessage = error.message || error.detail;
			}
			toast.error(`${errorMessage}`);
		} finally {
			setGeneratingEmail(false);
		}
	}, [employeeId, generatingEmail]);

	if (loading) {
		return (
			<div className="min-h-screen bg-[#f7f7fb] flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4426da] mb-4"></div>
					<p className="text-[#848496]">Loading employee profile...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-[#f7f7fb] flex items-center justify-center px-4">
				<div className="text-center max-w-md w-full">
					<p className="text-[#e21732] mb-4">{error || "Employee not found"}</p>
					<div className="space-y-2 space-x-8">
						<Link href="/employees/employee-list">
							<Button className="text-white w-full md:w-auto">Back to Employees</Button>
						</Link>
						<Button
							variant="outline"
							onClick={() => {
								setError(null);
								window.location.reload();
							}}
							className="w-full md:w-auto"
						>
							Retry
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full rounded-lg">
			{employee && (
				<div className="w-full md:px-4 md:pb-8">
					{/* Header section with back arrow, name, and action buttons */}
					<div className="flex flex-row md:flex-row md:items-center justify-between py-4 my-6 gap-4">
						<div className="flex items-center justify-start gap-4">
							<Link href="/employees/employee-list">
								<Button variant="outline" className="!h-10 !w-10 !rounded-full !aspect-square">
									<ArrowLeft className="w-5 h-5" />
								</Button>
							</Link>

							<h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center justify-start gap-2 md:gap-3">
								<span>{employee?.name || "Unknown Employee"}</span>
								<Badge className="bg-[#e1faec] text-[#3cb371] border-[#3cb371] font-medium self-start md:self-auto">
									{employee.is_active ? "Active" : "Inactive"}
								</Badge>
							</h1>
						</div>
						<div className="flex items-center gap-3 px-3">
							<Link href={`/employees/update-employee/${employee.id}`}>
								<Button
									variant="outline"
									size={isMobile ? "sm" : "default"}
									className=" flex items-center gap-2"
								>
									<Edit className="w-4 h-4" />
									<span className="hidden md:inline">Edit</span>
								</Button>
							</Link>
							<Button
								variant="outline"
								size={isMobile ? "sm" : "default"}
								className="flex items-center gap-2"
							>
								<Trash2 className="w-4 h-4" />
								<span className="hidden md:inline">Delete</span>
							</Button>

							<Button
								variant="outline"
								size={isMobile ? "sm" : "default"}
								onClick={() => setShowDocumentDialog(true)}
								className="flex items-center gap-2 shadow-sm"
							>
								<FileText className="h-4 w-4" />
								<span className="hidden md:inline">Generate Document</span>
							</Button>
						</div>
					</div>

					<div
						className={`pt-4 w-full ${employee?.approval_status !== "active" && employee.approvals?.length ? "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
					>
						{employee?.approvals && employee.approvals.length > 0 && (
							<ApprovalWorkflow
								className="order-1 md:order-2"
								approvals={employee.approvals}
								instance_approval_status={employee.approval_status}
								onRefresh={fetchEmployee}
							/>
						)}

						<div
							className={`flex flex-col order-2 md:order-1 ${employee?.approval_status !== "active" && employee?.approvals && employee.approvals.length > 0 ? "md:col-span-1 lg:col-span-2 xl:col-span-3" : ""}`}
						>
							{/* Profile card */}
							<div className="bg-white md:rounded-lg md:shadow-sm md:border border-[#e8e8f2] mb-6 -mt-5">
								<div className="p-4 md:p-6">
									<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
										<div className="flex flex-col">
											<div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
												<Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-white shadow-lg flex-shrink-0 self-center md:self-start">
													<AvatarImage
														src={
															employee.employee_profile_picture
																? getFileUrl(employee.employee_profile_picture)
																: "/placeholder.svg"
														}
														alt="Profile picture"
														className="object-cover"
													/>
													<AvatarFallback className="text-lg md:text-xl bg-[#f0f0f6] text-gray-800">
														{getEmployeeInitials(employee)}
													</AvatarFallback>
												</Avatar>

												<div className="flex flex-col text-center md:text-left">
													<h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">
														{employee?.name || "Unknown Employee"}
														{employee.user?.gender && (
															<span className="block md:inline text-[#9ca3af] text-sm font-normal md:ml-2">
																{employee.user.gender}
															</span>
														)}
													</h2>
													{/* <p className="text-[#9ca3af] text-sm font-medium mb-2">
                        {employee.employee_id}
                      </p> */}

													<div className="flex items-center justify-center md:justify-start gap-2">
														<Building className="w-4 h-4 text-[#9ca3af]" />
														<span className="text-gray-800 font-medium">
															{employee.position?.name || "No Position"}
														</span>
													</div>
												</div>
											</div>

											{/* Contact info - stack vertically on mobile, horizontal on larger screens */}
											<div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-sm">
												<div className="flex items-center justify-center md:justify-start gap-2">
													<Mail className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
													<span className="text-gray-800 break-all">{employee.email}</span>
												</div>
												{employee.phone_number && (
													<div className="flex items-center justify-center md:justify-start gap-2">
														<Phone className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
														<span className="text-gray-800">{employee.phone_number}</span>
													</div>
												)}
												{employee.address && (
													<div className="flex items-center justify-center md:justify-start gap-2">
														<MapPin className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
														<span className="text-gray-800 text-center md:text-left">
															{employee.address}
														</span>
													</div>
												)}
											</div>
										</div>

										{/* Right side - Job info and badges - show below on mobile, beside on desktop */}
										<div className="flex flex-col min-w-[16rem] items-center lg:items-start gap-4 mt-6 pt-6 border-t border-[#e8e8f2] lg:mt-0 lg:pt-0 lg:border-t-0 lg:flex-row lg:gap-4 lg:flex-shrink-0">
											{/* Vertical divider line - only on desktop */}
											<div className="hidden lg:block h-16 w-px bg-[#e8e8f2]"></div>

											<div className="flex flex-col items-center lg:items-start gap-3 ">
												<div className="text-center lg:text-left">
													<div className="font-semibold text-sm text-gray-800">
														{employee.position?.name || "No Position"}
													</div>
													<div className="text-xs text-[#848496]">
														{employee.department?.name || "No Department"}
													</div>
												</div>

												{/* Salary Information */}
												{employee.salary && (
													<div className="text-center lg:text-left">
														<div className="text-xs text-[#848496] mb-1">Monthly Salary</div>
														<div className="font-bold text-lg text-gray-800">
															{formatCurrency(employee.salary)}
														</div>
													</div>
												)}

												<div className="flex gap-2">
													{employee.work_type && typeof employee.work_type !== "number" && (
														<Badge className="bg-[#e1faec] text-[#3cb371] border-[#3cb371] text-xs px-2 py-1">
															{employee.work_type?.name}
														</Badge>
													)}
													{employee.employee_type && typeof employee.employee_type !== "number" && (
														<Badge className="bg-[#d7effd] text-[#0ca0f5] border-[#0ca0f5] text-xs px-2 py-1">
															{employee.employee_type?.name}
														</Badge>
													)}
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-6">
								<div className="">
									<Card className="bg-white border-[#e8e8f2] border-none p-0 shadow-none md:shadow-sm md:border">
										<CardHeader className="border-b border-[#e8e8f2] pb-0">
											<div className="flex gap-2 md:gap-4 lg:gap-8 relative overflow-x-auto scrollbar-hide">
												<div className="flex gap-2 md:gap-4 lg:gap-8 min-w-max px-8">
													{tabConfig.map((tab) => (
														<button
															key={tab.id}
															onClick={() => handleTabChange(tab.id as any)}
															className={`pb-4 text-xs md:text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
																activeTab === tab.id
																	? "text-gray-800 font-semibold"
																	: "text-[#848496] hover:text-gray-800"
															}`}
														>
															{tab.label}
															{activeTab === tab.id && (
																<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
															)}
														</button>
													))}
												</div>
											</div>
										</CardHeader>

										<CardContent className="p-4 md:p-6">
											{activeTab === "attendance" && (
												<EmployeeAttendance scope={{ type: "employee", employee }} />
											)}

											{activeTab === "general_info" && (
												<Card className=" bg-white border-none p-0 shadow-none md:shadow-sm md:border md:border-[#e8e8f2] ">
													<CardContent className="p-4 md:p-6 space-y-6">
														<div className="space-y-6 !flex !items-center ">
															<div className="flex items-center gap-8">
																<p className="flex items-center font-semibold gap-2">
																	<Mail className="w-5 h-5" />
																	Company Email
																</p>
																<p className="text-sm font-semibold text-gray-900">
																	{employee.company_email?.email || "Not set"}
																</p>
																{!employee.company_email?.email && (
																	<Button
																		onClick={handleGenerateCompanyEmail}
																		disabled={generatingEmail}
																		size={"sm"}
																		className="rounded-full"
																	>
																		{generatingEmail ? "Generating..." : "Generate"}
																	</Button>
																)}
															</div>
															<div className="!flex !items-center justify-start"></div>
														</div>
														<div>
															<div className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
																{employee.salary && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Salary
																		</label>
																		<p className="text-gray-800 font-medium">
																			{formatCurrency(employee.salary)}
																		</p>
																	</div>
																)}
																{employee.payroll_branch && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Payroll Branch
																		</label>
																		<p className="text-gray-800 font-medium">
																			{employee.payroll_branch.branch_name}
																		</p>
																	</div>
																)}

																{employee.user?.branches.length ? (
																	<div className="px-2 py-4">
																		<label className="text-sm font-medium text-[#848496]">
																			Attached Branches
																		</label>
																		{employee.user.branches.map((branch, idx) => (
																			<p key={idx} className="text-[#848496] text-sm break-all">
																				{branch.branch_name}
																			</p>
																		))}
																	</div>
																) : (
																	<></>
																)}
																{employee.date_of_joining && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Date of Joining
																		</label>
																		<p className="text-gray-800 font-medium">
																			{formatDate(employee.date_of_joining)}
																		</p>
																	</div>
																)}
																{employee.date_of_birth && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Date of Birth
																		</label>
																		<p className="text-gray-800 font-medium">
																			{formatDate(employee.date_of_birth)}
																		</p>
																	</div>
																)}
																{employee.nin && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			NIN
																		</label>
																		<p className="text-gray-800 font-medium break-all">
																			{employee.nin}
																		</p>
																	</div>
																)}
																{employee.tin && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			TIN
																		</label>
																		<p className="text-gray-800 font-medium break-all">
																			{employee.tin}
																		</p>
																	</div>
																)}
																{employee.nssf_no && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			NSSF No.
																		</label>
																		<p className="text-gray-800 font-medium break-all">
																			{employee.nssf_no}
																		</p>
																	</div>
																)}
																{employee.marital_status && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Marital Status
																		</label>
																		<p className="text-gray-800 font-medium">
																			{getMaritalStatusLabel(employee.marital_status)}
																		</p>
																	</div>
																)}

																{employee.spouse && employee.marital_status == "married" && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Spouse
																		</label>
																		<div className="py-4">
																			<p className="text-gray-800 font-medium">
																				Name : {employee.spouse.name}
																			</p>
																			<p className="text-gray-800 font-medium">
																				Phone number : {employee.spouse.phone_number}
																			</p>
																		</div>
																	</div>
																)}
																{employee.children.length ? (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Children
																		</label>
																		<div className="text-gray-800 font-medium grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
																			{employee.children.map((child, idx) => (
																				<span key={idx}>
																					{child.name} ({child.gender})
																				</span>
																			))}
																		</div>
																	</div>
																) : (
																	<></>
																)}

																{employee.bank_accounts.length ? (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Bank Accounts
																		</label>
																		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
																			{employee.bank_accounts.map((account, idx) => (
																				<div key={idx}>
																					{account.bank && (
																						<p className="text-gray-800 font-medium break-words">
																							{account.account_name}
																						</p>
																					)}
																					{account.account_number && (
																						<p className="text-[#848496] text-sm break-all">
																							A/C: {account.account_number}
																						</p>
																					)}
																				</div>
																			))}
																		</div>
																	</div>
																) : (
																	<></>
																)}
																{employee.country && (
																	<div>
																		<label className="text-sm font-medium text-[#848496]">
																			Country
																		</label>
																		<p className="text-gray-800 font-medium">{employee.country}</p>
																	</div>
																)}
															</div>
														</div>

														{employee.educations.length ? (
															<div className="border-t border-[#e8e8f2] pt-6">
																<h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
																	<GraduationCap className="w-5 h-5" />
																	Education
																</h3>
																<div className="space-y-3">
																	{employee.educations.map((education, idx) => (
																		<div key={idx}>
																			<div className="flex items-center justiify-start gap-8">
																				<label className="text-xs text-[#848496]">
																					Institution
																				</label>
																				<p className="text-gray-800 font-medium capitalize">
																					{education.institution}
																				</p>
																			</div>
																			<div className="flex items-center justiify-start gap-8">
																				<label className="text-xs text-[#848496]">Year</label>
																				<p className="text-gray-800 font-medium capitalize">
																					{education.year}
																				</p>
																			</div>
																			<div className="flex items-center justiify-start gap-8">
																				<label className="text-xs text-[#848496]">Award</label>
																				<p className="text-gray-800 font-medium capitalize">
																					{education.qualification?.name || ""}
																				</p>
																			</div>
																		</div>
																	))}
																</div>
															</div>
														) : (
															<></>
														)}

														{employee.work_experiences.length ? (
															<div>
																<label className="text-xs text-[#848496]">Work Experience</label>
																<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
																	{employee.work_experiences.map((exp, idx) => (
																		<div key={idx} className="flex flex-col items-start gap-4">
																			<label className="text-xs text-[#848496]">
																				Company : {exp.company}
																			</label>
																			<label className="text-xs text-[#848496]">
																				Duration : {exp.duration}
																			</label>
																			<label className="text-xs text-[#848496]">
																				Position : {exp.position}
																			</label>
																			<label className="text-xs text-[#848496]">
																				Reason of Leave : {exp.reason_of_leave}
																			</label>
																		</div>
																	))}
																</div>
															</div>
														) : (
															<></>
														)}
														{employee.skills && (
															<div>
																<h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
																	<Award className="w-5 h-5" />
																	Skills
																</h4>
																<p className="text-gray-800">{employee.skills}</p>
															</div>
														)}
													</CardContent>
												</Card>
											)}

											{activeTab === "discipline" && (
												<EmployeeDiscipline
													employeeId={employeeId}
													institutionId={selectedInstitution?.id || 0}
												/>
											)}

											{activeTab === "leave" && (
												<div className="space-y-6">
													{/* Leave Sub-tabs */}
													<div className="border-b border-[#e8e8f2]">
														<div className="flex gap-8">
															<button
																onClick={() => setLeaveSubTab("balances")}
																className={`pb-3 text-sm font-medium transition-colors relative ${
																	leaveSubTab === "balances"
																		? "text-gray-800 font-semibold"
																		: "text-[#848496] hover:text-gray-800"
																}`}
															>
																Leave Balances
																{leaveSubTab === "balances" && (
																	<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
																)}
															</button>
															<button
																onClick={() => setLeaveSubTab("applications")}
																className={`pb-3 text-sm font-medium transition-colors relative ${
																	leaveSubTab === "applications"
																		? "text-gray-800 font-semibold"
																		: "text-[#848496] hover:text-gray-800"
																}`}
															>
																Leave Applications
																{leaveSubTab === "applications" && (
																	<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
																)}
															</button>
														</div>
													</div>

													{/* Leave Sub-tab Content */}
													{leaveSubTab === "balances" && (
														<EmployeeLeaveBalances
															employeeId={employeeId}
															institutionId={selectedInstitution?.id || 0}
														/>
													)}

													{leaveSubTab === "applications" && (
														<EmployeeLeaveApplications
															employeeId={employeeId}
															institutionId={selectedInstitution?.id || 0}
														/>
													)}
												</div>
											)}

											{activeTab === "assets" && (
												<div className="space-y-6">
													{/* Asset Sub-tabs */}
													<div className="border-b border-[#e8e8f2]">
														<div className="flex gap-8">
															<button
																onClick={() => setAssetSubTab("requests")}
																className={`pb-3 text-sm font-medium transition-colors relative ${
																	assetSubTab === "requests"
																		? "text-gray-800 font-semibold"
																		: "text-[#848496] hover:text-gray-800"
																}`}
															>
																Asset Requests
																{assetSubTab === "requests" && (
																	<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
																)}
															</button>
															<button
																onClick={() => setAssetSubTab("allocations")}
																className={`pb-3 text-sm font-medium transition-colors relative ${
																	assetSubTab === "allocations"
																		? "text-gray-800 font-semibold"
																		: "text-[#848496] hover:text-gray-800"
																}`}
															>
																Asset Allocations
																{assetSubTab === "allocations" && (
																	<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
																)}
															</button>
														</div>
													</div>

													{/* Asset Sub-tab Content */}
													{assetSubTab === "requests" && (
														<AssetRequests
															employeeId={employee.employee_id}
															isEmployeeView={true}
															showHeader={true}
															showCreateButton={true}
															showStats={true}
															compact={true}
														/>
													)}

													{assetSubTab === "allocations" && (
														<EmployeeAssetAllocations
															employeeId={employee.employee_id}
															institutionId={selectedInstitution?.id}
															showHeader={false}
															showStats={true}
															compact={false}
														/>
													)}
												</div>
											)}

											{activeTab === "payroll" && selectedInstitution && (
												<EmployeePayrollTable
													institutionId={selectedInstitution.id}
													scope={{ type: "employee", employeeId: employeeId }}
													showEmployeeName={false}
												/>
											)}

											{activeTab === "documents" && (
												<div className="space-y-6">
													{/* Documents Sub-tabs */}
													<div className="border-b border-[#e8e8f2]">
														<div className="flex gap-8">
															<button
																onClick={() => setDocumentsSubTab("contracts")}
																className={`pb-3 text-sm font-medium transition-colors relative ${
																	documentsSubTab === "contracts"
																		? "text-gray-800 font-semibold"
																		: "text-[#848496] hover:text-gray-800"
																}`}
															>
																Contracts
																{documentsSubTab === "contracts" && (
																	<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
																)}
															</button>
														</div>
													</div>

													{/* Document Sub-tab Content */}
													{documentsSubTab === "contracts" && (
														<ContractsTable
															searchTerm={searchTerm}
															scope={{ type: "employee", employeeId }}
														/>
													)}
												</div>
											)}

											{activeTab === "spotchecks" && employee && (
												<div className="space-y-6">
													{/* Spotcheck Sub-tabs */}
													<div className="border-b border-[#e8e8f2]">
														<div className="flex gap-8">
															<button
																onClick={() => setSpotcheckSubTab("spotchecks")}
																className={`pb-3 text-sm font-medium transition-colors relative ${
																	spotcheckSubTab === "spotchecks"
																		? "text-gray-800 font-semibold"
																		: "text-[#848496] hover:text-gray-800"
																}`}
															>
																<div className="flex items-center gap-2">
																	<Clock className="w-4 h-4" />
																	Spotchecks
																</div>
																{spotcheckSubTab === "spotchecks" && (
																	<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
																)}
															</button>
															<button
																onClick={() => setSpotcheckSubTab("configs")}
																className={`pb-3 text-sm font-medium transition-colors relative ${
																	spotcheckSubTab === "configs"
																		? "text-gray-800 font-semibold"
																		: "text-[#848496] hover:text-gray-800"
																}`}
															>
																<div className="flex items-center gap-2">
																	<Settings className="w-4 h-4" />
																	Spotcheck Configs
																</div>
																{spotcheckSubTab === "configs" && (
																	<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#162032]" />
																)}
															</button>
														</div>
													</div>

													{/* Spotcheck Sub-tab Content */}
													{spotcheckSubTab === "spotchecks" && (
														<EmployeeSpotchecks employee={employee} />
													)}

													{spotcheckSubTab === "configs" && (
														<div className="space-y-6">
															<div className="flex items-center justify-between border-b pb-4">
																<h2 className="text-2xl font-bold text-gray-900">
																	Employee Spotcheck Configuration
																</h2>
																<Button
																	onClick={handleCreateSpotcheckConfig}
																	className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
																>
																	<Plus className="w-4 h-4" />
																	<span>
																		{spotcheckSetting
																			? "Update Configuration"
																			: "Create Configuration"}
																	</span>
																</Button>
															</div>

															{/* Current Configuration Display */}
															{spotcheckSetting ? (
																<div className="bg-green-50 border border-green-200 rounded-lg p-6">
																	<div className="flex items-center justify-between mb-4">
																		<div className="flex items-center space-x-3">
																			<div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
																				<Settings className="w-4 h-4 text-white" />
																			</div>
																			<h3 className="text-lg font-semibold text-green-900">
																				Current Configuration
																			</h3>
																		</div>
																		<div className="flex gap-2">
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={handleCreateSpotcheckConfig}
																				className="text-green-700 border-green-300 hover:bg-green-100 bg-transparent"
																			>
																				<Edit className="w-4 h-4 mr-1" />
																				Edit
																			</Button>
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={handleDeleteSpotcheckConfig}
																				className="text-red-700 border-red-300 hover:bg-red-100 bg-transparent"
																				disabled={loadingSpotcheckConfig}
																			>
																				<Trash2 className="w-4 h-4 mr-1" />
																				Delete
																			</Button>
																		</div>
																	</div>
																	<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																		<div className="bg-white rounded-lg p-4 border border-green-200">
																			<div className="text-sm text-gray-600 mb-1">
																				Lower Threshold
																			</div>
																			<div className="text-lg font-semibold text-gray-900">
																				{spotcheckSetting.lower_threshold} minutes
																			</div>
																		</div>
																		<div className="bg-white rounded-lg p-4 border border-green-200">
																			<div className="text-sm text-gray-600 mb-1">
																				Upper Threshold
																			</div>
																			<div className="text-lg font-semibold text-gray-900">
																				{spotcheckSetting.upper_threshold} minutes
																			</div>
																		</div>
																		<div className="bg-white rounded-lg p-4 border border-green-200">
																			<div className="text-sm text-gray-600 mb-1">
																				Expires After
																			</div>
																			<div className="text-lg font-semibold text-gray-900">
																				{spotcheckSetting.expires_after_minutes} minutes
																			</div>
																		</div>
																		<div className="bg-white rounded-lg p-4 border border-green-200">
																			<div className="text-sm text-gray-600 mb-1">
																				Late Starts After
																			</div>
																			<div className="text-lg font-semibold text-gray-900">
																				{spotcheckSetting.late_starts_after_minutes} minutes
																			</div>
																		</div>
																	</div>
																</div>
															) : (
																<div className="bg-red-50 border border-red-200 rounded-lg p-6">
																	<div className="flex items-center space-x-3">
																		<div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
																			<Settings className="w-4 h-4 text-white" />
																		</div>
																		<div>
																			<h3 className="text-lg font-semibold text-yellow-900">
																				No Configuration Found
																			</h3>
																			<p className="text-sm text-yellow-700">
																				Create a spotcheck configuration for this employee to manage
																				spotcheck settings.
																			</p>
																		</div>
																	</div>
																</div>
															)}

															{/* Spotcheck Configuration Form Modal */}
															{isSpotcheckFormOpen && (
																<Dialog
																	open={isSpotcheckFormOpen}
																	onOpenChange={setIsSpotcheckFormOpen}
																>
																	<DialogContent className="sm:max-w-[600px] rounded-2xl border-0 shadow-2xl">
																		<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
																			<DialogTitle className="text-2xl font-bold text-gray-900">
																				{spotcheckSetting
																					? "Update Employee Spotcheck Configuration"
																					: "Create Employee Spotcheck Configuration"}
																			</DialogTitle>
																			<DialogDescription className="text-gray-600 text-base">
																				Configure spotcheck settings for{" "}
																				{employee?.name || "this employee"}.
																			</DialogDescription>
																		</DialogHeader>
																		<div className="grid grid-cols-1 gap-6 py-6">
																			<div className="space-y-3">
																				<Label
																					htmlFor="lower_threshold"
																					className="text-sm text-gray-800"
																				>
																					Lower Threshold (minutes) *
																				</Label>
																				<Input
																					id="lower_threshold"
																					type="number"
																					min="0"
																					value={spotcheckFormData.lower_threshold}
																					onChange={(e) =>
																						handleSpotcheckInputChange(
																							"lower_threshold",
																							Number.parseInt(e.target.value) || 0,
																						)
																					}
																					placeholder="Enter lower threshold"
																					disabled={loadingSpotcheckConfig}
																					className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
																				/>
																			</div>

																			<div className="space-y-3">
																				<Label
																					htmlFor="upper_threshold"
																					className="text-sm text-gray-800"
																				>
																					Upper Threshold (minutes) *
																				</Label>
																				<Input
																					id="upper_threshold"
																					type="number"
																					min="0"
																					value={spotcheckFormData.upper_threshold}
																					onChange={(e) =>
																						handleSpotcheckInputChange(
																							"upper_threshold",
																							Number.parseInt(e.target.value) || 0,
																						)
																					}
																					placeholder="Enter upper threshold"
																					disabled={loadingSpotcheckConfig}
																					className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
																				/>
																			</div>

																			<div className="space-y-3">
																				<Label
																					htmlFor="expires_after_minutes"
																					className="text-sm text-gray-800"
																				>
																					Expires After (minutes) *
																				</Label>
																				<Input
																					id="expires_after_minutes"
																					type="number"
																					min="0"
																					value={spotcheckFormData.expires_after_minutes}
																					onChange={(e) =>
																						handleSpotcheckInputChange(
																							"expires_after_minutes",
																							Number.parseInt(e.target.value) || 0,
																						)
																					}
																					placeholder="Enter expiration time"
																					disabled={loadingSpotcheckConfig}
																					className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
																				/>
																			</div>

																			<div className="space-y-3">
																				<Label
																					htmlFor="late_starts_after_minutes"
																					className="text-sm text-gray-800"
																				>
																					Late Starts After (minutes) *
																				</Label>
																				<Input
																					id="late_starts_after_minutes"
																					type="number"
																					min="0"
																					value={spotcheckFormData.late_starts_after_minutes}
																					onChange={(e) =>
																						handleSpotcheckInputChange(
																							"late_starts_after_minutes",
																							Number.parseInt(e.target.value) || 0,
																						)
																					}
																					placeholder="Enter late start threshold"
																					disabled={loadingSpotcheckConfig}
																					className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
																				/>
																			</div>
																		</div>
																		<DialogFooter>
																			<Button
																				onClick={handleSaveSpotcheckConfig}
																				disabled={loadingSpotcheckConfig}
																				className="bg-primary rounded-full w-full"
																			>
																				{loadingSpotcheckConfig ? (
																					<>
																						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
																						Saving...
																					</>
																				) : spotcheckSetting ? (
																					"Update Configuration"
																				) : (
																					"Create Configuration"
																				)}
																			</Button>
																		</DialogFooter>
																	</DialogContent>
																</Dialog>
															)}

															{/* Delete Confirmation Modal */}
															<Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
																<DialogContent className="sm:max-w-[400px] rounded-2xl border-0 shadow-2xl">
																	<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
																		<DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
																			<div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
																				<Trash2 className="w-4 h-4 text-red-600" />
																			</div>
																			Delete Configuration
																		</DialogTitle>
																		<DialogDescription className="text-gray-600 text-base">
																			Are you sure you want to delete the spotcheck configuration
																			for {employee?.name || "this employee"}? This action cannot be
																			undone.
																		</DialogDescription>
																	</DialogHeader>
																	<DialogFooter className="flex gap-3 pt-6">
																		<Button
																			variant="outline"
																			onClick={() => setIsDeleteModalOpen(false)}
																			disabled={loadingSpotcheckConfig}
																			className="flex-1 rounded-full"
																		>
																			Cancel
																		</Button>
																		<Button
																			variant="destructive"
																			onClick={confirmDeleteSpotcheckConfig}
																			disabled={loadingSpotcheckConfig}
																			className="flex-1 rounded-full"
																		>
																			{loadingSpotcheckConfig ? (
																				<>
																					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
																					Deleting...
																				</>
																			) : (
																				<>
																					<Trash2 className="w-4 h-4 mr-2" />
																					Delete
																				</>
																			)}
																		</Button>
																	</DialogFooter>
																</DialogContent>
															</Dialog>
														</div>
													)}
												</div>
											)}

											{activeTab === "penalties" && employee && (
												<EmployeePenalties employee={employee} />
											)}

											{activeTab === "shifts" && employee && <EmployeeShifts employee={employee} />}
											{activeTab === "performance" && (
												<EmployeeBonusPointsTable employee={employee} />
											)}

											{/* {activeTab === "company_email" && employee && (

											)} */}
										</CardContent>
									</Card>
								</div>
							</div>

							<DocumentGenerationDialog
								open={showDocumentDialog}
								onOpenChange={setShowDocumentDialog}
								contextId={Number.parseInt(employeeId)}
								context="employee"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
