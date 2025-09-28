"use client";

import { useState } from "react";
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

	const modules = [
		{
			id: "accounting",
			name: "Accounting",
			link: "#",
			icon: <Icon icon="hugeicons:bitcoin-graph" width="24" height="24" />,
		},
		{
			id: "task_mgmt",
			name: "Tasks",
			link: "https://hrms.baifamgroup.co.ug",
			icon: <Icon icon="hugeicons:gitbook" width="24" height="24" />,
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
				className="bg-white p-4 rounded-2xl shadow-lg w-fit min-w-48"
				sideOffset={5}
			>
				{/* This is the card that exactly matches your reference image */}
				<div className="b">
					<div className="flex justify-center gap-4 items-center">
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
