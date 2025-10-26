"use client";

import type { ApprovalDocument, ContentTypeLite } from "@/types/approvals.types";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronsUpDown, MoreVertical } from "lucide-react";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

import { Button } from "@/platform/v1/components";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/platform/v1/components";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/platform/v1/components";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { showErrorToast } from "@/lib/utils";
import { Badge } from "@/platform/v1/components";
import { APPROVABLE_MODELS_API, APPROVAL_DOCUMENTS_API } from "@/lib/api/approvals/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/platform/v1/components";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/platform/v1/components";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ProtectedComponent } from "@/platform/v1/components";
import { PERMISSION_CODES } from "@/constants";

const actionsMapper: Array<{
	value: string;
	label: string;
}> = [
	{ value: "create", label: "Creation" },
	{ value: "edit", label: "Update" },
	{ value: "delete", label: "Deletion" },
];

export default function ApprovalsDocumentsPage() {
	const router = useModuleNavigation();
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
			showErrorToast({
				error: e,
				defaultMessage: "Failed to load approval records",
			});
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
			<div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-white rounded-xl">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							className="rounded-full aspect-square"
							onClick={() => router.push("/admin")}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="text-base sm:text-lg font-semibold capitalize">
							Objects Bearing Approvals
						</h1>
					</div>
					<div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-4">
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_APPROVER_GROUPS}>
							<Button
								onClick={() => router.push("/admin/settings/approvals/approver-groups/")}
								variant={"outline"}
								className="rounded-lg w-full sm:w-auto text-xs sm:text-sm"
							>
								Approver Groups
							</Button>
						</ProtectedComponent>
						<Dialog open={open} onOpenChange={setOpen}>
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CONFIGURE_APPROVER_OBJECTS}>
								<DialogTrigger asChild>
									<Button className="rounded-lg w-full sm:w-auto text-xs sm:text-sm">
										Create / Configure
									</Button>
								</DialogTrigger>
							</ProtectedComponent>
							<DialogContent className="w-[95vw] max-w-[400px] sm:max-w-[520px] rounded-lg">
								<DialogHeader>
									<DialogTitle className="text-base sm:text-lg">
										Select Objects to Configure
									</DialogTitle>
								</DialogHeader>
								<div className="space-y-3 py-2">
									<div className="text-xs text-gray-600">
										Everything that can bear an approval is listed.
									</div>

									<Popover open={modelsDialogOpen} onOpenChange={setModelsDialogOpen}>
										<PopoverTrigger asChild>
											<Button
												aria-expanded={open}
												className="w-full justify-start gap-4 sm:gap-8 rounded-xl text-xs sm:text-sm"
												disabled={models.length === 0}
												role="combobox"
												variant="outline"
											>
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												{models.find((m) => m.id === selectedModelId)?.name ||
													"Select something that can bear an approval"}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-full p-0">
											<Command shouldFilter={false}>
												<CommandInput
													placeholder="Select something that can bear an approval"
													value={modelsInputValue}
													onValueChange={(value) => {
														setModelsInputValue(value);
														setSelectedModelId(null);
													}}
													className="text-xs sm:text-sm"
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
																		className="text-xs sm:text-sm"
																	>
																		{isSelected && (
																			<Check
																				className={`mr-2 h-4 w-4 ${
																					isSelected ? "opacity-100" : "opacity-0"
																				}`}
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
										className="rounded-lg w-full text-xs sm:text-sm"
										onClick={onCreate}
										disabled={!selectedModelId}
									>
										Continue
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Input
						className="rounded-2xl w-full max-w-full sm:max-w-md text-xs sm:text-sm"
						placeholder="Search..."
						value={q}
						onChange={(e) => setQ(e.target.value)}
					/>
				</div>

				{loading && <div className="text-xs sm:text-sm text-gray-600">Loading...</div>}
				{error && <div className="text-xs sm:text-sm text-red-600">{error}</div>}

				<div className="rounded-lg overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="text-xs sm:text-sm">Name</TableHead>
								<TableHead className="text-xs sm:text-sm">Description</TableHead>
								<TableHead className="text-center min-w-[8rem] sm:min-w-[10rem] text-xs sm:text-sm">
									Number of Levels
								</TableHead>
								<TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredDocs.map((d) => (
								<TableRow key={d.id}>
									<TableCell>
										<div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2 sm:gap-4">
											<span className="text-xs sm:text-sm">{d.content_type_name || "-"}</span>
											<div className="flex flex-wrap gap-1">
												{d.actions.map((action, idx) => (
													<Badge variant={"info"} className="capitalize text-xs" key={idx}>
														{actionsMapper.find(
															(mapped_action) => mapped_action.value === action.name,
														)?.label || action.name}
													</Badge>
												))}
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="truncate text-xs sm:text-sm">{d.description}</div>
									</TableCell>
									<TableCell className="min-w-[8rem] sm:min-w-[10rem]">
										<p className="text-center text-xs sm:text-sm">{d.levels?.length || 0}</p>
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													className="rounded-full h-8 w-8 sm:h-10 sm:w-10"
												>
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="rounded-lg">
												<ProtectedComponent
													permissionCode={PERMISSION_CODES.CAN_VIEW_APPROVER_GROUPS}
												>
													<DropdownMenuItem asChild>
														<Link href={`/admin/settings/approvals/${d.id}`}>View details</Link>
													</DropdownMenuItem>
												</ProtectedComponent>
												<ProtectedComponent
													permissionCode={PERMISSION_CODES.CAN_EDIT_APPROVER_GROUPS}
												>
													<DropdownMenuItem asChild>
														<Link href={`/admin/settings/approvals/${d.id}/edit/`}>Edit</Link>
													</DropdownMenuItem>
												</ProtectedComponent>
												<ProtectedComponent
													permissionCode={PERMISSION_CODES.CAN_DELETE_APPROVER_GROUPS}
												>
													<DropdownMenuItem onClick={() => setDocumentToDelete(d)}>
														Delete
													</DropdownMenuItem>
												</ProtectedComponent>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
							{!loading && filteredDocs.length === 0 && (
								<TableRow>
									<TableCell colSpan={4} className="text-center text-gray-500 text-xs sm:text-sm">
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
