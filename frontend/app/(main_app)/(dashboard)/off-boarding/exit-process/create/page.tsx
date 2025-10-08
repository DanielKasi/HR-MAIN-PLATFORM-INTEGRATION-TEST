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
	effective_date: string;
	letter: File | null;
	additional_notes: string;
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
		effective_date: new Date().toISOString().split("T")[0],
		letter: null,
		additional_notes: "",
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
				formPayload.append("category", formData.category);
				formPayload.append("effective_date", formData.effective_date);
				if (formData.letter) {
					formPayload.append(
						formData.category === "termination" ? "termination_letter" : "resignation_letter",
						formData.letter,
					);
				}
				formPayload.append("additional_notes", formData.additional_notes);
				if (formData.category === "termination" && formData.employee_id) {
					formPayload.append("employee_id", formData.employee_id.toString());
				}
				if (category === "termination") {
					await apiPost("/on-boarding/termination-initiations/", formPayload);
				} else if (category === "resignation") {
					await apiPost("/on-boarding/resignation-requests/", formPayload);
				}
				showSuccessToast(`request submitted successfully`);
				router.push("/off-boarding/exit-process");
			} catch (error: any) {
				showErrorToast({ error, defaultMessage: "Failed to submit request" });
			} finally {
				setLoading(false);
			}
		},
		[formData, currentInstitution, currentUserId, router],
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
				{/* Main Card Container */}
				<Card className="w-full shadow-lg border-0">
					<CardHeader className="border-b border-gray-200 pb-6">
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
							{/* Employee Selection - Only for Termination */}

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

							{/* Date and File Upload in Grid */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Effective Date */}
								<div className="space-y-2">
									<Label htmlFor="effective_date" className="text-sm font-medium text-gray-800">
										Effective Date *
									</Label>
									<Input
										type="date"
										id="effective_date"
										name="effective_date"
										value={formData.effective_date}
										onChange={handleInputChange}
										required
										className="w-full bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
									/>
								</div>

								{/* Letter Upload */}
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

							{/* Additional Notes */}
							<div className="space-y-2">
								<Label htmlFor="additional_notes" className="text-sm font-medium text-gray-800">
									Additional Notes
								</Label>
								<Textarea
									id="additional_notes"
									name="additional_notes"
									value={formData.additional_notes}
									onChange={handleInputChange}
									placeholder="Enter any additional notes or context for this process..."
									className="w-full min-h-[120px] resize-vertical bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
								/>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.push("/off-boarding/exit-process")}
									disabled={loading}
									className="w-full sm:w-auto px-6 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={loading}
									className="w-full sm:w-auto px-6 py-2 text-sm font-medium bg-[#FF4D4D] hover:bg-[#E04444] text-white"
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
