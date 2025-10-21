// app/off-boarding/exit-process/[id]/edit/page.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, ChevronDown, Check, Upload, X, FileText, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { ExitProcessAPI, ITerminationType, ITermination } from "@/lib/exitProcess.Utils";

interface FormData {
	employee_id: number | null;
	termination_type_id: number | null;
	last_working_day: string;
	reason: string;
	status: "INITIATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
	initiator_type: "EMPLOYEE" | "MANAGER" | "HR" | "EMPLOYER";
	is_paid_after_termination: boolean;
	final_payment_date: string;
	updated_by: number | null;
}

const ExitProcessEdit = () => {
	const router = useRouter();
	const params = useParams();
	const terminationId = params.id as string;
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const currentUserId = currentUser?.id || null;

	// State for termination data
	const [termination, setTermination] = useState<ITermination | null>(null);
	const [terminationTypes, setTerminationTypes] = useState<ITerminationType[]>([]);
	const [loadingTerminationTypes, setLoadingTerminationTypes] = useState(false);
	const [selectedTerminationType, setSelectedTerminationType] = useState<ITerminationType | null>(
		null,
	);

	// State for handover report
	const [handoverReport, setHandoverReport] = useState<File | null>(null);
	const [handoverReportText, setHandoverReportText] = useState("");
	const [existingHandoverReport, setExistingHandoverReport] = useState<any>(null);

	const [formData, setFormData] = useState<FormData>({
		employee_id: null,
		termination_type_id: null,
		last_working_day: new Date().toISOString().split("T")[0],
		reason: "",
		status: "INITIATED",
		initiator_type: "EMPLOYER",
		is_paid_after_termination: false,
		final_payment_date: new Date().toISOString().split("T")[0],
		updated_by: currentUserId,
	});

	const [selectedEmployee, setSelectedEmployee] = useState<(string | number)[]>([]);
	const [loading, setLoading] = useState(false);
	const [fetchLoading, setFetchLoading] = useState(true);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Fetch termination details
	const fetchTerminationDetails = async () => {
		if (!currentInstitution || !terminationId) return;

		try {
			setFetchLoading(true);
			console.log("Fetching termination details for ID:", terminationId);

			const terminationData = await ExitProcessAPI.getById(terminationId);
			setTermination(terminationData);

			// Set form data
			setFormData({
				employee_id: terminationData.employee_id || null,
				termination_type_id: terminationData.termination_type?.id || null,
				last_working_day: terminationData.last_working_day,
				reason: terminationData.reason || "",
				status: terminationData.status,
				initiator_type: terminationData.initiator_type,
				is_paid_after_termination: terminationData.is_paid_after_termination,
				final_payment_date:
					terminationData.final_payment_date || new Date().toISOString().split("T")[0],
				updated_by: currentUserId,
			});

			// Set employee
			if (terminationData.employee_id) {
				setSelectedEmployee([terminationData.employee_id.toString()]);
			}

			// Set termination type
			if (terminationData.termination_type) {
				setSelectedTerminationType(terminationData.termination_type);
			}

			// Set handover report data
			if (terminationData.handover_report) {
				setExistingHandoverReport(terminationData.handover_report);
				setHandoverReportText(terminationData.handover_report.report_text || "");
			}

			console.log("Termination data loaded successfully:", terminationData);
		} catch (err) {
			console.error("Error fetching termination details:", err);
			showErrorToast({
				error: err,
				defaultMessage: "Failed to fetch termination details",
			});
		} finally {
			setFetchLoading(false);
		}
	};

	// Fetch termination types
	const fetchTerminationTypes = async () => {
		if (!currentInstitution) return;

		try {
			setLoadingTerminationTypes(true);
			const typesData = await ExitProcessAPI.getAllTerminationTypesSmart(currentInstitution.id);
			setTerminationTypes(typesData);
		} catch (err) {
			console.error("Error fetching termination types:", err);
			showErrorToast({
				error: err,
				defaultMessage: "Failed to fetch termination types",
			});
		} finally {
			setLoadingTerminationTypes(false);
		}
	};

	useEffect(() => {
		if (currentInstitution && terminationId) {
			fetchTerminationDetails();
			fetchTerminationTypes();
		}
	}, [currentInstitution, terminationId]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
		}));
	};

	const handleStatusChange = (status: FormData["status"]) => {
		setFormData((prev) => ({ ...prev, status }));
	};

	const handleInitiatorTypeChange = (initiatorType: FormData["initiator_type"]) => {
		setFormData((prev) => ({ ...prev, initiator_type: initiatorType }));
	};

	const handleTerminationTypeChange = (type: ITerminationType) => {
		setSelectedTerminationType(type);
		setFormData((prev) => ({
			...prev,
			termination_type_id: type.id,
		}));
		setIsDropdownOpen(false);

		// Clear handover report if new type doesn't require it
		if (!type.requires_handover_report) {
			setHandoverReport(null);
			setHandoverReportText("");
		}
	};

	const handleEmployeeSelect = (value: (string | number)[]) => {
		setSelectedEmployee(value);
		setFormData((prev) => ({ ...prev, employee_id: value[0] ? Number(value[0]) : null }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validate file size (e.g., max 10MB)
			if (file.size > 10 * 1024 * 1024) {
				showErrorToast({ defaultMessage: "File size must be less than 10MB" });
				return;
			}

			// Validate file type
			const allowedTypes = [
				"application/pdf",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"text/plain",
			];

			if (!allowedTypes.includes(file.type)) {
				showErrorToast({ defaultMessage: "Please upload a PDF, DOC, DOCX, or TXT file" });
				return;
			}

			setHandoverReport(file);
		}
	};

	const handleRemoveFile = () => {
		setHandoverReport(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleRemoveExistingFile = () => {
		setExistingHandoverReport(null);
		setHandoverReportText("");
	};

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			if (!formData.employee_id || formData.employee_id === 0) {
				showErrorToast({ defaultMessage: "Please select a valid employee" });
				return;
			}
			if (!formData.termination_type_id || formData.termination_type_id === 0) {
				showErrorToast({ defaultMessage: "Please select a valid termination type" });
				return;
			}
			if (!currentUserId || currentUserId === 0) {
				showErrorToast({ defaultMessage: "User information not available" });
				return;
			}

			// Validate handover report if required
			if (selectedTerminationType?.requires_handover_report) {
				if (!existingHandoverReport && !handoverReport && !handoverReportText.trim()) {
					showErrorToast({
						defaultMessage: "Please provide either a handover report file or text",
					});
					return;
				}
			}

			try {
				setLoading(true);

				const updateData: any = {
					employee_id: formData.employee_id,
					termination_type_id: formData.termination_type_id,
					last_working_day: formData.last_working_day,
					reason: formData.reason,
					status: formData.status,
					initiator_type: formData.initiator_type,
					is_paid_after_termination: formData.is_paid_after_termination,
					updated_by: currentUserId,
				};

				// Only include final_payment_date if payment after termination is enabled
				if (formData.is_paid_after_termination) {
					updateData.final_payment_date = formData.final_payment_date;
				} else {
					updateData.final_payment_date = null;
				}

				console.log("Updating termination data:", updateData);

				// Step 1: Update the termination
				const updatedTermination = await ExitProcessAPI.update(terminationId, updateData);

				if (!updatedTermination) {
					throw new Error("Failed to update termination");
				}

				console.log("Termination updated successfully:", updatedTermination.id);

				// Step 2: Handle handover report
				if (selectedTerminationType?.requires_handover_report) {
					const hasHandoverContent = handoverReport || handoverReportText.trim();
					const hasExistingHandover = existingHandoverReport;

					if (hasHandoverContent) {
						try {
							console.log("Updating handover report...");

							const formData = new FormData();
							formData.append("offboarding", terminationId);

							if (handoverReportText.trim()) {
								formData.append("report_text", handoverReportText.trim());
							}

							if (handoverReport) {
								formData.append("report_file", handoverReport);
							}

							if (currentUserId) {
								formData.append("updated_by", currentUserId.toString());
							}

							if (hasExistingHandover) {
								// Update existing handover report
								await ExitProcessAPI.updateHandoverReport(existingHandoverReport.id, {
									handoverData: formData,
									isFormData: true,
								});
								console.log("Handover report updated successfully");
							} else {
								// Create new handover report
								formData.append("created_by", currentUserId!.toString());
								await ExitProcessAPI.createHandoverReport({
									handoverData: formData,
									isFormData: true,
								});
								console.log("Handover report created successfully");
							}
						} catch (handoverError: any) {
							console.error("Error handling handover report:", handoverError);
							showErrorToast({
								defaultMessage: "Termination updated but handover report failed",
							});
						}
					} else if (hasExistingHandover && !hasHandoverContent) {
						// Delete handover report if it exists but no content provided
						try {
							await ExitProcessAPI.deleteHandoverReport(existingHandoverReport.id);
							console.log("Handover report deleted successfully");
						} catch (deleteError) {
							console.error("Error deleting handover report:", deleteError);
						}
					}
				}

				showSuccessToast("Termination process updated successfully");
				router.push(`/off-boarding/exit-process/${terminationId}`);
			} catch (error: any) {
				console.error("Update error:", error);

				if (error.response) {
					showErrorToast({
						defaultMessage: `Failed to update termination: ${error.response.data?.detail || error.response.statusText}`,
					});
				} else if (error.request) {
					showErrorToast({
						defaultMessage: "Network error: Unable to reach server",
					});
				} else {
					showErrorToast({
						error,
						defaultMessage: "An unexpected error occurred while updating the termination process",
					});
				}
			} finally {
				setLoading(false);
			}
		},
		[
			formData,
			currentUserId,
			terminationId,
			selectedTerminationType,
			handoverReport,
			handoverReportText,
			existingHandoverReport,
			router,
		],
	);

	const handleBack = () => {
		router.push(`/off-boarding/exit-process/${terminationId}`);
	};

	const getCategoryColor = (category: string) => {
		switch (category) {
			case "resignation":
				return "bg-purple-100 text-purple-800 border-purple-200";
			case "termination":
				return "bg-red-100 text-red-800 border-red-200";
			case "retirement":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "contract_end":
				return "bg-orange-100 text-orange-800 border-orange-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "INITIATED":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "IN_PROGRESS":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "COMPLETED":
				return "bg-green-100 text-green-800 border-green-200";
			case "CANCELLED":
				return "bg-gray-100 text-gray-800 border-gray-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	if (fetchLoading) {
		return (
			<div className="flex flex-col w-full min-h-screen bg-white p-4 sm:p-6 items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
				<p className="text-sm text-muted-foreground mt-2">Loading termination details...</p>
			</div>
		);
	}

	if (!termination) {
		return (
			<div className="flex flex-col w-full h-full p-6 bg-white rounded-lg items-center justify-center">
				<FileText className="h-16 w-16 text-gray-400 mb-4" />
				<h2 className="text-xl font-semibold text-gray-600 mb-2">Termination Not Found</h2>
				<p className="text-gray-500 mb-4">The requested termination process could not be found.</p>
				<Button onClick={() => router.push("/off-boarding/exit-process")}>
					Back to Exit Processes
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div className="w-full">
				<Card className="w-full border-0">
					<CardHeader className="pb-6">
						<div className="flex items-center gap-2 sm:gap-3 md:gap-4">
							<Button
								variant="outline"
								size="sm"
								onClick={handleBack}
								className="rounded-full aspect-square border-gray-300 hover:bg-gray-50"
							>
								<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
							</Button>
							<div>
								<CardTitle className="text-2xl sm:text-3xl font-semibold text-gray-800">
									Edit Termination Process
								</CardTitle>
								<p className="text-sm text-gray-600 mt-1">
									Update employee termination process details
								</p>
							</div>
							<div className="ml-auto flex items-center gap-2">
								<Badge className={getStatusColor(termination.status)}>
									{termination.status.toLowerCase().replace(/_/g, " ")}
								</Badge>
								<Badge variant="outline" className="text-xs">
									ID: {termination.id}
								</Badge>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6">
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Process Status and Initator Type */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-800">Process Status</Label>
									<div className="flex flex-wrap gap-2">
										{["INITIATED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => (
											<Badge
												key={status}
												variant={formData.status === status ? "default" : "outline"}
												className={`cursor-pointer ${
													formData.status === status
														? getStatusColor(status)
														: "bg-white hover:bg-gray-50"
												}`}
												onClick={() => handleStatusChange(status as FormData["status"])}
											>
												{status.toLowerCase().replace(/_/g, " ")}
											</Badge>
										))}
									</div>
								</div>

								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-800">Initiator Type</Label>
									<div className="flex flex-wrap gap-2">
										{["EMPLOYEE", "MANAGER", "HR", "EMPLOYER"].map((type) => (
											<Badge
												key={type}
												variant={formData.initiator_type === type ? "default" : "outline"}
												className={`cursor-pointer ${
													formData.initiator_type === type
														? "bg-blue-100 text-blue-800 border-blue-200"
														: "bg-white hover:bg-gray-50"
												}`}
												onClick={() =>
													handleInitiatorTypeChange(type as FormData["initiator_type"])
												}
											>
												{type.toLowerCase()}
											</Badge>
										))}
									</div>
								</div>
							</div>

							{/* Termination Type and Employee Selection */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Termination Type Selection */}
								<div className="space-y-2">
									<Label htmlFor="termination_type" className="text-sm font-medium text-gray-800">
										Termination Type *
									</Label>
									{loadingTerminationTypes ? (
										<div className="flex items-center justify-center py-4 border border-gray-300 rounded-lg">
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
											<span className="text-sm text-gray-600">Loading termination types...</span>
										</div>
									) : terminationTypes.length === 0 ? (
										<div className="text-center py-4 border border-gray-300 rounded-lg">
											<span className="text-sm text-gray-600">No termination types available</span>
										</div>
									) : (
										<div className="relative" ref={dropdownRef}>
											<button
												type="button"
												onClick={() => setIsDropdownOpen(!isDropdownOpen)}
												className="w-full h-10 bg-white border border-input rounded-lg px-3 py-2 text-sm ring-offset-background focus:border-gray-400 focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
											>
												<span
													className={
														selectedTerminationType ? "text-gray-900" : "text-muted-foreground"
													}
												>
													{selectedTerminationType
														? selectedTerminationType.name
														: "Select termination type"}
												</span>
												<ChevronDown
													className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
												/>
											</button>

											{isDropdownOpen && (
												<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
													{terminationTypes.map((type) => (
														<button
															key={type.id}
															type="button"
															onClick={() => handleTerminationTypeChange(type)}
															className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between transition-colors first:rounded-t-lg last:rounded-b-lg"
														>
															<span className="text-gray-900">{type.name}</span>
															{selectedTerminationType?.id === type.id && (
																<Check className="h-4 w-4 text-blue-600" />
															)}
														</button>
													))}
												</div>
											)}
										</div>
									)}

									{selectedTerminationType && (
										<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-2">
											<div className="flex items-center justify-between">
												<div>
													<p className="text-sm font-medium text-blue-800">
														{selectedTerminationType.name}
													</p>
													{selectedTerminationType.description && (
														<p className="text-xs text-blue-600 mt-1">
															{selectedTerminationType.description}
														</p>
													)}
												</div>
												<Badge className={getCategoryColor(selectedTerminationType.category)}>
													{selectedTerminationType.category}
												</Badge>
											</div>
											{selectedTerminationType.requires_handover_report && (
												<p className="text-xs text-blue-600 mt-2">
													<strong>Note:</strong> This termination type requires a handover report
												</p>
											)}
										</div>
									)}
								</div>

								{/* Employee Selection */}
								<div className="space-y-2">
									<Label htmlFor="employee_id" className="text-sm font-medium text-gray-800">
										Select Employee *
									</Label>
									<EmployeeSearchableSelect
										id="employee_id"
										value={selectedEmployee}
										onValueChange={handleEmployeeSelect}
										placeholder="Select an employee"
										multiple={false}
										className="w-full"
									/>
								</div>
							</div>

							{/* Handover Report Section */}
							{selectedTerminationType?.requires_handover_report && (
								<div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
									<div className="flex items-center gap-2">
										<FileText className="h-5 w-5 text-gray-600" />
										<h3 className="text-sm font-semibold text-gray-800">Handover Report</h3>
										{existingHandoverReport && (
											<Badge variant="outline" className="ml-2 text-xs">
												Existing Report
											</Badge>
										)}
									</div>

									{/* Existing File Display */}
									{existingHandoverReport?.report_file && (
										<div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
											<div className="flex items-center gap-2">
												<div className="p-2 bg-green-100 rounded">
													<FileText className="h-4 w-4 text-green-600" />
												</div>
												<div>
													<p className="text-sm font-medium text-green-800">
														Current: {existingHandoverReport.report_file.split("/").pop()}
													</p>
													<p className="text-xs text-green-600">
														Uploaded on{" "}
														{new Date(existingHandoverReport.created_at).toLocaleDateString()}
													</p>
												</div>
											</div>
											<button
												type="button"
												onClick={handleRemoveExistingFile}
												className="p-1 hover:bg-green-100 rounded transition-colors"
											>
												<X className="h-4 w-4 text-green-600" />
											</button>
										</div>
									)}

									{/* File Upload */}
									<div className="space-y-2">
										<Label htmlFor="handover_report" className="text-sm font-medium text-gray-700">
											{existingHandoverReport ? "Replace Document" : "Upload Document"} (Optional)
										</Label>
										<input
											ref={fileInputRef}
											type="file"
											id="handover_report"
											onChange={handleFileChange}
											accept=".pdf,.doc,.docx,.txt"
											className="hidden"
										/>

										{!handoverReport ? (
											<button
												type="button"
												onClick={() => fileInputRef.current?.click()}
												className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-700 bg-white"
											>
												<Upload className="h-6 w-6" />
												<span className="text-sm">
													{existingHandoverReport
														? "Click to replace file"
														: "Click to upload handover report"}
												</span>
												<span className="text-xs text-gray-500">
													PDF, DOC, DOCX, TXT (Max 10MB)
												</span>
											</button>
										) : (
											<div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
												<div className="flex items-center gap-2">
													<div className="p-2 bg-blue-100 rounded">
														<FileText className="h-4 w-4 text-blue-600" />
													</div>
													<div>
														<p className="text-sm font-medium text-blue-800">
															{handoverReport.name}
														</p>
														<p className="text-xs text-blue-600">
															{(handoverReport.size / 1024 / 1024).toFixed(2)} MB
														</p>
													</div>
												</div>
												<button
													type="button"
													onClick={handleRemoveFile}
													className="p-1 hover:bg-blue-100 rounded transition-colors"
												>
													<X className="h-4 w-4 text-blue-600" />
												</button>
											</div>
										)}
									</div>

									{/* Text Input */}
									<div className="space-y-2">
										<Label
											htmlFor="handover_report_text"
											className="text-sm font-medium text-gray-700"
										>
											Report Text
										</Label>
										<Textarea
											id="handover_report_text"
											value={handoverReportText}
											onChange={(e) => setHandoverReportText(e.target.value)}
											placeholder="Enter handover report details here..."
											className="w-full min-h-[120px] resize-vertical bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400 rounded-lg"
										/>
										<p className="text-xs text-gray-500">
											{existingHandoverReport?.report_text
												? "Current text will be replaced"
												: "You can provide either a file, text, or both for the handover report."}
										</p>
									</div>
								</div>
							)}

							{/* Payment Options */}
							<div className="space-y-4">
								<div className="flex items-center space-x-2">
									<input
										type="checkbox"
										id="is_paid_after_termination"
										name="is_paid_after_termination"
										checked={formData.is_paid_after_termination}
										onChange={handleInputChange}
										className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
									/>
									<Label
										htmlFor="is_paid_after_termination"
										className="text-sm font-medium text-gray-800"
									>
										Employee will be paid after termination
									</Label>
								</div>
							</div>

							{/* Date Fields */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Label htmlFor="last_working_day" className="text-sm font-medium text-gray-800">
										Last Working Day *
									</Label>
									<Input
										type="date"
										id="last_working_day"
										name="last_working_day"
										value={formData.last_working_day}
										onChange={handleInputChange}
										required
										className="w-full bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400 rounded-lg"
									/>
								</div>

								{formData.is_paid_after_termination && (
									<div className="space-y-2">
										<Label
											htmlFor="final_payment_date"
											className="text-sm font-medium text-gray-800"
										>
											Final Payment Date *
										</Label>
										<Input
											type="date"
											id="final_payment_date"
											name="final_payment_date"
											value={formData.final_payment_date}
											onChange={handleInputChange}
											required={formData.is_paid_after_termination}
											className="w-full bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400 rounded-lg"
										/>
									</div>
								)}
							</div>

							{/* Reason */}
							<div className="space-y-2">
								<Label htmlFor="reason" className="text-sm font-medium text-gray-800">
									Reason for Termination *
								</Label>
								<Textarea
									id="reason"
									name="reason"
									value={formData.reason}
									onChange={handleInputChange}
									placeholder="Enter the reason for termination..."
									required
									className="w-full min-h-[120px] resize-vertical bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400 rounded-lg"
								/>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-gray-200">
								<Button
									type="button"
									variant="outline"
									onClick={handleBack}
									disabled={loading}
									className="w-full sm:w-auto px-6 py-2 text-sm font-medium rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
								>
									Cancel
								</Button>
								<div className="flex gap-3">
									<Button
										type="button"
										variant="outline"
										onClick={() => router.push(`/off-boarding/exit-process/${terminationId}`)}
										disabled={loading}
										className="px-6 py-2 text-sm font-medium rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
									>
										View Details
									</Button>
									<Button
										type="submit"
										disabled={loading}
										className="flex rounded-full items-center gap-2 px-6 lg:px-8 bg-blue-600 hover:bg-blue-700"
									>
										{loading ? (
											<div className="flex items-center gap-2">
												<Loader2 className="h-4 w-4 animate-spin" />
												Updating...
											</div>
										) : (
											<>
												<Save className="h-4 w-4" />
												Update Process
											</>
										)}
									</Button>
								</div>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default ExitProcessEdit;
