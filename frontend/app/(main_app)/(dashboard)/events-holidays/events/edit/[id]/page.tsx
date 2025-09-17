"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Save,
	Calendar,
	Users,
	MapPin,
	Video,
	AlertTriangle,
	Clock,
} from "lucide-react";
import Link from "next/link";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiGet, apiPatch } from "@/lib/apiRequest";
import FixedLoader from "@/components/fixed-loader";

export default function EditEventPage() {
	const params = useParams();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [initialLoading, setInitialLoading] = useState(true);
	const [hasChanges, setHasChanges] = useState(false);
	const [originalData, setOriginalData] = useState<any>(null);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		date: "",
		target_audience: "all" as "all" | "department" | "individual" | "specific_employees",
		event_mode: "physical" as "physical" | "online" | "hybrid",
		department: "",
		specific_employees: [] as string[],
		frequency: "once" as "once" | "daily" | "weekly" | "monthly" | "yearly",
		repeat_until: "",
		institution: 1,
	});

	const fetchEvent = async () => {
		try {
			const response = await apiGet(`/calendar/events/${params.id}/`);
			const event = response.data;
			const eventData = {
				title: event.title,
				description: event.description,
				date: event.date.split("T")[0],
				target_audience: event.target_audience,
				event_mode: event.event_mode,
				department: event.department?.id?.toString() || "",
				specific_employees: event.specific_employees.map((emp: any) => emp.id.toString()),
				frequency: event.frequency || "once",
				repeat_until: event.repeat_until ? event.repeat_until.split("T")[0] : "",
				institution: event.institution,
			};

			setFormData(eventData);
			setOriginalData(eventData);
		} catch (error) {
			console.error("Error fetching event:", error);
		} finally {
			setInitialLoading(false);
		}
	};

	useEffect(() => {
		if (params.id) {
			fetchEvent();
		}
	}, [params.id]);

	useEffect(() => {
		if (originalData) {
			const changed = JSON.stringify(formData) !== JSON.stringify(originalData);

			setHasChanges(changed);
		}
	}, [formData, originalData]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			await apiPatch(`/calendar/events/${params.id}/`, formData);
			router.push(`/calendar/events/${params.id}`);
		} catch (error) {
			console.error("Error updating event:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: string, value: string | string[]) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleReset = () => {
		if (originalData) {
			setFormData(originalData);
		}
	};

	const getEventModeIcon = (mode: string) => {
		switch (mode) {
			case "online":
				return <Video className="h-4 w-4" />;
			case "physical":
				return <MapPin className="h-4 w-4" />;
			case "hybrid":
				return <Users className="h-4 w-4" />;
			default:
				return <Calendar className="h-4 w-4" />;
		}
	};

	// Mock data - in real app, fetch from API
	const departments = [
		{ id: "1", name: "Engineering" },
		{ id: "2", name: "Marketing" },
		{ id: "3", name: "Sales" },
		{ id: "4", name: "HR" },
	];

	const employees = [
		{ id: "1", name: "John Doe", department: "Engineering" },
		{ id: "2", name: "Jane Smith", department: "Marketing" },
		{ id: "3", name: "Mike Johnson", department: "Sales" },
		{ id: "4", name: "Sarah Wilson", department: "HR" },
	];

	if (initialLoading) {
		return <FixedLoader />;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
			<div className="max-w-full mx-auto space-y-8">
				{/* Header */}
				<div className="flex items-center gap-6">
					<Link href={`/events-holidays/events/${params.id}`}>
						<Button variant="outline" size="sm" className="shadow-sm bg-transparent">
							<ArrowLeft className="h-4 w-4 mr-2" />
						</Button>
					</Link>
					<div className="space-y-2">
						<h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
							Edit Event
						</h1>
						<p className="text-slate-600 text-lg">Update event details and settings</p>
					</div>
				</div>

				{/* Changes Alert */}
				{hasChanges && (
					<Card className="border-orange-200 bg-orange-50">
						<CardContent className="p-4">
							<div className="flex items-center gap-3">
								<AlertTriangle className="h-5 w-5 text-myOrange" />
								<div className="flex-1">
									<p className="text-orange-800 font-medium">You have unsaved changes</p>
									<p className="text-orange-700 text-sm">
										Make sure to save your changes before leaving this page.
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={handleReset}
									className="border-orange-300 text-orange-700 hover:bg-orange-100 bg-transparent"
								>
									Reset Changes
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Form */}
					<div className="lg:col-span-2">
						<Card className="border-0 shadow-lg">
							<CardHeader>
								<CardTitle className="text-2xl font-bold text-slate-900">Event Details</CardTitle>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmit} className="space-y-6">
									<div className="space-y-3">
										<Label htmlFor="title" className="text-base font-medium">
											Event Title *
										</Label>
										<Input
											id="title"
											value={formData.title}
											onChange={(e) => handleInputChange("title", e.target.value)}
											placeholder="Enter event title"
											className="h-12 text-base border-slate-200 focus:border-blue-500"
											required
										/>
									</div>

									<div className="space-y-3">
										<Label htmlFor="description" className="text-base font-medium">
											Event Description
										</Label>
										<Textarea
											id="description"
											value={formData.description}
											onChange={(e) => handleInputChange("description", e.target.value)}
											placeholder="Describe the event..."
											rows={6}
											className="text-base border-slate-200 focus:border-blue-500 resize-none"
										/>
									</div>

									<div className="space-y-3">
										<Label htmlFor="date" className="text-base font-medium">
											Event Date *
										</Label>
										<Input
											id="date"
											type="date"
											value={formData.date}
											onChange={(e) => handleInputChange("date", e.target.value)}
											className="h-12 text-base border-slate-200 focus:border-blue-500"
											required
										/>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="space-y-3">
											<Label className="text-base font-medium">Target Audience *</Label>
											<Select
												value={formData.target_audience}
												onValueChange={(value) => handleInputChange("target_audience", value)}
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
											<Label className="text-base font-medium">Event Mode *</Label>
											<Select
												value={formData.event_mode}
												onValueChange={(value) => handleInputChange("event_mode", value)}
											>
												<SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
													<SelectValue placeholder="Select event mode" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="physical">
														<div className="flex items-center gap-2">
															<MapPin className="h-4 w-4" />
															Physical
														</div>
													</SelectItem>
													<SelectItem value="online">
														<div className="flex items-center gap-2">
															<Video className="h-4 w-4" />
															Online
														</div>
													</SelectItem>
													<SelectItem value="hybrid">
														<div className="flex items-center gap-2">
															<Users className="h-4 w-4" />
															Hybrid
														</div>
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>

									{formData.target_audience === "department" && (
										<div className="space-y-3">
											<Label className="text-base font-medium">Select Department</Label>
											<Select
												value={formData.department}
												onValueChange={(value) => handleInputChange("department", value)}
											>
												<SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
													<SelectValue placeholder="Choose department" />
												</SelectTrigger>
												<SelectContent>
													{departments.map((dept) => (
														<SelectItem key={dept.id} value={dept.id}>
															{dept.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}

									{formData.target_audience === "specific_employees" && (
										<div className="space-y-3">
											<Label className="text-base font-medium">Select Employees</Label>
											<div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
												{employees.map((employee) => (
													<div
														key={employee.id}
														className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded"
													>
														<Checkbox
															id={`employee-${employee.id}`}
															checked={formData.specific_employees.includes(employee.id)}
															onCheckedChange={(checked) => {
																if (checked) {
																	handleInputChange("specific_employees", [
																		...formData.specific_employees,
																		employee.id,
																	]);
																} else {
																	handleInputChange(
																		"specific_employees",
																		formData.specific_employees.filter((id) => id !== employee.id),
																	);
																}
															}}
														/>
														<label
															htmlFor={`employee-${employee.id}`}
															className="flex-1 cursor-pointer"
														>
															<div className="font-medium text-slate-900">{employee.name}</div>
															<div className="text-sm text-slate-600">{employee.department}</div>
														</label>
													</div>
												))}
											</div>
										</div>
									)}

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="space-y-3">
											<Label className="text-base font-medium">Event Frequency</Label>
											<Select
												value={formData.frequency}
												onValueChange={(value) => handleInputChange("frequency", value)}
											>
												<SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
													<SelectValue placeholder="Select frequency" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="once">One-time Event</SelectItem>
													<SelectItem value="daily">Daily</SelectItem>
													<SelectItem value="weekly">Weekly</SelectItem>
													<SelectItem value="monthly">Monthly</SelectItem>
													<SelectItem value="yearly">Yearly</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{formData.frequency !== "once" && (
											<div className="space-y-3">
												<Label htmlFor="repeat_until" className="text-base font-medium">
													Repeat Until
												</Label>
												<Input
													id="repeat_until"
													type="date"
													value={formData.repeat_until}
													onChange={(e) => handleInputChange("repeat_until", e.target.value)}
													className="h-12 text-base border-slate-200 focus:border-blue-500"
													min={formData.date}
												/>
											</div>
										)}
									</div>

									<div className="flex gap-4 pt-6 border-t border-slate-200">
										<Button type="submit" disabled={loading || !hasChanges}>
											<Save className="h-4 w-4 mr-2" />
											{loading ? "Updating..." : "Save Changes"}
										</Button>
										<Link href={`/events-holidays/events/${params.id}`}>
											<Button variant="outline" type="button" className="shadow-sm bg-transparent">
												Cancel
											</Button>
										</Link>
									</div>
								</form>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Event Preview */}
						<Card className="border-0 shadow-lg">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									Event Preview
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-slate-600 text-sm">Mode</span>
										<Badge className="bg-blue-100 text-blue-800 border-blue-200">
											{getEventModeIcon(formData.event_mode)}
											<span className="ml-1">{formData.event_mode}</span>
										</Badge>
									</div>

									<div className="flex justify-between items-center">
										<span className="text-slate-600 text-sm">Audience</span>
										<span className="font-medium text-slate-900">
											{formData.target_audience.replace("_", " ")}
										</span>
									</div>

									<div className="flex justify-between items-center">
										<span className="text-slate-600 text-sm">Frequency</span>
										<span className="font-medium text-slate-900">{formData.frequency}</span>
									</div>

									{formData.date && (
										<div className="flex justify-between items-center">
											<span className="text-slate-600 text-sm">Date</span>
											<span className="font-medium text-slate-900">
												{new Date(formData.date).toLocaleDateString()}
											</span>
										</div>
									)}

									{formData.specific_employees.length > 0 && (
										<div className="flex justify-between items-center">
											<span className="text-slate-600 text-sm">Selected</span>
											<span className="font-medium text-slate-900">
												{formData.specific_employees.length} employees
											</span>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Change Summary */}
						{hasChanges && (
							<Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-yellow-50">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-orange-900">
										<AlertTriangle className="h-5 w-5" />
										Pending Changes
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-orange-800 text-sm space-y-2">
										<p>You have unsaved changes to this event.</p>
										<p>Remember to save your changes before navigating away.</p>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Event Timeline */}
						{formData.frequency !== "once" && formData.repeat_until && (
							<Card className="border-0 shadow-lg">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Clock className="h-5 w-5" />
										Recurring Schedule
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-3">
										<div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
											<div className="w-3 h-3 bg-green-500 rounded-full" />
											<div className="flex-1">
												<p className="text-sm font-medium text-green-800">Start Date</p>
												<p className="text-xs text-green-700">
													{formData.date ? new Date(formData.date).toLocaleDateString() : "Not set"}
												</p>
											</div>
										</div>

										<div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
											<div className="w-3 h-3 bg-red-500 rounded-full" />
											<div className="flex-1">
												<p className="text-sm font-medium text-red-800">End Date</p>
												<p className="text-xs text-red-700">
													{formData.repeat_until
														? new Date(formData.repeat_until).toLocaleDateString()
														: "Not set"}
												</p>
											</div>
										</div>

										<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
											<p className="text-sm font-medium text-blue-800">Frequency</p>
											<p className="text-xs text-blue-700 capitalize">{formData.frequency}</p>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Tips */}
						<Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-blue-900">
									<Calendar className="h-5 w-5" />
									Editing Tips
								</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="text-blue-800 text-sm space-y-2">
									<li>• Changes to recurring events affect all future occurrences</li>
									<li>• Audience changes will update attendee lists</li>
									<li>• Mode changes may affect meeting links</li>
									<li>• Date changes will send notifications to attendees</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
