"use client";

import type {
	IBranchDayFormData,
	IBranchWorkingDays,
	IDayType,
	IInstitutionDayFormData,
	IInstitutionWorkingDays,
	ISystemWorkingDay,
} from "@/types/types.utils";

import React, { useState, useEffect } from "react";
import { Calendar, X, Plus, Edit } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface WorkingDaysManagerProps {
	scope:
		| { type: "branch"; branchId: number; branchWorkingDays: IBranchWorkingDays | null }
		| { type: "institution"; institutionWorkingDays: IInstitutionWorkingDays | null };
	systemWorkingDays: ISystemWorkingDay[];
	onInstitutionDaysUpdate?: (days: IInstitutionDayFormData[]) => Promise<void>;
	onBranchDaysUpdate?: (days: IBranchDayFormData[]) => Promise<void>;
	isSaving?: boolean;
}

export function WorkingDaysManager({
	scope,
	systemWorkingDays,
	onBranchDaysUpdate,
	onInstitutionDaysUpdate,
	isSaving = false,
}: WorkingDaysManagerProps) {
	const [selectedInstitutionDays, setSelectedInstitutionDays] = useState<IInstitutionDayFormData[]>(
		[],
	);
	const [selectedBranchDays, setSelectedBranchDays] = useState<IBranchDayFormData[]>([]);
	const [hasChanges, setHasChanges] = useState(false);
	const [editingDayId, setEditingDayId] = useState<number | null>(null);
	const [pendingAddDayId, setPendingAddDayId] = useState<number | null>(null);
	const [addDayType, setAddDayType] = useState<IDayType | null>(null);
	const [currentDayStartTime, setCurrentDayStartTime] = useState<string | null>(null);
	const [currentDayEndTime, setCurrentDayEndTime] = useState<string | null>(null);
	const [sortedDays, setSortedDays] = useState<ISystemWorkingDay[]>([]);
	const [isAutoSaving, setIsAutoSaving] = useState(false);

	// Initialize selected days when scope changes
	useEffect(() => {
		if (scope.type === "institution" && scope.institutionWorkingDays?.institution_days) {
			setSelectedInstitutionDays(
				scope.institutionWorkingDays.institution_days.map((day) => ({
					day_id: day.day_id,
					opening_time: day.opening_time || null,
					closing_time: day.closing_time || null,
				})),
			);
			setHasChanges(false);
		} else if (scope.type === "branch" && scope.branchWorkingDays?.branch_days) {
			setSelectedBranchDays(
				scope.branchWorkingDays.branch_days.map((day) => ({
					day_id: day.day_id,
					day_type: day.day_type,
					opening_time: day.opening_time || null,
					closing_time: day.closing_time || null,
				})),
			);
			setHasChanges(false);
		}
	}, [scope]);

	// Sort system days
	useEffect(() => {
		const newSortedDays = [...systemWorkingDays].sort((a, b) => a.level - b.level);
		setSortedDays(newSortedDays);
	}, [systemWorkingDays]);

	// Check for changes including times
	useEffect(() => {
		if (
			scope.type === "institution" &&
			scope.institutionWorkingDays?.institution_days &&
			!isAutoSaving
		) {
			const current = scope.institutionWorkingDays.institution_days
				.map((d) => `${d.day_id}-${d.opening_time || ""}-${d.closing_time || ""}`)
				.sort();
			const selected = selectedInstitutionDays
				.map((d) => `${d.day_id}-${d.opening_time || ""}-${d.closing_time || ""}`)
				.sort();
			setHasChanges(JSON.stringify(current) !== JSON.stringify(selected));
		} else if (scope.type === "branch" && scope.branchWorkingDays?.branch_days && !isAutoSaving) {
			const current = scope.branchWorkingDays.branch_days
				.map((d) => `${d.day_id}-${d.day_type}-${d.opening_time || ""}-${d.closing_time || ""}`)
				.sort();
			const selected = selectedBranchDays
				.map((d) => `${d.day_id}-${d.day_type}-${d.opening_time || ""}-${d.closing_time || ""}`)
				.sort();
			setHasChanges(JSON.stringify(current) !== JSON.stringify(selected));
		}
	}, [selectedInstitutionDays, selectedBranchDays, scope, isAutoSaving]);

	const handleAddInstitutionDay = async (
		dayId: number,
		opening_time: string | null,
		closing_time: string | null,
	) => {
		if (validateTimes(opening_time, closing_time)) {
			const newDay: IInstitutionDayFormData = {
				day_id: dayId,
				opening_time,
				closing_time,
			};
			const updatedDays = [...selectedInstitutionDays, newDay];
			setSelectedInstitutionDays(updatedDays);
			setPendingAddDayId(null);
			setCurrentDayStartTime(null);
			setCurrentDayEndTime(null);
			setIsAutoSaving(true);
			try {
				if (onInstitutionDaysUpdate) await onInstitutionDaysUpdate(updatedDays);
			} catch (error) {
				toast.error("Failed to add day");
			} finally {
				setIsAutoSaving(false);
			}
		}
	};

	const handleRemoveInstitutionDay = async (dayId: number) => {
		const updatedDays = selectedInstitutionDays.filter((d) => d.day_id !== dayId);
		setSelectedInstitutionDays(updatedDays);
		setIsAutoSaving(true);
		try {
			if (onInstitutionDaysUpdate) await onInstitutionDaysUpdate(updatedDays);
		} catch (error) {
			toast.error("Failed to remove day");
		} finally {
			setIsAutoSaving(false);
		}
	};

	const handleUpdateInstitutionDayTimes = async (
		dayId: number,
		opening_time: string | null,
		closing_time: string | null,
	) => {
		if (validateTimes(opening_time, closing_time)) {
			const updatedDays = selectedInstitutionDays.map((d) =>
				d.day_id === dayId ? { ...d, opening_time, closing_time } : d,
			);
			setSelectedInstitutionDays(updatedDays);
			setEditingDayId(null);
			setCurrentDayStartTime(null);
			setCurrentDayEndTime(null);
			setIsAutoSaving(true);
			try {
				if (onInstitutionDaysUpdate) await onInstitutionDaysUpdate(updatedDays);
			} catch (error) {
				toast.error("Failed to update times");
			} finally {
				setIsAutoSaving(false);
			}
		}
	};

	const handleAddBranchDay = async (
		dayId: number,
		dayType: IDayType,
		opening_time: string | null,
		closing_time: string | null,
	) => {
		if (validateTimes(opening_time, closing_time)) {
			const newDay: IBranchDayFormData = {
				day_id: dayId,
				day_type: dayType,
				opening_time,
				closing_time,
			};
			const updatedDays = [...selectedBranchDays, newDay];
			setSelectedBranchDays(updatedDays);
			setPendingAddDayId(null);
			setAddDayType(null);
			setCurrentDayStartTime(null);
			setCurrentDayEndTime(null);
			setIsAutoSaving(true);
			try {
				if (onBranchDaysUpdate) await onBranchDaysUpdate(updatedDays);
			} catch (error) {
				toast.error("Failed to add day");
			} finally {
				setIsAutoSaving(false);
			}
		}
	};

	const handleRemoveBranchDay = async (dayId: number) => {
		const updatedDays = selectedBranchDays.filter((d) => d.day_id !== dayId);
		setSelectedBranchDays(updatedDays);
		setIsAutoSaving(true);
		try {
			if (onBranchDaysUpdate) await onBranchDaysUpdate(updatedDays);
		} catch (error) {
			toast.error("Failed to remove day");
		} finally {
			setIsAutoSaving(false);
		}
	};

	const handleUpdateBranchDayTimes = async (
		dayId: number,
		opening_time: string | null,
		closing_time: string | null,
	) => {
		if (validateTimes(opening_time, closing_time)) {
			const updatedDays = selectedBranchDays.map((d) =>
				d.day_id === dayId ? { ...d, opening_time, closing_time } : d,
			);
			setSelectedBranchDays(updatedDays);
			setEditingDayId(null);
			setCurrentDayStartTime(null);
			setCurrentDayEndTime(null);
			setIsAutoSaving(true);
			try {
				if (onBranchDaysUpdate) await onBranchDaysUpdate(updatedDays);
			} catch (error) {
				toast.error("Failed to update times");
			} finally {
				setIsAutoSaving(false);
			}
		}
	};

	const validateTimes = (start: string | null, end: string | null): boolean => {
		if ((start && !end) || (!start && end)) {
			toast.error("Please provide both opening and closing times or neither.");
			return false;
		}
		if (start && end && start >= end) {
			toast.error("Closing time must be after opening time.");
			return false;
		}
		return true;
	};

	const handleDayClick = (day: ISystemWorkingDay) => {
		if (scope.type === "institution") {
			const isSelected = selectedInstitutionDays.some((d) => d.day_id === day.id);
			if (isSelected) {
				handleRemoveInstitutionDay(day.id);
			} else {
				setPendingAddDayId(day.id);
			}
		} else {
			const isSelected = selectedBranchDays.some((d) => d.day_id === day.id);
			if (isSelected) {
				handleRemoveBranchDay(day.id);
			} else {
				setPendingAddDayId(day.id);
			}
		}
	};

	const startEditing = (dayId: number, currentStart: string | null, currentEnd: string | null) => {
		setEditingDayId(dayId);
		setCurrentDayStartTime(currentStart);
		setCurrentDayEndTime(currentEnd);
	};

	const cancelEditing = () => {
		setEditingDayId(null);
		setCurrentDayStartTime(null);
		setCurrentDayEndTime(null);
	};

	const saveTimes = (day: ISystemWorkingDay) => {
		if (scope.type === "institution") {
			handleUpdateInstitutionDayTimes(day.id, currentDayStartTime, currentDayEndTime);
		} else {
			handleUpdateBranchDayTimes(day.id, currentDayStartTime, currentDayEndTime);
		}
	};

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
				{sortedDays.map((day) => {
					const isSelected =
						scope.type === "institution"
							? selectedInstitutionDays.some((d) => d.day_id === day.id)
							: selectedBranchDays.some((d) => d.day_id === day.id);
					const dayData =
						scope.type === "institution"
							? selectedInstitutionDays.find((d) => d.day_id === day.id)
							: selectedBranchDays.find((d) => d.day_id === day.id);
					const openingTime = dayData?.opening_time || null;
					const closingTime = dayData?.closing_time || null;
					const dayType =
						scope.type === "branch"
							? (dayData as IBranchDayFormData | undefined)?.day_type
							: undefined;

					return (
						<div key={day.id} className="relative">
							<div
								onClick={() => handleDayClick(day)}
								className={cn(
									"cursor-pointer rounded-lg border p-4 text-center transition-colors",
									isSelected
										? "bg-blue-50 border-blue-200"
										: "bg-gray-50 border-gray-200 hover:bg-gray-100",
								)}
							>
								<div className="mb-2 flex justify-center">
									<div
										className={cn(
											"w-8 h-8 rounded-full flex items-center justify-center font-bold",
											isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500",
										)}
									>
										{isSaving || isAutoSaving ? (
											<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
										) : isSelected ? (
											scope.type === "branch" ? (
												dayType === "PHYSICAL" ? (
													"P"
												) : (
													"R"
												)
											) : (
												day.day_code
											)
										) : (
											<Plus className="w-6 h-6 text-green-600" />
										)}
									</div>
								</div>
								<p
									className={cn(
										"font-medium text-sm mb-1",
										isSelected ? "text-gray-900" : "text-gray-500",
									)}
								>
									{day.day_name}
								</p>
								<Badge
									variant="outline"
									className={cn(
										"text-xs",
										isSelected
											? scope.type === "branch"
												? dayType === "PHYSICAL"
													? "border-blue-300 text-blue-700"
													: "border-green-300 text-green-700"
												: "border-blue-300 text-blue-700"
											: "border-gray-200 text-gray-400",
									)}
								>
									{isSelected ? (scope.type === "branch" ? dayType : day.day_code) : day.day_code}
								</Badge>
								{isSelected && (
									<div className="mt-2 text-sm text-gray-600">
										<p>Opening: {openingTime || "Not set"}</p>
										<p>Closing: {closingTime || "Not set"}</p>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												startEditing(day.id, openingTime, closingTime);
											}}
											disabled={isSaving || isAutoSaving}
										>
											<Edit className="h-4 w-4 mr-1" /> Edit Times
										</Button>
									</div>
								)}
							</div>
							{isSelected && (
								<button
									type="button"
									onClick={async (e) => {
										e.stopPropagation();
										scope.type === "institution"
											? await handleRemoveInstitutionDay(day.id)
											: await handleRemoveBranchDay(day.id);
									}}
									className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors duration-200 z-10"
									title={`Remove ${day.day_name}`}
									disabled={isSaving || isAutoSaving}
								>
									<X className="w-4 h-4 text-red-600" />
								</button>
							)}
							{(pendingAddDayId === day.id && !isSelected) || editingDayId === day.id ? (
								<div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 bg-white border rounded shadow p-2">
									{scope.type === "branch" && pendingAddDayId === day.id && (
										<div className="flex items-center justify-start gap-2 mb-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleAddBranchDay(
														day.id,
														"PHYSICAL",
														currentDayStartTime,
														currentDayEndTime,
													)
												}
											>
												Physical
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleAddBranchDay(
														day.id,
														"REMOTE",
														currentDayStartTime,
														currentDayEndTime,
													)
												}
											>
												Remote
											</Button>
										</div>
									)}
									<div className="grid grid-cols-2 gap-4 min-w-24">
										<div>
											<Label htmlFor={`start_time_${day.id}`}>Start Time</Label>
											<Input
												type="time"
												id={`start_time_${day.id}`}
												value={currentDayStartTime || ""}
												onChange={(e) => setCurrentDayStartTime(e.target.value)}
											/>
										</div>
										<div>
											<Label htmlFor={`end_time_${day.id}`}>End Time</Label>
											<Input
												type="time"
												id={`end_time_${day.id}`}
												value={currentDayEndTime || ""}
												onChange={(e) => setCurrentDayEndTime(e.target.value)}
											/>
										</div>
									</div>
									<div className="flex justify-end gap-2 mt-2">
										<Button size="sm" variant="ghost" onClick={cancelEditing}>
											Cancel
										</Button>
										<Button
											size="sm"
											onClick={() => {
												if (pendingAddDayId) {
													if (scope.type === "institution") {
														handleAddInstitutionDay(day.id, currentDayStartTime, currentDayEndTime);
													}
												} else {
													saveTimes(day);
												}
											}}
										>
											Save
										</Button>
									</div>
								</div>
							) : null}
						</div>
					);
				})}
			</div>

			<div className="bg-gray-50 rounded-lg p-4">
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4 text-gray-500" />
						<span className="text-gray-600">
							<strong>
								{scope.type === "institution"
									? selectedInstitutionDays.length
									: selectedBranchDays.length}
							</strong>{" "}
							working days selected
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
