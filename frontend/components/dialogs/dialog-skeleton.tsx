"use client";

import type React from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
interface DialogSkeletonProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	className?: string;
	onConfirm?: () => void;
	confirmText?: string;
	cancelText?: string;
	confirmDisabled?: boolean;
	showActions?: boolean;
}

export function DialogSkeleton({
	isOpen,
	onClose,
	title,
	children,
	className = "",
	onConfirm,
	confirmText = "Confirm",
	cancelText = "Cancel",
	confirmDisabled = false,
	showActions = true,
}: DialogSkeletonProps) {
	const handleConfirm = () => {
		onConfirm?.();
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className={`sm:max-w-lg md:max-w-xl ${className}`}>
				<DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
					<DialogTitle className="text-lg font-semibold text-center w-full">{title}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 overflow-y-auto max-h-[70svh] md:max-h-[60svh] py-6">
					{children}
				</div>

				{showActions && (
					<div className="flex items-center space-x-2 pt-4">
						<Button
							onClick={handleConfirm}
							disabled={confirmDisabled}
							className="rounded-full w-full"
						>
							{confirmText}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
