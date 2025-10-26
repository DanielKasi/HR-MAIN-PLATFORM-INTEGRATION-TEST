"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Users,
	Shield,
	Calendar,
	Edit,
	Trash2,
	Loader2,
	AlertCircle,
} from "lucide-react";
import { Button } from "@/platform/v1/components";
import { Badge } from "@/platform/v1/components";
import { Separator } from "@/platform/v1/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/v1/components";
import { Alert, AlertDescription } from "@/platform/v1/components";
import { USER_GROUPS_API } from "@/lib/api/approvals/utils";
import { IUserGroup } from "@/types/approvals.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { format } from "date-fns";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

export default function UserGroupViewPage() {
	const params = useParams();
	const router = useModuleNavigation();
	const groupId = Number(params.id);

	const [group, setGroup] = useState<IUserGroup | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	useEffect(() => {
		fetchGroup();
	}, [groupId]);

	const fetchGroup = async () => {
		try {
			setLoading(true);
			const data = await USER_GROUPS_API.fetchById({ id: groupId });
			setGroup(data);
		} catch (error: any) {
			showErrorToast({
				error,
				defaultMessage: "Failed to load user group",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleEdit = () => {
		router.push(`/admin/settings/user-groups/${groupId}/edit`);
	};

	const handleDeleteClick = () => {
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		try {
			setDeleting(true);
			await USER_GROUPS_API.delete({ id: groupId });
			showSuccessToast("User group deleted successfully!");
			router.push("/admin/settings/user-groups");
		} catch (error: any) {
			showErrorToast({
				error,
				defaultMessage: "Failed to delete user group",
			});
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
		}
	};

	const cancelDelete = () => {
		setDeleteConfirmOpen(false);
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			under_creation: {
				label: "Under Creation",
				variant: "secondary" as const,
			},
			pending: { label: "Pending", variant: "default" as const },
			approved: { label: "Approved", variant: "default" as const },
			rejected: {
				label: "destructive" as const,
				variant: "destructive" as const,
			},
		};

		const config = statusConfig[status as keyof typeof statusConfig] || {
			label: status,
			variant: "secondary" as const,
		};

		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!group) {
		return (
			<div className="p-6">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>User group not found</AlertDescription>
				</Alert>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => router.push("/admin/settings/user-groups")}
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to User Groups
				</Button>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6 bg-white rounded-xl">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							className="rounded-full aspect-square"
							variant="outline"
							onClick={() => router.push("/admin/settings/user-groups")}
						>
							<ArrowLeft />
						</Button>
						<div className="ml-4">
							<div className="flex items-center gap-3">
								<h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
								{getStatusBadge(group.approval_status)}
							</div>
							{group.description && (
								<p className="text-muted-foreground mt-1">{group.description}</p>
							)}
						</div>
					</div>
				</div>
			</div>

			<Separator />

			{/* Details Grid */}
			<div className="grid md:grid-cols-2 gap-6">
				{/* Users Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5 text-blue-600" />
							Users
							<Badge variant="secondary" className="ml-auto">
								{group.users.length}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{group.users.length > 0 ? (
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground">
									{group.users.length} user{group.users.length !== 1 ? "s" : ""} assigned to this
									group
								</p>
								{group.users_detail && group.users_detail.length > 0 && (
									<div className="p-3 bg-muted/50 rounded-lg">
										<p className="text-xs font-medium mb-1">User Details:</p>
										<div className="space-y-1">
											{group.users_detail.map((user, idx) => (
												<p key={idx} className="text-sm">
													{user.fullname} ({user.email})
												</p>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No users assigned to this group</p>
						)}
					</CardContent>
				</Card>

				{/* Roles Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-orange-600" />
							Roles
							<Badge variant="secondary" className="ml-auto">
								{group.roles.length}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{group.roles.length > 0 ? (
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground">
									{group.roles.length} role{group.roles.length !== 1 ? "s" : ""} assigned to this
									group
								</p>
								{group.roles_detail && group.roles_detail.length > 0 && (
									<div className="p-3 bg-muted/50 rounded-lg">
										<p className="text-xs font-medium mb-1">Role Details:</p>
										<div className="space-y-1">
											{group.roles_detail.map((role, idx) => (
												<p key={idx} className="text-sm">
													{role.name}
												</p>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No roles assigned to this group</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Metadata Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Metadata
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid md:grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-muted-foreground mb-1">Created At</p>
							<p className="font-medium">{format(new Date(group.created_at), "PPP p")}</p>
						</div>
						<div>
							<p className="text-muted-foreground mb-1">Updated At</p>
							<p className="font-medium">{format(new Date(group.updated_at), "PPP p")}</p>
						</div>
						<div>
							<p className="text-muted-foreground mb-1">Active Status</p>
							<Badge variant={group.is_active ? "default" : "secondary"}>
								{group.is_active ? "Active" : "Inactive"}
							</Badge>
						</div>
						{group.created_by && (
							<div>
								<p className="text-muted-foreground mb-1">Created By</p>
								<p className="font-medium">User ID: {group.created_by}</p>
							</div>
						)}
						{group.updated_by && (
							<div>
								<p className="text-muted-foreground mb-1">Updated By</p>
								<p className="font-medium">User ID: {group.updated_by}</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Approvals Section */}
			{group.approvals && (
				<Card>
					<CardHeader>
						<CardTitle>Approvals</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm">{group.approvals}</p>
					</CardContent>
				</Card>
			)}

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDelete}
				onConfirm={confirmDelete}
				title="Delete User Group"
				description={`Are you sure you want to delete "${group.name}"? This action cannot be undone and may affect existing approval workflows.`}
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
