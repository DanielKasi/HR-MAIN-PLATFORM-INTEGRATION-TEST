"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users, MapPin, Video, Repeat, Clock } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Checkbox } from "@/components/ui/checkbox";
import { calendarAPI, getDepartments, getPaginatedEmployees } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { IDepartment, IEmployee } from "@/types/types.utils";

export default function AddEventPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [currentStep, setCurrentStep] = useState(1);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		date: "",
		time: "",
		target_audience: "all" as "all" | "department" | "individual" | "specific_employees",
		event_mode: "physical" as "physical" | "online" | "hybrid",
		department: null as number | null,
		specific_employees: [] as string[],
		frequency: "once" as "once" | "daily" | "weekly" | "monthly" | "yearly",
		institution: selectedInstitution?.id,
	});

	const [departments, setDepartments] = useState<IDepartment[]>([]);
	const [departmentsLoading, setDepartmentsLoading] = useState(false);
	const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");

	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [employeesLoading, setEmployeesLoading] = useState(false);
	const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");

	useEffect(() => {
		if (selectedInstitution?.id) {
			fetchDepartments();
			fetchEmployees();
		}
	}, [selectedInstitution?.id]);

	const handleSubmit = async () => {
		setLoading(true);

		try {
			if (!formData.institution) {
				throw new Error("Institution is required");
			}

			const eventData = {
				institution: formData.institution as number,
				title: formData.title,
				description: formData.description,
				date: formData.date,
				target_audience: formData.target_audience,
				event_mode: formData.event_mode,
				department: formData.department ? formData.department.toString() : undefined,
				specific_employees:
					formData.specific_employees.length > 0 ? formData.specific_employees : undefined,
			};

			const response = await calendarAPI.createEvent(eventData);

			toast({
				title: "Event Created Successfully!",
				description: `"${eventData.title}" has been added to your calendar.`,
				duration: 3000,
			});

			setFormData({
				title: "",
				description: "",
				date: "",
				time: "",
				target_audience: "all" as "all" | "department" | "individual" | "specific_employees",
				event_mode: "physical" as "physical" | "online" | "hybrid",
				department: null,
				specific_employees: [] as string[],
				frequency: "once" as "once" | "daily" | "weekly" | "monthly" | "yearly",
				institution: selectedInstitution?.id,
			});
			setCurrentStep(1);
			setDepartmentSearchTerm("");
			setEmployeeSearchTerm("");

			setTimeout(() => {
				router.push("/events-holidays");
			}, 1000);
		} catch (error) {
			console.error("Error creating event:", error);

			toast({
				title: "Error Creating Event",
				description: "Failed to create event. Please try again.",
				variant: "destructive",
				duration: 5000,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: string, value: string | string[] | number | null) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const steps = [
		{ id: 1, title: "Event Details" },
		{ id: 2, title: "Audience & Mode" },
	];

	const isStepComplete = (step: number) => {
		switch (step) {
			case 1:
				return formData.title && formData.description && formData.date && formData.frequency;
			case 2:
				return formData.target_audience && formData.event_mode;
			default:
				return false;
		}
	};

	const fetchDepartments = async () => {
		if (!selectedInstitution?.id) return;

		setDepartmentsLoading(true);
		try {
			const fetchedDepartments = await getDepartments({ institutionId: selectedInstitution.id });
			setDepartments(fetchedDepartments);
		} catch (error) {
			console.error("Error fetching departments:", error);
			toast({
				title: "Error Loading Departments",
				description: "Failed to load departments. Please try again.",
				variant: "destructive",
				duration: 5000,
			});
		} finally {
			setDepartmentsLoading(false);
		}
	};

	const fetchEmployees = async () => {
		if (!selectedInstitution?.id) return;

		setEmployeesLoading(true);
		try {
			const fetchedEmployees = await getPaginatedEmployees({
				institutionId: selectedInstitution.id,
			});

			setEmployees(fetchedEmployees.results || []);
		} catch (error) {
			console.error("Error fetching employees:", error);
			toast({
				title: "Error Loading Employees",
				description: "Failed to load employees. Please try again.",
				variant: "destructive",
				duration: 5000,
			});
		} finally {
			setEmployeesLoading(false);
		}
	};

	const filteredDepartments = departments.filter(
		(dept) =>
			dept.name.toLowerCase().includes(departmentSearchTerm.toLowerCase()) ||
			(dept.description &&
				dept.description.toLowerCase().includes(departmentSearchTerm.toLowerCase())),
	);

	const filteredEmployees = employees.filter(
		(employee) =>
			`${employee?.name} `.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
			employee.employee_id?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
			(employee.department?.name &&
				employee.department.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())),
	);

	const handleDepartmentChange = (value: string) => {
		handleInputChange("department", parseInt(value) || null);
		setDepartmentSearchTerm("");
	};

	return (
		<div className="p-6 bg-white rounded-lg relative">
			{/* Loading Overlay */}
			{loading && (
				<div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-50">
					<div className="text-center">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
						<p className="text-primary font-medium">Creating Event...</p>
					</div>
				</div>
			)}
			<div className="max-w-full mx-auto space-y-8">
				{/* Header */}
				<div className="flex items-center gap-6">
					<Link href="/events-holidays" passHref>
						<Button
							variant="outline"
							size="sm"
							className="shadow-sm bg-transparent rounded-full w-8 h-8 p-4 flex items-center justify-center"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div className="space-y-2">
						<h1 className="text-[20px] text-[#232E3F]">Add Event</h1>
						{(departmentsLoading || employeesLoading) && (
							<div className="flex items-center gap-2 text-sm text-slate-600">
								<div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
								{departmentsLoading && employeesLoading
									? "Loading data..."
									: departmentsLoading
										? "Loading departments..."
										: "Loading employees..."}
							</div>
						)}
					</div>
				</div>

				{/* Progress Steps */}
				<div>
					<div>
						<div className="flex items-center justify-between">
							{steps.map((step, index) => {
								const isActive = currentStep === step.id;
								const isCompleted = currentStep > step.id;
								const canClick = step.id < currentStep;
								const shouldBeFilled = isActive || isCompleted;

								return (
									<React.Fragment key={step.id}>
										<div
											className={`flex items-center gap-3 cursor-pointer transition-all duration-200 ${
												canClick ? "hover:scale-105" : ""
											}`}
											onClick={() => {
												if (canClick) {
													setCurrentStep(step.id);
												}
											}}
										>
											<div
												className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                        ${
													shouldBeFilled
														? "bg-primary text-white shadow-lg"
														: "bg-slate-200 text-slate-600"
												}
                        ${canClick ? "hover:shadow-md" : ""}
                      `}
											>
												{step.id}
											</div>
											<div className="hidden sm:block">
												<p
													className={`font-medium transition-colors duration-200 ${
														shouldBeFilled
															? "text-primary"
															: canClick
																? "text-slate-700 hover:text-primary"
																: "text-slate-600"
													}`}
												>
													{step.title}
												</p>
											</div>
										</div>

										{index < steps.length - 1 && (
											<div
												className={`
                        flex-1 h-0.5 mx-4 transition-all duration-300
                        ${isCompleted ? "bg-primary" : "bg-slate-200"}
                      `}
											/>
										)}
									</React.Fragment>
								);
							})}
						</div>
					</div>
				</div>

				<div className="flex flex-col lg:flex-row gap-8">
					{/* Main Form */}
					<div className="flex-1">
						<div className="">
							<div className="p-6">
								<div className={`space-y-6 ${loading ? "pointer-events-none opacity-60" : ""}`}>
									{currentStep === 1 && (
										<div className="space-y-6">
											{/* Row 1: Event Title and Event Date */}
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-3">
													<Label htmlFor="title" className="text-[#232E3F] font-medium">
														Event Title *
													</Label>
													<Input
														id="title"
														value={formData.title}
														onChange={(e) => handleInputChange("title", e.target.value)}
														placeholder="Enter event title"
														className="h-12 text-base border-slate-200"
														required
													/>
												</div>
												<div className="space-y-3">
													<Label htmlFor="date" className="text-[#232E3F] font-medium">
														Event Date *
													</Label>
													<input
														id="date"
														type="date"
														value={formData.date}
														onChange={(e) => handleInputChange("date", e.target.value)}
														className="h-12 w-full text-gray-500 border border-slate-200 rounded-md px-3"
														style={{
															colorScheme: "light",
														}}
														required
													/>
												</div>
											</div>

											{/* Row 2: Event Frequency and Time */}
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-3">
													<Label className="text-base font-medium">Event Frequency *</Label>
													<Select
														value={formData.frequency}
														onValueChange={(value: string) => handleInputChange("frequency", value)}
													>
														<SelectTrigger className="h-12 text-base border-slate-200">
															<SelectValue placeholder="Select frequency" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="once">
																<div className="flex items-center gap-2">
																	<Calendar className="h-4 w-4" />
																	One-time Event
																</div>
															</SelectItem>
															<SelectItem value="daily">
																<div className="flex items-center gap-2">
																	<Repeat className="h-4 w-4" />
																	Daily
																</div>
															</SelectItem>
															<SelectItem value="weekly">
																<div className="flex items-center gap-2">
																	<Repeat className="h-4 w-4" />
																	Weekly
																</div>
															</SelectItem>
															<SelectItem value="monthly">
																<div className="flex items-center gap-2">
																	<Repeat className="h-4 w-4" />
																	Monthly
																</div>
															</SelectItem>
															<SelectItem value="yearly">
																<div className="flex items-center gap-2">
																	<Repeat className="h-4 w-4" />
																	Yearly
																</div>
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div className="space-y-3">
													<Label htmlFor="time" className="text-base font-medium">
														Time
													</Label>
													<input
														id="time"
														type="time"
														value={formData.time}
														onChange={(e) => handleInputChange("time", e.target.value)}
														className="h-12 w-full text-gray-500 border border-slate-200 rounded-md px-3"
													/>
												</div>
											</div>

											{/* Row 3: Event Description */}
											<div className="space-y-3">
												<Label htmlFor="description" className="text-base font-medium">
													Event Description *
												</Label>
												<Textarea
													id="description"
													value={formData.description}
													onChange={(e) => handleInputChange("description", e.target.value)}
													placeholder="Describe the event, agenda, and important details..."
													rows={6}
													className="text-base border-slate-200 resize-none"
													required
												/>
											</div>
										</div>
									)}

									{currentStep === 2 && (
										<div className="space-y-6">
											{/* Event Mode */}
											<div className="space-y-3">
												<Label className="text-base font-medium">Event Mode *</Label>
												<div className="flex flex-col md:flex-row gap-3">
													{[
														{
															value: "physical",
															label: "Physical",
															icon: MapPin,
															desc: "In-person event",
														},
														{
															value: "online",
															label: "Online",
															icon: Video,
															desc: "Virtual meeting",
														},
														{
															value: "hybrid",
															label: "Hybrid",
															icon: Users,
															desc: "Both online & physical",
														},
													].map((mode) => {
														const Icon = mode.icon;

														return (
															<div
																key={mode.value}
																className={`
                                  p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 flex-1
                                  ${
																		formData.event_mode === mode.value
																			? "border-blue-500 bg-blue-50"
																			: "border-slate-200 hover:border-slate-300"
																	}
                                `}
																onClick={() => handleInputChange("event_mode", mode.value)}
															>
																<div className="flex items-center gap-3 mb-2">
																	<Icon className="h-5 w-5 text-slate-600" />
																	<span className="font-medium text-slate-900">{mode.label}</span>
																</div>
																<p className="text-sm text-slate-600">{mode.desc}</p>
															</div>
														);
													})}
												</div>
											</div>

											{/* Target Audience and Select Users */}
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-3">
													<Label className="text-base font-medium">Target Audience *</Label>
													<Select
														value={formData.target_audience}
														onValueChange={(value: string) =>
															handleInputChange("target_audience", value)
														}
													>
														<SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
															<SelectValue placeholder="Select target audience" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="all">
																<div className="flex items-center gap-2">
																	<Users className="h-4 w-4" />
																	All Employees
																</div>
															</SelectItem>
															<SelectItem value="department">
																<div className="flex items-center gap-2">
																	<Users className="h-4 w-4" />
																	Specific Department
																</div>
															</SelectItem>
															<SelectItem value="individual">
																<div className="flex items-center gap-2">
																	<Users className="h-4 w-4" />
																	Individual
																</div>
															</SelectItem>
															<SelectItem value="specific_employees">
																<div className="flex items-center gap-2">
																	<Users className="h-4 w-4" />
																	Specific Employees
																</div>
															</SelectItem>
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-3">
													{formData.target_audience === "department" && (
														<div className="space-y-3">
															<Label className="text-base font-medium">Select Department</Label>
															<Select
																value={formData.department?.toString() || ""}
																onValueChange={handleDepartmentChange}
																disabled={departmentsLoading}
															>
																<SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
																	<SelectValue
																		placeholder={
																			departmentsLoading
																				? "Loading departments..."
																				: "Choose department"
																		}
																	/>
																</SelectTrigger>
																<SelectContent>
																	{departmentsLoading ? (
																		<div className="p-4 text-center text-slate-500">
																			<div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
																			Loading departments...
																		</div>
																	) : departments.length === 0 ? (
																		<div className="p-4 text-center text-slate-500">
																			No departments found
																		</div>
																	) : (
																		<>
																			<div className="p-2 border-b border-slate-200">
																				<div className="relative">
																					<input
																						type="text"
																						placeholder="Search departments..."
																						value={departmentSearchTerm}
																						onChange={(e) =>
																							setDepartmentSearchTerm(e.target.value)
																						}
																						className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
																						onClick={(e) => e.stopPropagation()}
																					/>
																					<div className="absolute right-2 top-2.5">
																						<svg
																							className="w-4 h-4 text-slate-400"
																							fill="none"
																							stroke="currentColor"
																							viewBox="0 0 24 24"
																						>
																							<path
																								strokeLinecap="round"
																								strokeLinejoin="round"
																								strokeWidth={2}
																								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
																							/>
																						</svg>
																					</div>
																				</div>
																			</div>

																			<div className="max-h-60 overflow-y-auto">
																				{filteredDepartments.length === 0 ? (
																					<div className="p-4 text-center text-slate-500">
																						No departments match "{departmentSearchTerm}"
																					</div>
																				) : (
																					filteredDepartments.map((dept) => (
																						<SelectItem key={dept.id} value={dept.id.toString()}>
																							<div className="flex flex-col">
																								<span className="font-medium">{dept.name}</span>
																								{dept.description && (
																									<span className="text-xs text-slate-500 truncate">
																										{dept.description}
																									</span>
																								)}
																							</div>
																						</SelectItem>
																					))
																				)}
																			</div>
																		</>
																	)}
																</SelectContent>
															</Select>
														</div>
													)}

													{formData.target_audience === "specific_employees" && (
														<div className="space-y-3">
															<Label className="text-base font-medium">Select Employees</Label>

															<div className="relative">
																<input
																	type="text"
																	placeholder="Search employees..."
																	value={employeeSearchTerm}
																	onChange={(e) => setEmployeeSearchTerm(e.target.value)}
																	className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
																/>
																<div className="absolute right-3 top-2.5">
																	<svg
																		className="w-4 h-4 text-slate-400"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
																		/>
																	</svg>
																</div>
															</div>

															<div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
																{employeesLoading ? (
																	<div className="text-center py-4 text-slate-500">
																		<div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
																		Loading employees...
																	</div>
																) : employees.length === 0 ? (
																	<div className="text-center py-4 text-slate-500">
																		No employees found
																	</div>
																) : filteredEmployees.length === 0 ? (
																	<div className="text-center py-4 text-slate-500">
																		No employees match "{employeeSearchTerm}"
																	</div>
																) : (
																	filteredEmployees.map((employee) => (
																		<div
																			key={employee.id}
																			className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded"
																		>
																			<Checkbox
																				id={`employee-${employee.id}`}
																				checked={formData.specific_employees.includes(
																					employee.id.toString(),
																				)}
																				onCheckedChange={(checked: boolean) => {
																					if (checked) {
																						handleInputChange("specific_employees", [
																							...formData.specific_employees,
																							employee.id.toString(),
																						]);
																					} else {
																						handleInputChange(
																							"specific_employees",
																							formData.specific_employees.filter(
																								(id) => id !== employee.id.toString(),
																							),
																						);
																					}
																				}}
																			/>
																			<label
																				htmlFor={`employee-${employee.id}`}
																				className="flex-1 cursor-pointer"
																			>
																				<div className="font-medium text-slate-900">
																					{employee?.name}
																				</div>
																			</label>
																		</div>
																	))
																)}
															</div>
														</div>
													)}
												</div>
											</div>
										</div>
									)}

									{/* Navigation Buttons */}
									<div className="flex justify-between pt-6 w-full">
										<div className="flex gap-3 w-full">
											{currentStep < 2 ? (
												<Button
													type="button"
													onClick={() => setCurrentStep(currentStep + 1)}
													disabled={!isStepComplete(currentStep)}
													className="w-1/2 px-6 py-2 rounded-full"
												>
													Next
												</Button>
											) : (
												<Button
													type="button"
													onClick={handleSubmit}
													disabled={loading || !isStepComplete(currentStep)}
													className="w-1/2 px-6 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{loading ? (
														<div className="flex items-center gap-2">
															<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
															Creating...
														</div>
													) : (
														"Create Event"
													)}
												</Button>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
