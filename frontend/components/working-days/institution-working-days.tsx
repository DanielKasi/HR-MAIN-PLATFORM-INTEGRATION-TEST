"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkingDaysSkeleton } from "@/components/working-days-skeleton";
import { WorkingDaysManager } from "@/components/working-days-manager";
import { RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { institutionAPI, systemAPI } from "@/lib/utils";
import type {
	ISystemWorkingDay,
	IInstitutionWorkingDays,
	IWorkingDaysFormData,
} from "@/types/types.utils";

export default function InstitutionWorkingDays() {
	const [systemWorkingDays, setSystemWorkingDays] = useState<ISystemWorkingDay[]>([]);
	const [institutionWorkingDays, setInstitutionWorkingDays] =
		useState<IInstitutionWorkingDays | null>(null);
	const [selectedDays, setSelectedDays] = useState<number[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	const selectedInstitution = useSelector(selectSelectedInstitution);

	useEffect(() => {
		if (selectedInstitution) {
			fetchData();
		}
	}, [selectedInstitution]);

	useEffect(() => {
		if (institutionWorkingDays) {
			const currentDayIds = institutionWorkingDays.days.map((day) => day.id).sort();
			const selectedDayIds = [...selectedDays].sort();
			setHasChanges(JSON.stringify(currentDayIds) !== JSON.stringify(selectedDayIds));
		} else {
			setHasChanges(selectedDays.length > 0);
		}
	}, [selectedDays, institutionWorkingDays]);

	const fetchData = async () => {
		try {
			setIsLoading(true);
			setError(null);
			const [systemDays, institutionDays] = await Promise.all([
				systemAPI.getWorkingDays(),
				institutionAPI.getWorkingDays(),
			]);
			setSystemWorkingDays(systemDays);
			const currentWorkingDays = institutionDays.length > 0 ? institutionDays[0] : null;
			setInstitutionWorkingDays(currentWorkingDays);
			if (currentWorkingDays) {
				setSelectedDays(currentWorkingDays.days.map((day) => day.id));
			} else {
				setSelectedDays([]);
			}
		} catch (error: any) {
			setError(error?.message || error?.detail || "Failed to load working days");
			toast.error("Failed to load working days");
		} finally {
			setIsLoading(false);
		}
	};

	const handleWorkingDaysUpdate = async (dayIds: number[]) => {
		if (!selectedInstitution) {
			toast.error("No institution selected");
			return;
		}
		if (dayIds.length === 0) {
			toast.error("Please select at least one working day");
			return;
		}
		try {
			setIsSaving(true);
			const formData: IWorkingDaysFormData = { days: dayIds };
			let updatedWorkingDays: IInstitutionWorkingDays;
			if (institutionWorkingDays) {
				updatedWorkingDays = await institutionAPI.updateWorkingDays({
					workingDaysId: institutionWorkingDays.id,
					data: formData,
				});
			} else {
				updatedWorkingDays = await institutionAPI.createWorkingDays(formData);
			}
			setInstitutionWorkingDays(updatedWorkingDays);
			setSelectedDays(dayIds);
			setHasChanges(false);
		} catch (error: any) {
			const errorMessage = error?.message || error?.detail || "Failed to save working days";
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
					<div className="flex justify-between items-center">
						<div>
							<CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
								Institution Working Days
							</CardTitle>
							<CardDescription className="text-gray-600 mt-2">
								Configure which days of the week your institution operates. These settings will be
								used for attendance tracking, payroll calculations, and scheduling.
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							{hasChanges && (
								<div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
									<AlertCircle className="h-4 w-4" />
									Unsaved changes
								</div>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>
			<WorkingDaysManager
				scope={{ type: "institution", institutionWorkingDays: institutionWorkingDays }}
				systemWorkingDays={systemWorkingDays}
				onUpdate={handleWorkingDaysUpdate}
				isSaving={isSaving}
			/>
		</div>
	);
}
