"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, User, Activity } from "lucide-react";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/v1/components";
import { Skeleton } from "@/platform/v1/components";
import { PROJECT_STATUS_API } from "@/lib/utils";
import { showErrorToast } from "@/lib/utils";
import type { IProjectStatus } from "@/types/project.type";
import { formatDate } from "@/lib/helpers";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

export default function ProjectStatusViewPage() {
	const params = useParams();
	const router = useModuleNavigation();
	const [status, setStatus] = useState<IProjectStatus | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const fetchedStatus = await PROJECT_STATUS_API.getById({
					project_status_id: Number(params.id),
				});
				setStatus(fetchedStatus);
			} catch (error) {
				showErrorToast({
					error,
					defaultMessage: "Failed to fetch project status",
				});
				router.push("/projects/project-statuses");
			} finally {
				setLoading(false);
			}
		};

		if (params.id) {
			fetchStatus();
		}
	}, [params.id, router]);

	if (loading || !status) {
		return (
			<div className="min-h-screen bg-white p-6 rounded-xl space-y-6">
				<Skeleton className="h-8 w-8" />
				<Skeleton className="h-10 w-96" />
				<div className="grid gap-6 md:grid-cols-2">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		);
	}

	const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
		<div className="flex items-center justify-between py-3">
			<label className="text-sm text-muted-foreground">{label}</label>
			<div className="text-right">{children}</div>
		</div>
	);

	return (
		<div className="p-6 space-y-6 bg-white rounded-xl min-h-screen">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						size="sm"
						variant="outline"
						className="rounded-full aspect-square"
						onClick={() => router.push("/projects/project-statuses")}
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div className="mt-4">
						<h1 className="text-2xl font-bold">{status.status_name}</h1>
						<p className="text-sm text-muted-foreground mt-1">Project Status Details</p>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<Activity className="h-5 w-5" />
							Basic Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-0">
						<DetailRow label="Status Name">
							<p className="font-medium">{status.status_name}</p>
						</DetailRow>

						<DetailRow label="Description">
							<p className="max-w-xs text-sm">{status.description || "—"}</p>
						</DetailRow>

						<DetailRow label="Active Status">
							<Badge variant={status.is_active ? "default" : "secondary"}>
								{status.is_active ? "Active" : "Inactive"}
							</Badge>
						</DetailRow>

						<DetailRow label="Approval Status">
							<Badge variant="outline">
								{status.approval_status.replace(/_/g, " ").toUpperCase()}
							</Badge>
						</DetailRow>
					</CardContent>
				</Card>

				{/* System Information */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<Calendar className="h-5 w-5" />
							System Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-0">
						<DetailRow label="Created At">
							<p className="text-sm">
								{formatDate(status.created_at)}
								{" at "}
								{new Date(status.created_at).toLocaleTimeString("en-US", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						</DetailRow>

						<DetailRow label="Last Updated">
							<p className="text-sm">
								{formatDate(status.updated_at)}
								{" at "}
								{new Date(status.updated_at).toLocaleTimeString("en-US", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						</DetailRow>

						{status.deleted_at && (
							<DetailRow label="Deleted At">
								<p className="text-sm text-destructive">
									{formatDate(status.deleted_at)}

									{" at "}
									{new Date(status.deleted_at).toLocaleTimeString("en-US", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</p>
							</DetailRow>
						)}

						<DetailRow label="Created By">
							<p className="text-sm">
								{status.created_by ? `User #${status.created_by}` : "System"}
							</p>
						</DetailRow>

						<DetailRow label="Updated By">
							<p className="text-sm">
								{status.updated_by ? `User #${status.updated_by}` : "System"}
							</p>
						</DetailRow>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
