"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	Ticket,
	TicketFormData,
	TicketCategory,
	TicketStatus,
	TicketPriority,
	TICKET_STATUS_LABELS,
	TICKET_PRIORITY_LABELS,
} from "@/types/help-desk.types";
import { TICKET_API, TICKET_CATEGORIES_API } from "@/lib/api/help-desk.utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { DialogSkeleton } from "@/components/dialogs/dialog-skeleton";
import { Label } from "@/components/ui/label";
import TicketCategoryCreateEditDialog from "../categories/_components/ticket-category-create-edit-dialog";
import TicketCategorySearchableSelect from "../categories/_components/ticke-category-searchable-select";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";

export interface TicketCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedTicket: Ticket | null;
	onSuccess: () => void;
}

export const TicketCreateEditDialog = ({
	open,
	onOpenChange,
	selectedTicket,
	onSuccess,
}: TicketCreateEditDialogProps) => {
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
	// const [categories, setCategories] = useState<TicketCategory[]>([]);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
	const [saving, setSaving] = useState(false);
	const [newComment, setNewComment] = useState("");
	const [newAttachment, setNewAttachment] = useState<File | null>(null);

	useEffect(() => {
		if (selectedTicket) {
			setFormData({
				title: selectedTicket.title,
				status: selectedTicket.status,
				priority: selectedTicket.priority,
				category_id: selectedTicket.category?.id || null,
				assigned_to_id: selectedTicket.assigned_to?.id || null,
				new_comments: [],
				new_attachments: [],
			});
		} else {
			setFormData({
				title: "",
				status: TicketStatus.OPEN,
				priority: TicketPriority.MEDIUM,
				category_id: null,
				assigned_to_id: null,
				new_comments: [],
				new_attachments: [],
			});
		}
		setNewComment("");
		setNewAttachment(null);
	}, [selectedTicket]);

	// useEffect(() => {
	//   if (!currentInstitution) return;
	//   const fetchCategories = async () => {
	//     try {
	//       setLoadingCategories(true);
	//       const response = await TICKET_CATEGORIES_API.getPaginated({});
	//       setCategories(response.results || []);
	//     } catch (err) {
	//       showErrorToast({ error: err, defaultMessage: "Failed to fetch ticket categories" });
	//     } finally {
	//       setLoadingCategories(false);
	//     }
	//   };
	//   fetchCategories();
	// }, [currentInstitution]);

	const handleAddComment = () => {
		if (newComment.trim()) {
			setFormData((prev) => ({
				...prev,
				new_comments: [...(prev.new_comments || []), newComment],
			}));
			setNewComment("");
		}
	};

	const handleRemoveComment = (index: number) => {
		setFormData((prev) => ({
			...prev,
			new_comments: (prev.new_comments || []).filter((_, i) => i !== index),
		}));
	};

	const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setFormData((prev) => ({
				...prev,
				new_attachments: [...(prev.new_attachments || []), file],
			}));
			setNewAttachment(null);
		}
	};

	const handleRemoveAttachment = (index: number) => {
		setFormData((prev) => ({
			...prev,
			new_attachments: (prev.new_attachments || []).filter((_, i) => i !== index),
		}));
	};

	const handleCreateOrUpdate = async () => {
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

			if (selectedTicket) {
				await TICKET_API.update({ ticketId: selectedTicket.id, data: formDataToSend });
				showSuccessToast("Ticket updated successfully!");
			} else {
				await TICKET_API.create({ data: formDataToSend });
				showSuccessToast("Ticket created successfully!");
			}
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to save ticket" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<DialogSkeleton
				isOpen={open}
				onConfirm={handleCreateOrUpdate}
				onClose={() => onOpenChange(false)}
				title={selectedTicket ? "Edit Ticket" : "Create Ticket"}
				confirmText={saving ? "Saving..." : "Save"}
			>
				<div className="space-y-2 pb-4">
					<div className="space-y-2">
						<Label>Title *</Label>
						<Input
							placeholder="Title"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Label>Category</Label>
							<Button
								variant="ghost"
								size="sm"
								className="rounded-xl"
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
							triggerClassName="h-10 sm:h-12 rounded-xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<Label>Status</Label>
						<Select
							value={formData.status}
							onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}
						>
							<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
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
							<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
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
					<div className="space-y-2">
						<Label>Assigned To</Label>
						<EmployeeSearchableSelect
							value={formData.assigned_to_id ? [formData.assigned_to_id] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, assigned_to_id: values[0] ? Number(values[0]) : null })
							}
							placeholder="Select employee..."
							triggerClassName="h-10 sm:h-12 rounded-xl text-sm sm:text-base"
						/>
					</div>
					<div className="space-y-2">
						<Label>New Comment</Label>
						<div className="flex items-center gap-2">
							<Textarea
								placeholder="Add a comment..."
								value={newComment}
								onChange={(e) => setNewComment(e.target.value)}
								className="rounded-2xl"
								rows={3}
							/>
							<Button variant="outline" className="rounded-xl" onClick={handleAddComment}>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						{formData.new_comments && formData.new_comments?.length > 0 && (
							<div className="space-y-2">
								{formData.new_comments.map((comment, index) => (
									<div key={index} className="flex items-center gap-2">
										<p className="text-sm flex-1">{comment}</p>
										<Button
											variant="ghost"
											size="sm"
											className="p-0 h-6 w-6"
											onClick={() => handleRemoveComment(index)}
										>
											<Trash2 className="h-4 w-4 text-red-600" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
					<div className="space-y-2">
						<Label>New Attachment</Label>
						<div className="flex items-center gap-2">
							<Input
								type="file"
								onChange={handleAddAttachment}
								className="h-10 sm:h-12 rounded-xl text-sm sm:text-base"
							/>
						</div>
						{formData.new_attachments && formData.new_attachments?.length > 0 && (
							<div className="space-y-2">
								{formData.new_attachments.map((file, index) => (
									<div key={index} className="flex items-center gap-2">
										<p className="text-sm flex-1">{file.name}</p>
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
			</DialogSkeleton>

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
		</>
	);
};

export default TicketCreateEditDialog;
