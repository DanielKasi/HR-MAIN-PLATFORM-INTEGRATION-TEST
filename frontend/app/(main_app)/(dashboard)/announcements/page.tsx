"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useInView } from "react-intersection-observer";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Search, Plus } from "lucide-react";
import { ANNOUNCEMENTS_API } from "@/lib/api/announcements.utils";
import { IAnnouncement } from "@/types/announcements.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardSkeleton from "@/components/common/skeletons/card-skeleton";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";

export default function AnnouncementListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();
	const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [announcementToDelete, setAnnouncementToDelete] = useState<IAnnouncement | null>(null);
	const [deleting, setDeleting] = useState(false);
	const { ref, inView } = useInView();

	const fetchAnnouncements = useCallback(async () => {
		if (!currentInstitution || loading || !hasMore) return;
		try {
			setLoading(true);
			const response = await ANNOUNCEMENTS_API.getPaginated({
				page,
				search: searchTerm || undefined,
				ordering,
			});
			setAnnouncements((prev) => (page === 1 ? response.results : [...prev, ...response.results]));
			setHasMore(!!response.next);
			setPage((prev) => prev + 1);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to fetch announcements" });
		} finally {
			setLoading(false);
		}
	}, [currentInstitution, page, searchTerm, ordering, loading, hasMore]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setPage(1);
			setAnnouncements([]);
			setHasMore(true);
			fetchAnnouncements();
		}, 1000);

		return () => clearTimeout(timeout);
	}, [currentInstitution, searchTerm, ordering]);

	useEffect(() => {
		if (inView && hasMore && !loading) {
			fetchAnnouncements();
		}
	}, [inView, fetchAnnouncements, hasMore, loading]);

	const handleDelete = async () => {
		if (!announcementToDelete) return;
		try {
			setDeleting(true);
			await ANNOUNCEMENTS_API.delete({ id: announcementToDelete.id });
			showSuccessToast("Notice deleted successfully !");
			setAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementToDelete.id));
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete announcement" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setAnnouncementToDelete(null);
		}
	};

	const openEdit = (announcement: IAnnouncement) => {
		router.push(`/announcements/${announcement.id}/edit`);
	};

	const openDetails = (announcement: IAnnouncement) => {
		router.push(`/announcements/${announcement.id}`);
	};

	const filteredAnnouncements = useMemo(() => {
		return announcements;
	}, [announcements]);

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Notices</h1>
				<div className="flex items-center justify-end gap-4">
					<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_ANNOUNCEMENTS}>
						<Button onClick={() => router.push("/announcements/create")} className="rounded-xl">
							<Plus className="h-4 w-4 mr-2" />
							Create Notice
						</Button>
					</ProtectedComponent>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search announcements..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				<div className="flex items-center gap-2">
					<Button
						onClick={() => {
							if (ordering === "title") {
								setOrdering("-title");
							} else if (ordering === "-title") {
								setOrdering("");
							} else {
								setOrdering("title");
							}
						}}
						size="sm"
						variant={ordering.includes("title") ? "default" : "outline"}
						type="button"
					>
						{ordering === "title" ? (
							<Icon icon="mdi:sort-ascending" className="!h-4 !w-4" />
						) : ordering === "-title" ? (
							<Icon icon="mdi:sort-descending" className="!h-4 !w-4" />
						) : (
							<Icon icon="mdi:sort" className="!h-4 !w-4" />
						)}
						<span className="ml-2">Title</span>
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{loading && announcements.length === 0
					? Array.from({ length: 6 }).map((_, i) => (
							<CardSkeleton key={i} lines={2} avatarCount={3} showBadge={true} />
						))
					: filteredAnnouncements.map((announcement) => {
							const targetsCount =
								announcement.target_employees.length +
								announcement.target_departments.length +
								announcement.target_job_positions.length;

							return (
								<div
									key={announcement.id}
									className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
								>
									<div className="flex items-start justify-between">
										<h2 className="text-lg font-semibold capitalize truncate">
											{announcement.title}
										</h2>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" className="h-8 w-8 p-0">
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem className="p-0">
													<Link
														className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
														href={`/announcements/${announcement.id}/`}
													>
														<Eye className="h-4 w-4 mr-2" /> View Details
													</Link>
												</DropdownMenuItem>
												<ProtectedComponent
													permissionCode={PERMISSION_CODES.CAN_EDIT_ANNOUNCEMENTS}
												>
													<DropdownMenuItem className="p-0">
														<Link
															className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
															href={`/announcements/${announcement.id}/edit`}
														>
															<Edit className="h-4 w-4 mr-2" /> Edit
														</Link>
													</DropdownMenuItem>
												</ProtectedComponent>
												<ProtectedComponent
													permissionCode={PERMISSION_CODES.CAN_DELETE_ANNOUNCEMENTS}
												>
													<DropdownMenuItem
														onClick={() => {
															setAnnouncementToDelete(announcement);
															setDeleteConfirmOpen(true);
														}}
														className="text-red-600 p-0"
													>
														<span className="text-red-600 hover:text-red-700 text-xs w-full h-full px-2 py-1.5 flex items-center">
															<Trash2 className="h-4 w-4 mr-2" /> Delete
														</span>
													</DropdownMenuItem>
												</ProtectedComponent>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>

									<Badge
										variant={announcement.requires_acknowledgment ? "default" : "secondary"}
										className="capitalize"
									>
										{announcement.requires_acknowledgment
											? "Requires Acknowledgment"
											: "No Acknowledgment"}
									</Badge>

									<div className="space-y-2">
										<div className="text-sm text-gray-600">
											{announcement.content?.substring(0, 100) +
												(announcement.content && announcement.content.length > 100 ? "..." : "") ||
												"No content"}
										</div>
									</div>

									<div className="space-y-1 text-sm text-gray-600">
										<div className="flex justify-between">
											<span>Type</span>
											<span className="font-medium capitalize">
												{announcement.content_type_name || "N/A"}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Created</span>
											<span className="font-medium">{announcement.created_at?.split("T")[0]}</span>
										</div>
									</div>

									<div className="flex justify-between pt-4 border-t border-gray-200">
										<div className="flex items-center gap-2 text-sm text-gray-600">
											<div className="flex -space-x-1">
												{Array.from({ length: Math.min(3, targetsCount) }).map((_, i) => (
													<div
														key={i}
														className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white"
													/>
												))}
											</div>
											<span>{targetsCount} target(s)</span>
										</div>
										<div className="text-sm text-gray-600">
											{announcement.target_employees.length} employees
										</div>
									</div>
								</div>
							);
						})}
				{filteredAnnouncements.length === 0 && !loading && (
					<div className="col-span-full text-center py-12">
						<p className="text-muted-foreground mb-4">No announcements found</p>
					</div>
				)}
				{hasMore && (
					<div ref={ref} className="col-span-full flex justify-center py-4 min-h-[1px]">
						{loading && (
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
						)}
					</div>
				)}
			</div>

			{announcementToDelete && (
				<ConfirmationDialog
					isOpen={deleteConfirmOpen}
					onClose={() => {
						setDeleteConfirmOpen(false);
						setAnnouncementToDelete(null);
					}}
					onConfirm={handleDelete}
					title={`Delete ${announcementToDelete.title}`}
					description="Are you sure you want to delete this announcement? This action will submit it for approval and cannot be undone."
					confirmText="Delete"
					cancelText="Cancel"
					disabled={deleting}
				/>
			)}
		</div>
	);
}
