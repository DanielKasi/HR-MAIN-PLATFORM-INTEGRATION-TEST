"use client";

import type { SetupStep } from "./types";

import { Check, Circle } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface SetupGuideStepProps {
	step: SetupStep;
	stepNumber: number;
	totalSteps: number;
	isActive: boolean;
	onClick?: () => void;
}

export function SetupGuideStep({
	step,
	stepNumber,
	totalSteps,
	isActive,
	onClick,
}: SetupGuideStepProps) {
	// Determine status icon and colors
	const getStatusIcon = () => {
		switch (step.status) {
			case "completed":
				return (
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
						<Check className="h-5 w-5" />
					</div>
				);
			case "in-progress":
				return (
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white border-2 border-blue-500">
						<Circle className="h-5 w-5 fill-white" />
					</div>
				);
			default:
				return (
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-500">
						<Circle className="h-5 w-5" />
					</div>
				);
		}
	};

	const getStatusText = () => {
		switch (step.status) {
			case "completed":
				return <span className="text-xs text-green-500 px-1">Completed</span>;
			case "in-progress":
				return <span className="text-xs text-blue-500 px-1">In Progress</span>;
			default:
				return <span className="text-xs text-gray-400 px-1">Pending</span>;
		}
	};

	// Determine line color based on status
	const getLineColor = () => {
		switch (step.status) {
			case "completed":
				return "bg-green-500";
			case "in-progress":
				return "bg-blue-500";
			default:
				return "bg-blue-100";
		}
	};

	return (
		<div className={cn("flex flex-col", isActive ? "opacity-100" : "opacity-70")}>
			<div className="flex items-center">
				{/* Status icon */}
				{getStatusIcon()}

				{/* Connecting line (if not the last step) */}
				{stepNumber < totalSteps && <div className={cn("h-0.5 flex-1", getLineColor())} />}
			</div>

			{/* Step content */}
			<div className="mt-2">
				<div className="text-xs text-gray-500">STEP {stepNumber}</div>
				<Link
					className="font-medium hover:text-blue-600 transition-colors"
					href={step.to_complete_step_page_link}
					onClick={onClick}
				>
					{step.title}
				</Link>
				{getStatusText()}
			</div>
		</div>
	);
}
