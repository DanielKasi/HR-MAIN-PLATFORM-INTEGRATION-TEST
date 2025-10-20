"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Users } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface DummyAttendanceEmployee {
	name: string;
	role: string;
	department: string;
	time?: string;
	status?: string;
	avatar: string;
}

interface DummyAttendanceCategory {
	male: number;
	female: number;
	total: number;
	rate: number;
	employees: DummyAttendanceEmployee[];
}

interface DummyAttendance {
	date: string;
	time: string;
	onTime: DummyAttendanceCategory;
	late: DummyAttendanceCategory;
	absent: DummyAttendanceCategory;
}

const attendanceData: DummyAttendance = {
	date: "Monday, 12 April 2025",
	time: "9:30 AM",
	onTime: {
		male: 120,
		female: 301,
		total: 421,
		rate: 71,
		employees: [
			{
				name: "Musoke Paul",
				role: "Customer Officer",
				department: "Customer Service",
				time: "7:32 AM",
				avatar: "/man.jpg",
			},
			{
				name: "Nabwana Jane",
				role: "Project Manager",
				department: "Engineering",
				time: "7:15 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Kagwa Isaac",
				role: "System Developer",
				department: "Engineering",
				time: "7:05 AM",
				avatar: "/man.jpg",
			},
			{
				name: "Amani Grace",
				role: "Graphic Designer",
				department: "Design",
				time: "7:20 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Ssemakula Brian",
				role: "UX Designer",
				department: "Design",
				time: "7:45 AM",
				avatar: "/man.jpg",
			},
			{
				name: "Mugisha Rita",
				role: "Marketing Manager",
				department: "Marketing",
				time: "7:30 PM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Lukwago Daniel",
				role: "Sales Executive",
				department: "Sales",
				time: "7:00 PM",
				avatar: "/man.jpg",
			},
			{
				name: "Nabugodi Sarah",
				role: "Customer Support",
				department: "Customer Service",
				time: "7:00 PM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Kanyere Simon",
				role: "HR Coordinator",
				department: "Human Resources",
				time: "7:10 PM",
				avatar: "/man.jpg",
			},
			{
				name: "Ochieng Faith",
				role: "Content Writer",
				department: "Marketing",
				time: "7:25 PM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Kamara John",
				role: "IT Support",
				department: "Engineering",
				time: "7:00 PM",
				avatar: "/man.jpg",
			},
		],
	},
	late: {
		male: 62,
		female: 91,
		total: 153,
		rate: 18,
		employees: [
			{
				name: "Rwabwogo Isaac",
				role: "System Developer",
				department: "Engineering",
				time: "10:00 AM",
				avatar: "/man.jpg",
			},
			{
				name: "Kibuka Aisha",
				role: "Web Developer",
				department: "Engineering",
				time: "9:55 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Ssenyomo Robert",
				role: "Graphic Designer",
				department: "Design",
				time: "9:50 AM",
				avatar: "/man.jpg",
			},
			{
				name: "Ochieng Fiona",
				role: "Content Writer",
				department: "Marketing",
				time: "9:45 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Nankya Brenda",
				role: "Sales Executive",
				department: "Sales",
				time: "9:40 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Mugisha John",
				role: "Marketing Specialist",
				department: "Marketing",
				time: "9:35 AM",
				avatar: "/man.jpg",
			},
			{
				name: "Atim Alice",
				role: "Data Analyst",
				department: "Analytics",
				time: "9:30 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Kakinda Grace",
				role: "UX Designer",
				department: "Design",
				time: "9:25 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Okwelinga David",
				role: "Software Engineer",
				department: "Engineering",
				time: "9:20 AM",
				avatar: "/man.jpg",
			},
			{
				name: "Nabwana Sarah",
				role: "Product Manager",
				department: "Product",
				time: "9:15 AM",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Ssempala John",
				role: "Head of Sales",
				department: "Sales",
				time: "9:10 AM",
				avatar: "/man.jpg",
			},
		],
	},
	absent: {
		male: 6,
		female: 18,
		total: 24,
		rate: 11,
		employees: [
			{
				name: "Ssemakula Peter",
				role: "Software Developer",
				department: "Engineering",
				status: "On Leave",
				avatar: "/man.jpg",
			},
			{
				name: "Nabugodi Lydia",
				role: "Project Manager",
				department: "Engineering",
				status: "",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Kiseka Brian",
				role: "Software Developer",
				department: "Engineering",
				status: "",
				avatar: "/man.jpg",
			},
			{
				name: "Tumwebaze Sarah",
				role: "Data Analyst",
				department: "Analytics",
				status: "On Leave",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Okello Richard",
				role: "Marketing Specialist",
				department: "Marketing",
				status: "On Leave",
				avatar: "/man.jpg",
			},
			{
				name: "Abenakyo Esther",
				role: "Content Manager",
				department: "Marketing",
				status: "On Leave",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Kibombo James",
				role: "HR Coordinator",
				department: "Human Resources",
				status: "",
				avatar: "/man.jpg",
			},
			{
				name: "Mugisha Kevin",
				role: "Sales Executive",
				department: "Sales",
				status: "",
				avatar: "/man.jpg",
			},
			{
				name: "Akello Grace",
				role: "Business Consultant",
				department: "Consulting",
				status: "On Leave",
				avatar: "/diverse-woman-portrait.png",
			},
			{
				name: "Ochieng Samuel",
				role: "Financial Analyst",
				department: "Finance",
				status: "",
				avatar: "/man.jpg",
			},
			{
				name: "Nalwanga Joy",
				role: "Customer Support",
				department: "Customer Service",
				status: "",
				avatar: "/diverse-woman-portrait.png",
			},
		],
	},
};

export function AttendanceSummary() {
	const [currentDate, setCurrentDate] = useState("");
	const [currentTime, setCurrentTime] = useState("");

	useEffect(() => {
		const updateDateTime = () => {
			const now = new Date();

			// Format date as "Monday, 12 April 2025"
			const dateOptions: Intl.DateTimeFormatOptions = {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
			};
			const formattedDate = now.toLocaleDateString("en-US", dateOptions);

			// Format time as "9:30 AM"
			const timeOptions: Intl.DateTimeFormatOptions = {
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			};
			const formattedTime = now.toLocaleTimeString("en-US", timeOptions);

			setCurrentDate(formattedDate);
			setCurrentTime(formattedTime);
		};

		// Update immediately
		updateDateTime();

		// Update every second
		const interval = setInterval(updateDateTime, 1000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="w-full">
			<div className="p-6 bg-white rounded-xl shadow-sm ">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-xl font-bold text-foreground">ATTENDANCE SUMMARY</h1>
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-100 rounded-xl p-2">
							<Icon icon="hugeicons:calendar-03" className="!size-5" />
							<span className="font-medium">{currentDate}</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-100 rounded-xl p-2">
							<Icon icon="hugeicons:clock-01" className="!size-5" />
							<span className="font-medium">{currentTime}</span>
						</div>
					</div>
				</div>

				{/* Three Column Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-3 divide-x-2 divide-gray-200 gap-4">
					{/* On Time Check-In */}
					<AttendanceColumn
						title="On Time Check-In"
						bgColor="bg-green-100"
						male={attendanceData.onTime.male}
						female={attendanceData.onTime.female}
						total={attendanceData.onTime.total}
						rate={attendanceData.onTime.rate}
						rateLabel="On-Time Rate"
						rateColor="bg-green-500"
						employees={attendanceData.onTime.employees}
						timeColor="text-green-600"
						className=""
					/>

					{/* Late Check-In */}
					<AttendanceColumn
						title="Late Check-In"
						bgColor="bg-blue-100"
						male={attendanceData.late.male}
						female={attendanceData.late.female}
						total={attendanceData.late.total}
						rate={attendanceData.late.rate}
						rateLabel="Late Arrival Rate"
						rateColor="bg-blue-500"
						employees={attendanceData.late.employees}
						timeColor="text-blue-600"
						className="!pl-3"
					/>

					{/* Absent */}
					<AttendanceColumn
						title="Absent"
						bgColor="bg-red-100"
						male={attendanceData.absent.male}
						female={attendanceData.absent.female}
						total={attendanceData.absent.total}
						rate={attendanceData.absent.rate}
						rateLabel="Absence Rate"
						rateColor="bg-red-500"
						employees={attendanceData.absent.employees}
						isAbsent
						className="!pl-3"
					/>
				</div>
			</div>
		</div>
	);
}

interface AttendanceColumnProps {
	title: string;
	bgColor: string;
	male: number;
	female: number;
	total: number;
	rate: number;
	rateLabel: string;
	rateColor: string;
	employees: Array<{
		name: string;
		role: string;
		department: string;
		time?: string;
		status?: string;
		avatar: string;
	}>;
	timeColor?: string;
	isAbsent?: boolean;
	className?: string;
}

function AttendanceColumn({
	title,
	bgColor,
	male,
	female,
	total,
	rate,
	rateLabel,
	rateColor,
	employees,
	timeColor,
	isAbsent = false,
	className = "",
}: AttendanceColumnProps) {
	const [selectedDepartment, setSelectedDepartment] = useState("all");

	const departments = Array.from(new Set(employees.map((emp) => emp.department))).sort();

	const filteredEmployees =
		selectedDepartment === "all"
			? employees
			: employees.filter((emp) => emp.department === selectedDepartment);

	return (
		<div className={`flex flex-col gap-2 ${className}`}>
			{/* Column Header */}
			<div className={`${bgColor} p-4 rounded-lg`}>
				<h2 className="text-sm font-semibold text-foreground">{title}</h2>
			</div>

			{/* Stats Section */}
			<div className=" border border-border p-4 rounded-xl">
				{/* Gender Breakdown */}
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Icon icon="hugeicons:male-02" className="!w-5 !h-5" />
						<span>Male</span>
						<span className="font-semibold text-foreground">{male}</span>
					</div>
					<div className="text-sm text-muted-foreground">
						Total {isAbsent ? "On-Time" : "On-Time"}
					</div>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Icon icon="hugeicons:female-02" className="!w-5 !h-5" />
						<span>Female</span>
						<span className="font-semibold text-foreground">{female}</span>
					</div>
					<div className="text-3xl font-bold text-foreground">{total}</div>
				</div>

				{/* Rate */}
				<div className="mt-3 border-t border-gray-200 pt-2">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs text-muted-foreground">{rateLabel}</span>
						<div className="flex items-center gap-2">
							<div className={`w-2 h-2 rounded-full ${rateColor}`} />
							<span className="text-sm font-semibold text-foreground">{rate}%</span>
						</div>
					</div>
					<div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
						<div className={`h-full ${rateColor}`} style={{ width: `${rate}%` }} />
					</div>
				</div>
			</div>
			<Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
				<SelectTrigger className="w-full !shadow-none rounded-xl">
					<SelectValue placeholder="All Departments" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Departments</SelectItem>
					{departments.map((dept) => (
						<SelectItem key={dept} value={dept}>
							{dept}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<div className="bg-white rounded-xl overflow-hidden mt-4">
				<div className="max-h-[500px] overflow-y-auto no-scrollbar">
					{filteredEmployees.map((employee: DummyAttendanceEmployee, index) => (
						<div
							key={index}
							className="flex items-center justify-between p-3 border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<Avatar className="w-9 h-9 flex-shrink-0">
									<AvatarImage src={employee.avatar || "/placeholder.svg"} alt={employee.name} />
									<AvatarFallback>
										{employee.name
											.split(" ")
											.map((n) => n[0])
											.join("")}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-foreground truncate">{employee.name}</p>
									<p className="text-xs text-muted-foreground truncate">{employee.role}</p>
								</div>
							</div>
							<div className="flex items-center gap-3 flex-shrink-0">
								{!isAbsent && (
									<>
										<span className="text-xs text-muted-foreground">Apr 12, 2025</span>
										<span className={`text-sm font-semibold ${timeColor}`}>{employee.time}</span>
									</>
								)}
								{isAbsent && employee.status && (
									<span className="text-xs text-muted-foreground bg-gray-100 p-2 py-1 rounded-xl">
										{employee.status}
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
