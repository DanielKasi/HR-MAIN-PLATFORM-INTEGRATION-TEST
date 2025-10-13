"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ANNOUNCEMENTS_API } from "@/lib/api/announcements.utils";
import { IAnnouncement, IAnnouncementFormData } from "@/types/announcements.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useSelector } from "react-redux";
import Link from "next/link";
import FixedLoader from "@/components/fixed-loader";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ContextSelector } from "@/components/employee-allowances/context-selector";
import type { ContextItem, ContextType } from "@/types/types.utils";
import ContentTypeSearchableSelect from "@/components/selects/content-type-searchable-select";

export default function AnnouncementCreatePage() {
	const router = useRouter();
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
	// const [contentTypes, setContentTypes] = useState<ContentTypeLite[]>([]);
	// const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const handleCreate = async () => {
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

		const dataToSend: IAnnouncementFormData = {
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
			await ANNOUNCEMENTS_API.create({ data: dataToSend });
			showSuccessToast("Notice created successfully!");
			router.push(`/announcements`);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to create notice" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href={`/announcements`}>
						<Button variant="outline" className="rounded-full aspect-square h-10 w-10">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">Create Notice</h1>
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
						<Label>Notice Type (Optional)</Label>
						<ContentTypeSearchableSelect
							value={[formData.announcement_type || ""]}
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
							placeholder="Notice details..."
							value={formData.content}
							onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
							className="rounded-2xl"
							rows={6}
						/>
					</div>

					{/* <div className="space-y-2 flex items-end justify-start gap-8 py-4 pt-4 md:pt-8">
						<Switch
							checked={formData.requires_acknowledgment}
							onCheckedChange={(checked) =>
								setFormData((prev) => ({ ...prev, requires_acknowledgment: checked }))
							}
						/>
						<Label>Requires Acknowledgment</Label>
					</div> */}
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
					<Button className="rounded-full w-full max-w-xs" onClick={handleCreate} disabled={saving}>
						{saving ? "Creating..." : "Create Notice"}
					</Button>
				</div>
			</div>
		</div>
	);
}
