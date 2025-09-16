"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface SpotcheckExpiredModalProps {
	isOpen: boolean;
	onClose: () => void;
	onRedirectToProfile: () => void;
}

export const SpotcheckExpiredModal = ({
	isOpen,
	onClose,
	onRedirectToProfile,
}: SpotcheckExpiredModalProps) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
							<AlertTriangle className="w-5 h-5 text-red-600" />
						</div>
						<div>
							<DialogTitle className="text-lg font-semibold text-gray-900">
								Spot Check Expired
							</DialogTitle>
							<DialogDescription className="text-sm text-gray-600 mt-1">
								This spot check is no longer available for check-in.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="py-4">
					<p className="text-sm text-gray-700">
						The spot check you're trying to access has expired or is no longer in a valid state. You
						will be redirected to your employee profile.
					</p>
				</div>

				<div className="flex justify-end space-x-3">
					<Button variant="outline" onClick={onClose} className="rounded-full">
						Close
					</Button>
					<Button
						onClick={onRedirectToProfile}
						className="bg-primary hover:bg-primary/90 text-white rounded-full"
					>
						Go to Profile
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
