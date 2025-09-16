"use client";

import type { ApprovalDocument, ContentTypeLite } from "@/types/approvals.types";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
	const [docs, setDocs] = useState<ApprovalDocument[]>([]);
	const [models, setModels] = useState<ContentTypeLite[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>("");
	const [q, setQ] = useState<string>("");

	// dialog state
	const [open, setOpen] = useState(false);
	const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
	const [modelsDialogOpen, setModelsDialogOpen] = useState(false);
	const [modelsInputValue, setModelsInputValue] = useState("");
	const [documentToDelete, setDocumentToDelete] = useState<ApprovalDocument | null>(null);

	const refresh = async () => {
		const [docsRes, modelsRes] = await Promise.all([
			APPROVAL_DOCUMENTS_API.fetchAll(),
			APPROVABLE_MODELS_API.fetchAll(),
		]);

		setDocs(docsRes?.results || []);
		setModels(modelsRes || []);
	};

	useEffect(() => {
		let mounted = true;

		loadData();

		return () => {
			mounted = false;
		};
	}, []);

	const loadData = async () => {
		try {
			setLoading(true);
			await refresh();
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to load approval records" });
			setError(e?.message || "Failed to load approval records");
		} finally {
			setLoading(false);
		}
	};

	const filteredDocs = useMemo(() => {
		if (!q) return docs;
		const s = q.toLowerCase();

		return docs.filter((d) =>
			[d.description || "", String(d.content_type_name)].some((v) => v.toLowerCase().includes(s)),
		);
	}, [docs, q]);

	filteredDocs.sort((a, b) => a.content_type_name.localeCompare(b.content_type_name));

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
		refresh();
	};

	return (
		<>
			<div className="p-4 space-y-4 bg-white rounded-xl">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-semibold capitalize">Objects Bearing approvals</h1>
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
									<DialogTitle>Select Objects to configure</DialogTitle>
								</DialogHeader>
								<div className="space-y-3 py-2">
									<div className="text-xs text-gray-600">
										Everything that can bear an approval is listed.
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
													"Select something that can bear an approval"}
											</Button>
										</PopoverTrigger>
										<PopoverContent className={"w-full p-0"}>
											<Command shouldFilter={false}>
												<CommandInput
													placeholder={"Select something that can bear an approval"}
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

				{loading && <div className="text-sm text-gray-600">Loading...</div>}
				{error && <div className="text-sm text-red-600">{error}</div>}

				<div className="rounded-lg overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="text-center min-w-[10rem]">Number of Levels</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredDocs.map((d) => (
								<TableRow key={d.id}>
									<TableCell>
										<div className="flex items-center justify-start gap-4">
											{d.content_type_name || " -"}
											{d.actions.map((action, idx) => (
												<Badge variant={"info"} className="capitalize" key={idx}>
													{actionsMapper.find(
														(mapped_action) => mapped_action.value === action.name,
													)?.label || action.name}
												</Badge>
											))}
										</div>
									</TableCell>
									<TableCell>
										<div className="truncate text-xs md:text-sm">{d.description}</div>{" "}
									</TableCell>
									<TableCell className="min-w-[10rem]">
										<p className="text-center">{d.levels?.length || 0}</p>
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button size="icon" variant="ghost" className="rounded-full">
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="rounded-lg">
												<DropdownMenuItem asChild>
													<Link href={`/admin/settings/approvals/${d.id}`}>View details</Link>
												</DropdownMenuItem>
												<DropdownMenuItem asChild>
													<Link href={`/admin/settings/approvals/${d.id}/edit/`}>Edit</Link>
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => setDocumentToDelete(d)}>
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
							{!loading && filteredDocs.length === 0 && (
								<TableRow>
									<TableCell colSpan={4} className="text-center text-gray-500">
										No approval documents found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
			{documentToDelete && (
				<ConfirmationDialog
					description="Are you sure you want to delete this approval ? This action cannot be undone."
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
