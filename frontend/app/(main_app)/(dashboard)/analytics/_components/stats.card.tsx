import Link from "next/link";
import { Icon } from "@iconify/react";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface Props {
	index: number;
	bg?: string;
	color?: string;
	icon: string;
	link?: string;
	title: string;
	value: string | number;
	className?: string;
}

const colors = [
	{ fg: "text-orange-600", bg: "bg-orange-100" },
	{ fg: "text-indigo-600", bg: "bg-indigo-100" },
	{ fg: "text-emerald-600", bg: "bg-emerald-100" },
	{ fg: "text-blue-600", bg: "bg-blue-100" },

	{ fg: "text-emerald-600", bg: "bg-emerald-100" },
	{ fg: "text-orange-600", bg: "bg-orange-100" },
	{ fg: "text-indigo-600", bg: "bg-indigo-100" },
	{ fg: "text-blue-600", bg: "bg-blue-100" },

	{ fg: "text-orange-600", bg: "bg-orange-100" },
];

export default function StatsCard({
	index,
	bg,
	color: fg,
	icon,
	link,
	title,
	value,
	className = "",
}: Props) {
	const [color] = useState(bg && fg ? { bg, fg } : colors[index]);
	return (
		<Card className={`shadow-none border p-3 sm:p-4 ${className}`}>
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
					<div
						className={`w-8 h-8 sm:w-10 sm:h-10 ${color.bg} rounded-lg sm:rounded-xl p-1.5 sm:p-2 flex items-center justify-center flex-shrink-0`}
					>
						<Icon icon={icon} className={`!w-5 !h-5 sm:!w-7 sm:!h-7 ${color.fg}`} />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">{title}</p>
						<p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{value}</p>
					</div>
				</div>
				{link && (
					<Link
						href={link}
						className="!rounded-full aspect-square hover:bg-gray-100 border border-black/20 p-1.5 sm:p-2 transition-colors flex-shrink-0 ml-2"
					>
						<Icon icon="hugeicons:arrow-up-right-01" className="!size-3 sm:!size-4" />
					</Link>
				)}
			</div>
		</Card>
	);
}
