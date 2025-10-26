"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PROJECTS_TASKS_API, usersAPI, PROJECTS_API } from "@/lib/utils";
import { IProjectTask } from "@/types/types.utils";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { showErrorToast } from "@/lib/utils";
import { Badge } from "@/platform/v1/components";
import { ArrowLeft, Folder, Search } from "lucide-react";
import { Button } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { formatDate } from "@/lib/helpers";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

const getStatusBadge = (status: { id: number; name: string }) => {
	const statusKey = status.name.toLowerCase().replace(/\s+/g, "_");

	switch (statusKey) {
		case "completed":
			return (
				<Badge className="bg-green-100 text-green-800 hover:bg-green-100 capitalize text-xs sm:text-sm">
					{status.name}
				</Badge>
			);
		case "in_progress":
			return (
				<Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 capitalize text-xs sm:text-sm">
					{status.name}
				</Badge>
			);
		case "not_started":
			return (
				<Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 capitalize text-xs sm:text-sm">
					{status.name}
				</Badge>
			);
		default:
			return (
				<Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 capitalize text-xs sm:text-sm">
					{status.name}
				</Badge>
			);
	}
};

export default function TasksPage() {
	const router = useModuleNavigation();
	const searchParams = useSearchParams();
	const userId = useMemo(() => searchParams.get("q"), [searchParams]);
	const projectId = useMemo(() => searchParams.get("project_id"), [searchParams]);
	const [userName, setUserName] = useState<string | null>(null);
	const [projectName, setProjectName] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		const fetchData = async () => {
			try {
				if (userId) {
					const user = await usersAPI.getUserById({ userId: Number(userId) });
					setUserName(user.fullname || "Unknown User");
				}

				if (projectId) {
					const project = await PROJECTS_API.getByProjectById({
						project_id: Number(projectId),
					});
					setProjectName(project.project_name || "Unknown Project");
				}
			} catch (error) {
				showErrorToast({
					error,
					defaultMessage: "Failed to fetch user or project details",
				});
				setUserName("Unknown User");
				if (projectId) setProjectName("Unknown Project");
			}
		};

		if (userId || projectId) {
			fetchData();
		}
	}, [userId, projectId]);

	const columns: ColumnDef<IProjectTask>[] = [
		{
			key: "name",
			header: <span className="text-xs sm:text-sm">Task</span>,
			cell: (task) => <span className="text-xs sm:text-sm">{task.task_name || ""}</span>,
		},
		{
			key: "start_date",
			header: <span className="text-xs sm:text-sm">Start Date</span>,
			cell: (task) => (
				<span className="text-xs sm:text-sm">{formatDate(task.start_date ?? "")}</span>
			),
		},
		{
			key: "end_date",
			header: <span className="text-xs sm:text-sm">End Date</span>,
			cell: (task) => <span className="text-xs sm:text-sm">{formatDate(task.end_date ?? "")}</span>,
		},
		{
			key: "priority",
			header: <span className="text-xs sm:text-sm">Priority</span>,
			cell: (task) => (
				<Badge
					style={{
						backgroundColor: `${task.priority?.color}30`,
						color: task.priority?.color,
						border: `1.5px solid ${task.priority?.color}`,
					}}
					className="capitalize text-xs sm:text-sm"
				>
					{task.priority?.name}
				</Badge>
			),
		},
		{
			key: "status",
			header: <span className="text-xs sm:text-sm">Status</span>,
			cell: (task) =>
				task.task_status ? (
					<Badge
						style={{
							backgroundColor: `${task.task_status.color_code}30`,
							color: task.task_status.color_code,
							border: `1.5px solid ${task.task_status.color_code}`,
						}}
						className="capitalize text-xs sm:text-sm"
					>
						{task.task_status.name}
					</Badge>
				) : (
					<Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 capitalize text-xs sm:text-sm">
						Unknown
					</Badge>
				),
		},
	];

	return (
		<div className="min-h-screen bg-white p-3 sm:p-4 rounded-xl space-y-4 sm:space-y-6">
			<div className="flex items-center gap-2 mt-5">
				<Button
					className="rounded-full aspect-square -mt-"
					size="sm"
					variant="ghost"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="mb-4">
					<h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 ml-2">
						{userName ? `${userName}'s Tasks` : "All Tasks"}
					</h1>
					{projectName && projectId && (
						<div className="flex items-center ml-2 mt-2 text-gray-700 text-sm sm:text-base font-medium">
							<Folder className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-indigo-500" />
							<span>
								<span className="text-gray-500">Project:</span> {projectName}
							</span>
						</div>
					)}
				</div>
			</div>

			<div className="py-4 sm:py-6 w-full">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-3 sm:gap-4 w-full">
					<div className="relative w-full sm:max-w-md">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
						<Input
							placeholder="Search tasks..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10 h-10 sm:h-12 text-sm sm:text-base w-full"
						/>
					</div>
				</div>
			</div>

			<PaginatedTable<IProjectTask>
				paginated={true}
				fetchFirstPage={async () => {
					return await PROJECTS_TASKS_API.getPaginatedTasks({
						user: userId ? Number(userId) : undefined,
						project: projectId ? Number(projectId) : undefined,
						page: 1,
						search: searchTerm || undefined,
					});
				}}
				fetchFromUrl={PROJECTS_TASKS_API.getPaginatedTasksFromUrl}
				deps={[userId, projectId, searchTerm]}
				onError={(err) =>
					showErrorToast({
						error: err,
						defaultMessage: "Failed to fetch tasks",
					})
				}
				className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-auto"
				tableClassName="min-w-[800px] sm:min-w-[1000px] [&_th]:border-0 [&_td]:border-0"
				footerClassName="pt-3 sm:pt-4"
				columns={columns}
				skeletonRows={10}
				emptyState={
					<div className="text-center py-8 sm:py-12">
						<p className="text-muted-foreground text-xs sm:text-sm mb-4">No tasks found</p>
					</div>
				}
			/>
		</div>
	);
}
