"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	description: string;
	disabled?: boolean;
	confirmText?: string;
	cancelText?: string;
}

export function ConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	disabled = false,
	confirmText = "Confirm",
	cancelText = "Cancel",
}: ConfirmationDialogProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent className="min-w-min">
				<AlertDialogHeader className="">
					<AlertDialogTitle className="max-w-full !overflow-x-hidden line-clamp-1">
						{title}
					</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="grid grid-cols-2 !max-w-full  !w-fullgap-4">
					<AlertDialogCancel className="rounded-full" disabled={disabled}>
						{cancelText}
					</AlertDialogCancel>
					<AlertDialogAction className="rounded-full" disabled={disabled} onClick={onConfirm}>
						{confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
