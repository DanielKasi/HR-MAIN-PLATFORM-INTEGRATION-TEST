"use client";

import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ANNOUNCEMENTS_API } from "@/lib/api/announcements.utils";
import { IAnnouncement } from "@/types/announcements.types";
import { showErrorToast } from "@/lib/utils";
import CardSkeleton from "@/components/common/skeletons/card-skeleton";

const AnnouncementCarousel: React.FC = () => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const fetchAnnouncements = async () => {
			if (!currentInstitution) return;
			try {
				setLoading(true);
				const response = await ANNOUNCEMENTS_API.getPaginated({
					page: 1,
					search: undefined,
					ordering: "-created_at",
					page_size: 3,
				});
				setAnnouncements(response.results);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch announcements" });
			} finally {
				setLoading(false);
			}
		};

		fetchAnnouncements();
	}, [currentInstitution]);

	// Auto-cycle announcements every 10 seconds
	useEffect(() => {
		const displayedAnnouncements = announcements.slice(0, 3);
		if (displayedAnnouncements.length <= 1) return;

		intervalRef.current = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % displayedAnnouncements.length);
		}, 10000);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [announcements]);

	const handleDotClick = (index: number) => {
		setCurrentIndex(index);
		if (intervalRef.current) clearInterval(intervalRef.current);
		intervalRef.current = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % announcements.slice(0, 3).length);
		}, 10000);
	};

	if (loading) {
		return (
			<Card className="md:col-span-2 shadow-sm border-none bg-white !h-[6.5rem] !max-h-[6.5rem]">
				<CardSkeleton lines={1} avatarCount={0} showBadge={false} showActions={false} />
			</Card>
		);
	}

	if (announcements.length === 0) {
		return (
			<Card className="md:col-span-2 shadow-sm border-none bg-white !h-[6.5rem]">
				<CardHeader className="flex flex-row items-center justify-between py-2">
					<CardTitle className="text-lg font-medium">Announcements</CardTitle>
					<Link href="/announcements">
						<ChevronRight className="w-4 h-4 text-gray-400" />
					</Link>
				</CardHeader>
				<div className="px-6 text-sm text-gray-600">No announcements available</div>
			</Card>
		);
	}

	//   const displayedAnnouncements = announcements.slice(0, 3);

	return (
		<Card className="md:col-span-2 shadow-sm border-none bg-white !h-[6.5rem] overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between py-2">
				<CardTitle className="text-lg font-medium">Announcements</CardTitle>
				<Link href="/announcements">
					<ChevronRight className="w-4 h-4 text-gray-400" />
				</Link>
			</CardHeader>
			<div className="relative h-[2.5rem] overflow-hidden">
				<div
					className="flex transition-transform duration-500 ease-in-out"
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
				>
					{announcements.map((announcement) => (
						<div
							key={announcement.id}
							className="min-w-full px-6 text-sm text-gray-600 flex items-center"
						>
							<span className="truncate">
								<strong>{announcement.title}</strong>:{" "}
								{announcement.content?.substring(0, 50) +
									(announcement.content && announcement.content.length > 50 ? "..." : "")}
							</span>
						</div>
					))}
				</div>
			</div>
			{announcements.length && (
				<div className="flex items-center justify-center z-10 gap-2 mt-2">
					{announcements.slice(0, 3).map((_, index) => (
						<button
							key={index}
							onClick={() => handleDotClick(index)}
							className={`w-2 h-[5px] rounded-full shadow-sm transition-all ${
								index === currentIndex
									? "bg-primary scale-125 !w-6"
									: "bg-gray-300 hover:bg-gray-400"
							}`}
						/>
					))}
				</div>
			)}
		</Card>
	);
};

export default AnnouncementCarousel;
