"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Plus, Search } from "lucide-react";
import { ColumnDef } from "@/components/common/tables/paginated-table";
import { PaginatedTable } from "@/components/common/tables/paginated-table";
import { TICKET_API } from "@/lib/api/help-desk.utils";
import { Ticket, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/types/help-desk.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import FixedLoader from "@/components/fixed-loader";
import { Icon } from "@iconify/react";
import TicketCreateEditDialog from "./_components/ticket-create-edit-dialog";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function TicketsPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");

	// Dialog states
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

	// Delete confirmation
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!currentInstitution) {
			setLoading(false);
			return;
		}
		setLoading(false);
	}, [currentInstitution]);

	const handleDelete = async () => {
		if (!ticketToDelete) return;

		try {
			setDeleting(true);
			await TICKET_API.delete({ ticketId: ticketToDelete.id });
			showSuccessToast("Ticket deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete ticket" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setTicketToDelete(null);
		}
	};

	const openEditDialog = (ticket: Ticket) => {
		setSelectedTicket(ticket);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (ticket: Ticket) => {
		setSelectedTicket(ticket);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<Ticket>[] = [
		{
			key: "title",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Title</span>
					<Button
						onClick={() => setOrdering((prev) => (prev === "title" ? "-title" : "title"))}
						size="sm"
						variant={ordering.includes("title") ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (ticket) => ticket.title,
		},
		{
			key: "category",
			header: "Category",
			cell: (ticket) => ticket.category?.name || "N/A",
		},
		{
			key: "status",
			header: "Status",
			cell: (ticket) => (
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
			),
		},
		{
			key: "priority",
			header: "Priority",
			cell: (ticket) => (
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
			),
		},
		{
			key: "assigned_to",
			header: "Assigned To",
			cell: (ticket) => ticket.assigned_to?.user?.fullname || "N/A",
		},
		{
			key: "actions",
			header: "Actions",
			cell: (ticket) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(ticket)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(ticket)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setTicketToDelete(ticket);
								setDeleteConfirmOpen(true);
							}}
							className="text-red-600"
						>
							<Trash2 className="h-4 w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	if (loading) return <FixedLoader />;

	const renderDetailsContent = (ticket: Ticket) => (
		<div className="space-y-4">
			<div>
				<Label className="text-sm font-medium">Title</Label>
				<Input
					value={ticket.title}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div>
				<Label className="text-sm font-medium">Category</Label>
				<Input
					value={ticket.category?.name || "N/A"}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div>
				<Label className="text-sm font-medium">Status</Label>
				<Input
					value={TICKET_STATUS_LABELS[ticket.status]}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div>
				<Label className="text-sm font-medium">Priority</Label>
				<Input
					value={TICKET_PRIORITY_LABELS[ticket.priority]}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div>
				<Label className="text-sm font-medium">Assigned To</Label>
				<Input
					value={ticket.assigned_to?.user?.fullname || "N/A"}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div>
				<Label className="text-sm font-medium">Comments</Label>
				{ticket.comments.length > 0 ? (
					<div className="space-y-2">
						{ticket.comments.map((comment) => (
							<div key={comment.id} className="border rounded-xl p-2 bg-gray-50">
								<p className="text-sm">{comment.comment}</p>
								<p className="text-xs text-muted-foreground">
									Created: {format(new Date(comment.created_at), "PPp")}
								</p>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">No comments</p>
				)}
			</div>
			<div>
				<Label className="text-sm font-medium">Attachments</Label>
				{ticket.attachments.length > 0 ? (
					<div className="space-y-2">
						{ticket.attachments.map((attachment) => (
							<div key={attachment.id} className="flex items-center gap-2">
								<a
									href={attachment.file}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-600 hover:underline"
								>
									{attachment.file.split("/").pop()}
								</a>
								<p className="text-xs text-muted-foreground">
									Created: {format(new Date(attachment.created_at), "PPp")}
								</p>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">No attachments</p>
				)}
			</div>
		</div>
	);

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Tickets</h1>
				<div className="flex items-center justify-end gap-4">
					<Link href={"/help-desk/tickets/categories"}>
						<Button variant="outline" className="rounded-xl">
							Categories
						</Button>
					</Link>
					<Button
						className="rounded-xl"
						onClick={() => {
							setSelectedTicket(null);
							setOpenCreateEditDialog(true);
						}}
					>
						<Plus className="h-4 w-4 mr-2" /> Create Ticket
					</Button>
					<TicketCreateEditDialog
						open={openCreateEditDialog}
						onOpenChange={(open) => {
							setOpenCreateEditDialog(open);
							if (!open) setSelectedTicket(null);
						}}
						selectedTicket={selectedTicket}
						onSuccess={() => {
							if (tableRefreshRef.current) tableRefreshRef.current();
						}}
					/>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search tickets..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<Ticket>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await TICKET_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
					});
				}}
				fetchFromUrl={TICKET_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) => showErrorToast({ error: err, defaultMessage: "Failed to fetch tickets" })}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No tickets found</p>
					</div>
				}
			/>

			{selectedTicket && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedTicket(null);
					}}
					title={`Ticket Details: ${selectedTicket.title}`}
					description="View the details for this ticket."
					approvals={selectedTicket.approvals}
					instanceApprovalStatus={selectedTicket.approval_status}
					onRefresh={() => tableRefreshRef.current?.()}
				>
					{renderDetailsContent(selectedTicket)}
				</ApprovableDialog>
			)}

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Ticket"
				description="Are you sure you want to delete this ticket? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
