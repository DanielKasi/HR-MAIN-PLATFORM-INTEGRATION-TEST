"use client";

import type { IUser } from "@/types";
import type { IAttendance, IEmployee } from "@/types/types.utils";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Trash2 } from "lucide-react";

import { AddBranchForm } from "./add-branch";
import { EditUserRoles } from "./edit-user-roles";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { capitalizeEachWord } from "@/lib/helpers";
import apiRequest, { apiDelete } from "@/lib/apiRequest";
import { AttendanceAPI, employeeAPI } from "@/lib/utils";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

export default function UserProfilePage() {
	const params = useParams();
	const router = useRouter();
	const userId = params.userId as string;
	const [user, setUser] = useState<IUser | null>(null);
	const [employee, setEmployee] = useState<IEmployee | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [activeTab, setActiveTab] = useState("branches");

	// console.log("Employee", employee)

	const fetchUserDetails = async () => {
		setLoading(true);
		try {
			const [userResponse, employeeResponse] = await Promise.all([
				apiRequest.get(`user/${userId}/`),
				employeeAPI.getByUserId({ user_id: Number(userId) }).catch(() => null),
			]);

			// console.log("user data", userResponse);
			// console.log("employee data", employeeResponse)
			setUser(userResponse.data);
			setEmployee(employeeResponse);
			setError("");
		} catch (error: any) {
			setError(error.message || "Failed to fetch user details");
		} finally {
			setLoading(false);
		}
	};

	const handleRemoveBranch = async (branchId: number) => {
		try {
			await apiDelete(`institution/branch/user/${userId}/${branchId}/`);
			fetchUserDetails();
		} catch (error: any) {
			setError(error.message || "Failed to remove branch");
		}
	};

	useEffect(() => {
		if (userId) {
			fetchUserDetails();
		}
	}, [userId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">Loading user details...</div>
			</div>
		);
	}

	if (error) {
		return (
			<Alert className="mb-4" variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	if (!user) {
		return (
			<Alert className="mb-4">
				<AlertDescription>User not found</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="flex flex-col gap-6 bg-white rounded-lg min-h-screen p-6">
			<div className="flex items-center gap-2">
				<Button
					className="border rounded-full h-10 w-10 flex items-center justify-center"
					size="sm"
					variant="ghost"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h1 className="text-2xl">User Profile</h1>
			</div>

			<div
				className={` gap-6 ${user?.approval_status !== "active" && user?.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
			>
				{user?.approvals && user.approvals.length > 0 && (
					<div className="order-1 lg:order-2">
						<ApprovalWorkflow
							approvals={user.approvals}
							instance_approval_status={user.approval_status}
							onRefresh={fetchUserDetails}
						/>
					</div>
				)}

				<div
					className={`${user?.approval_status !== "active" && user?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
				>
					<Card className="border-none shadow-none">
						<CardContent className="p-0">
							<div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
								<Avatar className="h-20 w-20 bg-[#f0f0f0]">
									<AvatarFallback className="text-xl text-[#666]">
										{user.fullname?.substring(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="space-y-1 flex-1">
									<div className="flex items-start justify-between">
										<div>
											<h3 className="text-2xl font-semibold">
												{capitalizeEachWord(user.fullname || "")}
											</h3>
											<p className="text-sm text-[#666]">{user.email}</p>
											<div className="flex items-center gap-2 pt-2">
												<Badge
													className={
														user.is_active
															? "bg-primary text-white font-normal hover:bg-primary"
															: "bg-[#ef4444] text-white font-normal hover:bg-[#ef4444]"
													}
												>
													{user.is_active ? "Active" : "Inactive"}
												</Badge>
												{user.roles && user.roles.length > 0 && (
													<Badge
														className="bg-white text-[#666] font-normal border-[#e5e7eb]"
														variant="outline"
													>
														{capitalizeEachWord(user.roles[0].name)}
													</Badge>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="border-t border-[#e5e7eb]">
								<div className="flex border-b border-[#e5e7eb]">
									<button
										className={`px-6 py-3 text-sm font-medium ${
											activeTab === "branches"
												? "border-b-2 border-primary text-primary"
												: "text-[#666]"
										}`}
										onClick={() => setActiveTab("branches")}
									>
										Branches
									</button>
									<button
										className={`px-6 py-3 text-sm font-medium ${
											activeTab === "permissions"
												? "border-b-2 border-primary text-primary"
												: "text-[#666]"
										}`}
										onClick={() => setActiveTab("permissions")}
									>
										Permissions / role details
									</button>
									<button
										className={`px-6 py-3 text-sm font-medium ${
											activeTab === "attendance"
												? "border-b-2 border-primary text-primary"
												: "text-[#666]"
										}`}
										onClick={() => setActiveTab("attendance")}
									>
										Attendance
									</button>
								</div>

								{activeTab === "branches" && (
									<div className="p-6">
										<div className="flex justify-between items-center mb-4">
											<h3 className="text-lg font-medium">Branch Access</h3>
											<AddBranchForm
												userId={Number.parseInt(userId)}
												onBranchAdded={fetchUserDetails}
											/>
										</div>
										{user.branches && user.branches.length > 0 ? (
											<div className="space-y-3">
												{user.branches.map((branch) => (
													<div
														key={branch.id}
														className="flex items-center justify-between p-3 border rounded-md border-[#e5e7eb] bg-white"
													>
														<div>
															<div className="font-medium">{branch.branch_name}</div>
															<div className="text-sm text-[#666]">{branch.branch_location}</div>
														</div>
														<Button
															className="text-[#ef4444] hover:bg-[#fef2f2]"
															size="icon"
															title="Remove from branch"
															variant="ghost"
															onClick={() =>
																branch.id !== undefined && handleRemoveBranch(branch.id)
															}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												))}
											</div>
										) : (
											<div className="text-center py-4 text-[#666]">No branches assigned</div>
										)}
									</div>
								)}

								{activeTab === "permissions" && (
									<div className="p-6">
										<div className="flex justify-between items-center mb-4">
											<h3 className="text-lg font-medium">Role & Permissions</h3>
											<EditUserRoles user={user} />
										</div>
										{user.roles && user.roles.length > 0 ? (
											<div className="space-y-4">
												<div>
													<h3 className="text-lg font-medium">
														{capitalizeEachWord(user.roles[0].name)}
													</h3>
													{user.roles[0].description && (
														<p className="text-sm text-[#666] mt-1">{user.roles[0].description}</p>
													)}
												</div>

												{user.roles[0].permissions_details &&
												user.roles[0].permissions_details.length > 0 ? (
													<div className="space-y-3 mt-4">
														{user.roles[0].permissions_details.map((permission) => (
															<div
																key={permission.id}
																className="flex items-start gap-3 p-3 border rounded-md border-[#e5e7eb] bg-white"
															>
																<div className="mt-0.5 bg-[#dcfce7] rounded-full p-1">
																	<Check className="h-3 w-3 text-[#10b981]" />
																</div>
																<div>
																	<div className="font-medium">{permission.permission_name}</div>
																	{permission.permission_description && (
																		<div className="text-sm text-[#666] mt-1">
																			{permission.permission_description}
																		</div>
																	)}
																</div>
															</div>
														))}
													</div>
												) : (
													<div className="text-center py-4 text-[#666]">
														No specific permissions
													</div>
												)}
											</div>
										) : (
											<div className="text-center py-4 text-[#666]">No roles assigned</div>
										)}
									</div>
								)}

								{activeTab === "attendance" && (
									<div className="p-6">
										<h3 className="text-lg font-medium mb-4">Attendance Records</h3>
										{employee ? (
											<PaginatedTableWrapper<IAttendance>
												fetchFirstPage={async () => {
													return await AttendanceAPI.fetchAttendanceRecordsByEmployee({
														employee_id: employee.id,
														page: 1,
													});
												}}
												fetchFromUrl={({ url }) => AttendanceAPI.fetchAttendanceRecordsFromUrl(url)}
												deps={[employee.id]}
												className=""
												footerClassName="pt-4"
											>
												{({ data: attendanceData, loading: attendanceLoading, refresh }) => {
													if (attendanceLoading) {
														return (
															<div className="flex items-center justify-center h-32">
																<div className="text-center text-[#666]">
																	Loading attendance records...
																</div>
															</div>
														);
													}

													if (!attendanceData?.results || attendanceData.results.length === 0) {
														return (
															<div className="text-center py-8 text-[#666]">
																No attendance records found
															</div>
														);
													}

													return (
														<>
															<div className="overflow-x-auto">
																<table className="w-full border-collapse">
																	<thead>
																		<tr className="bg-[#f9f9f9] text-[#666]">
																			<th className="text-left p-3 border-b border-[#e5e7eb]">
																				Date
																			</th>
																			<th className="text-left p-3 border-b border-[#e5e7eb]">
																				Check In
																			</th>
																			<th className="text-left p-3 border-b border-[#e5e7eb]">
																				Check Out
																			</th>
																			<th className="text-left p-3 border-b border-[#e5e7eb]">
																				Status
																			</th>
																			<th className="text-left p-3 border-b border-[#e5e7eb]">
																				Overtime
																			</th>
																		</tr>
																	</thead>
																	<tbody>
																		{attendanceData.results.map((record) => (
																			<tr key={record.id} className="border-b border-[#e5e7eb]">
																				<td className="p-3">
																					{new Date(record.date).toLocaleDateString("en-US", {
																						day: "numeric",
																						month: "short",
																						year: "numeric",
																					})}
																				</td>
																				<td className="p-3">
																					{record.check_in_time
																						? new Date(
																								`2000-01-01T${record.check_in_time}`,
																							).toLocaleTimeString("en-US", {
																								hour: "numeric",
																								minute: "2-digit",
																								hour12: true,
																							})
																						: "-"}
																				</td>
																				<td className="p-3">
																					{record.check_out_time
																						? new Date(
																								`2000-01-01T${record.check_out_time}`,
																							).toLocaleTimeString("en-US", {
																								hour: "numeric",
																								minute: "2-digit",
																								hour12: true,
																							})
																						: "-"}
																				</td>
																				<td className="p-3">
																					<Badge
																						className={
																							record.status === "approved"
																								? "bg-[#10b981] text-white"
																								: record.status === "rejected"
																									? "bg-[#ef4444] text-white"
																									: "bg-[#f59e0b] text-white"
																						}
																					>
																						{record.status.charAt(0).toUpperCase() +
																							record.status.slice(1)}
																					</Badge>
																				</td>
																				<td className="p-3">
																					{record.overtime_hours
																						? `${record.overtime_hours}h`
																						: "-"}
																				</td>
																			</tr>
																		))}
																	</tbody>
																</table>
															</div>
														</>
													);
												}}
											</PaginatedTableWrapper>
										) : (
											<div className="text-center py-8 text-[#666]">
												No employee record found for this user
											</div>
										)}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
