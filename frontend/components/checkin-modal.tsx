import { Clock, X } from "lucide-react";
import { useState } from "react";

// Check-in Modal Component
interface CheckInModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (date: string, time: string) => void;
	employeeName: string;
}

export const getCurrentDateTime = () => {
	const now = new Date();
	const date = now.toISOString().split("T")[0];
	const time = now.toTimeString().slice(0, 5);

	return { date, time };
};

export const CheckInModal: React.FC<CheckInModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	employeeName,
}) => {
	const { date: currentDate, time: currentTime } = getCurrentDateTime();
	const [selectedDate, setSelectedDate] = useState(currentDate);
	const [selectedTime, setSelectedTime] = useState(currentTime);

	if (!isOpen) return null;

	const handleConfirm = () => {
		const checkInTime = `${selectedTime}:00`; // Add seconds

		onConfirm(selectedDate, checkInTime);
		onClose();
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
			<div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<h3 className="text-lg font-semibold text-gray-900">Check In - {employeeName}</h3>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 space-y-4">
					<div className="text-sm text-gray-600 mb-4">
						Select the check-in date and time or use the current time.
					</div>

					{/* Date Input */}
					{/* <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={currentDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div> */}

					{/* Time Input */}
					<div className="space-y-2">
						<label className="flex items-center text-sm font-medium text-gray-700">
							<Clock className="w-4 h-4 mr-2" />
							Time
						</label>
						<input
							type="time"
							value={selectedTime}
							onChange={(e) => setSelectedTime(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					{/* Use Current Time Button */}
					<button
						onClick={handleUseCurrentTime}
						className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center"
					>
						<Clock className="w-4 h-4 mr-2" />
						Use Current Time
					</button>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Cancel
					</button>
					<button
						onClick={handleConfirm}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Confirm Check In
					</button>
				</div>
			</div>
		</div>
	);
};
