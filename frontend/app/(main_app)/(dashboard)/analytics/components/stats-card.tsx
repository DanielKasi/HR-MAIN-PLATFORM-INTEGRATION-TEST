import Link from "next/link";
import { Icon } from "@iconify/react";
import { Card } from "@/components/ui/card";

interface Props {
	bg: string;
	color: string;
	icon: string;
	link?: string;
	title: string;
	value: string | number;
	className?: string;
}

export default function OverviewCard({
	bg,
	color,
	icon,
	link,
	title,
	value,
	className = "",
}: Props) {
	return (
		<Card className={`shadow-none border p-4 ${className}`}>
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3">
					<div className={`w-10 h-10 ${bg} rounded-xl p-2 flex items-center justify-center`}>
						<Icon icon={icon} className={`!w-7 !h-7 ${color}`} />
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
						<Icon icon="hugeicons:arrow-up-right-01" className="!size-3" />
					</Link>
				)}
			</div>
		</Card>
	);
}
