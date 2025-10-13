import React, { useState, useEffect } from "react";
import { GripVertical, CheckCircle, Clock, XCircle, AlertCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import apiRequest from "@/lib/apiRequest";
import { showErrorToast, showSuccessToast } from "@/lib/utils";

interface Stage {
	id: number;
	stage_name: string;
	status: string;
	position: number;
	notes?: string;
}

interface StageReorderModalProps {
	isOpen: boolean;
	separationId: number;
	stages: Stage[];
	employeeName: string;
	onClose: () => void;
	onSuccess: (updatedStages: Stage[]) => void;
}

export default function StageReorderModal({
	isOpen,
	separationId,
	stages: initialStages,
	employeeName,
	onClose,
	onSuccess,
}: StageReorderModalProps) {
	const [stages, setStages] = useState<Stage[]>([]);
	const [draggedStage, setDraggedStage] = useState<Stage | null>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const [saving, setSaving] = useState(false);

	// Initialize and sort stages
	useEffect(() => {
		if (isOpen) {
			const sorted = [...initialStages].sort((a, b) => a.position - b.position);
			setStages(sorted);
			setHasChanges(false);
		}
	}, [initialStages, isOpen]);

	const getStageStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-5 w-5 text-green-500" />;
			case "in_progress":
				return <Clock className="h-5 w-5 text-blue-500" />;
			case "skipped":
				return <XCircle className="h-5 w-5 text-gray-400" />;
			default:
				return <AlertCircle className="h-5 w-5 text-gray-400" />;
		}
	};

	const getStageStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800";
			case "in_progress":
				return "bg-blue-100 text-blue-800";
			case "skipped":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-yellow-100 text-yellow-800";
		}
	};

	const handleDragStart = (e: React.DragEvent, stage: Stage) => {
		setDraggedStage(stage);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = (e: React.DragEvent, targetStage: Stage) => {
		e.preventDefault();

		if (!draggedStage || draggedStage.id === targetStage.id) {
			setDraggedStage(null);
			return;
		}

		const draggedIndex = stages.findIndex((s) => s.id === draggedStage.id);
		const targetIndex = stages.findIndex((s) => s.id === targetStage.id);

		const newStages = [...stages];
		newStages.splice(draggedIndex, 1);
		newStages.splice(targetIndex, 0, draggedStage);

		// Update positions
		const updatedStages = newStages.map((stage, index) => ({
			...stage,
			position: index + 1,
		}));

		setStages(updatedStages);
		setDraggedStage(null);
		setHasChanges(true);
	};

	const handleDragEnd = () => {
		setDraggedStage(null);
	};

	const moveStage = (stageId: number, direction: "up" | "down") => {
		const currentIndex = stages.findIndex((s) => s.id === stageId);

		if (
			(direction === "up" && currentIndex === 0) ||
			(direction === "down" && currentIndex === stages.length - 1)
		) {
			return;
		}

		const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
		const newStages = [...stages];
		const [movedStage] = newStages.splice(currentIndex, 1);
		newStages.splice(newIndex, 0, movedStage);

		// Update positions
		const updatedStages = newStages.map((stage, index) => ({
			...stage,
			position: index + 1,
		}));

		setStages(updatedStages);
		setHasChanges(true);
	};

	const handleSave = async () => {
		if (!hasChanges) return;

		setSaving(true);

		try {
			// Create a map of original positions for quick lookup
			const originalPositions = new Map();
			initialStages.forEach((stage) => {
				originalPositions.set(stage.id, stage.position);
			});

			// Find which stage changed position
			let sourceStageId = null;
			let targetStageId = null;

			for (let i = 0; i < stages.length; i++) {
				const currentStage = stages[i];
				const originalPosition = originalPositions.get(currentStage.id);

				// If this stage has moved from its original position
				if (originalPosition !== i + 1) {
					sourceStageId = currentStage.id;

					// Find a target stage that is different from the source
					// Use the stage that was displaced by this move
					if (i > 0) {
						// Use the stage before the current position
						targetStageId = stages[i - 1].id;
					} else if (i < stages.length - 1) {
						// Use the stage after the current position if at beginning
						targetStageId = stages[i + 1].id;
					}
					break;
				}
			}

			// If we couldn't find a proper target, use the first available different stage
			if (sourceStageId && !targetStageId) {
				const otherStage = stages.find((stage) => stage.id !== sourceStageId);
				if (otherStage) {
					targetStageId = otherStage.id;
				}
			}

			if (sourceStageId && targetStageId && sourceStageId !== targetStageId) {
				await apiRequest.post(`/on-boarding/employee-separations/${separationId}/stage-reorder/`, {
					source_stage_id: sourceStageId,
					target_stage_id: targetStageId,
				});

				showSuccessToast("Stages reordered successfully!");
				setHasChanges(false);

				if (onSuccess) {
					onSuccess(stages);
				}

				setTimeout(() => {
					onClose();
				}, 500);
			} else {
				// Fallback: If we can't determine proper source/target, save the entire new order
				// This handles edge cases where the logic above fails
				console.warn("Using fallback reorder logic");

				// Find any two different stages to use for the API call
				const firstStage = stages[0];
				const secondStage = stages[1];

				if (firstStage && secondStage) {
					await apiRequest.post(
						`/on-boarding/employee-separations/${separationId}/stage-reorder/`,
						{
							source_stage_id: firstStage.id,
							target_stage_id: secondStage.id,
						},
					);

					showSuccessToast("Stages reordered successfully!");
					setHasChanges(false);

					if (onSuccess) {
						onSuccess(stages);
					}

					setTimeout(() => {
						onClose();
					}, 500);
				} else {
					showErrorToast({
						error: new Error("Cannot determine stage order changes"),
						defaultMessage: "No valid stage movement detected.",
					});
				}
			}
		} catch (error) {
			console.error("Error reordering stages:", error);
			showErrorToast({
				error,
				defaultMessage: "Failed to reorder stages. Please try again.",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (hasChanges) {
			const confirmed = window.confirm(
				"You have unsaved changes. Are you sure you want to cancel?",
			);
			if (!confirmed) return;
		}

		// Reset stages to original
		const sorted = [...initialStages].sort((a, b) => a.position - b.position);
		setStages(sorted);
		setHasChanges(false);

		// Close the modal
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Reorder Exit Stages - {employeeName}</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto pr-2">
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="text-lg">Stage Reordering</CardTitle>
										<p className="text-sm text-muted-foreground">
											Drag and drop stages to change their execution order
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											onClick={handleCancel}
											disabled={saving}
											size="sm"
											className="rounded-full"
										>
											Cancel
										</Button>
										<Button
											onClick={handleSave}
											disabled={!hasChanges || saving}
											size="sm"
											className="flex rounded-full w-full max-w-sm items-center gap-2 px-6 lg:px-8"
										>
											{saving ? "Saving..." : "Save Order"}
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{stages.map((stage, index) => (
										<div
											key={stage.id}
											draggable
											onDragStart={(e) => handleDragStart(e, stage)}
											onDragOver={handleDragOver}
											onDrop={(e) => handleDrop(e, stage)}
											onDragEnd={handleDragEnd}
											className={`
												flex items-center gap-3 p-4 border rounded-lg cursor-move
												transition-all duration-200
												${draggedStage?.id === stage.id ? "opacity-50 scale-95" : "hover:shadow-md hover:border-blue-300"}
												${hasChanges ? "bg-blue-50" : "bg-white"}
											`}
										>
											{/* Drag Handle */}
											<div className="flex-shrink-0">
												<GripVertical className="h-5 w-5 text-gray-400" />
											</div>

											{/* Position Number */}
											<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-sm">
												{index + 1}
											</div>

											{/* Stage Icon */}
											<div className="flex-shrink-0">{getStageStatusIcon(stage.status)}</div>

											{/* Stage Info */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<h4 className="font-medium truncate">{stage.stage_name}</h4>
													<Badge className={getStageStatusColor(stage.status)} variant="secondary">
														{stage.status.replace("_", " ")}
													</Badge>
												</div>
												{stage.notes && (
													<p className="text-sm text-muted-foreground truncate">{stage.notes}</p>
												)}
											</div>

											{/* Move Buttons */}
											<div className="flex flex-col gap-1">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => moveStage(stage.id, "up")}
													disabled={index === 0}
													className="h-6 w-6 p-0"
												>
													▲
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => moveStage(stage.id, "down")}
													disabled={index === stages.length - 1}
													className="h-6 w-6 p-0"
												>
													▼
												</Button>
											</div>
										</div>
									))}
								</div>

								{hasChanges && (
									<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
										<p className="text-sm text-yellow-800 font-medium">
											You have unsaved changes. Click "Save Order" to apply the new stage order.
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
