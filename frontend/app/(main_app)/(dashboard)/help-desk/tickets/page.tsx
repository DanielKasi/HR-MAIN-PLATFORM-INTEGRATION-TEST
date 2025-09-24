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
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { TICKET_API } from "@/lib/api/help-desk.utils";
import { Ticket, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/types/help-desk.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import FixedLoader from "@/components/fixed-loader";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function TicketsPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");

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
						<DropdownMenuItem asChild>
							<Link href={`/help-desk/tickets/${ticket.id}`}>
								<Eye className="h-4 w-4 mr-2" /> View Details
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link href={`/help-desk/tickets/${ticket.id}/edit`}>
								<Edit className="h-4 w-4 mr-2" /> Edit
							</Link>
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

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Tickets</h1>
				<div className="flex items-center justify-end gap-4">
					<Link href={"/help-desk/ticket-categories"}>
						<Button variant="outline" className="rounded-xl">
							Categories
						</Button>
					</Link>
					<Link href={"/help-desk/tickets/create"}>
						<Button className="rounded-xl">
							<Plus className="h-4 w-4 mr-2" /> Create Ticket
						</Button>
					</Link>
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
