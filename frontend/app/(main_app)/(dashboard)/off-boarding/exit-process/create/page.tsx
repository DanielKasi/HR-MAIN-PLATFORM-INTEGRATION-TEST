"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { apiPost } from "@/lib/apiRequest";

interface FormData {
	employee_id: number | null;
	last_working_day: string;
	letter: File | null;
	comments: string;
	category: "resignation" | "termination";
	created_by: number | null;
	updated_by: number | null;
	initiated_by: number | null;
}

const ExitProcessCreate = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const category = searchParams.get("category") as "resignation" | "termination" | null;
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const currentUserId = currentUser?.id || null;
	const [isLoadingUser, setIsLoadingUser] = useState(true);
	const [authError, setAuthError] = useState<string | null>(null);

	const [formData, setFormData] = useState<FormData>({
		employee_id: null,
		last_working_day: new Date().toISOString().split("T")[0],
		letter: null,
		comments: "",
		category:
			category && ["resignation", "termination"].includes(category) ? category : "resignation",
		created_by: currentUserId,
		updated_by: currentUserId,
		initiated_by: currentUserId,
	});
	const [selectedEmployee, setSelectedEmployee] = useState<(string | number)[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		console.log("Redux auth state:", { user: currentUser });
		if (!category || !["resignation", "termination"].includes(category)) {
			router.push("/off-boarding/exit-process");
			return;
		}
		if (currentUserId === null) {
			setAuthError(
				"No logged-in user found. Please ensure you are logged in or check Redux state. Rendering form for debugging.",
			);
		}
		setIsLoadingUser(false);
	}, [category, currentUserId, router, currentUser]);

	useEffect(() => {
		setFormData((prev) => ({
			...prev,
			created_by: currentUserId,
			updated_by: currentUserId,
			initiated_by: currentUserId,
		}));
	}, [currentUserId]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setFormData((prev) => ({ ...prev, letter: file }));
	};

	const handleEmployeeSelect = (value: (string | number)[]) => {
		setSelectedEmployee(value);
		setFormData((prev) => ({ ...prev, employee_id: value[0] ? Number(value[0]) : null }));
	};

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!currentInstitution) {
				showErrorToast({ defaultMessage: "No institution selected" });
				return;
			}
			if (!currentUserId) {
				showErrorToast({
					defaultMessage: "User information not available. Please refresh and try again.",
				});
				return;
			}
			if (formData.category === "termination" && !formData.employee_id) {
				showErrorToast({ defaultMessage: "Please select an employee" });
				return;
			}
			if (!formData.letter) {
				showErrorToast({
					defaultMessage: `Please upload a ${formData.category === "termination" ? "termination" : "resignation"} letter`,
				});
				return;
			}

			try {
				setLoading(true);
				const formPayload = new FormData();

				// Common fields for both termination and resignation
				formPayload.append("last_working_day", formData.last_working_day);
				formPayload.append("comments", formData.comments);
				formPayload.append("approval_status", "under_creation");
				formPayload.append("is_active", "true");
				formPayload.append("created_by", currentUserId.toString());
				formPayload.append("updated_by", currentUserId.toString());

				if (category === "termination") {
					// Termination-specific fields
					if (formData.employee_id) {
						formPayload.append("employee_id", formData.employee_id.toString());
					}
					formPayload.append("initiation_status", "submitted");
					if (formData.letter) {
						formPayload.append("termination_letter", formData.letter);
					}
					await apiPost("/on-boarding/termination-initiations/", formPayload);
				} else if (category === "resignation") {
					// Resignation-specific fields
					// NOTE: Do NOT send employee_id for resignations - backend uses logged-in user
					formPayload.append("request_status", "submitted"); // Different field name!
					if (formData.letter) {
						formPayload.append("resignation_letter", formData.letter); // Different field name!
					}
					await apiPost("/on-boarding/resignation-requests/", formPayload);
				}

				showSuccessToast(`${formData.category} request submitted successfully`);
				router.push("/off-boarding/exit-process");
			} catch (error: any) {
				console.error("Submission error:", error);
				showErrorToast({ error, defaultMessage: "Failed to submit request" });
			} finally {
				setLoading(false);
			}
		},
		[formData, currentInstitution, currentUserId, router, category],
	);

	const handleBack = () => {
		router.back();
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
									{formData.category === "termination" ? "Termination" : "Resignation"} Request
								</CardTitle>
								<p className="text-sm text-gray-600 mt-1">
									Create a new {formData.category === "termination" ? "termination" : "resignation"}{" "}
									process
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
							{/* Employee Selection - ONLY for Termination */}
							{formData.category === "termination" && (
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
							)}

							{/* Info message for resignations */}
							{formData.category === "resignation" && (
								<div className="p-4 bg-primary-50 border border-primary rounded-md">
									<p className="text-sm text-gray-500">
										<strong>Note:</strong> You are submitting your own resignation. The system will
										automatically link this request to your employee profile.
									</p>
								</div>
							)}

							{/* Date and File Upload in Grid */}
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
										className="w-full bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="letter" className="text-sm font-medium text-gray-800">
										{formData.category === "termination" ? "Termination" : "Resignation"} Letter *
									</Label>
									<Input
										type="file"
										id="letter"
										name="letter"
										accept=".pdf,.doc,.docx"
										onChange={handleFileChange}
										className="w-full bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="comments" className="text-sm font-medium text-gray-800">
									Comments
								</Label>
								<Textarea
									id="comments"
									name="comments"
									value={formData.comments}
									onChange={handleInputChange}
									placeholder="Enter any comments or context for this process..."
									className="w-full min-h-[120px] resize-vertical bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
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
									disabled={loading}
									className="flex rounded-full w-full max-w-sm items-center gap-2 px-6 lg:px-8"
								>
									{loading ? (
										<div className="flex items-center gap-2">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
											Submitting...
										</div>
									) : (
										`Submit ${formData.category === "termination" ? "Termination" : "Resignation"} Request`
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
