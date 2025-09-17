"use client";

import type { IMeeting, IMeetingFormData, IEventMode } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MeetingFormProps {
	initialData?: IMeeting;
	onSubmit: (data: IMeetingFormData) => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export function MeetingForm({ initialData, onSubmit, onCancel, isLoading }: MeetingFormProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [participantsValue, setParticipantsValue] = useState<(string | number)[]>([]);
	const [organizerValue, setOrganizerValue] = useState<(string | number)[]>([]);
	const [formData, setFormData] = useState<Record<string, any>>(() => {
		// Default start_time: Now + 1 hour, rounded to nearest 15 minutes
		const now = new Date();
		const defaultStart = new Date(Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));
		const defaultEnd = new Date(defaultStart.getTime() + 30 * 60 * 1000); // Default 30 min duration

		return initialData
			? {
					title: initialData.title,
					description: initialData.description || "",
					start_time:
						initialData.start_time?.slice(0, 16) || defaultStart.toISOString().slice(0, 16),
					end_time: initialData.end_time?.slice(0, 16) || defaultEnd.toISOString().slice(0, 16),
					mode: initialData.mode || "online",
					location: initialData.location || "",
					online_link: initialData.online_link || "",
					agenda: initialData.agenda || "",
					is_recurring: initialData.is_recurring || false,
					recurrence_rule: initialData.recurrence_rule || "",
				}
			: {
					title: "",
					description: "",
					start_time: defaultStart.toISOString().slice(0, 16),
					end_time: defaultEnd.toISOString().slice(0, 16),
					mode: "online",
					location: "",
					online_link: "",
					agenda: "",
					is_recurring: false,
					recurrence_rule: "",
				};
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		// Set initial values for participants and organizer
		if (initialData) {
			setParticipantsValue(initialData.participants.map((p) => p.id));
			if (initialData.organizer) {
				setOrganizerValue([initialData.organizer.id]);
			}
		}
	}, [initialData]);

	const modeOptions = [
		{ value: "physical", label: "Physical" },
		{ value: "online", label: "Online" },
		{ value: "hybrid", label: "Hybrid" },
	];

	const handleChange = (name: string, value: any) => {
		setFormData((prev) => ({ ...prev, [name]: value }));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		// Title validation
		if (!formData.title || formData.title.length < 5) {
			newErrors.title = "Meeting title must be at least 5 characters";
		}

		// Description validation
		if (formData.description && formData.description.length < 10) {
			newErrors.description = "Description must be at least 10 characters";
		}

		// Start time validation
		try {
			const startDate = new Date(formData.start_time);
			if (isNaN(startDate.getTime())) {
				newErrors.start_time = "Invalid date format";
			} else {
				const now = new Date();
				if (startDate < now) {
					newErrors.start_time = "Start time cannot be in the past";
				}
			}
		} catch {
			newErrors.start_time = "Invalid date format";
		}

		// End time validation
		try {
			const endDate = new Date(formData.end_time);
			if (isNaN(endDate.getTime())) {
				newErrors.end_time = "Invalid date format";
			} else if (formData.start_time) {
				const startDate = new Date(formData.start_time);
				if (endDate <= startDate) {
					newErrors.end_time = "End time must be after start time";
				} else {
					const diffMs = endDate.getTime() - startDate.getTime();
					const diffMinutes = diffMs / (1000 * 60);
					if (diffMinutes < 15) {
						newErrors.end_time = "Meeting must be at least 15 minutes long";
					}
				}
			}
		} catch {
			newErrors.end_time = "Invalid date format";
		}

		// Mode validation
		if (!formData.mode) {
			newErrors.mode = "Meeting mode is required";
		}

		// Location validation
		if (formData.mode === "physical" && !formData.location) {
			newErrors.location = "Location is required for physical meetings";
		}

		// Online link validation
		if ((formData.mode === "online" || formData.mode === "hybrid") && !formData.online_link) {
			newErrors.online_link = "Online link is required for online/hybrid meetings";
		} else if (formData.online_link && !formData.online_link.startsWith("http")) {
			newErrors.online_link = "Online link must be a valid URL";
		}

		// Recurrence rule validation
		if (formData.is_recurring && !formData.recurrence_rule) {
			newErrors.recurrence_rule = "Recurrence rule is required for recurring meetings";
		}

		// Participants validation
		if (participantsValue.length === 0) {
			newErrors.participants = "At least one participant is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentInstitution || !validateForm()) return;

		const meetingData: IMeetingFormData = {
			institution: currentInstitution.id,
			title: formData.title,
			description: formData.description || undefined,
			start_time: formData.start_time,
			end_time: formData.end_time,
			mode: formData.mode as IEventMode,
			location: formData.location || undefined,
			online_link: formData.online_link || undefined,
			participant_ids: participantsValue.map((id) => Number(id)),
			organizer_id: organizerValue.length > 0 ? Number(organizerValue[0]) : undefined,
			agenda: formData.agenda || undefined,
			is_recurring: formData.is_recurring || false,
			recurrence_rule: formData.recurrence_rule || undefined,
		};

		onSubmit(meetingData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Form Fields */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
				{/* Title */}
				<div className="space-y-2">
					<Label htmlFor="title" className="text-sm font-medium text-slate-700">
						Meeting Title <span className="text-red-500">*</span>
					</Label>
					<Input
						id="title"
						type="text"
						value={formData.title}
						onChange={(e) => handleChange("title", e.target.value)}
						placeholder="e.g., Q1 Performance Review Meeting"
						disabled={isLoading}
						className={cn("rounded-xl", errors.title && "border-red-500")}
					/>
					{errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
				</div>

				{/* Online Link */}
				<div className="space-y-2">
					<Label htmlFor="online_link" className="text-sm font-medium text-slate-700">
						Online Link
					</Label>
					<Input
						id="online_link"
						type="text"
						value={formData.online_link}
						onChange={(e) => handleChange("online_link", e.target.value)}
						placeholder="https://zoom.us/j/..."
						disabled={isLoading}
						className={cn("rounded-xl", errors.online_link && "border-red-500")}
					/>
					{errors.online_link && <p className="text-sm text-red-600">{errors.online_link}</p>}
					<p className="text-xs text-slate-500">Required for online/hybrid meetings</p>
				</div>
			</div>

			{/* Description */}
			<div className="space-y-2 md:col-span-2">
				<Label htmlFor="description" className="text-sm font-medium text-slate-700">
					Description
				</Label>
				<Textarea
					id="description"
					value={formData.description}
					onChange={(e) => handleChange("description", e.target.value)}
					placeholder="Describe the meeting purpose and agenda..."
					disabled={isLoading}
					className={cn(
						"min-h-[100px] rounded-xl resize-none",
						errors.description && "border-red-500",
					)}
					rows={3}
				/>
				{errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
			</div>

			{/* Recurrence Rule */}
			<div className="space-y-2">
				<Label htmlFor="recurrence_rule" className="text-sm font-medium text-slate-700">
					Recurrence Rule
				</Label>
				<Input
					id="recurrence_rule"
					type="text"
					value={formData.recurrence_rule}
					onChange={(e) => handleChange("recurrence_rule", e.target.value)}
					placeholder="e.g., FREQ=WEEKLY;BYDAY=MO"
					disabled={isLoading}
					className={cn("rounded-xl", errors.recurrence_rule && "border-red-500")}
				/>
				{errors.recurrence_rule && <p className="text-sm text-red-600">{errors.recurrence_rule}</p>}
				<p className="text-xs text-slate-500">Required for recurring meetings</p>
			</div>

			<div className="grid  grid-cols-1 md:grid-cols-2 gap-6">
				{/* Agenda */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="agenda" className="text-sm font-medium text-slate-700">
						Agenda
					</Label>
					<Textarea
						id="agenda"
						value={formData.agenda}
						onChange={(e) => handleChange("agenda", e.target.value)}
						placeholder="Meeting agenda items..."
						disabled={isLoading}
						className={cn(
							"min-h-[100px] rounded-xl resize-none",
							errors.agenda && "border-red-500",
						)}
						rows={3}
					/>
					{errors.agenda && <p className="text-sm text-red-600">{errors.agenda}</p>}
				</div>

				{/* Recurring Meeting */}
				<div className="space-y-2">
					<Label htmlFor="is_recurring" className="text-sm font-medium text-slate-700">
						Recurring Meeting
					</Label>
					<div className="flex items-center space-x-2">
						<Switch
							id="is_recurring"
							checked={formData.is_recurring}
							onCheckedChange={(checked) => handleChange("is_recurring", checked)}
							disabled={isLoading}
						/>
						<Label className="text-sm text-slate-600">Set up as a recurring meeting</Label>
					</div>
					{errors.is_recurring && <p className="text-sm text-red-600">{errors.is_recurring}</p>}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
				{/* Meeting Mode */}
				<div className="space-y-2">
					<Label htmlFor="mode" className="text-sm font-medium text-slate-700">
						Meeting Mode <span className="text-red-500">*</span>
					</Label>
					<Select
						value={formData.mode}
						onValueChange={(value) => handleChange("mode", value)}
						disabled={isLoading}
					>
						<SelectTrigger className={cn("!rounded-2xl", errors.mode && "border-red-500")}>
							<SelectValue placeholder="Select meeting mode" />
						</SelectTrigger>
						<SelectContent>
							{modeOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.mode && <p className="text-sm text-red-600">{errors.mode}</p>}
				</div>

				{/* Location */}
				<div className="space-y-2">
					<Label htmlFor="location" className="text-sm font-medium text-slate-700">
						Location
					</Label>
					<Input
						id="location"
						type="text"
						value={formData.location}
						onChange={(e) => handleChange("location", e.target.value)}
						placeholder="Meeting room or address"
						disabled={isLoading}
						className={cn("rounded-xl", errors.location && "border-red-500")}
					/>
					{errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
					<p className="text-xs text-slate-500">Required for physical meetings</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
				{/* Start Date & Time */}
				<div className="space-y-2">
					<Label htmlFor="start_time" className="text-sm font-medium text-slate-700">
						Start Date & Time <span className="text-red-500">*</span>
					</Label>
					<Input
						id="start_time"
						type="datetime-local"
						value={formData.start_time}
						onChange={(e) => handleChange("start_time", e.target.value)}
						disabled={isLoading}
						className={cn("rounded-xl", errors.start_time && "border-red-500")}
					/>
					{errors.start_time && <p className="text-sm text-red-600">{errors.start_time}</p>}
				</div>

				{/* End Date & Time */}
				<div className="space-y-2">
					<Label htmlFor="end_time" className="text-sm font-medium text-slate-700">
						End Date & Time <span className="text-red-500">*</span>
					</Label>
					<Input
						id="end_time"
						type="datetime-local"
						value={formData.end_time}
						onChange={(e) => handleChange("end_time", e.target.value)}
						disabled={isLoading}
						className={cn("rounded-xl", errors.end_time && "border-red-500")}
					/>
					{errors.end_time && <p className="text-sm text-red-600">{errors.end_time}</p>}
				</div>
			</div>

			{/* Participants Selection */}
			<div className="border-t pt-6">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Participants</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
					<div className="space-y-2">
						<Label htmlFor="organizer" className="text-sm font-medium text-slate-700">
							Organizer (Optional)
						</Label>
						<EmployeeSearchableSelect
							id="organizer"
							value={organizerValue}
							onValueChange={setOrganizerValue}
							placeholder="Select meeting organizer"
							multiple={false}
							disabled={isLoading}
						/>
						<p className="text-xs text-slate-500">Person responsible for organizing the meeting</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="participants" className="text-sm font-medium text-slate-700">
							Participants <span className="text-red-500">*</span>
						</Label>
						<EmployeeSearchableSelect
							id="participants"
							value={participantsValue}
							onValueChange={setParticipantsValue}
							placeholder="Select participants"
							multiple={true}
							disabled={isLoading}
						/>
						{errors.participants && <p className="text-sm text-red-600">{errors.participants}</p>}
						<p className="text-xs text-slate-500">People who will attend the meeting</p>
					</div>
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="submit" disabled={isLoading} className="px-8 w-full rounded-full">
					{isLoading ? "Saving..." : initialData ? "Update Meeting" : "Create Meeting"}
				</Button>
			</div>
		</form>
	);
}
