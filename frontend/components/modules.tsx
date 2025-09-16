"use client";

import { useState } from "react";
import { Blocks } from "lucide-react"; // Using Blocks icon for the dropdown trigger
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Modules() {
	const [isHovered, setIsHovered] = useState(false);
	const router = useRouter();

	// Main modules data with icons matching the reference image
	const modules = [
		{
			id: "hr",
			name: "HR",
			link: "/hrms/dashboard",
			icon: <Icon icon="hugeicons:user-settings-01" width="24" height="24" />,
		},
		{
			id: "accounting",
			name: "Accounting",
			link: "/accounting/dashboard",
			icon: <Icon icon="hugeicons:bitcoin-graph" width="24" height="24" />,
		},
		{
			id: "crm",
			name: "CRM",
			link: "/crm/dashboard",
			icon: <Icon icon="hugeicons:user-multiple-02" width="24" height="24" />,
		},
	];

	const handleModuleClick = (link: string) => {
		router.push(link);
	};

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					className="text-gray-900 bg-white hover:bg-gray-100 p-3 rounded-full border-none outline-none "
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
					<Icon icon="hugeicons:block-game" width="24" height="24" />
					<span
						className={`text-gray-100 px-2 py-1 rounded-sm z-10 bg-gray-600 text-xs font-medium absolute -top-6 left-1/2 transform -translate-x-1/2 pointer-events-none whitespace-nowrap ${
							isHovered ? "opacity-100" : "opacity-0"
						}`}
					>
						Modules
					</span>

					<span className="sr-only">Modules</span>
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="bg-white p-4 rounded-2xl shadow-lg w-64"
				sideOffset={5}
			>
				{/* This is the card that exactly matches your reference image */}
				<div className="b">
					<div className="flex justify-between items-center">
						{modules.map((module) => (
							<div
								role="module-click-handler"
								key={module.id}
								className="flex flex-col items-center cursor-pointer"
								onClick={() => handleModuleClick(module.link)}
							>
								<div className="rounded-full border border-gray-200 w-12 h-12 flex items-center justify-center mb-2">
									<div className="">{module.icon}</div>
								</div>
								<h3 className="text-sm font-bold text-gray-900">{module.name}</h3>
							</div>
						))}
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
