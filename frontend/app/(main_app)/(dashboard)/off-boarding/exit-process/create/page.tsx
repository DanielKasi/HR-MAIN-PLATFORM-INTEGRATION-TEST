//app\(main_app)\(dashboard)\off-boarding\exit-process\create\[category]\page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, Upload, X, FileText, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import apiRequest from "@/lib/apiRequest";
import { showErrorToast, showSuccessToast } from "@/lib/utils";

interface IEmployee {
	id: number;
	name: string;
	email: string;
	employee_id?: string;
	department?: {
		id: number;
		name: string;
	};
	position?: {
		id: number;
		name: string;
	};
}

export default function CreateTerminationPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);

	const separationTypeId = searchParams.get("separationTypeId");

	// Form state
	const [employeeId, setEmployeeId] = useState<number | null>(null);
	const [terminationLetter, setTerminationLetter] = useState("");
	const [comments, setComments] = useState("");
	const [lastWorkingDay, setLastWorkingDay] = useState("");
	const [initiationStatus, setInitiationStatus] = useState<"submitted" | "draft">("draft");

	// UI state
	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [loadingEmployees, setLoadingEmployees] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	// Fetch employees
	useEffect(() => {
		const fetchEmployees = async () => {
			if (!currentInstitution) return;

			try {
				setLoadingEmployees(true);
				const response = await apiRequest.get("/employees/");

				// Handle both array and paginated response
				const employeesData = Array.isArray(response.data)
					? response.data
					: response.data.results || [];

				setEmployees(employeesData);
			} catch (err) {
				console.error("Error fetching employees:", err);
				showErrorToast({ error: err, defaultMessage: "Failed to fetch employees" });
			} finally {
				setLoadingEmployees(false);
			}
		};

		fetchEmployees();
	}, [currentInstitution]);

	// Handle file upload
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSelectedFile(file);
			// You can also convert to base64 string if needed
			const reader = new FileReader();
			reader.onloadend = () => {
				setTerminationLetter(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	// Remove file
	const handleRemoveFile = () => {
		setSelectedFile(null);
		setTerminationLetter("");
	};

	// Validate form
	const validateForm = () => {
		if (!employeeId) {
			showErrorToast({ defaultMessage: "Please select an employee" });
			return false;
		}
		if (!lastWorkingDay) {
			showErrorToast({ defaultMessage: "Please select last working day" });
			return false;
		}
		return true;
	};

	// Handle submit
	const handleSubmit = async (status: "submitted" | "draft") => {
		if (!validateForm()) return;
		if (!currentUser) {
			showErrorToast({ defaultMessage: "User information not found" });
			return;
		}

		try {
			setSubmitting(true);

			// First, create the separation
			const separationPayload = {
				employee_id: employeeId,
				employee_separation_type_id: separationTypeId ? parseInt(separationTypeId) : null,
				effective_date: lastWorkingDay,
				additional_notes: comments,
				separation_status: "planned",
			};

			const separationResponse = await apiRequest.post(
				"/on-boarding/employee-separations/",
				separationPayload,
			);

			const separationId = separationResponse.data.id;

			// Then, create the termination initiation
			const terminationPayload = {
				employee_id: employeeId,
				separation: separationId,
				termination_letter: terminationLetter,
				comments: comments,
				last_working_day: lastWorkingDay,
				initiation_status: status,
				approval_status: "under_creation",
				is_active: true,
				created_by: currentUser.id,
				updated_by: currentUser.id,
			};

			await apiRequest.post("/on-boarding/termination-initiations/", terminationPayload);

			showSuccessToast(
				status === "submitted"
					? "Termination process initiated successfully"
					: "Draft saved successfully",
			);

			router.push("/exit-process");
		} catch (err) {
			console.error("Error creating termination:", err);
			showErrorToast({ error: err, defaultMessage: "Failed to create termination process" });
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen max-w-4xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					size="sm"
					variant="outline"
					className="rounded-full aspect-square"
					onClick={() => router.push("/exit-process")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold">Initiate Termination Process</h1>
					<p className="text-sm text-muted-foreground">Create a new employee termination process</p>
				</div>
			</div>

			{/* Form */}
			<Card>
				<CardHeader>
					<CardTitle>Termination Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Employee Selection */}
					<div className="space-y-2">
						<Label htmlFor="employee">
							Employee <span className="text-red-500">*</span>
						</Label>
						<Select
							value={employeeId?.toString() || ""}
							onValueChange={(value) => setEmployeeId(parseInt(value))}
							disabled={loadingEmployees}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select employee" />
							</SelectTrigger>
							<SelectContent>
								{loadingEmployees ? (
									<div className="p-2 text-sm text-muted-foreground">Loading employees...</div>
								) : employees.length === 0 ? (
									<div className="p-2 text-sm text-muted-foreground">No employees found</div>
								) : (
									employees.map((employee) => (
										<SelectItem key={employee.id} value={employee.id.toString()}>
											<div className="flex flex-col">
												<span>{employee.name}</span>
												<span className="text-xs text-muted-foreground">
													{employee.department?.name} - {employee.position?.name}
												</span>
											</div>
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>

					{/* Last Working Day */}
					<div className="space-y-2">
						<Label htmlFor="lastWorkingDay">
							Last Working Day <span className="text-red-500">*</span>
						</Label>
						<div className="relative">
							<Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								id="lastWorkingDay"
								type="date"
								className="pl-9"
								value={lastWorkingDay}
								onChange={(e) => setLastWorkingDay(e.target.value)}
								min={new Date().toISOString().split("T")[0]}
							/>
						</div>
					</div>

					{/* Termination Letter Upload */}
					<div className="space-y-2">
						<Label htmlFor="terminationLetter">Termination Letter</Label>
						{selectedFile ? (
							<div className="border rounded-lg p-4 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<FileText className="h-8 w-8 text-blue-500" />
									<div>
										<p className="text-sm font-medium">{selectedFile.name}</p>
										<p className="text-xs text-muted-foreground">
											{(selectedFile.size / 1024).toFixed(2)} KB
										</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleRemoveFile}
									className="text-red-500 hover:text-red-600"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<div className="border-2 border-dashed rounded-lg p-8 text-center">
								<Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
								<p className="text-sm text-muted-foreground mb-2">
									Upload termination letter (PDF, DOC, DOCX)
								</p>
								<Input
									id="terminationLetter"
									type="file"
									accept=".pdf,.doc,.docx"
									onChange={handleFileChange}
									className="hidden"
								/>
								<Button
									variant="outline"
									size="sm"
									onClick={() => document.getElementById("terminationLetter")?.click()}
								>
									Choose File
								</Button>
							</div>
						)}
					</div>

					{/* Comments */}
					<div className="space-y-2">
						<Label htmlFor="comments">Additional Comments</Label>
						<Textarea
							id="comments"
							placeholder="Enter any additional notes or reasons for termination..."
							value={comments}
							onChange={(e) => setComments(e.target.value)}
							rows={4}
						/>
					</div>

					{/* Action Buttons */}
					<div className="flex flex-col sm:flex-row gap-3 pt-4">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => handleSubmit("draft")}
							disabled={submitting}
						>
							Save as Draft
						</Button>
						<Button
							className="flex-1"
							onClick={() => handleSubmit("submitted")}
							disabled={submitting}
						>
							{submitting ? "Submitting..." : "Submit Termination"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
