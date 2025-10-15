import { useState } from "react";
import { Clock, X } from "lucide-react";

import { getCurrentDateTime } from "./checkin-modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Check-out Modal Component
interface CheckOutModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (date: string, time: string) => Promise<void>;
	employeeName: string;
	checkInTime: string | null;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	employeeName,
	checkInTime,
}) => {
	const { date: currentDate, time: currentTime } = getCurrentDateTime();
	const [selectedDate, setSelectedDate] = useState(currentDate);
	const [selectedTime, setSelectedTime] = useState(currentTime);
	const [submitting, setIsSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleConfirm = async () => {
		// Combine date and time to create the check-out time string
		const checkOutTime = `${selectedTime}:00`; // Add seconds
		try {
			setIsSubmitting(true);
			await onConfirm(selectedDate, checkOutTime);
			// onClose();
		} catch (error) {
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUseCurrentTime = () => {
		const { date, time } = getCurrentDateTime();

		setSelectedDate(date);
		setSelectedTime(time);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={onClose}
			/>

			{/* Modal Content */}
			<div className="relative bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4 transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<h3 className="text-lg font-semibold text-gray-900">Check Out - {employeeName}</h3>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 space-y-4">
					<div className="text-sm text-gray-600 mb-4">
						Select the check-out date and time or use the current time.
						{checkInTime && (
							<div className="mt-2 text-xs text-gray-500">
								Check-in time: <span className="font-medium">{checkInTime}</span>
							</div>
						)}
					</div>
					{/* Time Input */}
					<div className="space-y-2">
						<label className="flex items-center text-sm font-medium text-gray-700">Time</label>
						<Input
							type="time"
							value={selectedTime}
							onChange={(e) => setSelectedTime(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-xl"
						/>
					</div>

					{/* Use Current Time Button */}
					<button
						onClick={handleUseCurrentTime}
						className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center justify-center"
					>
						<Clock className="w-4 h-4 mr-2" />
						Use Current Time
					</button>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 ">
					<Button onClick={handleConfirm} className="w-full rounded-full">
						{submitting ? "Checking out..." : "Confirm Check Out"}
					</Button>
				</div>
			</div>
		</div>
	);
};
