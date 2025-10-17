"use client";

import { useRef, useState } from "react";
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
import { MoreVertical, Edit, Eye, Trash2, Search, Plus } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { INTERVIEW_STAGES_API } from "@/lib/api/interviews.utils";
import type { IInterviewStage } from "@/types/types.utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { CreateInterviewStageDialog } from "@/components/dialogs/create-interview-stage-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeedbackFieldsModal } from "@/components/dialogs/feedback-fields-modal";

export default function InterviewStagesPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");

	// Dialog states
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedStage, setSelectedStage] = useState<IInterviewStage | null>(null);
	const [isFeedbackFieldsModalOpen, setIsFeedbackFieldsModalOpen] = useState(false);

	// Delete confirmation
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [stageToDelete, setStageToDelete] = useState<IInterviewStage | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!stageToDelete || !currentInstitution) return;

		try {
			setDeleting(true);
			await INTERVIEW_STAGES_API.delete({ stageId: stageToDelete.id });
			showSuccessToast("Interview Stage deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete interview stage" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setStageToDelete(null);
		}
	};

	const openEditDialog = (stage: IInterviewStage) => {
		setSelectedStage(stage);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (stage: IInterviewStage) => {
		setSelectedStage(stage);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<IInterviewStage>[] = [
		{
			key: "name",
			header: (
				<div className="flex items-center justify-start gap-2 sm:gap-4">
					<span className="text-xs sm:text-sm">Name</span>
					<Button
						onClick={() => setOrdering((prev) => (prev === "name" ? "-name" : "name"))}
						size="sm"
						variant={ordering.includes("name") ? "default" : "outline"}
						type="button"
						className="h-6 w-6 sm:h-8 sm:w-8 p-0"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-3 !w-3 sm:!h-4 sm:!w-4" />
					</Button>
				</div>
			),
			cell: (stage) => <div className="text-xs sm:text-sm font-medium">{stage.name}</div>,
		},

		{
			key: "level",
			header: "Level",
			cell: (stage) => <div className="text-xs sm:text-sm">{stage.level}</div>,
		},
		{
			key: "interviewers",
			header: "Interviewers",
			cell: (stage) => (
				<div className="flex items-center justify-start gap-1 sm:gap-2">
					{stage.interviewers_details && stage.interviewers_details.length > 0 ? (
						<>
							<p className="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-none">
								{`${stage.interviewers_details[0].name || stage.interviewers_details[0].user?.fullname || "Unknown"}`}
							</p>
							{stage.interviewers_details.length > 1 && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Badge variant={"secondary"} className="cursor-pointer text-xs">
											+{stage.interviewers_details.length - 1}
										</Badge>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" className="max-h-[200px] overflow-y-auto w-48">
										{stage.interviewers_details.map((interviewer, idx) => (
											<DropdownMenuItem key={idx} className="text-xs sm:text-sm">
												{`${interviewer.name || interviewer.user?.fullname || "Unknown"}`}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</>
					) : (
						<p className="text-xs sm:text-sm text-muted-foreground">No interviewers</p>
					)}
				</div>
			),
		},
		{
			key: "feedback_fields",
			header: "Feedback Fields",
			cell: (stage) => (
				<div className="flex items-center justify-start gap-1 sm:gap-2">
					{stage.feedback_fields && stage.feedback_fields.length > 0 ? (
						<>
							<p className="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-none">
								{stage.feedback_fields[0].label}
							</p>
							{stage.feedback_fields.length > 1 && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Badge variant={"secondary"} className="cursor-pointer text-xs">
											+{stage.feedback_fields.length - 1}
										</Badge>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" className="max-h-[200px] overflow-y-auto w-48">
										{stage.feedback_fields.map((field, idx) => (
											<DropdownMenuItem key={idx} className="text-xs sm:text-sm">
												{field.label} ({field.type})
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</>
					) : (
						<p className="text-xs sm:text-sm text-muted-foreground">No feedback fields</p>
					)}
				</div>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (stage) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
							<MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-40 sm:w-48">
						<DropdownMenuItem onClick={() => openDetails(stage)} className="text-xs sm:text-sm">
							<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(stage)} className="text-xs sm:text-sm">
							<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setStageToDelete(stage);
								setDeleteConfirmOpen(true);
							}}
							className="text-red-600 text-xs sm:text-sm"
						>
							<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white rounded-lg min-h-screen">
			{/* Header Section */}
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
				<h1 className="text-xl sm:text-2xl font-bold">Interview Stages</h1>
				<div className="flex items-center justify-end">
					<CreateInterviewStageDialog
						isOpen={openCreateEditDialog}
						onOpenChange={(open) => {
							setOpenCreateEditDialog(open);
							if (!open) setSelectedStage(null);
						}}
						jobPositionId={selectedStage?.job_position_advert || 0}
						editingStage={selectedStage}
						onSuccess={() => {
							if (tableRefreshRef.current) tableRefreshRef.current();
							setSelectedStage(null);
						}}
						showTrigger={true}
						triggerButton={
							<Button className="flex items-center gap-2 w-full sm:w-auto">
								<Plus className="h-4 w-4" />
								<span className="hidden sm:inline">Create Interview Stage</span>
								<span className="sm:hidden">Create Stage</span>
							</Button>
						}
					/>
				</div>
			</div>

			{/* Search Section */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full"
						placeholder="Search interview stages..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			{/* Table Section */}
			<PaginatedTable<IInterviewStage>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await INTERVIEW_STAGES_API.getPaginatedInterviewStages({
						institutionId: currentInstitution.id,
						search: searchTerm || undefined,
						ordering,
					});
				}}
				fetchFromUrl={INTERVIEW_STAGES_API.getPaginatedStagesFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) => {
					console.log("\n\n\n Error : ", err);
					showErrorToast({ error: err, defaultMessage: "Failed to fetch interview stages" });
				}}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-8 sm:py-12">
						<p className="text-muted-foreground mb-4 text-sm sm:text-base">
							No interview stages found
						</p>
					</div>
				}
			/>

			{/* Details Dialog */}
			{selectedStage && (
				<Dialog
					open={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedStage(null);
					}}
				>
					<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="text-lg sm:text-xl">
								Interview Stage Details: {selectedStage.name}
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 text-sm sm:text-base">
							<div>
								<label className="text-sm font-medium">Stage Name</label>
								<p className="mt-1">{selectedStage.name}</p>
							</div>

							<div>
								<label className="text-sm font-medium">Level</label>
								<p className="mt-1">{selectedStage.level}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Interviewers</label>
								<div className="flex flex-wrap gap-2 mt-1">
									{selectedStage.interviewers_details &&
									selectedStage.interviewers_details.length > 0 ? (
										selectedStage.interviewers_details.map((interviewer, idx) => (
											<Badge key={idx} variant="secondary" className="text-xs">
												{`${interviewer.name || interviewer.user?.fullname || "Unknown"}`}
											</Badge>
										))
									) : (
										<p className="text-sm text-muted-foreground">No interviewers assigned</p>
									)}
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
									<label className="text-sm font-medium">Feedback Fields</label>
									<span className="text-sm text-muted-foreground">
										{selectedStage.feedback_fields?.length || 0} field(s)
									</span>
								</div>
								<FeedbackFieldsModal
									isOpen={isFeedbackFieldsModalOpen}
									onOpenChange={(open) => setIsFeedbackFieldsModalOpen(open)}
									fields={selectedStage.feedback_fields || []}
									onFieldsChange={(fields) => {
										if (selectedStage) {
											const updatedStage = { ...selectedStage, feedback_fields: fields };
											setSelectedStage(updatedStage);
										}
									}}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsFeedbackFieldsModalOpen(true)}
									className="w-full sm:w-auto"
								>
									<Plus className="h-4 w-4 mr-2" />
									Configure Feedback Fields ({selectedStage.feedback_fields?.length || 0})
								</Button>
								{selectedStage.feedback_fields && selectedStage.feedback_fields.length > 0 && (
									<div className="mt-4 p-3 border rounded-lg bg-slate-50">
										<h4 className="text-sm font-semibold text-gray-700 mb-3">
											Added Fields ({selectedStage.feedback_fields.length})
										</h4>
										<div className="space-y-2 max-h-32 overflow-y-auto">
											{selectedStage.feedback_fields.map((field, index) => (
												<div
													key={index}
													className="flex items-center justify-between p-2 bg-white border rounded-md shadow-sm"
												>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-gray-900 truncate">
															{field.label}
														</p>
														<div className="flex items-center gap-2 mt-1">
															<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
																{field.type.charAt(0).toUpperCase() + field.type.slice(1)}
															</span>
															{field.options && (
																<span className="text-xs text-gray-500">
																	{field.options.length} options
																</span>
															)}
														</div>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => {
															const updatedFields = (selectedStage.feedback_fields || []).filter(
																(_, i) => i !== index,
															);
															setSelectedStage({
																...selectedStage,
																feedback_fields: updatedFields,
															});
															// Optionally update the backend here if needed
														}}
														className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
													>
														<Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
													</Button>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Interview Stage"
				description="Are you sure you want to delete this interview stage? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
