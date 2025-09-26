"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Edit, ArrowLeft, Upload, FileText } from "lucide-react";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import {
	Ticket,
	TicketCommentFormData,
	TICKET_STATUS_LABELS,
	TICKET_PRIORITY_LABELS,
} from "@/types/help-desk.types";
import { TICKET_API, TICKET_COMMENT_API, TICKET_ATTACHMENT_API } from "@/lib/api/help-desk.utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import FixedLoader from "@/components/fixed-loader";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function TicketDetailsPage() {
	const router = useRouter();
	const { id } = useParams();
	const ticketId = Number(id);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const [ticket, setTicket] = useState<Ticket | null>(null);
	const [loading, setLoading] = useState(true);
	const [newComment, setNewComment] = useState("");
	const [addingComment, setAddingComment] = useState(false);
	const [editCommentId, setEditCommentId] = useState<number | null>(null);
	const [editCommentText, setEditCommentText] = useState("");
	const [addingAttachment, setAddingAttachment] = useState(false);

	const fetchTicket = async () => {
		try {
			setLoading(true);
			const response = await TICKET_API.getById({ ticketId });
			setTicket(response);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to fetch ticket" });
			router.push("/help-desk/tickets");
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		if (!currentInstitution || !ticketId) return;

		fetchTicket();
	}, [currentInstitution, ticketId, router]);

	const handleAddComment = async () => {
		if (!newComment.trim()) {
			showErrorToast({ error: null, defaultMessage: "Comment cannot be empty" });
			return;
		}
		try {
			setAddingComment(true);
			await TICKET_COMMENT_API.create({
				data: { ticket: ticketId, comment: newComment },
			});
			setNewComment("");
			showSuccessToast("Comment added successfully!");
			// Refresh ticket data
			const response = await TICKET_API.getById({ ticketId });
			setTicket(response);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to add comment" });
		} finally {
			setAddingComment(false);
		}
	};

	const handleEditComment = async (commentId: number) => {
		if (!editCommentText.trim()) {
			showErrorToast({ error: null, defaultMessage: "Comment cannot be empty" });
			return;
		}
		try {
			setAddingComment(true);
			await TICKET_COMMENT_API.update({
				commentId,
				data: { comment: editCommentText },
			});
			setEditCommentId(null);
			setEditCommentText("");
			showSuccessToast("Comment updated successfully!");
			// Refresh ticket data
			const response = await TICKET_API.getById({ ticketId });
			setTicket(response);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to update comment" });
		} finally {
			setAddingComment(false);
		}
	};

	const handleAddAttachments = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;
		try {
			setAddingAttachment(true);
			const formData = new FormData();
			files.forEach((file, index) => {
				formData.append(`file[${index}]`, file);
			});
			formData.append("ticket", ticketId.toString());
			await TICKET_ATTACHMENT_API.create({ data: formData });
			showSuccessToast("Attachment(s) added successfully!");
			// Refresh ticket data
			const response = await TICKET_API.getById({ ticketId });
			setTicket(response);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to add attachment(s)" });
		} finally {
			setAddingAttachment(false);
		}
	};

	if (loading || !ticket) return <FixedLoader />;

	return (
		<ApprovableInstancePageLayout instance={ticket} onInstanceRefresh={fetchTicket}>
			<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
				<div className="flex justify-between items-center">
					<div className="flex items-center justify-start gap-8 max-w-6xl">
						<Link href="/help-desk/tickets">
							<Button variant="outline" className="rounded-full aspect-square">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
							Ticket: {ticket.title}
						</h1>
					</div>
					<div className="flex items-center gap-4">
						<Link href={`/help-desk/tickets/${ticketId}/edit`}>
							<Button variant="outline" className="rounded-xl">
								<Edit className="h-4 w-4 mr-2" /> Edit Ticket
							</Button>
						</Link>
					</div>
				</div>

				<div className="space-y-6 max-w-6xl">
					{/* Ticket Details */}
					<div className="space-y-4 p-4 bg-gray-50">
						<div>
							<Label className="text-sm font-medium">Title</Label>
							<p className="text-sm">{ticket.title}</p>
						</div>
						<div>
							<Label className="text-sm font-medium">Category</Label>
							<p className="text-sm">{ticket.category?.name || "Unknown"}</p>
						</div>
						<div>
							<Label className="text-sm font-medium">Status</Label>
							<Badge
								variant={
									ticket.status === "OPEN"
										? "default"
										: ticket.status === "IN_PROGRESS"
											? "secondary"
											: "outline"
								}
							>
								{TICKET_STATUS_LABELS[ticket.status]}
							</Badge>
						</div>
						<div>
							<Label className="text-sm font-medium">Priority</Label>
							<Badge
								variant={
									ticket.priority === "HIGH"
										? "destructive"
										: ticket.priority === "MEDIUM"
											? "default"
											: "outline"
								}
							>
								{TICKET_PRIORITY_LABELS[ticket.priority]}
							</Badge>
						</div>
						<div>
							<Label className="text-sm font-medium">Assigned To</Label>
							<p className="text-sm">{ticket.assigned_to?.user?.fullname || "Unknown"}</p>
						</div>
					</div>

					{/* Comments Section */}
					<div className="space-y-4 max-w-6xl">
						<Label className="text-sm font-medium">Comments</Label>
						<div className="space-y-4 max-h-96 overflow-y-auto">
							{ticket.comments.length > 0 ? (
								ticket.comments.map((comment) => (
									<div
										key={comment.id}
										className={`flex ${comment.created_by === currentUser?.id ? "justify-end" : "justify-start"}`}
									>
										<div
											className={`max-w-[70%] p-3 rounded-xl ${
												comment.created_by === currentUser?.id
													? "bg-orange-100 text-right"
													: "bg-gray-100 text-left"
											}`}
										>
											{editCommentId === comment.id ? (
												<div className="relative">
													<Textarea
														value={editCommentText}
														onChange={(e) => setEditCommentText(e.target.value)}
														className="rounded-2xl pr-10"
														rows={3}
													/>
													<Button
														variant="outline"
														className="rounded-xl absolute right-2 bottom-2 h-8 w-8 p-0"
														onClick={() => handleEditComment(comment.id)}
														disabled={addingComment}
													>
														<Send className="h-4 w-4" />
													</Button>
												</div>
											) : (
												<>
													<p className="text-sm">{comment.comment}</p>
													<p className="text-xs text-muted-foreground mt-1">
														{format(new Date(comment.created_at), "PPp")}{" "}
														{comment.created_by === currentUser?.id ? "(You)" : ""}
													</p>
													{comment.created_by === currentUser?.id && (
														<Button
															variant="ghost"
															size="sm"
															className="mt-1 p-0 h-6 text-blue-600"
															onClick={() => {
																setEditCommentId(comment.id);
																setEditCommentText(comment.comment);
															}}
														>
															<Edit className="h-4 w-4" />
														</Button>
													)}
												</>
											)}
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground">No comments yet</p>
							)}
						</div>
						<div className="relative">
							<Textarea
								placeholder="Add a comment..."
								value={newComment}
								onChange={(e) => setNewComment(e.target.value)}
								className="rounded-2xl pr-10"
								rows={3}
							/>
							<Button
								variant="outline"
								className="rounded-xl absolute right-2 bottom-2 h-8 w-8 p-0"
								onClick={handleAddComment}
								disabled={addingComment}
							>
								<Send className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Attachments Section */}
					<div className="space-y-4 max-w-6xl">
						<Label className="text-sm font-medium">Attachments</Label>
						{ticket.attachments.length > 0 ? (
							<div className="space-y-2">
								{ticket.attachments.map((attachment) => (
									<div
										key={attachment.id}
										className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl"
									>
										<FileText className="h-3 w-3" />
										<a
											href={attachment.file}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm text-blue-600 hover:underline flex-1 truncate"
										>
											{attachment.file.split("/").pop()}
										</a>
										<p className="text-xs text-muted-foreground">
											{format(new Date(attachment.created_at), "PPp")}
										</p>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No attachments</p>
						)}
						<div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center cursor-pointer hover:border-gray-400 transition-colors duration-200">
							<input
								id="attachments-upload"
								type="file"
								multiple
								onChange={handleAddAttachments}
								className="sr-only"
								disabled={addingAttachment}
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
						</div>
					</div>
				</div>
			</div>
		</ApprovableInstancePageLayout>
	);
}
