"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, ChevronDown, Check, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { ExitProcessAPI, ITerminationType, CreateTerminationData } from "@/lib/exitProcess.Utils";

interface FormData {
	employee_id: number | null;
	termination_type_id: number | null;
	last_working_day: string;
	reason: string;
	status: "INITIATED";
	is_paid_after_termination: boolean;
	final_payment_date: string;
	created_by: number | null;
	updated_by: number | null;
	initiated_by_id: number | null;
}

const ExitProcessCreate = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const category = searchParams.get("category") as "resignation" | "termination" | null;
	const typeId = searchParams.get("typeId");
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const currentUserId = currentUser?.id || null;
	const [isLoadingUser, setIsLoadingUser] = useState(true);
	const [authError, setAuthError] = useState<string | null>(null);

	// State for termination types
	const [terminationTypes, setTerminationTypes] = useState<ITerminationType[]>([]);
	const [loadingTerminationTypes, setLoadingTerminationTypes] = useState(false);
	const [selectedTerminationType, setSelectedTerminationType] = useState<ITerminationType | null>(null);
	const [hasUserInteracted, setHasUserInteracted] = useState(false);

	// State for handover report
	const [handoverReport, setHandoverReport] = useState<File | null>(null);

	const [formData, setFormData] = useState<FormData>({
		employee_id: null,
		termination_type_id: null,
		last_working_day: new Date().toISOString().split("T")[0],
		reason: "",
		status: "INITIATED",
		is_paid_after_termination: false,
		final_payment_date: new Date().toISOString().split("T")[0],
		created_by: currentUserId,
		updated_by: currentUserId,
		initiated_by_id: currentUserId,
	});
	const [selectedEmployee, setSelectedEmployee] = useState<(string | number)[]>([]);
	const [loading, setLoading] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Fetch termination types using the utils API
	const fetchTerminationTypes = async () => {
		if (!currentInstitution) return;

		try {
			setLoadingTerminationTypes(true);
			console.log("Fetching termination types from API...");
			
			const typesData = await ExitProcessAPI.getAllTerminationTypesSmart(currentInstitution.id);

			if (typesData.length === 0) {
				console.log("API returned empty termination types");
				showErrorToast({ defaultMessage: "No termination types configured in the system" });
			} else {
				console.log(`Found ${typesData.length} termination types from API`);
			}

			setTerminationTypes(typesData);

			if (typeId && !hasUserInteracted) {
				const preselectedType = typesData.find(type => type.id === Number(typeId));
				if (preselectedType) {
					setSelectedTerminationType(preselectedType);
					setFormData(prev => ({ ...prev, termination_type_id: preselectedType.id }));
				}
			}
		} catch (err) {
			console.error("Error fetching termination types:", err);
			showErrorToast({ 
				error: err, 
				defaultMessage: "Failed to fetch termination types from server. Please try again." 
			});
			setTerminationTypes([]);
		} finally {
			setLoadingTerminationTypes(false);
		}
	};

	useEffect(() => {
		console.log("Redux auth state:", { user: currentUser });
		
		if (currentUserId === null) {
			setAuthError(
				"No logged-in user found. Please ensure you are logged in or check Redux state.",
			);
		}
		
		setIsLoadingUser(false);
	}, [currentUserId, currentUser]);

	useEffect(() => {
		setFormData((prev) => ({
			...prev,
			created_by: currentUserId,
			updated_by: currentUserId,
			initiated_by_id: currentUserId,
		}));
	}, [currentUserId]);

	useEffect(() => {
		if (currentInstitution) {
			fetchTerminationTypes();
		}
	}, [currentInstitution]);

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

	const handleTerminationTypeChange = (type: ITerminationType) => {
		setSelectedTerminationType(type);
		setFormData(prev => ({ 
			...prev, 
			termination_type_id: type.id
		}));
		setIsDropdownOpen(false);
		setHasUserInteracted(true);
		
		// Clear handover report if new type doesn't require it
		if (!type.requires_handover_report) {
			setHandoverReport(null);
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
			setHandoverReport(file);
		}
	};

	const handleRemoveFile = () => {
		setHandoverReport(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
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
			if (selectedTerminationType?.requires_handover_report && !handoverReport) {
				showErrorToast({ defaultMessage: "Handover report is required for this termination type" });
				return;
			}

			try {
				setLoading(true);

				const terminationData: CreateTerminationData = {
					employee_id: formData.employee_id,
					termination_type_id: formData.termination_type_id!,
					initiated_by_id: currentUserId,
					last_working_day: formData.last_working_day,
					reason: formData.reason,
					status: formData.status,
					initiator_type: "EMPLOYER",
					is_paid_after_termination: formData.is_paid_after_termination,
					final_payment_date: formData.is_paid_after_termination ? formData.final_payment_date : undefined,
					created_by: currentUserId,
					updated_by: currentUserId,
				};

				console.log("Submitting termination data:", terminationData);
				
				// If handover report exists, you may need to upload it separately
				// This depends on your API structure
				if (handoverReport) {
					console.log("Handover report attached:", handoverReport.name);
					// TODO: Upload handover report via API
					// await ExitProcessAPI.uploadHandoverReport(handoverReport);
				}

				await ExitProcessAPI.create({ terminationData });

				showSuccessToast("Termination process initiated successfully");
				router.push("/off-boarding/exit-process");
			} catch (error: any) {
				console.error("Submission error:", error);
				showErrorToast({ error, defaultMessage: "Failed to initiate termination process" });
			} finally {
				setLoading(false);
			}
		},
		[formData, currentInstitution, currentUserId, selectedTerminationType, handoverReport, router],
	);

	const handleBack = () => {
		router.back();
	};

	const getCategoryColor = (category: string) => {
		switch (category) {
			case "resignation":
				return "bg-purple-100 text-purple-800";
			case "termination":
				return "bg-red-100 text-red-800";
			case "retirement":
				return "bg-yellow-100 text-yellow-800";
			case "contract_end":
				return "bg-orange-100 text-orange-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	if (isLoadingUser) {
		return (
			<div className="flex flex-col w-full min-h-screen bg-white p-4 sm:p-6 items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
				<p className="text-sm text-muted-foreground mt-2">Loading user...</p>
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
									Create Termination Process
								</CardTitle>
								<p className="text-sm text-gray-600 mt-1">
									Initiate a new employee termination process
								</p>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6">
						{authError && (
							<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
								<p>{authError}</p>
								<Button
									onClick={() => router.push("/login")}
									className="mt-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm"
								>
									Go to Login
								</Button>
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Termination Type and Employee Selection - Side by Side */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Termination Type Selection */}
								<div className="space-y-2">
									<Label htmlFor="termination_type" className="text-sm font-medium text-gray-800">
										Termination Type *
									</Label>
									{loadingTerminationTypes ? (
										<div className="flex items-center justify-center py-4 border border-gray-300 rounded-lg">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
											<span className="text-sm text-gray-600">Loading termination types...</span>
										</div>
									) : terminationTypes.length === 0 ? (
										<div className="text-center py-4 border border-gray-300 rounded-lg">
											<span className="text-sm text-gray-600">No termination types available</span>
											<Button 
												variant="outline" 
												size="sm" 
												className="mt-2"
												onClick={() => fetchTerminationTypes()}
											>
												Retry
											</Button>
										</div>
									) : (
										<div className="relative" ref={dropdownRef}>
											<button
												type="button"
												onClick={() => setIsDropdownOpen(!isDropdownOpen)}
												className="w-full h-10 bg-white border border-input rounded-lg px-3 py-2 text-sm ring-offset-background focus:border-gray-400 focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
											>
												<span className={selectedTerminationType ? "text-gray-900" : "text-muted-foreground"}>
													{selectedTerminationType ? selectedTerminationType.name : "Select termination type"}
												</span>
												<ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
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
												<span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(selectedTerminationType.category)}`}>
													{selectedTerminationType.category}
												</span>
											</div>
											{selectedTerminationType.requires_handover_report && (
												<p className="text-xs text-blue-600 mt-2">
													<strong>Note:</strong> This termination type requires a handover report
												</p>
											)}
											{selectedTerminationType.supported_stages && selectedTerminationType.supported_stages.length > 0 && (
												<p className="text-xs text-blue-600 mt-1">
													<strong>Stages:</strong> {selectedTerminationType.supported_stages.length} stages configured
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

							{/* Handover Report Upload - Only show if required */}
							{selectedTerminationType?.requires_handover_report && (
								<div className="space-y-2">
									<Label htmlFor="handover_report" className="text-sm font-medium text-gray-800">
										Handover Report *
									</Label>
									<div className="space-y-2">
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
												className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-700"
											>
												<Upload className="h-6 w-6" />
												<span className="text-sm">Click to upload handover report</span>
												<span className="text-xs text-gray-500">PDF, DOC, DOCX, TXT (Max 10MB)</span>
											</button>
										) : (
											<div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
												<div className="flex items-center gap-2">
													<div className="p-2 bg-green-100 rounded">
														<Upload className="h-4 w-4 text-green-600" />
													</div>
													<div>
														<p className="text-sm font-medium text-green-800">{handoverReport.name}</p>
														<p className="text-xs text-green-600">
															{(handoverReport.size / 1024 / 1024).toFixed(2)} MB
														</p>
													</div>
												</div>
												<button
													type="button"
													onClick={handleRemoveFile}
													className="p-1 hover:bg-green-100 rounded transition-colors"
												>
													<X className="h-4 w-4 text-green-600" />
												</button>
											</div>
										)}
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

							{/* Date Fields in Grid */}
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

								{/* Final Payment Date - Only show if checkbox is checked */}
								{formData.is_paid_after_termination && (
									<div className="space-y-2">
										<Label htmlFor="final_payment_date" className="text-sm font-medium text-gray-800">
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

							<div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-gray-200">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.push("/off-boarding/exit-process")}
									disabled={loading}
									className="w-full sm:w-auto px-6 py-2 text-sm font-medium rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={loading || !selectedTerminationType}
									className="flex rounded-full w-full max-w-sm items-center gap-2 px-6 lg:px-8"
								>
									{loading ? (
										<div className="flex items-center gap-2">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
											Creating Termination...
										</div>
									) : (
										`Create ${selectedTerminationType?.name || 'Termination'} Process`
									)}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default ExitProcessCreate;