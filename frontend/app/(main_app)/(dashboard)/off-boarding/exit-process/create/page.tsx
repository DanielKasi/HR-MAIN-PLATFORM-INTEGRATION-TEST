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
	termination_type_id: number | null;
	last_working_day: string;
	reason: string;
	status: "INITIATED";
	initiator_type: "EMPLOYEE" | "MANAGER" | "HR";
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

	const [formData, setFormData] = useState<FormData>({
		employee_id: null,
		termination_type_id: typeId ? Number(typeId) : null,
		last_working_day: new Date().toISOString().split("T")[0],
		reason: "",
		status: "INITIATED",
		initiator_type: "MANAGER", // Default to MANAGER for termination initiations
		is_paid_after_termination: false,
		final_payment_date: new Date().toISOString().split("T")[0],
		created_by: currentUserId,
		updated_by: currentUserId,
		initiated_by_id: currentUserId,
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
			initiated_by_id: currentUserId,
		}));
	}, [currentUserId]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
		}));
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
			if (!formData.employee_id) {
				showErrorToast({ defaultMessage: "Please select an employee" });
				return;
			}
			if (!formData.termination_type_id) {
				showErrorToast({ defaultMessage: "Termination type is required" });
				return;
			}
			if (!formData.reason.trim()) {
				showErrorToast({ defaultMessage: "Please provide a reason for termination" });
				return;
			}

			try {
				setLoading(true);

				const payload = {
					employee_id: formData.employee_id,
					termination_type_id: formData.termination_type_id,
					initiated_by_id: formData.initiated_by_id,
					last_working_day: formData.last_working_day,
					reason: formData.reason,
					status: formData.status,
					initiator_type: formData.initiator_type,
					is_paid_after_termination: formData.is_paid_after_termination,
					final_payment_date: formData.final_payment_date,
					created_by: formData.created_by,
					updated_by: formData.updated_by,
					is_active: true,
					approval_status: "under_creation",
				};

				await apiPost("/on-boarding/terminations/", payload);

				showSuccessToast("Termination process initiated successfully");
				router.push("/off-boarding/exit-process");
			} catch (error: any) {
				console.error("Submission error:", error);
				showErrorToast({ error, defaultMessage: "Failed to initiate termination process" });
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

							{/* Termination Type Info */}
							{formData.termination_type_id && (
								<div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
									<p className="text-sm text-blue-700">
										<strong>Termination Type:</strong> ID {formData.termination_type_id}
									</p>
								</div>
							)}

							{/* Date and Reason in Grid */}
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
									<Label htmlFor="final_payment_date" className="text-sm font-medium text-gray-800">
										Final Payment Date
									</Label>
									<Input
										type="date"
										id="final_payment_date"
										name="final_payment_date"
										value={formData.final_payment_date}
										onChange={handleInputChange}
										className="w-full bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
									/>
								</div>
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
									className="w-full min-h-[120px] resize-vertical bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
								/>
							</div>

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

								<div className="space-y-2">
									<Label htmlFor="initiator_type" className="text-sm font-medium text-gray-800">
										Initiator Type
									</Label>
									<select
										id="initiator_type"
										name="initiator_type"
										value={formData.initiator_type}
										onChange={handleInputChange}
										className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-gray-400 focus:ring-gray-400"
									>
										<option value="EMPLOYEE">Employee</option>
										<option value="MANAGER">Manager</option>
										<option value="HR">HR</option>
									</select>
								</div>
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
											Creating Termination...
										</div>
									) : (
										"Create Termination Process"
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
