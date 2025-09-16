"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IEvent } from "@/types/types.utils";

interface EditEventModalProps {
	isOpen: boolean;
	event: IEvent | null;
	onClose: () => void;
	onSave: (eventId: number, updatedData: Partial<IEvent>) => Promise<void>;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
	isOpen,
	event,
	onClose,
	onSave,
}) => {
	const [editFormData, setEditFormData] = useState({
		title: "",
		description: "",
		date: "",
		event_mode: "physical" as "physical" | "online" | "hybrid",
		target_audience: "all" as "all" | "department" | "individual" | "specific_employees",
		department: "",
		specific_employees: [] as string[],
	});

	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Update form data when event changes
	useEffect(() => {
		if (event) {
			setEditFormData({
				title: event.title,
				description: event.description,
				date: event.date,
				event_mode: event.event_mode,
				target_audience: event.target_audience,
				department: event.department || "",
				specific_employees: event.specific_employees || [],
			});
			setError(null); // Clear any previous errors
			setSuccess(false); // Clear any previous success
		}
	}, [event]);

	const handleFormChange = (field: string, value: string | string[]) => {
		setEditFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		// Clear error when user starts typing
		if (error) setError(null);
	};

	const handleSave = async () => {
		if (!event) return;

		setIsSaving(true);
		setError(null);
		setSuccess(false);

		try {
			await onSave(event.id, editFormData);
			setSuccess(true);
			// Close modal after a brief success message
			setTimeout(() => {
				onClose();
			}, 1500);
		} catch (error) {
			console.error("Error saving event:", error);
			setError("Failed to save event. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	if (!isOpen || !event) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-lg font-semibold text-gray-900">Edit Event</h3>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
							<input
								type="text"
								value={editFormData.title}
								onChange={(e) => handleFormChange("title", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Event title"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
							<textarea
								value={editFormData.description}
								onChange={(e) => handleFormChange("description", e.target.value)}
								rows={3}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="Event description"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
							<input
								type="date"
								value={editFormData.date}
								onChange={(e) => handleFormChange("date", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Event Mode</label>
							<select
								value={editFormData.event_mode}
								onChange={(e) => handleFormChange("event_mode", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								required
							>
								<option value="physical">Physical</option>
								<option value="online">Online</option>
								<option value="hybrid">Hybrid</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Target Audience
							</label>
							<select
								value={editFormData.target_audience}
								onChange={(e) => handleFormChange("target_audience", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								required
							>
								<option value="all">All</option>
								<option value="department">Department</option>
								<option value="individual">Individual</option>
								<option value="specific_employees">Specific Employees</option>
							</select>
						</div>

						{editFormData.target_audience === "department" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
								<input
									type="text"
									value={editFormData.department}
									onChange={(e) => handleFormChange("department", e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Department name"
								/>
							</div>
						)}

						{error && <div className="text-red-500 text-sm mt-2">{error}</div>}

						{success && (
							<div className="text-green-500 text-sm mt-2">Event saved successfully!</div>
						)}

						<div className="flex gap-3 pt-4">
							<Button
								type="button"
								onClick={handleSave}
								disabled={isSaving}
								className="flex-1 bg-primary text-white disabled:opacity-50"
							>
								{isSaving ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};
