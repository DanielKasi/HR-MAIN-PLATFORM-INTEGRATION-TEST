"use client";

import type { ISystemWorkingDay, IBranchWorkingDays, IBranchDay } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkingDaysSkeleton } from "@/components/working-days-skeleton";
import { WorkingDaysManager } from "@/components/working-days-manager";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { branchesAPI, showErrorToast, systemAPI } from "@/lib/utils";
import { Branch } from "@/types";

export default function BranchWorkingDaysTab() {
	const [systemWorkingDays, setSystemWorkingDays] = useState<ISystemWorkingDay[]>([]);
	const [branchWorkingDays, setBranchWorkingDays] = useState<IBranchWorkingDays | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const branches = selectedInstitution?.branches || [];

	const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

	useEffect(() => {
		if (selectedBranch) {
			fetchData();
		}
	}, [selectedBranch]);

	const fetchSystemWorkingDays = async () => {
		try {
			const systemDays = await systemAPI.getWorkingDays();

			setSystemWorkingDays(systemDays);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load system working days" });
			setSystemWorkingDays([]);
		}
	};

	const fetchBranchWorkingDays = async (branchId: number) => {
		try {
			const branchDays = await branchesAPI.WORKING_DAYS.getAll({ branchId });

			setBranchWorkingDays(branchDays);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load branch working days" });
			setBranchWorkingDays(null);
		}
	};

	const fetchData = async () => {
		if (!selectedBranch) {
			return;
		}
		setIsLoading(true);
		await fetchSystemWorkingDays();
		await fetchBranchWorkingDays(selectedBranch.id);
		setIsLoading(false);
	};

	const handleBranchWorkingDaysUpdate = async (args: any) => {
		if (!selectedBranch) {
			toast.error("No branch selected");

			return;
		}

		try {
			setIsSaving(true);
			const currentDays = branchWorkingDays?.branch_days || [];
			let newDays: Omit<IBranchDay, "id" | "day_name">[] = [];

			if (args.action === "add") {
				const validDayId = systemWorkingDays.find((d) => d.id === args.dayId);

				if (!validDayId) {
					toast.error("Invalid day selected. Please refresh and try again.");

					return;
				}

				newDays = [
					...currentDays.map((d) => ({ day_id: d.id, day_type: d.day_type })),
					{
						day_id: args.dayId,
						day_type: args.dayType,
					},
				];
			} else if (args.action === "remove") {
				const remainingDays = currentDays.filter(
					(d) => d.day_name.toLowerCase() !== args.day_name.toLowerCase(),
				);

				newDays = remainingDays.map((d) => {
					const systemDay = systemWorkingDays.find(
						(sd) => sd.day_name.toLowerCase() === d.day_name.toLowerCase(),
					);

					return {
						day_id: systemDay?.id || d.id,
						day_type: d.day_type,
					};
				});
			} else if (args.action === "save") {
				for (const day of args.days) {
					const validDayId = systemWorkingDays.find((d) => d.id === day.day_id);

					if (!validDayId) {
						toast.error(`Invalid day ID ${day.day_id}. Please refresh and try again.`);

						return;
					}
				}
				newDays = args.days;
			} else {
				return;
			}

			const transformForAPI = (days: any[]) => {
				return days.map((day) => {
					const branchDay = currentDays.find((cd) => cd.id === day.day_id);

					if (branchDay) {
						const systemDay = systemWorkingDays.find(
							(sd) => sd.day_name.toLowerCase() === branchDay.day_name.toLowerCase(),
						);

						return {
							day_id: systemDay?.id || day.day_id,
							day_type: day.day_type,
						};
					}

					return {
						day_id: day.day_id,
						day_type: day.day_type,
					};
				});
			};

			const apiPayload = transformForAPI(newDays);

			if (!branchWorkingDays) {
				const created = await branchesAPI.WORKING_DAYS.create({
					branch_days: apiPayload,
				});

				if (created) {
					setBranchWorkingDays(created);
					toast.success("Branch working days created");
				}
			} else {
				const updated = await branchesAPI.WORKING_DAYS.update(branchWorkingDays.id, {
					branch_days: apiPayload,
				});

				if (updated) {
					setBranchWorkingDays(updated);
					toast.success("Branch working days updated");
				}
			}
		} catch (error: any) {
			let errorMessage = "Failed to update branch working days";

			if (error?.detail?.branch_days) {
				const branchDaysErrors = error.detail.branch_days;
				const errorMessages = branchDaysErrors
					.map((dayError: any) => {
						if (dayError.day_id && Array.isArray(dayError.day_id)) {
							return dayError.day_id.join(", ");
						}

						return JSON.stringify(dayError);
					})
					.filter(Boolean);

				errorMessage =
					errorMessages.length > 0
						? `Validation errors: ${errorMessages.join("; ")}`
						: errorMessage;
			} else if (error?.message) {
				errorMessage = error.message;
			} else if (typeof error?.detail === "string") {
				errorMessage = error.detail;
			}

			toast.error(errorMessage);
			throw error;
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="p-6">
				<WorkingDaysSkeleton />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
				<div className="mt-4">
					<Button onClick={fetchData} variant="outline">
						<RotateCcw className="h-4 w-4 mr-2" />
						Retry
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto p-6 space-y-6 bg-white rounded-lg">
			<Card className="shadow-none border-none">
				<CardHeader className="border-b">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
						<div>
							<CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
								Branch Working Days
							</CardTitle>
							<CardDescription className="text-gray-600 mt-2">
								Configure which days of the week this branch operates, and whether each day is
								physical or remote.
							</CardDescription>
						</div>
						{/* Branch Selector */}
						<div className="flex items-center gap-2">
							<Label htmlFor="branch-select" className="text-sm font-medium text-gray-700">
								Branch:
							</Label>
							<Select
								value={selectedBranch?.id.toString() || ""}
								onValueChange={(val) => {
									const branch = branches.find((b) => b.id === Number(val));

									setSelectedBranch(branch || null);
								}}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Select a branch" />
								</SelectTrigger>
								<SelectContent>
									{branches.map((branch) => (
										<SelectItem key={branch.id} value={branch.id.toString()}>
											{branch.branch_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
			</Card>
			{selectedBranch && (
				<WorkingDaysManager
					scope={{
						type: "branch",
						branchId: selectedBranch.id,
						branchWorkingDays: branchWorkingDays,
					}}
					systemWorkingDays={systemWorkingDays}
					onUpdate={handleBranchWorkingDaysUpdate}
					isSaving={isSaving}
				/>
			)}
		</div>
	);
}
