"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, MapPin, Video, Users, Star } from "lucide-react";
import { useSelector } from "react-redux";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { apiGet } from "@/lib/apiRequest";

interface IEvent {
	id: number;
	institution: number;
	title: string;
	description: string;
	date: string;
	target_audience: "all" | "department" | "individual" | "specific_employees";
	event_mode: "physical" | "online" | "hybrid";
	department: any;
	specific_employees: any[];
	created_at: string;
	updated_at: string;
	created_by: any;
	updated_by: any;
}

interface IPublicHoliday {
	id: number;
	institution: number;
	title: string;
	date: string;
	created_at: string;
	updated_at: string;
}

interface IEventOccurrence {
	id: number;
	event: IEvent;
	date: string;
}

interface ICalendar {
	id: number;
	institution: number;
	year: number;
	public_holidays: IPublicHoliday[];
	event_occurrences: IEventOccurrence[];
	created_at: string;
	updated_at: string;
}

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarWidgetProps {
	className?: string;
}

export function SimpleCalendarWidget({ className = "" }: CalendarWidgetProps) {
	const [calendar, setCalendar] = useState<ICalendar | null>(null);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [loading, setLoading] = useState(true);
	const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
	const [isTooltipVisible, setIsTooltipVisible] = useState(false);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const selectedInstitution = useSelector(selectSelectedInstitution);
	const institutionId = selectedInstitution?.id;

	const fetchCalendar = async (year: number) => {
		try {
			setLoading(true);
			const response = await apiGet(`/calendar/institutions-calendar/?year=${year}`);

			setCalendar(response.data);
		} catch (error) {
			console.error("Error fetching calendar:", error);
			setCalendar(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (institutionId) {
			fetchCalendar(currentDate.getFullYear());
		}
	}, [institutionId, currentDate.getFullYear()]);

	const getDaysInMonth = (date: Date) => {
		const year = date.getFullYear();
		const month = date.getMonth();

		// Create dates using UTC to avoid timezone issues
		const firstDay = new Date(Date.UTC(year, month, 1));
		const lastDay = new Date(Date.UTC(year, month + 1, 0));
		const daysInMonth = lastDay.getUTCDate();
		const startingDayOfWeek = firstDay.getUTCDay();

		const days = [];

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(null);
		}

		// Add all days of the month using UTC dates
		for (let day = 1; day <= daysInMonth; day++) {
			// Create date using UTC to avoid timezone shifts
			const utcDate = new Date(Date.UTC(year, month, day));
			// Convert to local date for display
			const localDate = new Date(utcDate.getTime());

			days.push(localDate);
		}

		return days;
	};

	const navigateMonth = (direction: "prev" | "next") => {
		const newDate = new Date(currentDate);

		if (direction === "prev") {
			newDate.setMonth(newDate.getMonth() - 1);
		} else {
			newDate.setMonth(newDate.getMonth() + 1);
		}
		setCurrentDate(newDate);
	};

	const isToday = (date: Date) => {
		const today = new Date();

		// Compare date components directly to avoid timezone issues
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		);
	};

	const getEventModeIcon = (mode: string) => {
		switch (mode) {
			case "online":
				return <Video className="h-3 w-3" />;
			case "physical":
				return <MapPin className="h-3 w-3" />;
			case "hybrid":
				return <Users className="h-3 w-3" />;
			default:
				return null;
		}
	};

	const getEventsForDate = (date: Date) => {
		if (!calendar) return { events: [], holidays: [] };

		// Create a date string in YYYY-MM-DD format using local date components
		// This avoids timezone issues when comparing dates
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

		const events = calendar.event_occurrences
			.filter((occurrence) => occurrence.date === dateStr)
			.map((occurrence) => occurrence.event);

		const holidays = calendar.public_holidays.filter((holiday) => holiday.date === dateStr);

		return { events, holidays };
	};

	const handleMouseEnter = (day: Date, event: React.MouseEvent) => {
		// Clear any existing timeout
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}

		const rect = event.currentTarget.getBoundingClientRect();
		const containerRect = event.currentTarget.closest(".relative")?.getBoundingClientRect();

		if (containerRect) {
			// Position tooltip relative to the container
			const x = rect.left - containerRect.left + rect.width / 2;
			const y = rect.top - containerRect.top - 10; // 10px above the day cell

			setTooltipPosition({ x, y });
			setHoveredDay(day);
			setIsTooltipVisible(true);
		}
	};

	const handleMouseLeave = () => {
		// Add a small delay before hiding to prevent flickering
		hoverTimeoutRef.current = setTimeout(() => {
			setIsTooltipVisible(false);
			setHoveredDay(null);
		}, 100);
	};

	const handleTooltipMouseEnter = () => {
		// Clear the timeout if mouse enters tooltip
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
	};

	const handleTooltipMouseLeave = () => {
		setIsTooltipVisible(false);
		setHoveredDay(null);
	};

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current);
			}
		};
	}, []);

	const days = getDaysInMonth(currentDate);

	if (loading) {
		return (
			<Card className="w-full max-w-md">
				<CardContent className="p-6">
					<div className="flex items-center justify-center h-64">
						<div className="text-sm text-slate-500">Loading calendar...</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={`relative`}>
			<Card className={`w-full shadow-sm border-none !rounded-xl ${className}`}>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<CardTitle className="text-lg font-semibold">
							{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
						</CardTitle>
						<Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>

				<CardContent>
					{/* Day Headers */}
					<div className="grid grid-cols-7 gap-1 mb-2">
						{DAYS.map((day) => (
							<div key={day} className="p-2 text-center text-xs font-medium text-slate-500">
								<>{day}</>
							</div>
						))}
					</div>

					{/* Calendar Grid */}
					<div className="grid grid-cols-7 gap-1">
						{days.map((day, index) => {
							if (!day) {
								return <div key={index} className="h-10" />;
							}

							const { events, holidays } = getEventsForDate(day);
							const hasEvents = events.length > 0 || holidays.length > 0;

							return (
								<div
									key={day.toISOString()}
									className={`
                    h-10 p-1 rounded-md text-xs flex items-center justify-center relative cursor-pointer transition-all duration-200
                    ${
											isToday(day)
												? "bg-[#0CA0F5]/60 text-white font-medium"
												: hasEvents
													? "bg-slate-100 text-slate-900 hover:bg-slate-200"
													: "text-slate-700 hover:bg-slate-50"
										}
                  `}
									onMouseEnter={(e) => handleMouseEnter(day, e)}
									onMouseLeave={handleMouseLeave}
								>
									{day.getDate()}

									{/* Event indicators */}
									{hasEvents && (
										<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-0.5">
											{holidays.length > 0 && <div className="w-1 h-1 bg-[#0CA0F5] rounded-full" />}
											{events.slice(0, 2).map((event, idx) => (
												<div
													key={idx}
													className={`w-1 h-1 rounded-full ${
														event.event_mode === "online"
															? "bg-[#0CA0F5]"
															: event.event_mode === "physical"
																? "bg-[#0CA0F5]"
																: "bg-[#0CA0F5]"
													}`}
												/>
											))}
											{events.length > 2 && (
												<div className="w-1 h-1 bg-[#0CA0F5]/60 rounded-full" />
											)}
										</div>
									)}

									{/* Hover Tooltip */}
									{hoveredDay?.getDate().toString().toLowerCase() ===
										day?.getDate().toString().toLowerCase() &&
										isTooltipVisible && (
											<div
												ref={tooltipRef}
												className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-36 transition-all duration-200 ease-out"
												style={{
													left: `${tooltipPosition.x}px`,
													top: `${tooltipPosition.y}px`,
													transform: ` ${day.getDay() === 6 ? "translateX(-70%)" : "translateX(-50%)"} translateY(-100%)`,
												}}
												onMouseEnter={handleTooltipMouseEnter}
												onMouseLeave={handleTooltipMouseLeave}
											>
												{/* Tooltip Arrow */}
												<div
													className={`absolute top-full ${day.getDay() === 6 ? "left-[80%]" : "left-1/2"} transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-200`}
												/>
												<div
													className={`absolute top-full ${day.getDay() === 6 ? "left-[80%]" : "left-1/2"}  transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white`}
													style={{ marginTop: "-1px" }}
												/>

												<div className="text-xs font-medium text-slate-900 mb-2">
													{hoveredDay.toLocaleDateString("en-US", {
														weekday: "long",
														month: "long",
														day: "numeric",
													})}
												</div>

												{(() => {
													const { events, holidays } = getEventsForDate(hoveredDay);

													if (events.length === 0 && holidays.length === 0) {
														return <p className="text-xs text-slate-500">No events or holidays</p>;
													}

													return (
														<div className="space-y-2">
															{holidays.map((holiday) => (
																<div key={holiday.id} className="flex items-center gap-2 text-xs">
																	<Star className="h-3 w-3 text-[#0CA0F5] flex-shrink-0" />
																	<span className="text-[#0CA0F5] font-medium">
																		{holiday.title}
																	</span>
																</div>
															))}

															{events.slice(0, 3).map((event) => (
																<div key={event.id} className="flex items-start gap-2 text-xs">
																	<div className="flex-shrink-0 mt-0.5">
																		{getEventModeIcon(event.event_mode)}
																	</div>
																	<div className="flex-1 min-w-0">
																		<div className="font-medium text-slate-900 truncate">
																			{event.title}
																		</div>
																		{event.description && (
																			<div className="text-slate-600 line-clamp-2 mt-1">
																				{event.description}
																			</div>
																		)}
																	</div>
																</div>
															))}

															{events.length > 3 && (
																<div className="text-xs text-slate-500 font-medium">
																	+{events.length - 3} more events
																</div>
															)}
														</div>
													);
												})()}
											</div>
										)}
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
