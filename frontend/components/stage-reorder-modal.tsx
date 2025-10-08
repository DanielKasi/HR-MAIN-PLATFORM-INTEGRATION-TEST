import React, { useState, useEffect } from "react";
import { GripVertical, CheckCircle, Clock, XCircle, AlertCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Types
interface Stage {
	id: number;
	stage_name: string;
	status: "not_started" | "in_progress" | "completed" | "skipped";
	notes: string;
	position: number;
	created_at: string;
	updated_at: string;
	isOpen: boolean;
}

interface StageReorderProps {
	separationId: number;
	stages: Stage[];
	onReorderSuccess?: (updatedStages: Stage[]) => void;
	onCancel?: () => void;
}

export default function StageReorderComponent({
	separationId,
	stages: initialStages,
	onReorderSuccess,
	onCancel,
}: StageReorderProps) {
	const [stages, setStages] = useState<Stage[]>(initialStages);
	const [draggedStage, setDraggedStage] = useState<Stage | null>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const [saving, setSaving] = useState(false);

	// Sort stages by position on mount
	useEffect(() => {
		const sorted = [...initialStages].sort((a, b) => a.position - b.position);
		setStages(sorted);
	}, [initialStages]);

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
			// Find the changes and make API calls
			const reorderPromises: Promise<any>[] = [];

			for (let i = 0; i < stages.length - 1; i++) {
				const currentStage = stages[i];
				const nextStage = stages[i + 1];

				// Check if this stage's position changed
				const originalStage = initialStages.find((s) => s.id === currentStage.id);
				if (originalStage && originalStage.position !== currentStage.position) {
					// Make API call to reorder
					reorderPromises.push(
						fetch(`/api/on-boarding/employee-separations/${separationId}/stage-reorder/`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								source_stage_id: currentStage.id,
								target_stage_id: nextStage.id,
							}),
						}).then((res) => {
							if (!res.ok) throw new Error("Failed to reorder stage");
							return res.json();
						}),
					);
				}
			}

			await Promise.all(reorderPromises);

			// Success
			setHasChanges(false);
			if (onReorderSuccess) {
				onReorderSuccess(stages);
			}

			alert("Stages reordered successfully!");
		} catch (error) {
			console.error("Error reordering stages:", error);
			alert("Failed to reorder stages. Please try again.");
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

		setStages([...initialStages].sort((a, b) => a.position - b.position));
		setHasChanges(false);

		if (onCancel) {
			onCancel();
		}
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Reorder Exit Stages</CardTitle>
							<p className="text-sm text-muted-foreground mt-1">
								Drag and drop stages to change their execution order
							</p>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={handleCancel} disabled={saving}>
								<X className="h-4 w-4 mr-2" />
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={!hasChanges || saving}>
								<Save className="h-4 w-4 mr-2" />
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
								⚠️ You have unsaved changes. Click "Save Order" to apply the new stage order.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Instructions */}
			<Card>
				<CardContent className="p-4">
					<h4 className="font-medium mb-2">How to reorder stages:</h4>
					<ul className="text-sm text-muted-foreground space-y-1">
						<li>
							• <strong>Drag & Drop:</strong> Click and drag a stage to move it to a new position
						</li>
						<li>
							• <strong>Arrow Buttons:</strong> Use ▲ and ▼ buttons to move stages up or down
						</li>
						<li>
							• <strong>Save:</strong> Click "Save Order" to apply changes
						</li>
						<li>
							• <strong>Cancel:</strong> Click "Cancel" to discard changes
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
