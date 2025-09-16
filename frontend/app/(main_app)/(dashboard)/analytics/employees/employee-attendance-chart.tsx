"use client";

import { Bar } from "react-chartjs-2";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";

// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AttendanceData {
	total_hours_worked: number;
	total_late_minutes: number;
	total_overtime_hours: number;
	attendance_metrics: Record<string, string>;
}

interface Props {
	data: AttendanceData;
}

export default function AttendanceChart({ data }: Props) {
	const chartData = {
		labels: ["Hours Worked", "Late Minutes", "Overtime Hours"],
		datasets: [
			{
				label: "Attendance Overview",
				data: [data.total_hours_worked, data.total_late_minutes, data.total_overtime_hours],
				backgroundColor: ["#4F46E5", "#F59E0B", "#10B981"], // purple, amber, green
				borderRadius: 8,
			},
		],
	};

	const options = {
		responsive: true,
		plugins: {
			legend: {
				position: "top" as const,
			},
			title: {
				display: true,
				text: "Employee Attendance Analytics",
			},
		},
	};

	return <Bar data={chartData} options={options} />;
}
