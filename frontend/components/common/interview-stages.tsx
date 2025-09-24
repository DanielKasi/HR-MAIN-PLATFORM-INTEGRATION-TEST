"use client";

import React from "react";
import { Eye, Edit, MoreVertical, Briefcase } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProcessedStage {
	id: string;
	name: string;
	count: number;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
	level: number;
	interviewer: string;
	candidates?: any[];
}

interface InterviewStagesPanelProps {
	stages: ProcessedStage[];
	activeStageId: string | null;
	onStageSelect: (stageId: string) => void;
	onViewStageDetails?: (stage: ProcessedStage) => void;
	onEditStage?: (stage: ProcessedStage) => void;
	showDropdownActions?: boolean;
	maxHeight?: string;
	title?: string;
	showCount?: boolean;
}

export const InterviewStagesPanel: React.FC<InterviewStagesPanelProps> = ({
	stages,
	activeStageId,
	onStageSelect,
	onViewStageDetails,
	onEditStage,
	showDropdownActions = true,
	maxHeight = "max-h-[500px]",
	title,
	showCount = true,
}) => {
	const defaultTitle = showCount ? `Interview Stages (${stages.length})` : "Interview Stages";

	const handleStageClick = (stageId: string) => {
		onStageSelect(stageId);
	};

	const handleViewDetails = (stage: ProcessedStage, e: React.MouseEvent) => {
		e.stopPropagation();
		if (onViewStageDetails) {
			onViewStageDetails(stage);
		}
	};

	const handleEdit = (stage: ProcessedStage, e: React.MouseEvent) => {
		e.stopPropagation();
		if (onEditStage) {
			onEditStage(stage);
		}
	};

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Briefcase className="h-5 w-5" />
					{title || defaultTitle}
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<div className={`space-y-1 ${maxHeight} overflow-y-auto`}>
					{stages.map((stage) => (
						<div
							key={stage.id}
							className={`p-4 cursor-pointer transition-all duration-200 border-l-4 hover:bg-gray-50 ${
								activeStageId === stage.id
									? "bg-blue-50 border-l-blue-500 shadow-sm"
									: "border-l-transparent hover:border-l-gray-300"
							}`}
							onClick={() => handleStageClick(stage.id)}
						>
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center space-x-3">
									<div className={`p-2 rounded-lg ${stage.bgColor}`}>
										<div className={stage.color}>{stage.icon}</div>
									</div>
									<div>
										<h4 className="font-semibold text-sm">{stage.name}</h4>
										<p className="text-xs text-gray-500">Level {stage.level}</p>
									</div>
								</div>

								{/* Right side with Badge and Optional Dropdown */}
								<div className="flex items-center gap-2">
									{/* Dropdown Menu - Only show if actions are provided */}
									{showDropdownActions && (onViewStageDetails || onEditStage) && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
												<button className="p-1 rounded-md hover:bg-gray-200 transition-colors">
													<MoreVertical className="h-4 w-4 text-gray-500" />
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{onViewStageDetails && (
													<DropdownMenuItem
														onClick={(e) => handleViewDetails(stage, e)}
														className="text-xs sm:text-sm"
													>
														<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
														View Details
													</DropdownMenuItem>
												)}
												{onEditStage && (
													<DropdownMenuItem
														onClick={(e) => handleEdit(stage, e)}
														className="text-xs sm:text-sm"
													>
														<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
														Edit
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</div>
							</div>

							<div className="text-xs text-gray-500 ml-11">Interviewer: {stage.interviewer}</div>

							{activeStageId === stage.id && (
								<div className="text-xs text-blue-600 ml-11 mt-1 flex items-center gap-1">
									<Eye className="h-3 w-3" />
									<span>Currently viewing</span>
								</div>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
};
