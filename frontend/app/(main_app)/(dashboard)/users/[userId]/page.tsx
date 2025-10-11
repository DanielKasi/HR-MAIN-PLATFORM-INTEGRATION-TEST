"use client";

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
import { apiDelete } from "@/lib/apiRequest";
import { EMPLOYEE_API } from "@/lib/utils";

import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function UserProfilePage() {
	const params = useParams();
	const router = useRouter();
	const userId = params.userId as string;
	const [employee, setEmployee] = useState<IEmployee | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [activeTab, setActiveTab] = useState<"branches" | "permissions">("branches");

	const fetchUserDetails = async () => {
		setLoading(true);
		try {
			const employeeResponse = await EMPLOYEE_API.getByUserId({ user_id: Number(userId) }).catch(
				() => null,
			);

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

			<ApprovableInstancePageLayout instance={employee} onInstanceRefresh={fetchUserDetails}>
				<Card className="border-none shadow-none">
					<CardContent className="p-0">
						<div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
							<Avatar className="h-20 w-20 bg-[#f0f0f0]">
								<AvatarFallback className="text-xl text-[#666]">
									{employee?.user?.fullname?.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="space-y-1 flex-1">
								<div className="flex items-start justify-between">
									<div>
										<h3 className="text-2xl font-semibold">
											{capitalizeEachWord(employee?.user?.fullname || "")}
										</h3>
										<p className="text-sm text-[#666]">{employee?.user?.email}</p>
										<div className="flex items-center gap-2 pt-2">
											<Badge
												className={
													employee?.user?.is_active
														? "bg-primary text-white font-normal hover:bg-primary"
														: "bg-[#ef4444] text-white font-normal hover:bg-[#ef4444]"
												}
											>
												{employee?.user?.is_active ? "Active" : "Inactive"}
											</Badge>
											{employee?.user?.roles && employee?.user?.roles.length > 0 && (
												<Badge
													className="bg-white text-[#666] font-normal border-[#e5e7eb]"
													variant="outline"
												>
													{capitalizeEachWord(employee?.user?.roles[0].name)}
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
									{employee?.user?.branches && employee?.user?.branches.length > 0 ? (
										<div className="space-y-3">
											{employee?.user?.branches.map((branch) => (
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
														onClick={() => branch.id !== undefined && handleRemoveBranch(branch.id)}
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
										{employee?.user && <EditUserRoles user={employee?.user} />}
									</div>
									{employee?.user?.roles && employee?.user?.roles.length > 0 ? (
										<div className="space-y-4">
											<div>
												<h3 className="text-lg font-medium">
													{capitalizeEachWord(employee?.user?.roles[0].name)}
												</h3>
												{employee?.user?.roles[0].description && (
													<p className="text-sm text-[#666] mt-1">
														{employee?.user?.roles[0].description}
													</p>
												)}
											</div>

											{employee?.user?.roles[0].permissions_details &&
											employee?.user?.roles[0].permissions_details.length > 0 ? (
												<div className="space-y-3 mt-4">
													{employee?.user?.roles[0].permissions_details.map((permission) => (
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
												<div className="text-center py-4 text-[#666]">No specific permissions</div>
											)}
										</div>
									) : (
										<div className="text-center py-4 text-[#666]">No roles assigned</div>
									)}
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</ApprovableInstancePageLayout>
		</div>
	);
}
