"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import { useSelector } from "react-redux";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ACKNOWLEDGMENTS_API } from "@/lib/api/announcements.utils";
import { IAcknowledgment } from "@/types/announcements.types";
import { showErrorToast } from "@/lib/utils";
import CardSkeleton from "@/components/common/skeletons/card-skeleton";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/helpers";

const AnnouncementCarousel: React.FC = () => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [acknowledgmentAnnouncements, setAcknowledgmentAnnouncements] = useState<IAcknowledgment[]>(
		[],
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const router = useRouter();

	useEffect(() => {
		const fetchAcknowlegmentAnnouncements = async () => {
			if (!currentInstitution) return;
			try {
				setLoading(true);
				const response = await ACKNOWLEDGMENTS_API.getPaginated({
					page: 1,
				});
				setAcknowledgmentAnnouncements(response.results);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch announcements" });
			} finally {
				setLoading(false);
			}
		};

		fetchAcknowlegmentAnnouncements();
	}, [currentInstitution]);

	// Auto-cycle announcements every 10 seconds
	useEffect(() => {
		const displayedAnnouncements = acknowledgmentAnnouncements.slice(0, 3);
		if (displayedAnnouncements.length <= 1) return;

		intervalRef.current = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % displayedAnnouncements.length);
		}, 10000);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [acknowledgmentAnnouncements]);

	const handleDotClick = (index: number) => {
		setCurrentIndex(index);
		if (intervalRef.current) clearInterval(intervalRef.current);
		intervalRef.current = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % acknowledgmentAnnouncements.slice(0, 3).length);
		}, 10000);
	};

	if (loading) {
		return (
			<Card className="md:col-span-2 shadow-sm border-none bg-white !h-[6.5rem] !max-h-[6.5rem]">
				<CardSkeleton lines={1} avatarCount={0} showBadge={false} showActions={false} />
			</Card>
		);
	}

	if (acknowledgmentAnnouncements.length === 0) {
		return (
			<Card className="md:col-span-2 shadow-sm border-none bg-white !h-full !min-h-full">
				<CardHeader className="flex flex-row items-center justify-between py-2">
					<CardTitle className="text-lg font-medium">Notice Board</CardTitle>
					<Link href="/announcements">
						<ChevronRight className="w-4 h-4 text-gray-400" />
					</Link>
				</CardHeader>
				<div className="px-6 text-sm text-gray-600">No notices available</div>
			</Card>
		);
	}

	return (
		<Card className="md:col-span-2 shadow-sm  flex flex-col justify-between border-none bg-white !h-full overflow-hidden">
			<CardHeader className="flex flex-row items-start justify-between !py-2 !pt-6">
				<CardTitle className="text-lg font-medium">Notice Board</CardTitle>
				<Link
					className="flex items-center justify-end gap-2 text-xs md:text-sm underline underline-offset-2 decoration-primary text-primary"
					href="/announcements"
				>
					<span className="">View All</span>
					<ChevronRight className="w-4 h-4 text-primary" />
				</Link>
			</CardHeader>

			<div className="relative overflow-hidden cursor-pointer h-full max-h-[calc(100%-4.5rem)]">
				<div
					className="flex transition-transform duration-500 ease-in-out "
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
				>
					{acknowledgmentAnnouncements.map((acknowledgement) => (
						<div key={acknowledgement.id} className="min-w-full px-6 text-sm">
							<div className="min-h-[80%]">
								{acknowledgement.announcement.created_at && (
									<div className="flex items-center justify-between gap-4 mt-4">
										<span className="text-sm text-gray-600">
											{formatDate(acknowledgement.announcement.created_at, true)}
										</span>
									</div>
								)}

								<p className="truncate text-gray-700 text-2xl font-semibold w-full mb-4">
									{acknowledgement.announcement.title}
								</p>

								<div className="w-full flex flex-col gap-2">
									<div className="min-h-[4rem] mb-auto">
										<p className="text-base text-gray-600 line-clamp-6">
											{/* {acknowledgement.announcement.content} */}
											Lorem ipsum dolor sit amet, consectetur adipiscing elit. In quis rhoncus mi.
											Etiam
										</p>
									</div>
									<Link
										className="flex items-center justify-start w-full mt-10 gap-2 text-xs md:text-sm underline underline-offset-2 decoration-primary text-primary"
										href={`/announcements/${acknowledgmentAnnouncements[currentIndex].announcement.id}`}
									>
										<span className="">Read More</span>
										<ChevronRight className="w-4 h-4 text-primary" />
									</Link>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
			{acknowledgmentAnnouncements.length && (
				<div className="flex items-center justify-center min-h-6 z-100 gap-2 mb-2">
					{acknowledgmentAnnouncements.slice(0, 3).map((_, index) => (
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
