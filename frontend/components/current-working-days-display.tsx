"use client";

import type { IInstitutionWorkingDays } from "@/types/types.utils";

import { Calendar, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CurrentWorkingDaysDisplayProps {
	workingDays: IInstitutionWorkingDays | null;
}

export function CurrentWorkingDaysDisplay({ workingDays }: CurrentWorkingDaysDisplayProps) {
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

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!workingDays || workingDays.days.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Current Working Days
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8">
						<Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">No Working Days Set</h3>
						<p className="text-gray-500">Configure your institution's working days below.</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Sort days by level for proper display order
	const sortedDays = [...workingDays.days].sort((a, b) => a.level - b.level);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Calendar className="h-5 w-5" />
					Current Working Days
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{/* Days Grid */}
					<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
						{sortedDays.map((day) => (
							<div key={day.id} className="text-center">
								<div
									className={cn(
										"w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2 border-2",
										getDayColor(day.day_code),
									)}
								>
									{day.day_code[0]}
								</div>
								<p className="font-medium text-gray-900 text-sm">{day.day_name}</p>
								<Badge variant="outline" className="text-xs mt-1">
									{day.day_code}
								</Badge>
							</div>
						))}
					</div>

					{/* Summary */}
					<div className="bg-gray-50 rounded-lg p-4">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-gray-500" />
								<span className="text-gray-600">
									<strong>{workingDays.days.length}</strong> working days configured
								</span>
							</div>
							<span className="text-gray-500">
								Last updated: {formatDate(workingDays.updated_at)}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
