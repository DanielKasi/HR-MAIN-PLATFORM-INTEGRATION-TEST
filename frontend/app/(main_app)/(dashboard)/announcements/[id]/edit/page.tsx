"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ANNOUNCEMENTS_API } from "@/lib/api/announcements.utils";
import { IAnnouncementFormData } from "@/types/announcements.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useSelector } from "react-redux";
import Link from "next/link";
import FixedLoader from "@/components/fixed-loader";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ContextSelector } from "@/components/employee-allowances/context-selector";
import type { ContextItem, ContextType } from "@/types/types.utils";
import ContentTypeSearchableSelect from "@/components/selects/content-type-searchable-select";

export default function AnnouncementEditPage() {
	const router = useRouter();
	const params = useParams();
	const announcementId = Number(params.id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IAnnouncementFormData>({
		title: "",
		content: "",
		requires_acknowledgment: true,
		target_employees: [],
		target_departments: [],
		target_job_positions: [],
		announcement_type: undefined,
	});
	const [selectedContext, setSelectedContext] = useState<ContextType | "">("");
	const [selectedContextItems, setSelectedContextItems] = useState<ContextItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!currentInstitution || !announcementId) return;
		fetchAnnouncement();
	}, [currentInstitution, announcementId]);

	const fetchAnnouncement = async () => {
		try {
			setLoading(true);
			const announcement = await ANNOUNCEMENTS_API.getById({ id: announcementId });
			setFormData({
				title: announcement.title,
				content: announcement.content,
				requires_acknowledgment: announcement.requires_acknowledgment,
				target_employees: announcement.target_employees_details.map((e) => e.id),
				target_departments: announcement.target_departments.map((d) => d.id),
				target_job_positions: announcement.target_job_positions.map((j) => j.id),
				announcement_type: announcement.announcement_type,
			});

			let context: ContextType | "" = "";
			let items: ContextItem[] = [];

			if (announcement.target_employees.length > 0) {
				context = "employee";
				items = announcement.target_employees_details.map((e) => ({ id: e.id, name: e.name }));
			} else if (announcement.target_departments.length > 0) {
				context = "department";
				items = announcement.target_departments.map((d) => ({ id: d.id, name: d.name }));
			} else if (announcement.target_job_positions.length > 0) {
				context = "job_position";
				items = announcement.target_job_positions.map((j) => ({ id: j.id, name: j.title }));
			}

			setSelectedContext(context);
			setSelectedContextItems(items);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to fetch announcement" });
			router.push("/announcements");
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.title.trim()) {
			showErrorToast({ error: null, defaultMessage: "Title is required" });
			return;
		}
		if (selectedContextItems.length === 0) {
			showErrorToast({ error: null, defaultMessage: "At least one target is required" });
			return;
		}

		const dataToSend: Partial<IAnnouncementFormData> = {
			...formData,
			target_employees:
				selectedContext === "employee"
					? selectedContextItems.map((item) => item.id)
					: formData.target_employees,
			target_departments:
				selectedContext === "department"
					? selectedContextItems.map((item) => item.id)
					: formData.target_departments,
			target_job_positions:
				selectedContext === "job_position"
					? selectedContextItems.map((item) => item.id)
					: formData.target_job_positions,
		};

		try {
			setSaving(true);
			await ANNOUNCEMENTS_API.update({ id: announcementId, data: dataToSend });
			showSuccessToast("Announcement updated successfully!");
			router.push(`/announcements/${announcementId}`);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to update announcement" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href={`/announcements/${announcementId}`}>
						<Button variant="outline" className="rounded-full aspect-square h-10 w-10">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">Edit Announcement</h1>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
					<div className="space-y-2">
						<Label>Title *</Label>
						<Input
							placeholder="e.g., Company Update"
							value={formData.title}
							onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
							className="rounded-2xl"
						/>
					</div>
					<div className="space-y-2">
						<Label>Announcement Type (Optional)</Label>
						<ContentTypeSearchableSelect
							value={[formData.announcement_type?.toString() || ""]}
							onValueChange={(values) => {
								if (values.length) {
									setFormData((prev) => ({ ...prev, announcement_type: Number(values[0]) }));
								}
							}}
							multiple={false}
						/>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
					<div className="space-y-2">
						<Label>Content *</Label>
						<Textarea
							placeholder="Announcement details..."
							value={formData.content}
							onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
							className="rounded-2xl"
							rows={6}
						/>
					</div>

					<div className="space-y-2 flex items-end justify-start gap-8 py-4 pt-4 md:pt-8">
						<Switch
							checked={formData.requires_acknowledgment}
							onCheckedChange={(checked) =>
								setFormData((prev) => ({ ...prev, requires_acknowledgment: checked }))
							}
						/>
						<Label>Requires Acknowledgment</Label>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 ">
					<div className="space-y-2 col-span-1">
						<ContextSelector
							selectedContext={selectedContext}
							onContextChange={setSelectedContext}
							selectedItems={selectedContextItems}
							onItemsChange={setSelectedContextItems}
						/>
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						className="rounded-full w-full max-w-xs"
						onClick={() => router.push(`/announcements/${announcementId}`)}
					>
						Cancel
					</Button>
					<Button className="rounded-full w-full max-w-xs" onClick={handleUpdate} disabled={saving}>
						{saving ? "Updating..." : "Update Announcement"}
					</Button>
				</div>
			</div>
		</div>
	);
}
