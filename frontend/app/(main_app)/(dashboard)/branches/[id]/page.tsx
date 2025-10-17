"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Clock,
	Phone,
	Mail,
	MapPin,
	Loader2,
	Calendar,
	ChevronDown,
	ChevronUp,
	X,
	Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn, showErrorToast } from "@/lib/utils";
import apiRequest from "@/lib/apiRequest";
import { IBranchWorkingDays, IBranchDay } from "@/types/types.utils";
import { Branch } from "@/types/branch.types";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function BranchDetailPage() {
	const params = useParams();
	const router = useRouter();
	const branchId = params.id as string;

	const [branch, setBranch] = useState<Branch | null>(null);
	const [branchWorkingDays, setBranchWorkingDays] = useState<IBranchWorkingDays | null>(null);
	// const [selectedDays, setSelectedDays] = useState<SelectedDay[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isWorkingDaysLoading, setIsWorkingDaysLoading] = useState(false);
	const [isWorkingDaysOpen, setIsWorkingDaysOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [addingDayId, setAddingDayId] = useState<number | null>(null);
	const [removingDayId, setRemovingDayId] = useState<number | null>(null);

	const fetchBranch = async () => {
		setIsLoading(true);
		try {
			const response = await apiRequest.get(`institution/branch/${branchId}/`);

			if (response.status === 200) {
				setBranch(response.data);
			} else {
				toast.error("Failed to fetch branch details");
				router.push("/branches");
			}
		} catch (error) {
			toast.error("Error fetching branch details");
			router.push("/branches");
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch branch working days
	const fetchBranchWorkingDays = async () => {
		if (!branchId) return;

		setIsWorkingDaysLoading(true);
		try {
			const response = await apiRequest.get(
				`institution/branch-working-days/?branch_id=${branchId}`,
			);

			setBranchWorkingDays(response.data as IBranchWorkingDays);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to load working days" });
		} finally {
			setIsWorkingDaysLoading(false);
		}
	};

	// Handle working days update
	const handleWorkingDaysUpdate = async (days: IBranchDay[]) => {
		if (!branchId) {
			toast.error("No branch ID available");

			return;
		}

		if (days.length === 0) {
			toast.error("Please select at least one working day");

			return;
		}

		try {
			setIsSaving(true);

			const formData = {
				branch: parseInt(branchId),
				branch_days: days.map((day) => ({ day_id: day.id, day_type: day.day_type })),
			};

			let response;

			if (branchWorkingDays?.id) {
				response = await apiRequest.patch(
					`institution/branch-working-day-detail/${branchWorkingDays.id}/`,
					formData,
				);
			} else {
				response = await apiRequest.post(`institution/branch-working-days/`, formData);
			}

			setBranchWorkingDays(response.data as IBranchWorkingDays);
			setHasChanges(false);
			toast.success("Branch working days updated successfully");
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to update working days" });
		} finally {
			setIsSaving(false);
			setAddingDayId(null);
			setRemovingDayId(null);
		}
	};

	useEffect(() => {
		if (branchId) {
			fetchBranch();
		}
	}, [branchId]);

	const handleWorkingDaysToggle = () => {
		setIsWorkingDaysOpen(!isWorkingDaysOpen);
		if (!isWorkingDaysOpen && !branchWorkingDays) {
			fetchBranchWorkingDays();
		}
	};

	const getDayColor = (dayName: string) => {
		const colors = {
			Monday: "bg-blue-100 text-blue-700 border-blue-200",
			Tuesday: "bg-green-100 text-green-700 border-green-200",
			Wednesday: "bg-purple-100 text-purple-700 border-purple-200",
			Thursday: "bg-orange-100 text-orange-700 border-orange-200",
			Friday: "bg-pink-100 text-pink-700 border-pink-200",
			Saturday: "bg-indigo-100 text-indigo-700 border-indigo-200",
			Sunday: "bg-red-100 text-red-700 border-red-200",
		};

		return colors[dayName as keyof typeof colors] || "bg-gray-100 text-gray-700 border-gray-200";
	};

	const getDayIcon = (dayName: string) => {
		const icons = {
			Monday: "M",
			Tuesday: "T",
			Wednesday: "W",
			Thursday: "T",
			Friday: "F",
			Saturday: "S",
			Sunday: "S",
		};

		return icons[dayName as keyof typeof icons] || dayName[0] || "?";
	};

	// Handle day click (add/remove)
	const handleDayClick = async (dayId: number, dayType: "PHYSICAL" | "REMOTE" = "PHYSICAL") => {
		const day = branchWorkingDays?.branch_days.find((d) => d.id === dayId);

		if (!day || day.id === 0) {
			toast.error("This day is not available for selection");

			return;
		}

		const isSelected = branchWorkingDays?.branch_days.some((d) => d.day_id === dayId);

		if (!isSelected) {
			return;
		}
		setRemovingDayId(dayId);
		const newSelectedDays = branchWorkingDays?.branch_days.filter((d) => d.day_id !== dayId);

		try {
			await handleWorkingDaysUpdate(newSelectedDays || []);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to remove day. Please try again." });
		} finally {
			setRemovingDayId(null);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex items-center">
					<Loader2 className="h-6 w-6 animate-spin mr-2" />
					<span>Loading branch details...</span>
				</div>
			</div>
		);
	}

	if (!branch) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<p className="text-muted-foreground">Branch not found</p>
					<Button className="mt-2" onClick={() => router.push("/branches")}>
						Back to Branches
					</Button>
				</div>
			</div>
		);
	}

	const sortedDays = branchWorkingDays?.branch_days.sort((a, b) => {
		const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

		return order.indexOf(a.day_name) - order.indexOf(b.day_name);
	});

	return (
		<div className="flex flex-col gap-6 bg-white rounded-xl ">
			<div className="flex items-center justify-between mt-10">
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="icon"
						className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0 ml-4 -mt-5"
						onClick={() => router.push("/branches")}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<div className="flex items-center justify-start gap-8">
							<h1 className="text-2xl font-bold tracking-tight">{branch.branch_name}</h1>
							<Badge variant={branch.is_active ? "default" : "secondary"}>
								{branch.is_active ? "Active" : "Inactive"}
							</Badge>
						</div>
						<p className="text-muted-foreground">Branch details</p>
					</div>
				</div>
			</div>
			<ApprovableInstancePageLayout instance={branch} onInstanceRefresh={fetchBranch}>
				<Card className="shadow-none border-none">
					<CardHeader>
						<CardTitle>Branch Information</CardTitle>
						<CardDescription>View branch details</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid gap-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<Phone className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">Phone:</span>
										<span>{branch.branch_phone_number || "Not provided"}</span>
									</div>
									<div className="flex items-center gap-2">
										<Mail className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">Email:</span>
										<span>{branch.branch_email || "Not provided"}</span>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">Operating Hours:</span>
										<span>
											{branch.branch_opening_time && branch.branch_closing_time
												? `${branch.branch_opening_time} - ${branch.branch_closing_time}`
												: "Not specified"}
										</span>
									</div>
								</div>
								<div className="space-y-3">
									<div>
										<span className="font-medium">Institution:</span>
										<span className="ml-2">{branch.institution_name}</span>
									</div>
									{/* <div>
										<span className="font-medium">Paying Bank Account:</span>
										<span className="ml-2">{branch.paying_bank_account}</span>
									</div> */}
								</div>
							</div>
							<div className="flex items-start gap-2">
								<MapPin className="h-4 w-4 text-muted-foreground mt-1" />
								<div>
									<span className="font-medium">Location:</span>
									<p className="text-sm text-muted-foreground mt-1">{branch.branch_location}</p>
									<p className="text-xs text-muted-foreground mt-1">
										Coordinates: {branch.branch_latitude}, {branch.branch_longitude}
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Separator />

				<Collapsible open={isWorkingDaysOpen} onOpenChange={handleWorkingDaysToggle}>
					<Card>
						<CollapsibleTrigger asChild>
							<CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Calendar className="h-5 w-5 text-muted-foreground" />
										<div>
											<CardTitle>Branch Working Days</CardTitle>
											<CardDescription>Configure the working days for this branch</CardDescription>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{branchWorkingDays && (
											<Badge variant="outline">
												{branchWorkingDays.branch_days.length}{" "}
												{branchWorkingDays.branch_days.length === 1 ? "day" : "days"}
											</Badge>
										)}
										{isWorkingDaysOpen ? (
											<ChevronUp className="h-4 w-4" />
										) : (
											<ChevronDown className="h-4 w-4" />
										)}
									</div>
								</div>
							</CardHeader>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<CardContent className="pt-0">
								{isWorkingDaysLoading ? (
									<div className="flex items-center justify-center py-8">
										<div className="flex items-center">
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
											<span className="text-sm text-muted-foreground">Loading working days...</span>
										</div>
									</div>
								) : (
									<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
										<div className="p-6 border-b border-gray-200">
											<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
												<Calendar className="h-5 w-5" />
												Branch Working Days Manager
											</h2>
											<p className="text-sm text-gray-600 mt-1">
												Click the plus (+) button to add a day, or the cross (×) to remove a day.
												Select the day type (Physical/Remote) when adding.
											</p>
										</div>
										<div className="p-6 space-y-6">
											{sortedDays?.every((day) => day.id === 0) ? (
												<div className="text-center py-8">
													<Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
													<h3 className="text-lg font-medium text-gray-900 mb-2">
														No Working Days Set
													</h3>
													<p className="text-gray-500">
														Configure your branch's working days to get started.
													</p>
												</div>
											) : (
												<>
													<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
														{sortedDays?.map((day) => {
															const isSelected = branchWorkingDays?.branch_days.some(
																(d) => d.day_id === day.id,
															);
															const isSelectable = day.id !== 0;

															return (
																<div key={day.day_name} className="relative">
																	<div className="text-center transition-all duration-200 rounded-lg p-2">
																		<div
																			className={cn(
																				"w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2 border-2 transition-all duration-200 relative",
																				isSelected
																					? getDayColor(day.day_name)
																					: isSelectable
																						? "bg-gray-100 text-gray-400 border-gray-200 hover:border-green-300 hover:bg-green-50 cursor-pointer"
																						: "bg-gray-100 text-gray-400 border-gray-200 opacity-50",
																			)}
																			onClick={() => {
																				if (!isSelected && isSelectable) {
																					handleDayClick(day.id);
																				}
																			}}
																		>
																			{addingDayId === day.id ? (
																				<div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
																			) : isSelected ? (
																				getDayIcon(day.day_name)
																			) : (
																				<Plus
																					className={cn(
																						"w-6 h-6",
																						isSelectable ? "text-green-600" : "text-gray-400",
																					)}
																				/>
																			)}
																		</div>
																		<p
																			className={cn(
																				"font-medium text-sm mb-1",
																				isSelected ? "text-gray-900" : "text-gray-500",
																			)}
																		>
																			{day.day_name}
																		</p>
																		{isSelected && (
																			<Badge variant="outline" className="text-xs">
																				{
																					branchWorkingDays?.branch_days.find(
																						(d) => d.id === day.id,
																					)?.day_type
																				}
																			</Badge>
																		)}
																		{/* {!isSelected && isSelectable && (
                                    <Select
                                      onValueChange={(value) =>
                                        handleDayClick(day.id, value as "PHYSICAL" | "REMOTE")
                                      }
                                      disabled={isSaving || addingDayId === day.id}
                                    >
                                      <SelectTrigger className="w-full mt-1 text-xs h-8">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="PHYSICAL">Physical</SelectItem>
                                        <SelectItem value="REMOTE">Remote</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )} */}
																	</div>
																	{isSelected && (
																		<button
																			type="button"
																			onClick={() => handleDayClick(day.id)}
																			className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors duration-200 z-10"
																			title={`Remove ${day.day_name}`}
																			disabled={isSaving || removingDayId === day.id}
																		>
																			{removingDayId === day.id ? (
																				<div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
																			) : (
																				<X className="w-4 h-4 text-red-600" />
																			)}
																		</button>
																	)}
																</div>
															);
														})}
													</div>
													<div className="bg-gray-50 rounded-lg p-4">
														<div className="flex items-center justify-between text-sm">
															<div className="flex items-center gap-2">
																<Calendar className="h-4 w-4 text-gray-500" />
																{/* <span className="text-gray-600">
                                <strong>{selectedDays.length}</strong> working days selected
                              </span> */}
															</div>
															<span className="text-gray-500">
																Last updated:{" "}
																{branchWorkingDays ? new Date().toLocaleDateString() : "Never"}
															</span>
														</div>
													</div>
													{/* {hasChanges && (
                          <div className="flex items-center gap-3 pt-4 border-t">
                            <Button
                              onClick={handleSave}
                              disabled={isSaving}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleReset}
                              disabled={isSaving}
                              className="flex items-center gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reset
                            </Button>
                          </div>
                        )} */}
												</>
											)}
										</div>
									</div>
								)}
							</CardContent>
						</CollapsibleContent>
					</Card>
				</Collapsible>
			</ApprovableInstancePageLayout>
		</div>
	);
}
