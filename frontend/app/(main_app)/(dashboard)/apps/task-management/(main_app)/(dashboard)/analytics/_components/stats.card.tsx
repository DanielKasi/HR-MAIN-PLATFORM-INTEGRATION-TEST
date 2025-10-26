import Link from "next/link";
import { Icon } from "@iconify/react";
import { Card } from "@/platform/v1/components";
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
		<Card className={`shadow-none border p-4 ${className}`}>
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3">
					<div className={`w-10 h-10 ${color.bg} rounded-xl p-2 flex items-center justify-center`}>
						<Icon icon={icon} className={`!w-7 !h-7 ${color.fg}`} />
					</div>
					<div>
						<p className="text-base text-gray-600">{title}</p>
						<p className="text-2xl font-bold">{value}</p>
					</div>
				</div>
				{link && (
					<Link
						href={link}
						className="!rounded-full aspect-square hover:bg-gray-100 border border-black/20 p-2 transition-colors"
					>
						<Icon icon="hugeicons:arrow-up-right-01" className="!size-4" />
					</Link>
				)}
			</div>
		</Card>
	);
}
