"use client";

import type { IDepartment, IJobPosition } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Search, Users, ArrowLeft, Building2, UserPlus, Filter, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { getDepartment, showErrorToast } from "@/lib/utils";
import RichTextDisplay from "@/components/common/rich-text-display";
import { EmployeesTable } from "@/app/(main_app)/(dashboard)/employees/employee-list/employees-table";
import { JobPositionsTable } from "@/components/common/tables/job-positions/job-positions-table";
import { RecruitmentHistoryTable } from "@/components/common/tables/recruitment/recruitment-history-table";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function DepartmentDetailView() {
	const router = useRouter();
	const params = useParams();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);

	const departmentId = params?.id ? parseInt(params.id as string) : null;

	const [department, setDepartment] = useState<IDepartment | null>(null);
	const [currentJobPositions, setCurrentJobPostions] = useState<IJobPosition[]>([]);

	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState("");

	const [employeesSearchTerm, setEmployeesSearchTerm] = useState("");
	const [recruitmentSearchTerm, setRecruitmentSearchTerm] = useState("");
	const [jobPositionsSearchTerm, setJobPositionsSearchTerm] = useState("");
	const [activeTab, setActiveTab] = useState("overview");
	const [statusFilter, setStatusFilter] = useState("all");

	useDocumentTitle(department ? `${department.name} - Department` : "Department Details");

	// Effects
	useEffect(() => {
		if (!selectedInstitution || !selectedBranch) {
			router.push("/dashboard");

			return;
		}

		if (!departmentId) {
			setError("Department ID is required");

			return;
		}

		fetchDepartmentData();
	}, [selectedBranch, selectedInstitution, router, departmentId]);

	const fetchDepartmentData = async () => {
		if (!selectedInstitution || !departmentId) return;

		try {
			setIsRefreshing(true);
			setError("");

			const department = await getDepartment({ departmentId });

			setDepartment(department);
		} catch (err) {
			setError("Failed to fetch department data");
			showErrorToast({ error: err, defaultMessage: "Failed to load department data" });
		} finally {
			setIsRefreshing(false);
		}
	};

	if (isRefreshing) {
		return (
			<div className="w-full h-full p-6 space-y-6">
				<div className="flex items-center gap-4">
					<Button
						onClick={() => {
							router.back();
						}}
						className="rounded-full aspect-square"
						variant="ghost"
						disabled
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
					</Button>
					<div className="h-6 w-px bg-border" />
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 w-10 rounded-lg" />
						<div>
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-4 w-64 mt-1" />
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => (
						<Card key={i}>
							<CardContent className="p-4">
								<Skeleton className="h-4 w-24 mb-2" />
								<Skeleton className="h-8 w-16" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full h-full p-6 flex items-center justify-center">
				<div className="text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<div className="flex items-center justify-between gap-8">
						<Button onClick={() => fetchDepartmentData()}>Retry</Button>

						<Button onClick={() => router.push("/admin/departments")} className="mt-4">
							Back to Departments
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-full min-h-screen p-3 md:p-6 bg-white rounded-lg py-8">
			<ApprovableInstancePageLayout instance={department} onInstanceRefresh={fetchDepartmentData}>
				<div className="flex justify-between items-start gap-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-3">
							{/* Header */}

							<div className="flex flex-col items-start justify-start gap-y-4">
								<div className="flex items-center justify-start gap-1">
									<Button
										variant="ghost"
										onClick={() => router.push("/admin/departments")}
										className="flex items-center gap-2 text-muted-foreground hover:text-foreground rounded-full aspect-square"
									>
										<ArrowLeft className="h-4 w-4" />
									</Button>

									{department && <h1 className="text-2xl font-bold">{department.name}</h1>}
								</div>
								{department && (
									<div className="flex items-start justify-start gap-2">
										<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
											<Building2 className="h-5 w-5 text-primary" />
										</div>
										<RichTextDisplay
											className={
												"text-xs md:text-sm" + !department.description
													? "text-muted-foreground py-2"
													: ""
											}
											content={department.description || "No description"}
										/>
									</div>
								)}
							</div>
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2  md:flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={fetchDepartmentData}
							disabled={isRefreshing}
						>
							<RefreshCw className={`h-4 w-4 md:mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
							<span className="hidden md:inline">Refresh</span>
						</Button>

						<Button size="sm" onClick={() => router.push(`/employees/employee-list/`)}>
							<UserPlus className="h-4 w-4 md:mr-2" />
							<span className="hidden md:inline">Add Employee</span>
						</Button>
					</div>
				</div>

				{/* Tabs */}
				<Tabs
					value={activeTab}
					onValueChange={(tab) => {
						setActiveTab(tab);
						setStatusFilter("all");
					}}
					className="space-y-6"
				>
					<TabsList className="grid w-full grid-cols-4 lg:w-[500px] mt-12">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="employees">Employees</TabsTrigger>
						<TabsTrigger value="positions">Job Positions/Titles</TabsTrigger>
						<TabsTrigger value="recruitment">Recruitment</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent value="overview" className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<Card className="shadow-sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Building2 className="h-5 w-5" />
										Department Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{selectedInstitution && selectedBranch && (
										<div className="grid grid-cols-2 gap-4">
											<div>
												<p className="text-sm font-medium text-muted-foreground">Institution</p>
												<p className="text-sm">{selectedInstitution.institution_name}</p>
											</div>
											<div>
												<p className="text-sm font-medium text-muted-foreground">Branch</p>
												<p className="text-sm">{selectedBranch.branch_name}</p>
											</div>
										</div>
									)}
									{department && (
										<div>
											<p className="text-sm font-medium text-muted-foreground">Description</p>
											<RichTextDisplay
												className={
													"text-sm" + !department.description ? "text-muted-foreground italic" : ""
												}
												content={department.description || "No description"}
											/>
										</div>
									)}
								</CardContent>
							</Card>

							<Card className="shadow-sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Users className="h-5 w-5" />
										Quick Stats
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="flex items-center justify-between text-sm">
											<span>Total Employees</span>
											{/* <span className="font-semibold">{departmentEmployees.length}</span> */}
										</div>
										<div className="flex items-center justify-between text-sm">
											<span>Active Employees</span>
											<span className="font-semibold">
												{/* {departmentEmployees.filter((e) => e.is_active).length} */}
											</span>
										</div>
										<div className="flex items-center justify-between text-sm">
											<span>Job Positions/Titles</span>
											<span className="font-semibold">{currentJobPositions.length}</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* Employees Tab */}
					<TabsContent value="employees" className="space-y-6">
						<Card className="shadow-sm border-none p-2">
							<CardHeader>
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
									<div>
										<CardTitle>Department Employees</CardTitle>
									</div>
									<div className="flex items-center gap-2">
										<div className="relative">
											<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
											<Input
												placeholder="Search employees..."
												value={employeesSearchTerm}
												onChange={(e) => setEmployeesSearchTerm(e.target.value)}
												className="pl-10 w-[250px]"
											/>
										</div>
										<Select value={statusFilter} onValueChange={setStatusFilter}>
											<SelectTrigger className="w-[130px]">
												<Filter className="h-4 w-4 mr-2" />
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Status</SelectItem>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="inactive">Inactive</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								<EmployeesTable searchTerm={employeesSearchTerm} />
							</CardContent>
						</Card>
					</TabsContent>

					{/* Job Positions/Titles Tab */}
					<TabsContent value="positions" className="space-y-6">
						<Card className="shadow-sm border-none p-2">
							<CardHeader>
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
									<div>
										<CardTitle>Job Positions/Titles</CardTitle>
										<p className="text-sm text-muted-foreground">
											Manage positions available in this department
										</p>
									</div>
									<div className="flex items-center gap-2">
										<div className="relative">
											<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
											<Input
												placeholder="Search positions..."
												value={jobPositionsSearchTerm}
												onChange={(e) => setJobPositionsSearchTerm(e.target.value)}
												className="pl-10 w-[250px]"
											/>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								<div className="">
									<JobPositionsTable
										searchTerm={jobPositionsSearchTerm}
										setCurrentJobPostions={setCurrentJobPostions}
									/>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Recruitment History Tab */}
					<TabsContent value="recruitment" className="space-y-6">
						<Card className="shadow-sm border-none p-2">
							<CardHeader>
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
									<div>
										<CardTitle>Recruitment History</CardTitle>
									</div>
									<div className="flex items-center gap-2">
										<div className="relative">
											<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
											<Input
												placeholder="Search recruitment history..."
												value={recruitmentSearchTerm}
												onChange={(e) => setRecruitmentSearchTerm(e.target.value)}
												className="pl-10 w-[250px]"
											/>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								<RecruitmentHistoryTable searchTerm={recruitmentSearchTerm} />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</ApprovableInstancePageLayout>
		</div>
	);
}
