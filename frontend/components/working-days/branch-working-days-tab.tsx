"use client";
import type {
	ISystemWorkingDay,
	IBranchWorkingDays,
	IBranchDayFormData,
} from "@/types/types.utils";
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
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { branchesAPI, showErrorToast, systemAPI } from "@/lib/utils";
import { Branch } from "@/types/branch.types";

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
		if (!selectedBranch) return;
		setIsLoading(true);
		await fetchSystemWorkingDays();
		await fetchBranchWorkingDays(selectedBranch.id);
		setIsLoading(false);
	};

	const transformForAPI = (days: IBranchDayFormData[]) => {
		return days.map((day) => ({
			day_id: day.day_id,
			day_type: day.day_type,
			opening_time: day.opening_time || null,
			closing_time: day.closing_time || null,
		}));
	};

	const handleBranchWorkingDaysUpdate = async (days: IBranchDayFormData[]) => {
		if (!selectedBranch) {
			toast.error("No branch selected");
			return;
		}
		try {
			setIsSaving(true);
			const apiPayload = transformForAPI(days);
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
			showErrorToast({ error, defaultMessage: "Failed to update branch working days" });
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
							<CardTitle className="text-2xl font-bold text-gray-900">
								Branch Working Days
							</CardTitle>
							<CardDescription className="text-gray-600 mt-2">
								Configure which days of the week this branch operates, and whether each day is
								physical or remote.
							</CardDescription>
						</div>
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

			{selectedBranch && branchWorkingDays && (
				<ApprovableInstancePageLayout instance={branchWorkingDays} onInstanceRefresh={fetchData}>
					<WorkingDaysManager
						scope={{
							type: "branch",
							branchId: selectedBranch.id,
							branchWorkingDays: branchWorkingDays,
						}}
						systemWorkingDays={systemWorkingDays}
						onBranchDaysUpdate={handleBranchWorkingDaysUpdate}
						isSaving={isSaving}
					/>
				</ApprovableInstancePageLayout>
			)}

			{selectedBranch && !branchWorkingDays && (
				<WorkingDaysManager
					scope={{
						type: "branch",
						branchId: selectedBranch.id,
						branchWorkingDays: branchWorkingDays,
					}}
					systemWorkingDays={systemWorkingDays}
					onBranchDaysUpdate={handleBranchWorkingDaysUpdate}
					isSaving={isSaving}
				/>
			)}
		</div>
	);
}
