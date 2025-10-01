"use client";

import { useSelector, useDispatch } from "react-redux";

import { Button } from "../ui/button";
import { selectRequiredAnnouncementAcknowledgment } from "@/store/miscellaneous/selectors";
import { IAcknowledgment } from "@/types/announcements.types";
import { useEffect, useState } from "react";
import { ACKNOWLEDGMENTS_API } from "@/lib/api/announcements.utils";
import { showErrorToast } from "@/lib/utils";
import { clearAcknowledgmentRequiredAnnouncement } from "@/store/miscellaneous/actions";

const AnnouncementAcknowledgementPopup: React.FC = () => {
	const announcement = useSelector(selectRequiredAnnouncementAcknowledgment);
	const [thisAnnouncementAcknowledgment, setThisAnnouncementAcknowledgment] =
		useState<IAcknowledgment | null>(null);
	const dispatch = useDispatch();

	useEffect(() => {
		if (announcement) {
			fetchAcknowledgment();
		}
	}, [announcement]);

	const fetchAcknowledgment = async () => {
		try {
			const response = await ACKNOWLEDGMENTS_API.getOneForLoggedInEmployee();
			setThisAnnouncementAcknowledgment(response);
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to proceed with this operation, try reloading this page",
			});
		}
	};

	const acknowledgeAnnouncement = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.stopPropagation();
		if (!thisAnnouncementAcknowledgment) {
			return;
		}
		try {
			const response = ACKNOWLEDGMENTS_API.acknowledge({
				ack_id: thisAnnouncementAcknowledgment.id,
			});
			dispatch(clearAcknowledgmentRequiredAnnouncement());
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to acknowledge this announcement, reload this page and try again",
			});
		}
	};

	if (!announcement) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] pointer-events-none">
			<div className="bg-white p-6 rounded-lg shadow-lg">
				<p className="mb-4">
					You are required to acknowledge this announcement before you can proceed.
				</p>
				<div className="max-h-[50svh] h-full overflow-y-auto">
					<p className="text-sm text-gray-600 whitespace-pre-wrap">
						{announcement.content || "No content"}
					</p>
				</div>
				<div className="flex justify-end gap-4">
					<Button
						className="px-4 py-2 bg-red-500 text-white rounded-full min-w-32 hover:bg-red-600"
						onClick={(e) => acknowledgeAnnouncement}
					>
						Acknowledge
					</Button>
				</div>
			</div>
		</div>
	);
};

export default AnnouncementAcknowledgementPopup;
