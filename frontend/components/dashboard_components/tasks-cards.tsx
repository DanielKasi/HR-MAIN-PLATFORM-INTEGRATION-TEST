"use client";

import type { ApprovalTasksDashboardResponse, TaskType } from "@/types/types.utils";
import { useEffect, useState, useMemo } from "react";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDashboardTasksAnalytics } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Icon } from "@iconify/react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface Task {
	id: string;
	title: string;
	module: string;
	status: string;
	createdAt: string;
}

export function TasksCards({ branchId }: { branchId: string | null }) {
	const [dashboardData, setDashboardData] = useState<ApprovalTasksDashboardResponse | null>(null);
	const [allTasks, setAllTasks] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [allTasksList, setAllTasksList] = useState<Task[]>([]);
	const router = useRouter();

	// Compute unique modules from task list
	const modules: Array<{ name: string; count: number }> = useMemo(
		() => [
			{ name: "Task Management", count: 27 },
			{ name: "HR", count: 13 },
			{ name: "Accounting", count: 41 },
		],
		[allTasksList],
	);

	useEffect(() => {
		if (dashboardData) {
			let count = 0;
			Object.entries(dashboardData).forEach(([_, value]) => {
				count += (value as { count: number }).count || 0;
			});
			setAllTasks(count);
		}
	}, [dashboardData]);

	useEffect(() => {
		fetchTasks();
		fetchAllTasksList();
	}, [branchId]);

	const fetchTasks = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await getDashboardTasksAnalytics();
			setDashboardData(data);
		} catch (error) {
			console.error("Error fetching dashboard tasks:", error);
			setError("Failed to load tasks data");
		} finally {
			setLoading(false);
		}
	};

	const fetchAllTasksList = async () => {
		try {
			//   const tasks = await getAllTasksApiCall({ branchId });
			//   setAllTasksList(tasks);

			// For demo purposes, creating mock data
			const mockTasks: Task[] = [
				{
					id: "1",
					title: "Leave request pending approval for John Okello.",
					module: "Task Management",
					status: "Pending",
					createdAt: "2 days ago",
				},
				{
					id: "2",
					title: "New employee onboarding form for Lydia Tendo awaiting confirmation.",
					module: "Task Management",
					status: "Awaiting Confirmation",
					createdAt: "8 days ago",
				},
				{
					id: "3",
					title: "Employee transfer request for David Muwonge requires approval.",
					module: "Task Management",
					status: "Requires Approval",
					createdAt: "16 days ago",
				},
				{
					id: "4",
					title: "Loan application from Kevin Lutaaya awaiting HR approval.",
					module: "Task Management",
					status: "Awaiting HR Approval",
					createdAt: "1 Month ago",
				},
				{
					id: "5",
					title: "New job posting for Sales Executive awaiting HR validation.",
					module: "Task Management",
					status: "Awaiting HR Validation",
					createdAt: "2 Months ago",
				},
				{
					id: "6",
					title: "System access request for HR Reports Module requires admin approval.",
					module: "Task Management",
					status: "Requires Admin Approval",
					createdAt: "1 Year ago",
				},
				{
					id: "7",
					title: "Employee transfer request for David Muwonge requires approval.",
					module: "Task Management",
					status: "Requires Approval",
					createdAt: "1 Year ago",
				},
			];
			setAllTasksList(mockTasks);
		} catch (error) {
			console.error("Error fetching all tasks:", error);
			// Optionally set an error state for the dropdown
		}
	};

	const viewTasks = (type: TaskType) => {
		router.push(`/tasks?type=${type}`);
	};

	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6 py-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="bg-gray-100 rounded-2xl py-3 px-4 animate-pulse">
						<div className="flex items-center">
							<div className="w-8 h-6 bg-gray-300 rounded mr-2" />
							<div className="w-20 h-4 bg-gray-300 rounded" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6 py-4">
				<div className="col-span-full bg-red-50 border border-red-200 rounded-2xl py-3 px-4 text-center">
					<span className="text-red-600 text-sm">{error}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 !py-0 items-center gap-4">
			{/* Task Cards Grid (4 columns) */}
			<div className="col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4 cursor-pointer">
				<div
					className="bg-primary/10 rounded-2xl py-3 px-4 flex justify-between items-center"
					onClick={() => viewTasks("incoming")}
				>
					<div className="flex items-center">
						<span className="text-xl font-bold text-primary mr-2">
							{dashboardData?.incoming?.count || 0}
						</span>
						<span className="text-primary-hover text-sm">Incoming tasks</span>
					</div>
					<ArrowRight className="text-primary-hover h-4 w-4" />
				</div>
				<div
					className="bg-red-100 rounded-2xl py-3 px-4 flex justify-between items-center"
					onClick={() => viewTasks("critical")}
				>
					<div className="flex items-center">
						<span className="text-xl font-bold text-red-500 mr-2">
							{dashboardData?.critical?.count || 0}
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
							{dashboardData?.expired?.count || 0}
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
							{dashboardData?.outgoing?.count || 0}
						</span>
						<span className="text-green-500 text-sm">Outgoing Tasks</span>
					</div>
					<ArrowRight className="text-green-500 h-4 w-4" />
				</div>
			</div>

			{/* All Tasks Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild className="col-span-1 !rounded-2xl">
					<Button
						variant={"outline"}
						className="flex items-center justify-between cursor-pointer !rounded-2xl min-h-14 w-full"
					>
						<div className="flex items-center justify-start gap-4">
							<Icon icon="hugeicons:task-02" className="!w-6 !h-6" />
							<span>All Tasks</span>
							<Badge variant={"secondary"} className="text-base font-semibold px-4">
								{allTasks}
							</Badge>
						</div>
						<ChevronDown />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent className="!w-[calc(100%-1rem)] h-fit p-4 mx-auto rounded-xl max-h-[80vh] overflow-hidden">
					<div className="flex items-center justify-between gap-4">
						<h3 className="font-semibold mb-2">All Tasks ({allTasks})</h3>

						{/* Nested Modules Dropdown */}
						<div className="mb-4">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="w-full justify-between text-sm font-medium p-2 hover:bg-gray-100"
									>
										<span>All Modules ({modules.length})</span>
										<ChevronDown className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-[220px] max-h-60 overflow-y-auto">
									<DropdownMenuItem className="p-2 text-sm text-muted-foreground">
										<div className="flex justify-start gap-2 items-center w-full">
											<span>All modules</span>
											<span className="text-xs text-muted-foreground">({allTasks})</span>
										</div>
									</DropdownMenuItem>
									{modules.length > 0 ? (
										modules.map((mod, idx) => (
											<DropdownMenuItem key={idx} className="p-2 text-sm">
												<div className="flex justify-start gap-2 items-center w-full">
													<span>{mod.name}</span>
													<span className="text-xs text-muted-foreground">({mod.count})</span>
												</div>
											</DropdownMenuItem>
										))
									) : (
										<DropdownMenuItem className="p-2 text-sm text-muted-foreground">
											No modules found
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
					<div className="mb-4">
						<input
							type="text"
							placeholder="Search tasks or modules..."
							className="w-full p-2 text-sm border rounded-xl"
						/>
					</div>

					{/* Task List */}
					<div className="max-h-[30vh] overflow-y-auto">
						{allTasksList.length > 0 ? (
							allTasksList.map((task) => (
								<DropdownMenuItem
									key={task.id}
									className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
								>
									<div className="flex justify-between items-center w-full">
										<div className="flex-1 pr-2">
											<p className="font-medium">{task.title}</p>
											<p className="text-xs text-muted-foreground py-1">
												<span className="rounded-lg p-2 py-1 bg-gray-100">{task.module}</span>•{" "}
												{task.createdAt}
											</p>
										</div>
										<ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
									</div>
								</DropdownMenuItem>
							))
						) : (
							<p className="text-sm text-muted-foreground p-2">No tasks available.</p>
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
