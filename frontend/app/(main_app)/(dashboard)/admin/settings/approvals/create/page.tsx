"use client";

import type {
	Action,
	ContentTypeLite,
	ApprovalDocumentFormData,
	ApprovalDocument,
} from "@/types/approvals.types";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowLeft, Plus, CheckCircle2, Users, Shield, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ApprovalLevelCard } from "@/components/approvals/approval-level-card";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FixedLoader from "@/components/fixed-loader";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
	ACTIONS_API,
	APPROVABLE_MODELS_API,
	APPROVAL_DOCUMENT_LEVELS_API,
	APPROVAL_DOCUMENTS_API,
} from "@/lib/api/approvals/utils";
import { ApprovalLevelCreateEditDialog } from "@/components/approvals/approvel-level-create-edit-dialog";

export default function ApprovalCreatePage() {
	const searchParams = useSearchParams();
	const contentTypeId = searchParams.get("content") as unknown as number;
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);

	// Data states
	const [createdApprovalDocument, setCreatedApprovalDocument] = useState<ApprovalDocument | null>(
		null,
	);
	const [models, setModels] = useState<ContentTypeLite[]>([]);
	const [actions, setActions] = useState<Action[]>([]);
	const [selectedActionIds, setSelectedActionIds] = useState<number[]>([]);

	const [reorderConfirmOpen, setReorderConfirmOpen] = useState(false);
	// Form states
	const [documentDescription, setDocumentDescription] = useState("");

	// Loading states
	const [loading, setLoading] = useState(true);
	const [savingDocument, setSavingDocument] = useState(false);

	// Error state
	const [error, setError] = useState<string>("");

	// Level states
	const [openLevelDialog, setOpenLevelDialog] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [levelToDelete, setLevelToDelete] = useState<number | null>(null);
	const [deletingLevel, setDeletingLevel] = useState(false);

	const [reorderPayload, setReorderPayload] = useState<{
		sourceId: number;
		targetId: number;
	} | null>(null);
	const [reordering, setReordering] = useState(false);
	const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

	useEffect(() => {
		loadData();
	}, [contentTypeId, currentInstitution]);

	const fetchExistingApprovalDocument = async () => {
		if (!createdApprovalDocument || !currentInstitution) return;

		try {
			const response = await APPROVAL_DOCUMENTS_API.fetchById({ id: createdApprovalDocument.id });
			setCreatedApprovalDocument(response);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Could not find an existing approval workflow" });
		}
	};

	const loadData = async () => {
		if (!currentInstitution) {
			return;
		}
		try {
			setLoading(true);
			const [modelsRes, actionsRes] = await Promise.all([
				APPROVABLE_MODELS_API.fetchAll(),
				ACTIONS_API.fetchActions(),
			]);

			const normalizedActions = Array.isArray(actionsRes)
				? actionsRes
				: Array.isArray((actionsRes as any).results)
					? (actionsRes as any).results
					: [];

			setModels(modelsRes);
			setActions(normalizedActions);
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to load approval data" });
			setError(e?.message || "Failed to load approval data");
		} finally {
			setLoading(false);
		}
	};

	const handleReorder = async () => {
		if (!reorderPayload || !createdApprovalDocument) return;

		try {
			setReordering(true);
			await APPROVAL_DOCUMENT_LEVELS_API.reorder({
				sourceId: reorderPayload.sourceId,
				targetId: reorderPayload.targetId,
			});
			showSuccessToast("Approval levels reordered successfully!");
			await fetchExistingApprovalDocument(); // refresh levels
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to reorder levels" });
		} finally {
			setReordering(false);
			setReorderConfirmOpen(false);
			setReorderPayload(null);
		}
	};

	const handleDragEnd = (event: any) => {
		if (!createdApprovalDocument) return;

		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const sourceId = active.id as number;
		const targetId = over.id as number;

		setReorderPayload({ sourceId, targetId });
		setReorderConfirmOpen(true);
	};

	const model = useMemo(
		() => models.find((m) => m.id === Number(contentTypeId)),
		[models, contentTypeId],
	);

	const toggleAction = (id: number) => {
		setSelectedActionIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const createApprovalDocumentWithLevels = async () => {
		if (createdApprovalDocument) {
			toast.error("Another approval already exists for this instance");

			return;
		}
		if (!currentInstitution) {
			setError("Missing institution");

			return;
		}

		if (selectedActionIds.length === 0) {
			setError("Please select at least one action that requires approval");

			return;
		}

		try {
			setSavingDocument(true);

			const documentData: ApprovalDocumentFormData = {
				institution: currentInstitution.id,
				content_type: contentTypeId,
				description: documentDescription || null,
				actions: selectedActionIds,
			};

			const createdDoc = await APPROVAL_DOCUMENTS_API.create(documentData);

			setCreatedApprovalDocument(createdDoc);
			showSuccessToast("Approval document created successfully!");
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to create approval document" });
			setError(e?.message || "Failed to create approval document");
		} finally {
			setSavingDocument(false);
		}
	};

	const removeLevelFromList = async (levelId: number) => {
		try {
			setDeletingLevel(true);
			await APPROVAL_DOCUMENT_LEVELS_API.delete({ id: levelId });

			// Refetch levels to ensure data consistency
			if (createdApprovalDocument) {
				await fetchExistingApprovalDocument();
			}

			showSuccessToast("Approval level deleted successfully!");
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to delete approval level" });
		} finally {
			setDeletingLevel(false);
			setDeleteConfirmOpen(false);
			setLevelToDelete(null);
		}
	};

	const handleDeleteLevel = (levelId: number) => {
		setLevelToDelete(levelId);
		setDeleteConfirmOpen(true);
	};

	const confirmDeleteLevel = () => {
		if (levelToDelete) {
			removeLevelFromList(levelToDelete);
		}
	};

	const cancelDeleteLevel = () => {
		setDeleteConfirmOpen(false);
		setLevelToDelete(null);
	};

	if (loading) {
		return <FixedLoader />;
	}

	if (!contentTypeId) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">No Content Type Selected</h3>
					<p className="text-muted-foreground mb-4">
						Please select a content type to configure approvals.
					</p>
					<Link href="/admin/settings/approvals">
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Approvals
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-white rounded-xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div className="space-y-1">
					<div className="flex items-center gap-4">
						<Link href="/admin/settings/approvals">
							<Button variant="ghost" className="rounded-full aspect-square" size="sm">
								<ArrowLeft className="h-4 w-4 mr-2" />
							</Button>
						</Link>
						<h1 className="text-xl lg:text-2xl font-bold">Configure Approvals</h1>
					</div>
					<p className="text-muted-foreground">
						Define approval workflows for {model?.name || "selected model"} actions
					</p>
				</div>
			</div>

			{error && (
				<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			)}

			<div className={`grid grid-cols-1 ${createdApprovalDocument ? "lg:grid-cols-2" : ""} gap-6`}>
				{/* Actions Configuration */}
				<Card className={`border-none shadow-none ${!createdApprovalDocument ? "max-w-7xl" : ""}`}>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5" />
							Actions Requiring Approval
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Select which actions should trigger the approval workflow
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						{actions.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
								<p>No actions available</p>
							</div>
						) : (
							<div className="space-y-3">
								{actions.map((action) => (
									<div
										key={action.id}
										className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
									>
										<div className="flex-1">
											<div className="font-medium">{action.name}</div>
											{action.description && (
												<div className="text-sm text-muted-foreground mt-1">
													{action.description}
												</div>
											)}
										</div>
										<Label className="flex items-center gap-2 cursor-pointer">
											<Checkbox
												className="rounded"
												checked={selectedActionIds.includes(action.id)}
												onCheckedChange={() => toggleAction(action.id)}
											/>
											<span className="text-sm">Require</span>
										</Label>
									</div>
								))}
							</div>
						)}

						{/* Document Description */}
						<div className="pt-4 border-t">
							<label className="block text-sm font-medium mb-2">
								Approval Document Description
							</label>
							<Textarea
								placeholder="Optional description for this approval workflow..."
								value={documentDescription}
								className="resize-none"
								onChange={(e) => setDocumentDescription(e.target.value)}
								rows={3}
							/>
						</div>
						<div className="flex justify-end gap-4 pt-6">
							<Button
								onClick={createApprovalDocumentWithLevels}
								disabled={
									savingDocument || selectedActionIds.length === 0 || !!createdApprovalDocument
								}
							>
								{savingDocument ? "Creating..." : "Create Approval"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Approval Levels - Only show after approval document is created */}
				{createdApprovalDocument && (
					<Card className="border-none shadow-none">
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Users className="h-5 w-5" />
										Approval Levels
									</CardTitle>
									<p className="text-sm text-muted-foreground mt-1">
										Create sequential approval levels with approver groups
									</p>
								</div>
								<Button size="sm" onClick={() => setOpenLevelDialog(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Add Level
								</Button>
							</div>
						</CardHeader>

						<CardContent className="w-full overflow-x-hidden">
							{reordering ? (
								<div className="space-y-3">
									{createdApprovalDocument.levels.map((_, index) => (
										<Skeleton key={index} className="h-48 w-full rounded bg-gray-200" />
									))}
								</div>
							) : (
								<DndContext
									sensors={sensors}
									collisionDetection={closestCenter}
									onDragEnd={handleDragEnd}
								>
									<SortableContext
										items={createdApprovalDocument.levels.map((l) => l.id)}
										strategy={verticalListSortingStrategy}
									>
										<div className="space-y-3">
											{createdApprovalDocument.levels.map((level, index) => (
												<ApprovalLevelCard
													key={level.id}
													level={level}
													index={index}
													totalLevels={createdApprovalDocument.levels.length}
													onEdit={() => {
														fetchExistingApprovalDocument();
													}}
													onDelete={handleDeleteLevel}
												/>
											))}
										</div>
									</SortableContext>
								</DndContext>
							)}
						</CardContent>
					</Card>
				)}
			</div>

			<div className="flex justify-end gap-4 mt-8 pt-6 border-t">
				<Button
					disabled={!createdApprovalDocument}
					onClick={() => router.push("/admin/settings/approvals")}
				>
					Back to Approvals
				</Button>
			</div>

			{createdApprovalDocument ? (
				<ApprovalLevelCreateEditDialog
					open={openLevelDialog}
					onOpenChange={setOpenLevelDialog}
					approvalDocumentId={createdApprovalDocument.id}
					onSave={loadData}
				/>
			) : (
				<></>
			)}

			{/* Confirmation dialog for delete level */}
			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={cancelDeleteLevel}
				onConfirm={confirmDeleteLevel}
				title="Delete Approval Level"
				description="Are you sure you want to delete this approval level? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deletingLevel}
			/>

			<ConfirmationDialog
				isOpen={reorderConfirmOpen}
				onClose={() => {
					setReorderConfirmOpen(false);
					setReorderPayload(null);
				}}
				onConfirm={handleReorder}
				title="Reorder Approval Levels"
				description="Are you sure you want to move this level to a new position? This will update the approval workflow sequence."
				confirmText="Confirm Reorder"
				cancelText="Cancel"
				disabled={reordering}
			/>
		</div>
	);
}
