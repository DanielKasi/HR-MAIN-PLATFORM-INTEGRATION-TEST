"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Tag } from "lucide-react";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/v1/components";
import { TASK_PRIORITY_API } from "@/lib/utils";
import { showErrorToast } from "@/lib/utils";
import type { ITaskPriority } from "@/types/project.type";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

export default function TaskPriorityDetailsPage() {
	const params = useParams();
	const router = useModuleNavigation("/apps/task-management");
	const [priority, setPriority] = useState<ITaskPriority | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadPriority();
	}, [params.id]);

	const loadPriority = async () => {
		try {
			setLoading(true);
			const data = await TASK_PRIORITY_API.getById({
				task_priority_id: Number(params.id),
			});
			setPriority(data);
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to load task priority details",
			});
			router.push("/task-mgt/task-priority");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="p-4 sm:p-6">
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-gray-200 rounded w-1/2 sm:w-1/4"></div>
					<div className="h-64 bg-gray-200 rounded"></div>
				</div>
			</div>
		);
	}

	if (!priority) return null;

	const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-0">
			<label className="text-xs sm:text-sm text-muted-foreground">{label}</label>
			<div className="sm:text-right break-words">{children}</div>
		</div>
	);

	return (
		<div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white rounded-xl min-h-screen overflow-x-hidden">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-3 sm:gap-4">
					<Button
						size="sm"
						variant="outline"
						className="rounded-full aspect-square"
						onClick={() => router.push("/task-mgt/task-priority")}
					>
						<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<div className="flex items-center gap-2 sm:gap-3 min-w-0">
						<div
							className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
							style={{ backgroundColor: priority.color_code }}
						/>
						<h1 className="text-lg sm:text-2xl font-bold truncate">{priority.name}</h1>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="grid gap-4 sm:gap-6 md:grid-cols-2">
				{/* Basic Information */}
				<Card className="overflow-hidden">
					<CardHeader>
						<CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-0 overflow-x-hidden">
						<DetailRow label="Priority Name">
							<p className="font-medium text-sm sm:text-base break-words">{priority.name}</p>
						</DetailRow>

						<DetailRow label="Description">
							<p className="text-sm sm:text-base break-words max-w-full sm:max-w-xs">
								{priority.description || "—"}
							</p>
						</DetailRow>

						<DetailRow label="Weight">
							<p className="font-medium text-sm sm:text-base">{priority.weight}</p>
						</DetailRow>

						<DetailRow label="Color Code">
							<div className="flex items-center gap-2">
								<span className="text-xs sm:text-sm">{priority.color_code}</span>
								<div
									className="w-5 h-5 sm:w-6 sm:h-6 rounded border flex-shrink-0"
									style={{ backgroundColor: priority.color_code }}
								/>
							</div>
						</DetailRow>

						<DetailRow label="Status">
							<Badge variant={priority.is_active ? "default" : "secondary"} className="text-xs">
								{priority.is_active ? "Active" : "Inactive"}
							</Badge>
						</DetailRow>
					</CardContent>
				</Card>

				{/* System Information */}
				<Card className="overflow-hidden">
					<CardHeader>
						<CardTitle className="text-base sm:text-lg">System Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-0 overflow-x-hidden">
						<DetailRow label="Approval Status">
							<Badge variant="outline" className="text-xs break-words">
								{priority.approval_status.replace(/_/g, " ").toUpperCase()}
							</Badge>
						</DetailRow>

						<DetailRow label="Created At">
							<p className="text-xs sm:text-sm break-words">
								{new Date(priority.created_at).toLocaleString()}
							</p>
						</DetailRow>

						<DetailRow label="Updated At">
							<p className="text-xs sm:text-sm break-words">
								{new Date(priority.updated_at).toLocaleString()}
							</p>
						</DetailRow>

						{priority.deleted_at && (
							<DetailRow label="Deleted At">
								<p className="text-xs sm:text-sm text-destructive break-words">
									{new Date(priority.deleted_at).toLocaleString()}
								</p>
							</DetailRow>
						)}

						<DetailRow label="Created By">
							<p className="text-xs sm:text-sm">User #{priority.created_by}</p>
						</DetailRow>

						<DetailRow label="Updated By">
							<p className="text-xs sm:text-sm">User #{priority.updated_by}</p>
						</DetailRow>

						{priority.approvals && (
							<DetailRow label="Approvals">
								<p className="text-xs sm:text-sm break-words">{priority.approvals}</p>
							</DetailRow>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
