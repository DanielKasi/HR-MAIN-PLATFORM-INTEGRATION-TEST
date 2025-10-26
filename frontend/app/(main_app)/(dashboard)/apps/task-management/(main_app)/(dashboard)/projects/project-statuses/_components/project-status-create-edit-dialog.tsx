"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";
import { useState, useEffect } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { PROJECT_STATUS_API } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/lib/modules/task-management/selectors";
import { RichTextEditor } from "@/components/common/rich-editor";
import type { IProjectStatus, IProjectStatusFormData } from "@/types/project.type";

interface ProjectStatusDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	initialData?: IProjectStatus | null;
}

const PRESET_COLORS = [
	"#ef4444",
	"#f97316",
	"#f59e0b",
	"#eab308",
	"#84cc16",
	"#22c55e",
	"#10b981",
	"#14b8a6",
	"#06b6d4",
	"#0ea5e9",
	"#3b82f6",
	"#6366f1",
	"#8b5cf6",
	"#a855f7",
	"#d946ef",
	"#ec4899",
	"#64748b",
];

export function ProjectStatusDialog({
	open,
	onOpenChange,
	onSuccess,
	initialData = null,
}: ProjectStatusDialogProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [saving, setSaving] = useState(false);
	const [statusName, setStatusName] = useState("");
	const [description, setDescription] = useState("");
	const [colorCode, setColorCode] = useState("#000000");

	useEffect(() => {
		if (open) {
			if (initialData) {
				setStatusName(initialData.status_name || "");
				setDescription(initialData.description || "");
				setColorCode(initialData.color_code || "#000000");
			} else {
				setStatusName("");
				setDescription("");
				setColorCode("#000000");
			}
		}
	}, [open, initialData]);

	const isEditMode = !!initialData;
	const title = isEditMode ? "Edit Project Status" : "Create Project Status";

	const handleClose = () => {
		onOpenChange(false);
	};

	const handleSave = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "Missing institution" });
			return;
		}
		if (!statusName.trim()) {
			showErrorToast({
				error: null,
				defaultMessage: "Status name is required",
			});
			return;
		}

		const statusData: Partial<IProjectStatusFormData> = {
			institution: currentInstitution.id,
			status_name: statusName,
			description,
			color_code: colorCode,
		};

		try {
			setSaving(true);
			if (isEditMode) {
				await PROJECT_STATUS_API.update({
					project_status_id: initialData.id,
					data: statusData,
				});
				showSuccessToast("Project status updated successfully!");
			} else {
				await PROJECT_STATUS_API.create({ data: statusData });
				showSuccessToast("Project status created successfully!");
			}
			onSuccess?.();
			handleClose();
		} catch (e: any) {
			showErrorToast({
				error: e,
				defaultMessage: isEditMode
					? "Failed to update project status"
					: "Failed to create project status",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[90vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl rounded-xl p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleSave();
					}}
					className="flex flex-col space-y-4 sm:space-y-6"
				>
					<div className="space-y-4 sm:space-y-6 py-4 px-2 sm:px-4 overflow-y-auto max-h-[60vh] sm:max-h-[60svh]">
						<div>
							<label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
								Status Name <span className="text-destructive">*</span>
							</label>
							<Input
								placeholder="e.g., Planning, In Progress, Completed..."
								value={statusName}
								onChange={(e) => setStatusName(e.target.value)}
								className="text-xs sm:text-sm"
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
								Description
							</label>
							<RichTextEditor
								value={description || ""}
								onChange={(value) => setDescription(value || "")}
								placeholder="Enter your description..."
								disabled={false}
								maxLength={1000}
							/>
						</div>
						<div>
							<label className="block text-xs sm:text-sm font-medium mb-2">Color</label>
							<div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
								{PRESET_COLORS.map((color) => (
									<button
										key={color}
										type="button"
										onClick={() => setColorCode(color)}
										className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border-2 transition-all ${
											colorCode === color ? "border-primary scale-110" : "border-transparent"
										}`}
										style={{ backgroundColor: color }}
										title={color}
									/>
								))}
							</div>
							<div className="flex gap-2">
								<Input
									type="color"
									value={colorCode}
									onChange={(e) => setColorCode(e.target.value)}
									className="w-16 sm:w-20 h-9 sm:h-10 p-1 cursor-pointer flex-shrink-0"
								/>
								<Input
									type="text"
									placeholder="#000000"
									value={colorCode}
									onChange={(e) => setColorCode(e.target.value)}
									className="flex-1 h-9 sm:h-10 text-sm"
								/>
							</div>
						</div>
					</div>
					<DialogFooter className="flex justify-end gap-2 mt-4 sm:mt-6">
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={saving}
							className="w-full sm:w-auto text-xs sm:text-sm rounded-full"
							type="button"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={saving}
							className="w-full sm:w-auto text-xs sm:text-sm rounded-full"
						>
							{saving ? "Saving..." : isEditMode ? "Update Status" : "Create Status"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
