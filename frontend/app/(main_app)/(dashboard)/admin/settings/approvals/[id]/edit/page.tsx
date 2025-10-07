"use client";

import type {
	ApprovalDocument,
	ApprovalDocumentLevel,
	ApprovalDocumentFormData,
	Action,
} from "@/types/approvals.types";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowLeft, Plus, CheckCircle2, Users, FileText, Save } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FixedLoader from "@/components/fixed-loader";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
	ACTIONS_API,
	APPROVAL_DOCUMENT_LEVELS_API,
	APPROVAL_DOCUMENTS_API,
} from "@/lib/api/approvals/utils";

import { ApprovalLevelCreateEditDialog } from "@/components/approvals/approvel-level-create-edit-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApprovalEditPage() {
	const params = useParams();
	const approvalId = params.id as string;
	const currentInstitution = useSelector(selectSelectedInstitution);

	const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

	// Data states
	const [approvalDocument, setApprovalDocument] = useState<ApprovalDocument | null>(null);
	const [actions, setActions] = useState<Action[]>([]);

	// Form states
	const [documentDescription, setDocumentDescription] = useState("");
	const [selectedActionIds, setSelectedActionIds] = useState<number[]>([]);

	// Loading states
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Error state
	const [error, setError] = useState<string>("");

	// Level dialog states
	const [openLevelDialog, setOpenLevelDialog] = useState(false);
	const [editingLevel, setEditingLevel] = useState<ApprovalDocumentLevel | null>(null);
	const [reorderConfirmOpen, setReorderConfirmOpen] = useState(false);
	const [reorderPayload, setReorderPayload] = useState<{
		sourceId: number;
		targetId: number;
	} | null>(null);
	const [reordering, setReordering] = useState(false);
	const [activeLevelId, setActiveLevelId] = useState<number | null>(null);

	// Confirmation dialog states
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [levelToDelete, setLevelToDelete] = useState<number | null>(null);
	const [deletingLevel, setDeletingLevel] = useState(false);

	useEffect(() => {
		handleFetchData();
	}, [approvalId, currentInstitution]);

	const handleFetchData = async () => {
		if (!currentInstitution) {
			return;
		}
		try {
			setLoading(true);
			await fetchData();
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to load approval data" });
			setError(e?.message || "Failed to load approval data");
		} finally {
			setLoading(false);
		}
	};

	const fetchData = async () => {
		const [documentRes, actionsRes] = await Promise.all([
			APPROVAL_DOCUMENTS_API.fetchById({ id: Number.parseInt(approvalId) }),
			ACTIONS_API.fetchActions(),
		]);

		const normalizedActions = Array.isArray(actionsRes)
			? actionsRes
			: Array.isArray((actionsRes as any).results)
				? (actionsRes as any).results
				: [];

		setApprovalDocument(documentRes);
		setActions(normalizedActions);
		setDocumentDescription(documentRes.description || "");
		setSelectedActionIds(documentRes.actions?.map((a) => a.id) || []);
	};

	const toggleAction = (id: number) => {
		setSelectedActionIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const saveApprovalDocument = async () => {
		if (!approvalDocument || !currentInstitution) {
			return;
		}

		if (selectedActionIds.length === 0) {
			toast.error("Please select at least one action that requires approval");

			return;
		}

		try {
			setSaving(true);

			const documentData: Partial<ApprovalDocumentFormData> = {
				description: documentDescription || null,
				actions: selectedActionIds,
			};

			await APPROVAL_DOCUMENTS_API.update({ id: approvalDocument.id, payload: documentData });
			showSuccessToast("Approval document updated successfully!");
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to update approval document" });
		} finally {
			setSaving(false);
		}
	};

	const openEditLevelDialog = (level: ApprovalDocumentLevel) => {
		setOpenLevelDialog(true);
	};

	const handleSaveLevel = async () => {
		resetLevelDialog();
		handleFetchData();
	};

	const resetLevelDialog = () => {
		setOpenLevelDialog(false);
		setEditingLevel(null);
	};

	const handleDeleteLevel = (levelId: number) => {
		setLevelToDelete(levelId);
		setDeleteConfirmOpen(true);
	};

	const confirmDeleteLevel = async () => {
		if (!levelToDelete || !approvalDocument) return;

		try {
			setDeletingLevel(true);
			await APPROVAL_DOCUMENT_LEVELS_API.delete({ id: levelToDelete });
			await handleFetchData();
			showSuccessToast("Approval level deleted successfully!");
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to delete approval level" });
		} finally {
			setDeletingLevel(false);
			setDeleteConfirmOpen(false);
			setLevelToDelete(null);
		}
	};

	const cancelDeleteLevel = () => {
		setDeleteConfirmOpen(false);
		setLevelToDelete(null);
	};

	const handleDragEnd = (event: any) => {
		if (!approvalDocument) {
			return;
		}
		const { active, over } = event;

		if (!over || active.id === over.id) {
			setActiveLevelId(null);
			return;
		}

		const oldIndex = approvalDocument.levels.findIndex((l) => l.id === active.id);
		const newIndex = approvalDocument.levels.findIndex((l) => l.id === over.id);

		if (oldIndex === -1 || newIndex === -1) return;

		// Get source and target IDs
		const sourceId = active.id as number;
		const targetId = over.id as number;

		// Show confirmation
		setReorderPayload({ sourceId, targetId });
		setReorderConfirmOpen(true);

		setActiveLevelId(null);
	};

	const handleReorder = async () => {
		if (!reorderPayload || !approvalDocument) return;

		try {
			setReordering(true);
			await APPROVAL_DOCUMENT_LEVELS_API.reorder({
				sourceId: reorderPayload.sourceId,
				targetId: reorderPayload.targetId,
			});
			showSuccessToast("Approval levels reordered successfully!");
			await fetchData();
		} catch (e: any) {
			showErrorToast({ error: e, defaultMessage: "Failed to reorder levels" });
		} finally {
			setReordering(false);
			setReorderConfirmOpen(false);
			setReorderPayload(null);
		}
	};

	if (loading) {
		return <FixedLoader />;
	}

	if (error || !approvalDocument) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">Approval Not Found</h3>
					<p className="text-muted-foreground mb-4">
						{error || "The requested approval document could not be found."}
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
						<Link href={`/admin/settings/approvals/${approvalId}`}>
							<Button variant="ghost" className="rounded-full aspect-square" size="sm">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-xl lg:text-2xl font-bold">Edit Approval</h1>
					</div>
					<p className="text-muted-foreground ml-8">
						Modify approval workflow for {approvalDocument.content_type_name}
					</p>
				</div>
			</div>

			{error && (
				<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Actions Configuration */}
				<Card className="border-none shadow-none">
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
						<div className="flex items-center w-full justify-end">
							<Button className="rounded-xl" onClick={saveApprovalDocument} disabled={saving}>
								<Save className="h-4 w-4 mr-2" />
								{saving ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Approval Levels */}
				<Card className="border-none shadow-none">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									Approval Levels
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									Manage sequential approval levels with approver groups
								</p>
							</div>
							<Button
								className="rounded-xl"
								size="sm"
								onClick={() => {
									resetLevelDialog();
									setOpenLevelDialog(true);
								}}
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Level
							</Button>
						</div>
					</CardHeader>
					<CardContent className="w-full overflow-x-hidden">
						{reordering ? (
							<>
								<div className="space-y-3 bg-transparent animate-pulse">
									{approvalDocument.levels.map((level, index) => (
										<Skeleton key={index} className="h-48 w-full rounded bg-gray-200" />
									))}
								</div>
							</>
						) : (
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								onDragEnd={handleDragEnd}
							>
								<SortableContext
									items={approvalDocument.levels.map((l) => l.id)}
									strategy={verticalListSortingStrategy}
								>
									<div className="space-y-3">
										{approvalDocument.levels.map((level, index) => (
											<ApprovalLevelCard
												key={level.id}
												level={level}
												index={index}
												totalLevels={approvalDocument.levels.length}
												onEdit={openEditLevelDialog}
												onDelete={handleDeleteLevel}
											/>
										))}
									</div>
								</SortableContext>
							</DndContext>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Level Dialog */}
			<ApprovalLevelCreateEditDialog
				open={openLevelDialog}
				onOpenChange={setOpenLevelDialog}
				approvalDocumentId={approvalDocument.id}
				level={editingLevel}
				onSave={handleSaveLevel}
			/>

			{/* Confirmation Dialog */}
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
				description={`Are you sure you want to move this level to a new position? This will update the approval workflow sequence.`}
				confirmText="Confirm Reorder"
				cancelText="Cancel"
				disabled={reordering}
			/>
		</div>
	);
}
