"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { apiPost } from "@/lib/apiRequest";
import { IEmployee } from "@/types/types.utils";

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
		console.log("Redux auth state:", { user: currentUser }); // Debug Redux state
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
					formPayload.append("employee", formData.employee_id.toString());
				}
				formPayload.append("created_by", formData.created_by!.toString());
				formPayload.append("updated_by", formData.updated_by!.toString());
				formPayload.append("initiated_by", formData.initiated_by!.toString());

				const response = await apiPost("/api/on-boarding/employee-separations/", formPayload);
				console.log("API response:", response); // Debug API response
				showSuccessToast(
					`${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} request submitted successfully`,
				);
				router.push("/off-boarding/exit-process");
			} catch (error: any) {
				console.error("API error:", error); // Debug error
				if (error.response?.status === 405) {
					showErrorToast({
						defaultMessage:
							"The server does not allow this action. Please check the API endpoint or contact support.",
					});
				} else {
					showErrorToast({ error, defaultMessage: "Failed to submit request" });
				}
			} finally {
				setLoading(false);
			}
		},
		[formData, currentInstitution, currentUserId, router],
	);

	if (isLoadingUser) {
		return (
			<div className="flex flex-col w-full min-h-screen bg-white p-4 sm:p-6 items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
				<p className="text-sm text-muted-foreground mt-2">Loading user...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full min-h-screen bg-white p-4 sm:p-6 md:p-8">
			{authError && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
					<p>{authError}</p>
					<Button
						onClick={() => router.push("/login")}
						className="mt-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
					>
						Go to Login
					</Button>
				</div>
			)}

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
				<div className="flex items-center gap-3">
					<Button
						size="sm"
						variant="outline"
						className="rounded-full aspect-square border-gray-300 hover:bg-gray-100"
						onClick={() => router.push("/off-boarding/exit-process")}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-2xl md:text-3xl font-bold text-gray-900">
							{formData.category === "termination" ? "Termination" : "Resignation"} Request
						</h1>
						<p className="text-sm text-muted-foreground">
							Create a new {formData.category === "termination" ? "termination" : "resignation"}{" "}
							process
						</p>
					</div>
				</div>
			</div>

			{/* Full page card layout */}
			<div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-6 sm:p-8">
				<div className="max-w-2xl mx-auto">
					<form onSubmit={handleSubmit} className="space-y-8">
						{formData.category === "termination" && (
							<div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
								<Label
									htmlFor="employee_id"
									className="text-base font-semibold text-gray-800 mb-3 block"
								>
									Select Employee
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

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
								<Label
									htmlFor="effective_date"
									className="text-base font-semibold text-gray-800 mb-3 block"
								>
									Effective Date
								</Label>
								<Input
									type="date"
									id="effective_date"
									name="effective_date"
									value={formData.effective_date}
									onChange={handleInputChange}
									required
									className="w-full h-12 text-base"
								/>
							</div>

							<div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
								<Label
									htmlFor="letter"
									className="text-base font-semibold text-gray-800 mb-3 block"
								>
									{formData.category === "termination" ? "Termination" : "Resignation"} Letter
								</Label>
								<Input
									type="file"
									id="letter"
									name="letter"
									accept=".pdf,.doc,.docx"
									onChange={handleFileChange}
									className="w-full h-12 text-base"
									required
								/>
							</div>
						</div>

						<div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
							<Label
								htmlFor="additional_notes"
								className="text-base font-semibold text-gray-800 mb-3 block"
							>
								Additional Notes
							</Label>
							<Textarea
								id="additional_notes"
								name="additional_notes"
								value={formData.additional_notes}
								onChange={handleInputChange}
								placeholder="Enter any additional notes or context for this process..."
								className="w-full min-h-[200px] text-base resize-vertical"
							/>
						</div>

						<div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.push("/off-boarding/exit-process")}
								disabled={loading}
								className="w-full sm:w-auto px-8 py-3 text-base font-medium"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={loading}
								className="w-full sm:w-auto px-8 py-3 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
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
				</div>
			</div>
		</div>
	);
};

export default ExitProcessCreate;
