"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
	title: string;
	data: Record<string, number>;
}

export default function PieChart({ title, data }: PieChartProps) {
	const chartData = {
		labels: Object.keys(data).map(
			(label) => label[0].toLocaleUpperCase() + label.slice(1).replaceAll("_", " "),
		),
		datasets: [
			{
				label: title,
				data: Object.values(data),
				backgroundColor: [
					"rgba(255, 99, 132, 0.6)",
					"rgba(54, 162, 235, 0.6)",
					"rgba(255, 206, 86, 0.6)",
					"rgba(75, 192, 192, 0.6)",
					"rgba(153, 102, 255, 0.6)",
					"rgba(255, 159, 64, 0.6)",
				],
				borderColor: ["#fff"],
				borderWidth: 2,
			},
		],
	};

	return (
		<div className="p-4 bg-white shadow rounded-2xl">
			<h2 className="text-lg font-semibold mb-2">{title}</h2>
			<Pie data={chartData} />
		</div>
	);
}
