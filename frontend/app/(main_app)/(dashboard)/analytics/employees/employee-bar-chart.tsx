"use client";

import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
	title: string;
	data: { label: string; value: number }[];
}

export default function BarChart({ title, data }: BarChartProps) {
	const chartData = {
		labels: data.map((item) => item.label),
		datasets: [
			{
				label: title,
				data: data.map((item) => item.value),
				backgroundColor: [
					"rgba(255, 99, 132, 0.6)",
					"rgba(54, 162, 235, 0.6)",
					"rgba(255, 206, 86, 0.6)",
					"rgba(75, 192, 192, 0.6)",
					"rgba(153, 102, 255, 0.6)",
					"rgba(255, 159, 64, 0.6)",
				],
				borderColor: "#fff",
				borderWidth: 1,
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
				text: title,
			},
		},
	};

	return (
		<div className="p-4 bg-white shadow rounded-2xl">
			<Bar data={chartData} options={options} />
		</div>
	);
}
