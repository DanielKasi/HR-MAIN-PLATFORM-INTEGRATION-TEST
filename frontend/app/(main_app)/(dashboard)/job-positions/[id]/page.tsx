"use client";

import type { IJobPosition } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
	Briefcase,
	ArrowLeft,
	Edit,
	Users,
	Building2,
	CheckCircle,
	XCircle,
	Search,
	User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { getJobPosition } from "@/lib/utils";
import { formatCurrency } from "@/lib/helpers";
import RichTextDisplay from "@/components/common/rich-text-display";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

export default function JobPositionDetailsPage() {
	const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [activeTab, setActiveTab] = useState("overview");
	const [searchTerm, setSearchTerm] = useState("");

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

		fetchJobPosition();
	}, [selectedInstitution, selectedBranch, jobPositionId, router]);

	const fetchJobPosition = async () => {
		try {
			setIsLoading(true);
			setError("");
			const fetchedJobPosition = await getJobPosition({ jobPositionId });

			if (fetchedJobPosition) {
				setJobPosition(fetchedJobPosition);
			}
		} catch (err) {
			setError("Failed to fetch job position/title details");
			toast.error("Failed to load job position/title details");
		} finally {
			setIsLoading(false);
		}
	};

	const handleBack = () => {
		router.back();
	};

	const handleEdit = () => {
		router.push(`/job-positions/${jobPositionId}/edit`);
	};

	const handleDownloadFile = (fileUrl: string, fileName: string) => {
		// Create a temporary link to download the file
		const link = document.createElement("a");

		link.href = fileUrl;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Helper for employee initials
	const getInitials = (name: string) => {
		if (!name) return "NA";

		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	// Filtered employees
	const employees = Array.isArray(jobPosition?.employees) ? jobPosition.employees : [];
	const filteredEmployees = employees.filter((emp: any) => {
		const fullName = emp.user?.fullname || emp.email || "";

		return (
			fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
		);
	});

	if (!selectedInstitution || !selectedBranch) {
		return <div>Loading...</div>;
	}

	if (isLoading) {
		return (
			<div className="w-full h-full p-6">
				<div className="w-full space-y-6">
					{/* Header Skeleton */}
					<div className="flex items-center justify-between">
						<Skeleton className="h-9 w-32" />
						<Skeleton className="h-9 w-20" />
					</div>

					{/* Main Card Skeleton */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="space-y-2">
									<Skeleton className="h-7 w-64" />
									<Skeleton className="h-4 w-48" />
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<Skeleton className="h-20 w-full" />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Skeleton className="h-32 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	if (error || !jobPosition) {
		return (
			<div className="w-full h-full p-6">
				<div className="w-full max-w-6xl mx-auto space-y-6">
					<Card className="p-12 text-center">
						<Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Job Position / Title Not Found</h3>
						<p className="text-muted-foreground mb-4">{error}</p>
						<Button onClick={handleBack}>Go Back</Button>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full p-4 rounded-xl bg-white">
			<div className="w-full space-y-6">
				<div
					className={` gap-6 ${jobPosition?.approval_status !== "active" && jobPosition.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
				>
					{jobPosition?.approvals && jobPosition.approvals.length > 0 && (
						<div className="order-1 lg:order-2">
							<ApprovalWorkflow
								approvals={jobPosition.approvals}
								instance_approval_status={jobPosition.approval_status}
								onRefresh={fetchJobPosition}
							/>
						</div>
					)}
					{/* Main Details Card */}
					<Card
						className={` shadow-none border-none bg-transparent ${jobPosition.approval_status !== "active" && jobPosition.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
					>
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="flex flex-col gap-4">
									<div className="flex flex-wrap items-center justify-start gap-4">
										<Button
											variant="ghost"
											size="sm"
											onClick={handleBack}
											className="flex items-center gap-2 rounded-full aspect-square"
										>
											<ArrowLeft className="h-4 w-4" />
										</Button>

										<CardTitle className="text-2xl">{jobPosition.name}</CardTitle>

										<Badge variant="outline" className="flex items-center gap-1">
											<Building2 className="h-3 w-3" />
											{jobPosition.department_details?.name}
										</Badge>
										<Badge variant="outline" className="flex items-center gap-1">
											<Users className="h-3 w-3" />
											{employees.length} Employees
										</Badge>
									</div>
									<div className="flex items-center justify-start gap-2">
										<div className="flex flex-col items-start justify-start">
											{jobPosition.salary_min || jobPosition.salary_max ? (
												<p className="flex items-center gap-1 text-xl font-semibold text-gray-500">
													{formatCurrency(jobPosition.salary_min || 0)} -{" "}
													{formatCurrency(jobPosition.salary_max || 0)}
												</p>
											) : (
												<p className="flex items-center gap-1 text-xl font-semibold text-gray-500">
													No range set
												</p>
											)}
											<p className="text-sm text-muted-foreground">Salary Range</p>
										</div>
									</div>
								</div>
								<Button onClick={handleEdit} className="flex items-center gap-2">
									<Edit className="h-4 w-4" />
									Edit Position
								</Button>
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Tabs */}
							<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
								<TabsList className="grid w-full grid-cols-2 lg:w-[300px] mb-4">
									<TabsTrigger value="overview">Overview</TabsTrigger>
									<TabsTrigger value="employees">Employees</TabsTrigger>
								</TabsList>

								{/* Overview Tab */}
								<TabsContent value="overview" className="space-y-6">
									{/* Job Description */}
									<div>
										<h3 className="text-lg font-semibold mb-1">Job Description</h3>
										<div className="bg-muted/50 p-4 rounded-lg">
											<RichTextDisplay
												className="text-sm leading-relaxed whitespace-pre-wrap"
												content={jobPosition.description || "No description provided"}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* Department Information */}
										<Card className="shadow-none border-none bg-gray-50">
											<CardHeader className="pb-3">
												<CardTitle className="text-lg flex items-center gap-2">
													<Building2 className="h-5 w-5" />
													Department Information
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-3">
												<div>
													<p className="text-sm font-medium">Department Name</p>
													<p className="text-sm text-muted-foreground">
														{jobPosition.department_details?.name}
													</p>
												</div>
												{jobPosition.department_details?.description && (
													<div>
														<p className="text-sm font-medium">Department Description</p>
														<p className="text-sm text-muted-foreground">
															{jobPosition.department_details?.description}
														</p>
													</div>
												)}
											</CardContent>
										</Card>
										{/* Reporting Structure */}
										<Card className="shadow-none border-none bg-gray-50">
											<CardHeader className="pb-3">
												<CardTitle className="text-lg flex items-center gap-2">
													<Users className="h-5 w-5" />
													Reporting Structure
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-3">
												{jobPosition.reports_to_details ? (
													<>
														<div>
															<p className="text-sm font-medium">Reports To</p>
															<p className="text-sm text-muted-foreground">
																{jobPosition.reports_to_details.name}
															</p>
														</div>
														<div>
															<p className="text-sm font-medium">Manager Email</p>
															<p className="text-sm text-muted-foreground">
																{jobPosition.reports_to_details.email}
															</p>
														</div>
														<div>
															<p className="text-sm font-medium">Manager Department</p>
															<p className="text-sm text-muted-foreground">
																{jobPosition.reports_to_details.department}
															</p>
														</div>
													</>
												) : (
													<div className="text-center py-4">
														<User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
														<p className="text-sm text-muted-foreground">
															No direct reporting manager
														</p>
														<p className="text-xs text-muted-foreground">
															This is likely a senior position
														</p>
													</div>
												)}
											</CardContent>
										</Card>
									</div>
								</TabsContent>

								{/* Employees Tab */}
								<TabsContent value="employees" className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<div className="relative">
											<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
											<Input
												placeholder="Search employees..."
												value={searchTerm}
												onChange={(e) => setSearchTerm(e.target.value)}
												className="pl-10 w-[250px]"
											/>
										</div>
									</div>
									{filteredEmployees.length === 0 ? (
										<div className="p-12 text-center">
											<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
											<h3 className="text-lg font-semibold mb-2">No employees found</h3>
										</div>
									) : (
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Employee</TableHead>
														<TableHead>Email</TableHead>
														<TableHead>Phone</TableHead>
														<TableHead>Join Date</TableHead>
														<TableHead>Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredEmployees.map((emp: any) => (
														<TableRow key={emp.id}>
															<TableCell>
																<div className="flex items-center gap-3">
																	<Avatar className="h-8 w-8">
																		<AvatarImage src={emp.employee_profile_picture || ""} />
																		<AvatarFallback className="text-xs">
																			{getInitials(emp.user?.fullname || emp.email || "")}
																		</AvatarFallback>
																	</Avatar>
																	<div>
																		<p className="font-medium">{emp.user?.fullname || emp.email}</p>
																	</div>
																</div>
															</TableCell>
															<TableCell className="text-sm">{emp.email}</TableCell>
															<TableCell className="text-sm">{emp.phone_number}</TableCell>
															<TableCell className="text-sm">
																{emp.date_of_joining
																	? new Date(emp.date_of_joining).toLocaleDateString()
																	: "-"}
															</TableCell>
															<TableCell>
																{emp.is_active ? (
																	<Badge className="bg-green-50 text-green-700 border-green-200">
																		<CheckCircle className="w-3 h-3 mr-1" />
																		Active
																	</Badge>
																) : (
																	<Badge className="bg-gray-50 text-gray-700 border-gray-200">
																		<XCircle className="w-3 h-3 mr-1" />
																		Inactive
																	</Badge>
																)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									)}
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
		// </div>
	);
}
