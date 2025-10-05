"use client";

import { useSelector, useDispatch } from "react-redux";
import { Button } from "../ui/button";
import { selectRequiredAnnouncementAcknowledgment } from "@/store/miscellaneous/selectors";
import { IAcknowledgment } from "@/types/announcements.types";
import { useEffect, useState } from "react";
import { ACKNOWLEDGMENTS_API } from "@/lib/api/announcements.utils";
import { showErrorToast } from "@/lib/utils";
import { clearAcknowledgmentRequiredAnnouncement } from "@/store/miscellaneous/actions";
import { Icon } from "@iconify/react";

const AnnouncementAcknowledgementPopup: React.FC = () => {
	const announcement = useSelector(selectRequiredAnnouncementAcknowledgment);
	const [isAcknowledging, setIsAcknowledging] = useState(false);
	const [thisAnnouncementAcknowledgment, setThisAnnouncementAcknowledgment] =
		useState<IAcknowledgment | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const dispatch = useDispatch();

	useEffect(() => {
		return () => {
			dispatch(clearAcknowledgmentRequiredAnnouncement());
		};
	}, []);

	useEffect(() => {
		if (announcement) {
			fetchAcknowledgment();
			// Trigger animation after mount
			setTimeout(() => setIsVisible(true), 50);
		}
	}, [announcement]);

	const fetchAcknowledgment = async () => {
		if (!announcement) return;
		try {
			const response = await ACKNOWLEDGMENTS_API.getOneForLoggedInEmployee({
				announcement_id: announcement.id,
			});
			if (response.length !== 0) {
				setThisAnnouncementAcknowledgment(response[0]);
			}
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to proceed with this operation, try reloading this page",
			});
		}
	};

	const acknowledgeAnnouncement = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.stopPropagation();
		if (!thisAnnouncementAcknowledgment) {
			return;
		}
		try {
			setIsAcknowledging(true);
			const response = await ACKNOWLEDGMENTS_API.acknowledge({
				ack_id: thisAnnouncementAcknowledgment.id,
			});

			setIsAcknowledging(false);
			dispatch(clearAcknowledgmentRequiredAnnouncement());
		} catch (error) {
			setIsAcknowledging(false);
			showErrorToast({
				error,
				defaultMessage: "Failed to acknowledge this announcement, reload this page and try again",
			});
		}
	};

	if (!announcement) return null;

	return (
		<div
			className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] pointer-events-auto transition-opacity duration-300 ${
				isVisible ? "opacity-100" : "opacity-0"
			}`}
		>
			<div
				className={`bg-gradient-to-br from-white via-white to-blue-50/30 p-8 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden transition-all duration-500 transform sm:mx-6 md:mx-10 ${
					isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
				}`}
			>
				{/* Decorative background elements */}
				<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl -z-10 animate-pulse" />
				<div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />

				{/* Sparkle decorations */}
				<div
					className="absolute top-8 right-12 w-4 h-4 bg-yellow-400 rounded-full animate-ping"
					style={{ animationDelay: "0.5s" }}
				/>
				<div
					className="absolute top-16 right-24 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping"
					style={{ animationDelay: "1s" }}
				/>
				<div
					className="absolute top-12 right-32 w-2 h-2 bg-purple-400 rounded-full animate-ping"
					style={{ animationDelay: "1.5s" }}
				/>

				{/* Icon Section */}
				<div className="flex justify-center mb-6">
					<div className="relative">
						{/* <div className="absolute inset-0 bg-gradient-to-r from-blue-500  via-purple-600 to-orange-600 rounded-full blur-xl opacity-40 animate-pulse" /> */}
						{/* <div className="relative bg-gradient-to-br from-blue-500 via-purple-600 to-orange-600 p-6 rounded-full shadow-lg transform hover:scale-110 transition-transform duration-300 aspect-square">
						</div> */}
						<Icon icon="hugeicons:megaphone-01" className="!w-24 !h-24" strokeWidth={2.5} />,
					</div>
				</div>

				{/* Header */}
				<div className="text-center mb-6">
					<div className="inline-block">
						<h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
							<span className="inline-block w-8 h-px bg-gradient-to-r from-transparent to-blue-600" />
							Important Notice
							<span className="inline-block w-8 h-px bg-gradient-to-l from-transparent to-blue-600" />
						</h2>
					</div>
					<p className="text-gray-600 text-sm">
						Please review and acknowledge this notice to continue
					</p>
				</div>

				{/* Content Section */}
				<div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-inner border border-gray-100 max-h-[50svh] overflow-y-auto">
					<h3 className="text-2xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
						{announcement.title}
					</h3>
					<div className="prose prose-sm max-w-none">
						<p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
							{announcement.content || "No content"}
						</p>
					</div>
				</div>

				{/* Action Button */}
				<div className="flex justify-center mt-8">
					<Button
						size="lg"
						className="px-8 py-6 text-white rounded-full min-w-48 bg-gradient-to-r from-primary to-primary/60 shadow-lg hover:shadow-xl transform transition-all duration-300 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
						onClick={acknowledgeAnnouncement}
						disabled={isAcknowledging}
					>
						{isAcknowledging ? (
							<span className="flex items-center gap-2">
								<svg
									className="animate-spin h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
								Acknowledging...
							</span>
						) : (
							"I Acknowledge"
						)}
					</Button>
				</div>
			</div>

			<style jsx>{`
				@keyframes ping {
					75%,
					100% {
						transform: scale(2);
						opacity: 0;
					}
				}
				.animate-ping {
					animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
				}
			`}</style>
		</div>
	);
};

export default AnnouncementAcknowledgementPopup;
