"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ApprovalTasksDashboardResponse, TaskType } from "@/types/types.utils";
import { getDashboardTasksAnalytics } from "@/lib/utils";

// Tasks Cards Component
export function TasksCards({ branchId }: { branchId: string | null }) {
	const [dashboardData, setDashboardData] = useState<ApprovalTasksDashboardResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		fetchTasks();
	}, []);

	const fetchTasks = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await getDashboardTasksAnalytics();
			setDashboardData(data);
		} catch (error) {
			console.error("Error fetching tasks:", error);
			setError("Failed to load tasks data");
		} finally {
			setLoading(false);
		}
	};

	const viewTasks = (type: TaskType) => {
		router.push(`/tasks?type=${type}`);
	};

	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-6 py-4">
				{[...Array(5)].map((_, i) => (
					<div key={i} className="bg-gray-100 rounded-2xl py-3 px-4 animate-pulse">
						<div className="flex items-center">
							<div className="w-8 h-6 bg-gray-300 rounded mr-2"></div>
							<div className="w-20 h-4 bg-gray-300 rounded"></div>
						</div>
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-6 py-4">
				<div className="col-span-full bg-red-50 border border-red-200 rounded-2xl py-3 px-4 text-center">
					<span className="text-red-600 text-sm">{error}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-6 py-4 cursor-pointer">
			<div
				className="bg-primary/10 rounded-2xl py-3 px-4 flex justify-between items-center"
				onClick={() => viewTasks("incoming")}
			>
				<div className="flex items-center">
					<span className="text-xl font-bold text-primary mr-2">
						{dashboardData?.incoming.count || 0}
					</span>
					<span className="text-primary-hover text-sm">Incoming tasks</span>
				</div>
				<ArrowRight className="text-primary-hover h-4 w-4" />
			</div>
			<div
				className="bg-purple-100 rounded-2xl py-3 px-4 flex justify-between items-center"
				onClick={() => viewTasks("open")}
			>
				<div className="flex items-center">
					<span className="text-xl font-bold text-purple-500 mr-2">
						{dashboardData?.open.count || 0}
					</span>
					<span className="text-purple-500 text-sm">Open tasks</span>
				</div>
				<ArrowRight className="text-purple-500 h-4 w-4" />
			</div>
			<div
				className="bg-red-100 rounded-2xl py-3 px-4 flex justify-between items-center"
				onClick={() => viewTasks("critical")}
			>
				<div className="flex items-center">
					<span className="text-xl font-bold text-red-500 mr-2">
						{dashboardData?.critical.count || 0}
					</span>
					<span className="text-red-500 text-sm">Critical Tasks</span>
				</div>
				<ArrowRight className="text-red-500 h-4 w-4" />
			</div>

			<div
				className="bg-gray-200/60 rounded-2xl py-3 px-4 flex justify-between items-center"
				onClick={() => viewTasks("expired")}
			>
				<div className="flex items-center">
					<span className="text-xl font-bold text-gray-600 mr-2">
						{dashboardData?.expired.count || 0}
					</span>
					<span className="text-gray-600 text-sm">Expired Tasks</span>
				</div>
				<ArrowRight className="text-blue-500 h-4 w-4" />
			</div>

			<div
				className="bg-green-100 rounded-2xl py-3 px-4 flex justify-between items-center"
				onClick={() => viewTasks("outgoing")}
			>
				<div className="flex items-center">
					<span className="text-xl font-bold text-green-500 mr-2">
						{dashboardData?.outgoing.count || 0}
					</span>
					<span className="text-green-500 text-sm">Outgoing Tasks</span>
				</div>
				<ArrowRight className="text-green-500 h-4 w-4" />
			</div>
		</div>
	);
}
