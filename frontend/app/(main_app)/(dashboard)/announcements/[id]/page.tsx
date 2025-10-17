"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ANNOUNCEMENTS_API } from "@/lib/api/announcements.utils";
import { IAnnouncement } from "@/types/announcements.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import FixedLoader from "@/components/fixed-loader";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export default function AnnouncementDetailsPage() {
	const router = useRouter();
	const { id } = useParams();
	const announcementId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [announcement, setAnnouncement] = useState<IAnnouncement | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !announcementId) return;

		const fetchAnnouncement = async () => {
			try {
				setLoading(true);
				const data = await ANNOUNCEMENTS_API.getById({ id: announcementId });
				setAnnouncement(data);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch announcement" });
				router.push("/announcements");
			} finally {
				setLoading(false);
			}
		};

		fetchAnnouncement();
	}, [currentInstitution, announcementId, router]);

	const handleDelete = async () => {
		if (!announcement) return;
		try {
			setDeleting(true);
			await ANNOUNCEMENTS_API.delete({ id: announcement.id });
			showSuccessToast("Notice submitted for deletion approval!");
			router.push("/announcements");
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete notice" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
		}
	};

	if (loading) return <FixedLoader />;

	if (!announcement) {
		return (
			<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
				<div className="text-center py-12">
					<p className="text-muted-foreground mb-4">Notice not found</p>
					<Link href="/announcements">
						<Button variant="outline" className="rounded-xl">
							Back to Notices
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	const targetsCount =
		announcement.target_employees.length +
		announcement.target_departments.length +
		announcement.target_job_positions.length;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href="/announcements">
						<Button variant="outline" className="rounded-full aspect-square h-10 w-10">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl lg:text-2xlfont-semibold max-w-full text-wrap">
						{announcement.title}
					</h1>
				</div>
				<div className="flex justify-start items-start  lg:items-center gap-2">
					<Button
						variant="outline"
						className="rounded-xl"
						onClick={() => router.push(`/announcements/${announcement.id}/edit`)}
					>
						<Edit className="h-4 w-4 mr-2" />
						Edit
					</Button>
					<Button
						variant="destructive"
						className="rounded-xl"
						onClick={() => setDeleteConfirmOpen(true)}
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete
					</Button>
				</div>
			</div>

			<div className="">
				<div className="space-y-4">
					<div className="bg-white  border-gray-200 shadow-sm p-6">
						<h2 className="text-lg font-medium mb-4">Details</h2>
						<div className="space-y-3 text-sm text-gray-600">
							<div className="flex justify-between lg:justify-start gap-6">
								<span>Requires Acknowledgment</span>
								<Badge variant={announcement.requires_acknowledgment ? "default" : "secondary"}>
									{announcement.requires_acknowledgment ? "Yes" : "No"}
								</Badge>
							</div>
							<div className="flex justify-between lg:justify-start gap-6">
								<span>Created</span>
								<span className="font-medium">{announcement.created_at?.split("T")[0]}</span>
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-4">
					<div className="bg-white border-gray-200 shadow-sm p-6">
						<h2 className="text-lg font-medium mb-4">Content</h2>
						<p className="text-sm text-gray-600 whitespace-pre-wrap">
							{announcement.content || "No content"}
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="bg-white border-gray-200 shadow-sm p-6">
						<h2 className="text-lg font-medium mb-4">
							Targets ({announcement.target_employees.length})
						</h2>
						<div className="space-y-3">
							{announcement.target_employees_details.length && (
								<div>
									<h3 className="text-sm font-medium text-gray-600 mb-2">Employees</h3>
									<div className="flex flex-wrap gap-2">
										{announcement.target_employees_details.map((employee, idx) => (
											<Badge key={employee?.id || idx} variant="secondary" className="text-xs">
												{employee.name}
											</Badge>
										))}
									</div>
								</div>
							)}
							{announcement.target_departments.length > 0 && (
								<div>
									<h3 className="text-sm font-medium text-gray-600 mb-2">Departments</h3>
									<div className="flex flex-wrap gap-2">
										{announcement.target_departments.map((department, idx) => (
											<Badge key={department?.id || idx} variant="secondary" className="text-xs">
												{department.name}
											</Badge>
										))}
									</div>
								</div>
							)}
							{announcement.target_job_positions.length > 0 && (
								<div>
									<h3 className="text-sm font-medium text-gray-600 mb-2">Job Positions</h3>
									<div className="flex flex-wrap gap-2">
										{announcement.target_job_positions.map((position, idx) => (
											<Badge key={position?.id || idx} variant="secondary" className="text-xs">
												{position.title}
											</Badge>
										))}
									</div>
								</div>
							)}
							{targetsCount === 0 && <p className="text-sm text-gray-600">No targets assigned</p>}
						</div>
					</div>
				</div>
			</div>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title={`Delete ${announcement.title}`}
				description="Are you sure you want to delete this announcement? This action will submit it for approval and cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
