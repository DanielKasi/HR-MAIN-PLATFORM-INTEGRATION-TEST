"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, User } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

// Define types for our dummy data
interface DummyEmployee {
	id: number;
	name: string;
	role: string;
	checkInTime?: string; // For On Time & Late
	status?: string; // For Absent (e.g., "On Leave")
}

export function AttendanceSummary() {
	const [loading, setLoading] = useState(true);

	// Dummy Data
	const onTimeData: DummyEmployee[] = [
		{ id: 1, name: "Musoke Paul", role: "Operations Officer", checkInTime: "7:32 AM" },
		{ id: 2, name: "Nabwana Jane", role: "Project Manager", checkInTime: "7:15 AM" },
		{ id: 3, name: "Kagwa Isaac", role: "Software Developer", checkInTime: "7:05 AM" },
		{ id: 4, name: "Amani Grace", role: "Graphic Designer", checkInTime: "7:20 AM" },
		{ id: 5, name: "Ssemakula Brian", role: "Data Analyst", checkInTime: "7:45 AM" },
		{ id: 6, name: "Mugisha Rita", role: "Marketing Specialist", checkInTime: "7:30 PM" },
		{ id: 7, name: "Lukwago Daniel", role: "Sales Analyst", checkInTime: "7:00 PM" },
		{ id: 8, name: "Nabugodi Sarah", role: "Customer Support", checkInTime: "7:00 PM" },
		{ id: 9, name: "Kanyere Simon", role: "HR Coordinator", checkInTime: "7:10 PM" },
		{ id: 10, name: "Ochieng Faith", role: "Content Writer", checkInTime: "7:25 PM" },
		{ id: 11, name: "Kamara John", role: "IT Support", checkInTime: "7:00 PM" },
	];

	const lateData: DummyEmployee[] = [
		{ id: 1, name: "Rwabwogo Isaac", role: "System Administrator", checkInTime: "10:00 AM" },
		{ id: 2, name: "Kibuka Aisha", role: "Web Developer", checkInTime: "9:55 AM" },
		{ id: 3, name: "Ssenyomo Robert", role: "Graphic Designer", checkInTime: "9:50 AM" },
		{ id: 4, name: "Ochieng Fiona", role: "Content Creator", checkInTime: "9:45 AM" },
		{ id: 5, name: "Nankya Brenda", role: "Sales Executive", checkInTime: "9:40 AM" },
		{ id: 6, name: "Mugisha John", role: "Marketing Specialist", checkInTime: "9:35 AM" },
		{ id: 7, name: "Atim Alice", role: "Data Analyst", checkInTime: "9:30 AM" },
		{ id: 8, name: "Kakinda Grace", role: "UX Designer", checkInTime: "9:25 AM" },
		{ id: 9, name: "Okwalinga David", role: "Software Engineer", checkInTime: "9:20 AM" },
		{ id: 10, name: "Nabwana Sarah", role: "Product Manager", checkInTime: "9:15 AM" },
		{ id: 11, name: "Ssempala John", role: "Head of Sales", checkInTime: "9:10 AM" },
	];

	const absentData: DummyEmployee[] = [
		{ id: 1, name: "Ssemakula Peter", role: "Software Developer", status: "On Leave" },
		{ id: 2, name: "Nabugodi Lydia", role: "Project Manager", status: "On Leave" },
		{ id: 3, name: "Kiseka Brian", role: "Software Developer", status: "On Leave" },
		{ id: 4, name: "Tumwebaze Sarah", role: "Data Analyst", status: "On Leave" },
		{ id: 5, name: "Okello Richard", role: "Marketing Specialist", status: "On Leave" },
		{ id: 6, name: "Abenakyo Esther", role: "Product Manager", status: "On Leave" },
		{ id: 7, name: "Kibombo James", role: "HR Coordinator", status: "On Leave" },
		{ id: 8, name: "Mugisha Kevin", role: "Sales Executive", status: "On Leave" },
		{ id: 9, name: "Akello Grace", role: "Business Consultant", status: "On Leave" },
		{ id: 10, name: "Ochieng Samuel", role: "Financial Analyst", status: "On Leave" },
		{ id: 11, name: "Nalwanga Joy", role: "Customer Support", status: "On Leave" },
	];

	// Calculate stats
	const onTimeStats = {
		male: onTimeData.filter((emp) => emp.name.startsWith("M") || emp.name.startsWith("K")).length,
		female:
			onTimeData.length -
			onTimeData.filter((emp) => emp.name.startsWith("M") || emp.name.startsWith("K")).length,
		total: onTimeData.length,
		rate: 71,
	};

	const lateStats = {
		male: lateData.filter((emp) => emp.name.startsWith("R") || emp.name.startsWith("K")).length,
		female:
			lateData.length -
			lateData.filter((emp) => emp.name.startsWith("R") || emp.name.startsWith("K")).length,
		total: lateData.length,
		rate: 18,
	};

	const absentStats = {
		male: absentData.filter((emp) => emp.name.startsWith("S") || emp.name.startsWith("K")).length,
		female:
			absentData.length -
			absentData.filter((emp) => emp.name.startsWith("S") || emp.name.startsWith("K")).length,
		total: absentData.length,
		rate: 11,
	};

	// Simulate loading
	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 800);
		return () => clearTimeout(timer);
	}, []);

	if (loading) {
		return (
			<div className="p-4">
				<div className="flex justify-between mb-4">
					<h2 className="text-lg font-semibold">ATTENDANCE SUMMARY</h2>
					<div className="flex gap-4 text-sm">
						<div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
							<Calendar className="h-4 w-4" />
							<span>Loading...</span>
						</div>
						<div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
							<Clock className="h-4 w-4" />
							<span>Loading...</span>
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="bg-gray-100 rounded-2xl p-4 animate-pulse">
							<div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
							<div className="flex justify-between items-center mb-4">
								<div className="h-4 bg-gray-300 rounded w-16"></div>
								<div className="h-4 bg-gray-300 rounded w-8"></div>
							</div>
							<div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
							<div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="p-4">
			{/* Header */}
			<div className="flex justify-between mb-4">
				<h2 className="text-lg font-semibold">ATTENDANCE SUMMARY</h2>
				<div className="flex gap-4 text-sm">
					<div className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1 rounded-full">
						<Calendar className="h-4 w-4 text-gray-500" />
						<span>Monday, 12 April 2025</span>
					</div>
					<div className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1 rounded-full">
						<Clock className="h-4 w-4 text-gray-500" />
						<span>9:30 AM</span>
					</div>
				</div>
			</div>

			{/* Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{/* On Time Check-In Card */}
				<div className="border border-green-200 rounded-2xl overflow-hidden">
					<div className="bg-green-100 px-4 py-2 font-semibold text-sm">On Time Check-In</div>
					<div className="p-4">
						<div className="flex justify-between items-center mb-4 bg-green-50">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<User className="h-4 w-4 text-gray-500" />
									<span className="text-xs">Male</span>
									<span className="text-sm font-medium">{onTimeStats.male}</span>
								</div>
								<div className="flex items-center gap-1">
									<User className="h-4 w-4 text-gray-500" />
									<span className="text-xs">Female</span>
									<span className="text-sm font-medium">{onTimeStats.female}</span>
								</div>
							</div>
							<div className="text-right">
								<div className="text-xs text-gray-500">Total On-Time</div>
								<div className="text-xl font-bold">{onTimeStats.total}</div>
							</div>
						</div>
						<div className="flex justify-between items-center mb-4">
							<div className="text-xs text-gray-500">On-Time Rate</div>
							<div className="flex items-center gap-1">
								<div className="w-16 h-1 bg-green-400 rounded-full overflow-hidden">
									<div
										className="h-full bg-green-600"
										style={{ width: `${onTimeStats.rate}%` }}
									></div>
								</div>
								<span className="text-xs">{onTimeStats.rate}%</span>
							</div>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="w-full justify-between text-xs p-0 h-auto">
									All Departments
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="currentColor"
										viewBox="0 0 16 16"
									>
										<path
											fillRule="evenodd"
											d="M7.646 4.646a.5.5 0 01.708 0l6 6a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708z"
										/>
										<path
											fillRule="evenodd"
											d="M7.646 8.646a.5.5 0 01.708 0l6 6a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708z"
										/>
									</svg>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem>Engineering</DropdownMenuItem>
								<DropdownMenuItem>Marketing</DropdownMenuItem>
								<DropdownMenuItem>Sales</DropdownMenuItem>
								<DropdownMenuItem>HR</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
							{onTimeData.map((emp) => (
								<div
									key={emp.id}
									className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
								>
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-white">
											{emp.name.split(" ")[0][0]}
											{emp.name.split(" ")[1][0]}
										</div>
										<div>
											<div className="text-sm font-medium">{emp.name}</div>
											<div className="text-xs text-gray-500">{emp.role}</div>
										</div>
									</div>
									<div className="text-sm text-green-600 font-medium">{emp.checkInTime}</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Late Check-In Card */}
				<div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
					<div className="bg-blue-100 px-4 py-2 font-semibold text-sm">Late Check-In</div>
					<div className="p-4">
						<div className="flex justify-between items-center mb-4">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<User className="h-4 w-4 text-gray-500" />
									<span className="text-xs">Male</span>
									<span className="text-sm font-medium">{lateStats.male}</span>
								</div>
								<div className="flex items-center gap-1">
									<User className="h-4 w-4 text-gray-500" />
									<span className="text-xs">Female</span>
									<span className="text-sm font-medium">{lateStats.female}</span>
								</div>
							</div>
							<div className="text-right">
								<div className="text-xs text-gray-500">Total On-Time</div>
								<div className="text-xl font-bold">{lateStats.total}</div>
							</div>
						</div>
						<div className="flex justify-between items-center mb-4">
							<div className="text-xs text-gray-500">Late Arrival Rate</div>
							<div className="flex items-center gap-1">
								<div className="w-16 h-1 bg-blue-400 rounded-full overflow-hidden">
									<div className="h-full bg-blue-600" style={{ width: `${lateStats.rate}%` }}></div>
								</div>
								<span className="text-xs">{lateStats.rate}%</span>
							</div>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="w-full justify-between text-xs p-0 h-auto">
									All Departments
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="currentColor"
										viewBox="0 0 16 16"
									>
										<path
											fillRule="evenodd"
											d="M7.646 4.646a.5.5 0 01.708 0l6 6a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708z"
										/>
										<path
											fillRule="evenodd"
											d="M7.646 8.646a.5.5 0 01.708 0l6 6a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708z"
										/>
									</svg>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem>Engineering</DropdownMenuItem>
								<DropdownMenuItem>Marketing</DropdownMenuItem>
								<DropdownMenuItem>Sales</DropdownMenuItem>
								<DropdownMenuItem>HR</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
							{lateData.map((emp) => (
								<div
									key={emp.id}
									className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
								>
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-white">
											{emp.name.split(" ")[0][0]}
											{emp.name.split(" ")[1][0]}
										</div>
										<div>
											<div className="text-sm font-medium">{emp.name}</div>
											<div className="text-xs text-gray-500">{emp.role}</div>
										</div>
									</div>
									<div className="text-sm text-blue-600 font-medium">{emp.checkInTime}</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Absent Card */}
				<div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
					<div className="bg-red-100 px-4 py-2 font-semibold text-sm">Absent</div>
					<div className="p-4">
						<div className="flex justify-between items-center mb-4">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1">
									<User className="h-4 w-4 text-gray-500" />
									<span className="text-xs">Male</span>
									<span className="text-sm font-medium">{absentStats.male}</span>
								</div>
								<div className="flex items-center gap-1">
									<User className="h-4 w-4 text-gray-500" />
									<span className="text-xs">Female</span>
									<span className="text-sm font-medium">{absentStats.female}</span>
								</div>
							</div>
							<div className="text-right">
								<div className="text-xs text-gray-500">Total On-Time</div>
								<div className="text-xl font-bold">{absentStats.total}</div>
							</div>
						</div>
						<div className="flex justify-between items-center mb-4">
							<div className="text-xs text-gray-500">Absence Rate</div>
							<div className="flex items-center gap-1">
								<div className="w-16 h-1 bg-red-400 rounded-full overflow-hidden">
									<div
										className="h-full bg-red-600"
										style={{ width: `${absentStats.rate}%` }}
									></div>
								</div>
								<span className="text-xs">{absentStats.rate}%</span>
							</div>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="w-full justify-between text-xs p-0 h-auto">
									All Departments
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="currentColor"
										viewBox="0 0 16 16"
									>
										<path
											fillRule="evenodd"
											d="M7.646 4.646a.5.5 0 01.708 0l6 6a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708z"
										/>
										<path
											fillRule="evenodd"
											d="M7.646 8.646a.5.5 0 01.708 0l6 6a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708z"
										/>
									</svg>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem>Engineering</DropdownMenuItem>
								<DropdownMenuItem>Marketing</DropdownMenuItem>
								<DropdownMenuItem>Sales</DropdownMenuItem>
								<DropdownMenuItem>HR</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
							{absentData.map((emp) => (
								<div
									key={emp.id}
									className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
								>
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-white">
											{emp.name.split(" ")[0][0]}
											{emp.name.split(" ")[1][0]}
										</div>
										<div>
											<div className="text-sm font-medium">{emp.name}</div>
											<div className="text-xs text-gray-500">{emp.role}</div>
										</div>
									</div>
									<Badge variant="outline" className="text-xs px-2 py-1">
										On Leave
									</Badge>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
