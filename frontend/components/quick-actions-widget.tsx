"use client";

import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface QuickAction {
	id: string;
	label: string;
	icon: string;
	bgColor: string;
	href?: string;
	action?: () => void;
}

const QuickActionsWidget = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const [hoveredAction, setHoveredAction] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	const quickActions: QuickAction[] = [
		{
			id: "add-employee",
			label: "Add Employee",
			icon: "hugeicons:user-multiple-02",
			bgColor: "bg-blue-600 hover:bg-blue-700",
			href: "/employees/add-employee",
		},
		{
			id: "add-event",
			label: "Add Event",
			icon: "hugeicons:date-time",
			bgColor: "bg-blue-600 hover:bg-blue-700",
			href: "/events-holidays/events/add",
		},
		{
			id: "create-report",
			label: "Create Report",
			icon: "hugeicons:google-doc",
			bgColor: "bg-blue-600 hover:bg-blue-700",
			href: "",
		},
		{
			id: "view-attendance",
			label: "View Attendance",
			icon: "hugeicons:time-02",
			bgColor: "bg-blue-600 hover:bg-blue-700",
			href: "/employees/attendance",
		},
		{
			id: "analytics",
			label: "Analytics",
			icon: "hugeicons:analysis-text-link",
			bgColor: "bg-blue-600 hover:bg-blue-700",
			href: "",
		},
		{
			id: "settings",
			label: "Settings",
			icon: "hugeicons:settings-01",
			bgColor: "bg-blue-600 hover:bg-blue-700",
			href: "",
		},
	];

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handleActionClick = (action: QuickAction) => {
		if (action.href) {
			router.push(action.href);
		}
		if (action.action) {
			action.action();
		}
		setIsOpen(false);
	};

	return (
		<>
			<style jsx>{`
				@keyframes slideUp {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.action-circle {
					animation: slideUp 0.3s ease-out;
				}

				.action-circle:nth-child(1) {
					animation-delay: 0ms;
				}
				.action-circle:nth-child(2) {
					animation-delay: 30ms;
				}
				.action-circle:nth-child(3) {
					animation-delay: 60ms;
				}
				.action-circle:nth-child(4) {
					animation-delay: 90ms;
				}
				.action-circle:nth-child(5) {
					animation-delay: 120ms;
				}
				.action-circle:nth-child(6) {
					animation-delay: 150ms;
				}

				.button-rotate {
					transition: transform 0.3s ease-out;
				}

				.button-rotate.open {
					transform: rotate(45deg);
				}
			`}</style>

			<div ref={containerRef} className="fixed bottom-24 right-6 z-50 pointer-events-none">
				{isOpen && (
					<div className="absolute bottom-full right-1/2 transform translate-x-1/2 mb-4 pointer-events-auto flex flex-col items-center gap-3">
						{quickActions.map((action) => (
							<div key={action.id} className="relative">
								{hoveredAction === action.id && (
									<div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-white text-black text-xs rounded shadow-lg whitespace-nowrap">
										{action.label}
										<div className="absolute left-full top-1/2 transform -translate-y-1/2">
											<div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[4px] border-t-transparent border-b-transparent border-l-white" />
										</div>
									</div>
								)}

								<button
									onClick={() => handleActionClick(action)}
									onMouseEnter={() => setHoveredAction(action.id)}
									onMouseLeave={() => setHoveredAction(null)}
									className={`action-circle relative h-10 w-10 rounded-full bg-primary text-white shadow-md transition-all duration-200 hover:shadow-lg transform hover:scale-110 flex items-center justify-center pointer-events-auto`}
								>
									<Icon icon={action.icon} width="20" height="20" />
								</button>
							</div>
						))}
					</div>
				)}

				<div className="flex flex-col items-center pointer-events-auto">
					<div className="relative">
						{showTooltip && !isOpen && (
							<div className="absolute bottom-16 right-0 mb-2 px-3 py-2 bg-white text-black text-sm rounded-lg shadow-lg animate-in fade-in duration-200 whitespace-nowrap">
								Quick Actions
								<div className="absolute bottom-0 right-6 transform translate-y-full">
									<div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
								</div>
							</div>
						)}

						<Button
							onClick={() => setIsOpen(!isOpen)}
							onMouseEnter={() => setShowTooltip(true)}
							onMouseLeave={() => setShowTooltip(false)}
							className={`pointer-events-auto relative text-white rounded-full p-0 shadow-xl transition-all duration-300 hover:shadow-2xl transform hover:scale-110 group overflow-hidden button-rotate ${
								isOpen ? "open" : ""
							}`}
							style={{ width: "52px", height: "52px" }}
						>
							{/* <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" /> */}
							<div className="relative z-10 flex items-center justify-center">
								<Icon icon="hugeicons:plus-sign" width="24" height="24" />
							</div>
						</Button>
					</div>
				</div>
			</div>
		</>
	);
};

export default QuickActionsWidget;
