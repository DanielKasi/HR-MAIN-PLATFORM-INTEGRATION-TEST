"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

interface TerminationFormData {
	employee_id: number;
	deleted_at: string;
	is_active: boolean;
	approval_status: string;
	termination_letter: string;
	comments: string;
	last_working_day: string;
	initiation_status: string;
	created_by: number;
	updated_by: number;
}

interface ResignationFormData {
	deleted_at: string;
	is_active: boolean;
	approval_status: string;
	resignation_letter: string;
	comments: string;
	last_working_day: string;
	request_status: string;
	created_by: number;
	updated_by: number;
	separation: number;
}

const ExitProcessCreate = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const category = searchParams.get("category");

	const [terminationForm, setTerminationForm] = useState<TerminationFormData>({
		employee_id: 0,
		deleted_at: new Date().toISOString(),
		is_active: true,
		approval_status: "under_creation",
		termination_letter: "",
		comments: "",
		last_working_day: new Date().toISOString().split("T")[0],
		initiation_status: "submitted",
		created_by: 0,
		updated_by: 0,
	});

	const [resignationForm, setResignationForm] = useState<ResignationFormData>({
		deleted_at: new Date().toISOString(),
		is_active: true,
		approval_status: "under_creation",
		resignation_letter: "",
		comments: "",
		last_working_day: new Date().toISOString().split("T")[0],
		request_status: "submitted",
		created_by: 0,
		updated_by: 0,
		separation: 0,
	});

	const [selectedEmployee, setSelectedEmployee] = useState<(string | number)[]>([]);

	useEffect(() => {
		if (!category || !["resignation", "termination"].includes(category)) {
			router.push("/off-boarding");
		}
	}, [category, router]);

	const handleTerminationChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setTerminationForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleResignationChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setResignationForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleEmployeeSelect = (value: (string | number)[]) => {
		setSelectedEmployee(value);
		setTerminationForm((prev) => ({ ...prev, employee_id: Number(value[0]) }));
	};

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			try {
				let response;
				if (category === "termination") {
					if (!terminationForm.employee_id) {
						toast({
							title: "Error",
							description: "Please select an employee.",
							variant: "destructive",
						});
						return;
					}
					response = await fetch("/api/on-boarding/termination-initiations/", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(terminationForm),
					});
				} else if (category === "resignation") {
					response = await fetch("/api/on-boarding/resignation-requests/", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(resignationForm),
					});
				}

				if (response && response.ok) {
					toast({ title: "Success", description: `${category} request submitted successfully!` });
					router.push("/off-boarding");
				} else {
					throw new Error("Submission failed");
				}
			} catch (error) {
				toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
			}
		},
		[category, terminationForm, resignationForm, router],
	);

	return (
		<div className="container mx-auto p-6">
			<h1 className="text-2xl font-bold mb-6">
				{category === "termination" ? "Termination" : "Resignation"} Request
			</h1>
			<form onSubmit={handleSubmit} className="space-y-6">
				{category === "termination" && (
					<div>
						<Label htmlFor="employee_id">Select Employee</Label>
						<EmployeeSearchableSelect
							id="employee_id"
							value={selectedEmployee}
							onValueChange={handleEmployeeSelect}
							placeholder="Select an employee"
							multiple={false}
							className="mt-1"
						/>
					</div>
				)}
				<div>
					<Label htmlFor="last_working_day">Last Working Day</Label>
					<Input
						type="date"
						id="last_working_day"
						name="last_working_day"
						value={
							category === "termination"
								? terminationForm.last_working_day
								: resignationForm.last_working_day
						}
						onChange={
							category === "termination" ? handleTerminationChange : handleResignationChange
						}
						required
						className="mt-1"
					/>
				</div>
				<div>
					<Label htmlFor={category === "termination" ? "termination_letter" : "resignation_letter"}>
						{category === "termination" ? "Termination" : "Resignation"} Letter
					</Label>
					<Textarea
						id={category === "termination" ? "termination_letter" : "resignation_letter"}
						name={category === "termination" ? "termination_letter" : "resignation_letter"}
						value={
							category === "termination"
								? terminationForm.termination_letter
								: resignationForm.resignation_letter
						}
						onChange={
							category === "termination" ? handleTerminationChange : handleResignationChange
						}
						placeholder="Enter letter content"
						className="mt-1"
					/>
				</div>
				<div>
					<Label htmlFor="comments">Comments</Label>
					<Textarea
						id="comments"
						name="comments"
						value={category === "termination" ? terminationForm.comments : resignationForm.comments}
						onChange={
							category === "termination" ? handleTerminationChange : handleResignationChange
						}
						placeholder="Enter any comments"
						className="mt-1"
					/>
				</div>
				<div className="flex justify-end space-x-4">
					<Button type="button" variant="outline" onClick={() => router.push("/off-boarding")}>
						Cancel
					</Button>
					<Button type="submit">Submit</Button>
				</div>
			</form>
		</div>
	);
};

export default ExitProcessCreate;
