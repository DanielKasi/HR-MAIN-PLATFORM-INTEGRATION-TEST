"use client";

import type { ApprovalDocument, ContentTypeLite } from "@/types/approvals.types";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { showErrorToast } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { APPROVABLE_MODELS_API, APPROVAL_DOCUMENTS_API } from "@/lib/api/approvals/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { RefObject } from "react";

const actionsMapper: Array<{
	value: string;
	label: string;
}> = [
	{ value: "create", label: "Creation" },
	{ value: "edit", label: "Update" },
	{ value: "delete", label: "Deletion" },
];

export default function ApprovalsDocumentsPage() {
	const router = useRouter();
	const [models, setModels] = useState<ContentTypeLite[]>([]);
	const [error, setError] = useState<string>("");
	const [q, setQ] = useState<string>("");

	// dialog state
	const [open, setOpen] = useState(false);
	const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
	const [modelsDialogOpen, setModelsDialogOpen] = useState(false);
	const [modelsInputValue, setModelsInputValue] = useState("");
	const [documentToDelete, setDocumentToDelete] = useState<ApprovalDocument | null>(null);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const loadModels = async () => {
		try {
			const modelsRes = await APPROVABLE_MODELS_API.fetchAll();
			setModels(modelsRes || []);
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to load approvable models" });
			setError(e?.message || "Failed to load approvable models");
		}
	};

	useEffect(() => {
		loadModels();
	}, []);

	const onCreate = async () => {
		if (!selectedModelId) return;
		setOpen(false);
		setTimeout(
			() => router.push(`/admin/settings/approvals/create?content=${selectedModelId}`),
			1000,
		);
	};

	const handleDelete = async (id: number) => {
		if (!documentToDelete) return;
		await APPROVAL_DOCUMENTS_API.delete({ id });
		tableRefreshRef.current?.();
	};

	const getActionsDisplay = (actions: ApprovalDocument["actions"]) => {
		return actions.map((action, idx) => (
			<Badge variant={"info"} className="capitalize" key={idx}>
				{actionsMapper.find((mapped_action) => mapped_action.value === action.name)?.label ||
					action.name}
			</Badge>
		));
	};

	const columns: ColumnDef<ApprovalDocument>[] = [
		{
			key: "name",
			header: "Name",
			cell: (doc) => (
				<div className="flex items-center justify-start gap-4">
					{doc.content_type_name || " -"}
					{getActionsDisplay(doc.actions)}
				</div>
			),
		},
		{
			key: "description",
			header: "Description",
			cell: (doc) => <div className="truncate text-xs md:text-sm">{doc.description}</div>,
		},
		{
			key: "levels",
			header: "Number of Levels",
			cell: (doc) => <p className="text-center">{doc.levels?.length || 0}</p>,
		},
		{
			key: "actions",
			header: "Actions",
			cell: (doc) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="icon" variant="ghost" className="rounded-full">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="rounded-lg">
						<DropdownMenuItem asChild>
							<Link href={`/admin/settings/approvals/${doc.id}`}>View details</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link href={`/admin/settings/approvals/${doc.id}/edit/`}>Edit</Link>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setDocumentToDelete(doc)}>Delete</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	const hasFilters = !!q;

	return (
		<>
			<div className="p-4 space-y-4 bg-white rounded-xl">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-semibold capitalize">Configured Approval Workflows</h1>
					<div className="flex items-center justify-end gap-4">
						<Button
							onClick={() => router.push("/admin/settings/approvals/approver-groups/")}
							variant={"outline"}
							className="rounded-lg"
						>
							Approver Groups
						</Button>
						<Dialog open={open} onOpenChange={setOpen}>
							<DialogTrigger asChild>
								<Button className="rounded-lg">Create / Configure</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[520px] rounded-lg">
								<DialogHeader>
									<DialogTitle>Select Entities to configure</DialogTitle>
								</DialogHeader>
								<div className="space-y-3 py-2">
									<div className="text-xs text-gray-600">
										All resources that can bear approvals are listed.
									</div>

									<Popover open={modelsDialogOpen} onOpenChange={setModelsDialogOpen}>
										<PopoverTrigger asChild>
											<Button
												aria-expanded={open}
												className={"w-full justify-start gap-8 rounded-xl"}
												disabled={models.length === 0}
												role="combobox"
												variant="outline"
											>
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												{models.find((m) => m.id === selectedModelId)?.name ||
													"Select a resource that can bear an approval"}
											</Button>
										</PopoverTrigger>
										<PopoverContent className={"w-full p-0"}>
											<Command shouldFilter={false}>
												<CommandInput
													placeholder={"Select a resource that can bear an approval"}
													value={modelsInputValue}
													onValueChange={(value) => {
														setModelsInputValue(value);
														setSelectedModelId(null);
													}}
												/>

												<CommandEmpty>Nothing to configure</CommandEmpty>
												<CommandGroup>
													<CommandList>
														{models
															.filter((mod) =>
																mod.name.toLowerCase().includes(modelsInputValue.toLowerCase()),
															)
															.map((item) => {
																const isSelected =
																	models.find((m) => m.id === selectedModelId)?.id === item.id;

																return (
																	<CommandItem
																		key={item.id}
																		value={item.id.toString()}
																		onSelect={() => setSelectedModelId(item.id)}
																	>
																		{isSelected && (
																			<Check
																				className={`
                                    "mr-2 h-4 w-4 ${isSelected ? "opacity - 100" : "opacity - 0"}`}
																			/>
																		)}
																		{item.name}
																	</CommandItem>
																);
															})}
													</CommandList>
												</CommandGroup>
											</Command>
										</PopoverContent>
									</Popover>
								</div>
								<DialogFooter className="flex items-center">
									<Button
										className="rounded-full w-full"
										onClick={onCreate}
										disabled={!selectedModelId}
									>
										{"Continue"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Input
						className="rounded-2xl w-full max-w-md"
						placeholder="Search..."
						value={q}
						onChange={(e) => setQ(e.target.value)}
					/>
				</div>

				{error && <div className="text-sm text-red-600">{error}</div>}

				{/* Paginated Table */}
				<PaginatedTable<ApprovalDocument>
					fetchFirstPage={async () => {
						return await APPROVAL_DOCUMENTS_API.fetchAll({
							search: q || undefined,
							page: 1,
						});
					}}
					fetchFromUrl={APPROVAL_DOCUMENTS_API.fetchPaginatedFromUrl}
					deps={[q]}
					query={q}
					onError={(err) => {
						console.error("Error fetching approval documents:", err);
						showErrorToast({ error: err, defaultMessage: "Failed to load approval documents" });
					}}
					className="space-y-4"
					tableClassName="min-w-[800px]"
					footerClassName="pt-4"
					columns={columns}
					skeletonRows={10}
					refreshRef={tableRefreshRef}
					emptyState={
						<div className="text-center py-12">
							<p className="text-muted-foreground mb-4">
								{hasFilters
									? "No approval documents found matching your search"
									: "No approval documents found. Create your first approval workflow to get started."}
							</p>
						</div>
					}
				/>
			</div>
			{documentToDelete && (
				<ConfirmationDialog
					description="Are you sure you want to delete this approval? This action cannot be undone."
					isOpen={!!documentToDelete}
					title={`Delete ${documentToDelete.content_type_name}`}
					onConfirm={() => handleDelete(documentToDelete.id)}
					onClose={() => {
						setDocumentToDelete(null);
					}}
				/>
			)}
		</>
	);
}
