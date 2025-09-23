"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, Upload, FileText, Plus } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	TicketFormData,
	TicketCategory,
	TicketStatus,
	TicketPriority,
	TICKET_STATUS_LABELS,
	TICKET_PRIORITY_LABELS,
} from "@/types/help-desk.types";
import { TICKET_API, TICKET_CATEGORIES_API } from "@/lib/api/help-desk.utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { TicketCategorySearchableSelect } from "../../categories/_components/ticke-category-searchable-select";
import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import TicketCategoryCreateEditDialog from "../../categories/_components/ticket-category-create-edit-dialog";
import Link from "next/link";
import FixedLoader from "@/components/fixed-loader";

export default function TicketEditPage() {
	const router = useRouter();
	const { id } = useParams();
	const ticketId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<TicketFormData>({
		title: "",
		status: TicketStatus.OPEN,
		priority: TicketPriority.MEDIUM,
		category_id: null,
		assigned_to_id: null,
		new_comments: [],
		new_attachments: [],
	});
	const [categories, setCategories] = useState<TicketCategory[]>([]);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!currentInstitution || !ticketId) return;
		const fetchTicket = async () => {
			try {
				setLoading(true);
				const ticket = await TICKET_API.getById({ ticketId });
				setFormData({
					title: ticket.title,
					status: ticket.status,
					priority: ticket.priority,
					category_id: ticket.category?.id || null,
					assigned_to_id: ticket.assigned_to?.id || null,
					new_comments: [],
					new_attachments: [],
				});
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch ticket" });
				router.push("/help-desk/tickets");
			} finally {
				setLoading(false);
			}
		};
		fetchTicket();
	}, [currentInstitution, ticketId, router]);

	useEffect(() => {
		if (!currentInstitution) return;
		const fetchCategories = async () => {
			try {
				setLoadingCategories(true);
				const response = await TICKET_CATEGORIES_API.getPaginated({});
				setCategories(response.results || []);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch ticket categories" });
			} finally {
				setLoadingCategories(false);
			}
		};
		fetchCategories();
	}, [currentInstitution]);

	const handleAddAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length > 0) {
			setFormData((prev) => ({
				...prev,
				new_attachments: [...(prev.new_attachments || []), ...files],
			}));
		}
	};

	const handleRemoveAttachment = (index: number) => {
		setFormData((prev) => ({
			...prev,
			new_attachments: (prev.new_attachments || []).filter((_, i) => i !== index),
		}));
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
		try {
			setSaving(true);
			const formDataToSend = new FormData();
			formDataToSend.append("title", formData.title);
			formDataToSend.append("status", formData.status);
			formDataToSend.append("priority", formData.priority);
			if (formData.category_id) {
				formDataToSend.append("category_id", formData.category_id.toString());
			}
			if (formData.assigned_to_id) {
				formDataToSend.append("assigned_to_id", formData.assigned_to_id.toString());
			}
			formData.new_comments?.forEach((comment, index) => {
				formDataToSend.append(`new_comments[${index}]`, comment);
			});
			formData.new_attachments?.forEach((file, index) => {
				formDataToSend.append(`new_attachments[${index}]`, file);
			});

			await TICKET_API.update({ ticketId, data: formDataToSend });
			showSuccessToast("Ticket updated successfully!");
			router.push(`/help-desk/tickets/${ticketId}`);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to update ticket" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <FixedLoader />;

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<div className="flex items-center justify-start gap-4">
					<Link href={`/help-desk/tickets/${ticketId}`}>
						<Button variant="outline" className="rounded-full aspect-square">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">Edit Ticket</h1>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1  md:grid-cols-2 gap-4 items-end">
					<div className="space-y-2">
						<Label>Title *</Label>
						<Input
							placeholder="Title"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
							className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Label>Category</Label>
							<Button
								variant="ghost"
								size="sm"
								className="p-0 h-6 w-6"
								onClick={() => setOpenCategoryDialog(true)}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<TicketCategorySearchableSelect
							value={formData.category_id ? [formData.category_id] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, category_id: values[0] ? Number(values[0]) : null })
							}
							placeholder="Select category..."
							disabled={loadingCategories}
							triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1  md:grid-cols-2 gap-4 items-end">
					<div className="space-y-2">
						<Label>Status</Label>
						<Select
							value={formData.status}
							onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}
						>
							<SelectTrigger className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base">
								<SelectValue placeholder="Select status..." />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Priority</Label>
						<Select
							value={formData.priority}
							onValueChange={(value) =>
								setFormData({ ...formData, priority: value as TicketPriority })
							}
						>
							<SelectTrigger className="h-10 sm:h-12 rounded-2xl text-sm sm:text-base">
								<SelectValue placeholder="Select priority..." />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Assigned To</Label>
					<UserProfileSearchableSelect
						value={formData.assigned_to_id ? [formData.assigned_to_id] : []}
						onValueChange={(values) =>
							setFormData({ ...formData, assigned_to_id: values[0] ? Number(values[0]) : null })
						}
						placeholder="Select employee..."
						triggerClassName="h-10 sm:h-12 rounded-2xl text-sm sm:text-base"
					/>
				</div>
				<div className="space-y-2 w-full lg:w-1/2">
					<Label>Attachments</Label>
					<div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center cursor-pointer hover:border-gray-400 transition-colors duration-200">
						<input
							id="attachments-upload"
							type="file"
							multiple
							onChange={handleAddAttachments}
							className="sr-only"
						/>
						<label
							htmlFor="attachments-upload"
							className="flex flex-col items-center cursor-pointer"
						>
							<Upload className="h-10 w-10 text-primary mb-2" />
							<span className="text-sm font-medium text-primary">
								Click to upload or drag and drop
							</span>
							<span className="text-xs text-gray-500">(Max. File size: 25 MB)</span>
						</label>
						{formData.new_attachments && formData.new_attachments?.length > 0 && (
							<div className="mt-2 space-y-2 w-full">
								{formData.new_attachments.map((file, index) => (
									<div key={index} className="flex items-center gap-2 text-sm text-gray-700">
										<FileText className="h-3 w-3" />
										<span className="flex-1 truncate">{file.name}</span>
										<Button
											variant="ghost"
											size="sm"
											className="p-0 h-6 w-6"
											onClick={() => handleRemoveAttachment(index)}
										>
											<Trash2 className="h-4 w-4 text-red-600" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<Button className="rounded-full w-full max-w-xs" onClick={handleUpdate} disabled={saving}>
						{saving ? "Updating..." : "Update Ticket"}
					</Button>
				</div>
			</div>

			<TicketCategoryCreateEditDialog
				open={openCategoryDialog}
				onOpenChange={setOpenCategoryDialog}
				selectedCategory={null}
				onSuccess={(createdCategoryId) => {
					if (createdCategoryId) {
						setFormData((prev) => ({ ...prev, category_id: createdCategoryId }));
					}
				}}
			/>
		</div>
	);
}
