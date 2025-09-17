"use client";

import type { ISystemWorkingDay } from "@/types/types.utils";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DaySelectionCardProps {
	day: ISystemWorkingDay;
	isSelected: boolean;
	onToggle: (dayId: number) => void;
	disabled?: boolean;
}

export function DaySelectionCard({
	day,
	isSelected,
	onToggle,
	disabled = false,
}: DaySelectionCardProps) {
	const getDayIcon = (dayCode: string) => {
		const icons = {
			MON: "M",
			TUE: "T",
			WED: "W",
			THU: "T",
			FRI: "F",
			SAT: "S",
			SUN: "S",
		};

		return icons[dayCode as keyof typeof icons] || dayCode[0];
	};

	const getDayColor = (dayCode: string) => {
		const colors = {
			MON: "bg-blue-100 text-blue-700 border-blue-200",
			TUE: "bg-green-100 text-green-700 border-green-200",
			WED: "bg-purple-100 text-purple-700 border-purple-200",
			THU: "bg-orange-100 text-orange-700 border-orange-200",
			FRI: "bg-pink-100 text-pink-700 border-pink-200",
			SAT: "bg-indigo-100 text-indigo-700 border-indigo-200",
			SUN: "bg-red-100 text-red-700 border-red-200",
		};

		return colors[dayCode as keyof typeof colors] || "bg-gray-100 text-gray-700 border-gray-200";
	};

	const handleCrossClick = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering the main card click
		if (!disabled && isSelected) {
			onToggle(day.id); // This will unselect the day
		}
	};

	return (
		<div
			className={cn(
				"cursor-pointer transition-all duration-200 bg-white relative",
				isSelected && "",
				disabled && "opacity-50 cursor-not-allowed",
			)}
			onClick={() => !disabled && onToggle(day.id)}
		>
			{/* Cross symbol - only show when day is selected */}
			{isSelected && (
				<button
					onClick={handleCrossClick}
					className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors duration-200"
					title="Remove this day"
				>
					<X className="w-4 h-4 text-red-600" />
				</button>
			)}

			<div className="p-4">
				<div className="flex flex-col items-center space-x-3">
					<div className="">
						<div className="flex flex-col items-center ">
							<div
								className={cn(
									"w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2 border-2",
									getDayColor(day.day_code),
								)}
							>
								{getDayIcon(day.day_code)}
							</div>
							<div className="flex flex-col items-center">
								<p className="font-semibold text-gray-900">{day.day_name}</p>
								<div className="space-x-2">
									<Badge variant="outline" className="text-xs">
										{day.day_code}
									</Badge>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
