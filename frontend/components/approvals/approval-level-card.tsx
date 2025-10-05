"use client";

import { ApprovalDocumentLevel } from "@/types/approvals.types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Shield, MoreHorizontal, GripVertical } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ApprovalLevelCardProps {
	level: ApprovalDocumentLevel;
	index: number;
	totalLevels: number;
	onEdit: (level: ApprovalDocumentLevel) => void;
	onDelete: (levelId: number) => void;
}

export function ApprovalLevelCard({
	level,
	index,
	totalLevels,
	onEdit,
	onDelete,
}: ApprovalLevelCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: level.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
		zIndex: isDragging ? 100 : "auto",
		cursor: "grab",
	};

	return (
		<div ref={setNodeRef} style={style} className="relative">
			<div className="border rounded-lg p-4 bg-white">
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-2">
						{/* Drag handle */}
						<button
							type="button"
							{...attributes}
							{...listeners}
							className="text-muted-foreground hover:text-foreground cursor-grab focus:outline-none"
							aria-label="Drag to reorder"
						>
							<GripVertical className="h-5 w-5" />
						</button>

						<Badge variant="outline" className="text-xs">
							Level {index + 1}
						</Badge>
						<span className="font-medium">{level.name}</span>
					</div>

					<div className="flex gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => onEdit(level)}>Edit</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onClick={() => onDelete(level.id)}
								>
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-4 text-sm">
					{/* Approvers */}
					<div>
						<div className="flex items-center gap-1 mb-1">
							<CheckCircle2 className="h-3 w-3 text-green-600" />
							<span className="font-medium">Approver Groups</span>
						</div>
						<div className="text-muted-foreground">
							{level.approvers_detail?.length || 0}{" "}
							{`group${level.approvers_detail?.length !== 1 ? "s" : ""} assigned`}
						</div>
						{level.approvers_detail && level.approvers_detail.length > 0 && (
							<div className="mt-1 flex flex-wrap gap-1">
								{level.approvers_detail.map((approver) => (
									<Badge key={approver.id} variant="secondary" className="text-xs">
										{approver.approver_group?.name || "Unknown group"}
									</Badge>
								))}
							</div>
						)}
					</div>

					{/* Overriders */}
					<div>
						<div className="flex items-center gap-1 mb-1">
							<Shield className="h-3 w-3 text-orange-600" />
							<span className="font-medium">Overrider Groups</span>
						</div>
						<div className="text-muted-foreground">
							{level.overriders_detail?.length || 0}{" "}
							{`group${level.overriders_detail?.length !== 1 ? "s" : ""} assigned`}
						</div>
						{level.overriders_detail && level.overriders_detail.length > 0 && (
							<div className="mt-1 flex flex-wrap gap-1">
								{level.overriders_detail.map((overrider) => (
									<Badge key={overrider.id} variant="outline" className="text-xs">
										{overrider.approver_group?.name || "Unknown group"}
									</Badge>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
