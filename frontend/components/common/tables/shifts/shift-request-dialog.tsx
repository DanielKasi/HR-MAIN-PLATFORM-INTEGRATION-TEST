"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react";
import { useSelector } from "react-redux";
import { selectSelectedBranch } from "@/store/auth/selectors";
import apiRequest from "@/lib/apiRequest";
import type { IBranchShift } from "@/types/types.utils";

interface ShiftRequestDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onRequestSubmitted?: () => void;
}

interface IRequestFormData {
	shift: string;
	date: string;
}

export default function ShiftRequestDialog({
	isOpen,
	onOpenChange,
	onRequestSubmitted,
}: ShiftRequestDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [shifts, setShifts] = useState<IBranchShift[]>([]);
	const [isLoadingShifts, setIsLoadingShifts] = useState(false);
	const [formData, setFormData] = useState<IRequestFormData>({
		shift: "",
		date: "",
	});

	const selectedBranch = useSelector(selectSelectedBranch);

	// Fetch available branch shifts when dialog opens
	useEffect(() => {
		if (isOpen && selectedBranch?.id) {
			fetchBranchShifts();
		}
	}, [isOpen, selectedBranch?.id]);

	// Reset form when dialog closes
	useEffect(() => {
		if (!isOpen) {
			setFormData({ shift: "", date: "" });
		}
	}, [isOpen]);

	const fetchBranchShifts = async () => {
		if (!selectedBranch?.id) return;

		setIsLoadingShifts(true);
		try {
			const response = await apiRequest.get(`institution/branch-shifts/${selectedBranch.id}/`);
			setShifts(response.data.results || []);
			// console.log(shifts);
		} catch (error) {
			console.error("Failed to fetch branch shifts:", error);
			setShifts([]);
		} finally {
			setIsLoadingShifts(false);
		}
	};

	const handleSubmitRequest = async () => {
		if (!formData.shift || !formData.date) {
			console.error("Please fill in all required fields");
			return;
		}

		setIsSubmitting(true);
		try {
			await apiRequest.post("employee/employee-shifts/", {
				shift: formData.shift,
				context: "REQUEST",
				date: formData.date,
			});

			// console.log("Shift request submitted successfully");
			onOpenChange(false);
			onRequestSubmitted?.();
		} catch (error) {
			console.error("Failed to submit shift request:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedShift = shifts.find((shift) => shift.id.toString() === formData.shift);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Request Shift
					</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="shift">Available Shifts</Label>
						<Select
							value={formData.shift}
							onValueChange={(value) => setFormData({ ...formData, shift: value })}
							disabled={isLoadingShifts}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={isLoadingShifts ? "Loading shifts..." : "Select a shift"}
								/>
							</SelectTrigger>
							<SelectContent>
								{shifts.map((shift) => (
									<SelectItem key={shift.id} value={shift.id.toString()}>
										<div className="flex items-center justify-between w-full">
											<span className="font-medium">{shift.name}</span>
											<div className="flex items-center gap-1 text-sm text-muted-foreground ml-2">
												<Clock className="h-3 w-3" />
												{shift.start_time} - {shift.end_time}
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{selectedShift && (
							<div className="text-sm text-muted-foreground mt-1">
								<span className="font-medium">Day:</span> {selectedShift.shift_day?.day_name}
							</div>
						)}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="date">Requested Date</Label>
						<Input
							id="date"
							type="date"
							value={formData.date}
							onChange={(e) => setFormData({ ...formData, date: e.target.value })}
							min={new Date().toISOString().split("T")[0]} // Prevent past dates
						/>
						{selectedShift && formData.date && (
							<div className="text-sm text-muted-foreground mt-1">
								Make sure the selected date falls on a {selectedShift.shift_day?.day_name}
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-end space-x-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmitRequest}
						disabled={isSubmitting || !formData.shift || !formData.date}
					>
						{isSubmitting ? "Submitting..." : "Submit Request"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
