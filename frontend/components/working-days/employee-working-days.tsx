"use client";
import type { ISystemWorkingDay, IEmployeeWorkingDays } from "@/types/types.utils";
import { useState, useEffect } from "react";
import { RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkingDaysSkeleton } from "@/components/working-days-skeleton";
import { WorkingDaysManager } from "@/components/working-days-manager";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";
import { EMPLOYEE_API, showErrorToast, systemAPI } from "@/lib/utils";

interface EmployeeWorkingDaysProps {
	employeeId: number | null;
}

export default function EmployeeWorkingDaysTab({ employeeId }: EmployeeWorkingDaysProps) {
	const [systemWorkingDays, setSystemWorkingDays] = useState<ISystemWorkingDay[]>([]);
	const [employeeWorkingDays, setEmployeeWorkingDays] = useState<IEmployeeWorkingDays | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (employeeId) {
			fetchData();
		}
	}, [employeeId]);

	const fetchSystemWorkingDays = async () => {
		try {
			const systemDays = await systemAPI.getWorkingDays();
			setSystemWorkingDays(systemDays);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load system working days" });
			setSystemWorkingDays([]);
		}
	};

	const fetchEmployeeWorkingDays = async (employeeId: number) => {
		try {
			const employeeDays = await EMPLOYEE_API.WORKING_DAYS.getAll({ employeeId });
			setEmployeeWorkingDays(employeeDays);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load working days" });
			setEmployeeWorkingDays(null);
		}
	};

	const fetchData = async () => {
		if (!employeeId) return;
		setIsLoading(true);
		await fetchSystemWorkingDays();
		await fetchEmployeeWorkingDays(employeeId);
		setIsLoading(false);
	};

	const handleEmployeeWorkingDaysUpdate = async (days: number[]) => {
		if (!employeeId) {
			toast.error("No employee selected");
			return;
		}
		try {
			setIsSaving(true);
			if (!employeeWorkingDays) {
				const created = await EMPLOYEE_API.WORKING_DAYS.create(employeeId, {
					days,
				});
				if (created) {
					setEmployeeWorkingDays(created);
					toast.success("Working days created");
				}
			} else {
				const updated = await EMPLOYEE_API.WORKING_DAYS.update(employeeId, {
					days,
				});
				if (updated) {
					setEmployeeWorkingDays(updated);
					toast.success("Working days updated");
				}
			}
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to update working days" });
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

	return (
		<div className="mx-auto p-6 space-y-6 bg-white rounded-lg">
			<Card className="shadow-none border-none">
				<CardHeader className="border-b">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
						<div>
							<CardTitle className="text-2xl font-bold text-gray-900">Working Days</CardTitle>
							<CardDescription className="text-gray-600 mt-2">
								Configure which days of the week are specific work days for this employee
							</CardDescription>
						</div>
					</div>
				</CardHeader>
			</Card>

			{employeeId && (
				<ApprovableInstancePageLayout instance={employeeWorkingDays} onInstanceRefresh={fetchData}>
					<WorkingDaysManager
						scope={{
							type: "employee",
							employeeWorkingDays: employeeWorkingDays,
						}}
						systemWorkingDays={systemWorkingDays}
						onEmployeeDaysUpdate={handleEmployeeWorkingDaysUpdate}
						isSaving={isSaving}
					/>
				</ApprovableInstancePageLayout>
			)}
		</div>
	);
}
