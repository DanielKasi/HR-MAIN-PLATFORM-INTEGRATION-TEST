"use client";

import type React from "react";

import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import Image from "next/image";
import { X } from "lucide-react";

import { InstitutionBranchSelector } from "@/components/institution-branch-selector";
import { Button } from "@/platform/v1/components";

import { NavItemComponent } from "./nav-item";

import { PERMISSION_CODES } from "@/constants";
import { selectSelectedInstitution, selectUser } from "@/lib/modules/task-management/selectors";
import { hasPermission } from "@/lib/helpers";
import { selectSideBarOpened } from "@/lib/modules/task-management/selectors";
import { NavItem } from "@/types/other";
import { useMobile } from "@/hooks/use-mobile";
import {
	closeSideBar,
	openSideBar,
} from "@/lib/modules/task-management/store/miscellaneous/actions";

export default function DashboardSideBar() {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const isMobile = useMobile();
	const currentUser = useSelector(selectUser);
	const isSideBarOpen = useSelector(selectSideBarOpened);
	const dispatch = useDispatch();
	const router = useModuleNavigation("/apps/task-management");
	const [filteredNavItems, setFilteredNavItems] = useState<NavItem[]>([]);

	const [expandedItems, setExpandedItems] = useState<{
		[key: string]: boolean;
	}>({});
	const [InstitutionLogo, setInstitutionLogo] = useState<string | null>(null);
	const [InstitutionName, setInstitutionName] = useState("TASK MANAGEMENT");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrollPercentage, setScrollPercentage] = useState(0);

	useEffect(() => {
		const scrollElement = document.getElementById("mobile-nav-scroll");

		const handleScroll = () => {
			if (scrollElement) {
				const { scrollTop, scrollHeight, clientHeight } = scrollElement;

				const scrollableHeight = scrollHeight - clientHeight;

				if (scrollableHeight > 0) {
					const scrollPercent = (scrollTop / scrollableHeight) * 100;
					setScrollPercentage(Math.min(Math.max(scrollPercent, 0), 100));
				}
			}
		};

		if (scrollElement) {
			scrollElement.addEventListener("scroll", handleScroll);
			setTimeout(handleScroll, 100);
			return () => scrollElement.removeEventListener("scroll", handleScroll);
		}
	}, [mobileMenuOpen, filteredNavItems]);

	useEffect(() => {
		console.log("\n\n isSideBarOpen", isSideBarOpen);
		setMobileMenuOpen(isSideBarOpen ?? false);
	}, [isSideBarOpen]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (mobileMenuOpen && isMobile) {
				const target = event.target as HTMLElement;

				if (!target.closest(".mobile-nav-drawer") && !target.closest(".mobile-menu-button")) {
					onCloseSidebar();
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [mobileMenuOpen, isMobile]);

	useEffect(() => {
		if (selectedInstitution) {
			setInstitutionLogo(selectedInstitution.institution_logo);
			setInstitutionName(selectedInstitution.institution_name);
		}

		const filtered = navItems
			.map((item) => {
				if (item.submenu && item.submenu.length > 0) {
					const filteredSubmenu = item.submenu.filter(
						(subItem) => !subItem.requiredPermission || hasPermission(subItem.requiredPermission),
					);

					return { ...item, submenu: filteredSubmenu };
				}

				return item;
			})
			.filter((item) => {
				return !item.requiredPermission || hasPermission(item.requiredPermission);
			});

		setFilteredNavItems(filtered);
	}, [currentUser, selectedInstitution]);

	const toggleExpand = (title: string) => {
		setExpandedItems((prev) => ({ [title]: !prev[title] }));
	};

	const onCloseSidebar = () => {
		dispatch(closeSideBar());
	};

	const navItems: NavItem[] = [
		{
			title: "Dashboard",
			href: "/dashboard",
			icon: (
				<Icon icon="hugeicons:dashboard-browsing" className="!w-6 !h-6" width="28" height="28" />
			),
			requiredPermission: PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD,
		},

		{
			title: "Project",
			href: "#1",
			icon: <Icon icon="hugeicons:gitbook" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/project" },
				{ title: "Project Statuses", href: "/projects/project-statuses" },
				{ title: "Project Task Priorities", href: "/projects/project-task-priorities" },
				{ title: "Project Completed Tasks", href: "/projects/completed-tasks" },
				{ title: "Project Failed Tasks", href: "/projects/failed-tasks" },
				//{ title: "Project Timeline Extensions", href: "/projects/timeline-extensions" },
				{ title: "Projects", href: "/projects" },
				// { title: "Timesheet", href: "#" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_PROJECTS,
		},
		{
			title: "Task",
			href: "#1",
			icon: <Icon icon="hugeicons:task-done-01" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				//{ title: "Analytics", href: "/analytics/task" },
				{ title: "Task Priorities", href: "/task-mgt/task-priority" },
				// { title: "Task Statuses", href: "/task-mgt/task-statuses" },
				{ title: "Tasks", href: "/task-mgt/task" },
				{ title: "Completed Tasks", href: "/task-mgt/completed-tasks" },
				{ title: "Failed Tasks", href: "/task-mgt/failed-tasks" },
				{ title: "Timeline Extensions", href: "/task-mgt/task-extension" },
				// { title: "Timesheet", href: "#" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_TASKS,
		},
		// {
		// 	title: "Configuration",
		// 	href: "#1",
		// 	icon: <Icon icon="hugeicons:configuration-01" className="!w-6 !h-6" width="28" height="28" />,
		// 	submenu: [
		// 		{ title: "Multiple Approvals", href: "#" },
		// 		{ title: "Mail Templates", href: "#" },
		// 		{ title: "Mail Automation", href: "#" },
		// 		{ title: "Calendar", href: "/events-holidays" },
		// 		{ title: "Company Leaves", href: "#" },
		// 		{ title: "Restrict Leaves", href: "#" },
		// 	],
		// 	requiredPermission: PERMISSION_CODES.CAN_MANAGE_APPROVAL_WORKFLOWS,
		// },
		// {
		//   title: "Events & Holidays",
		//   href: "#1",
		//   icon: <Icon icon="hugeicons:calendar-01" className="!w-6 !h-6" width="28" height="28" />,
		//   submenu: [{title: "Calendar", href: "/events-holidays"}],
		// },
	];

	const onToggle = () => {
		if (isMobile) {
			// setMobileMenuOpen(!mobileMenuOpen);
			dispatch(!isSideBarOpen ? openSideBar() : closeSideBar());
			// console.log("Dispatching toggle action with sidebar state:", isSideBarOpen);
		} else {
			if (isSideBarOpen) {
				dispatch(closeSideBar());
			} else {
				dispatch(openSideBar());
			}
		}
	};

	return (
		<>
			{/* Desktop Sidebar */}
			{!isMobile && (
				<div
					className={`${
						isSideBarOpen ? "w-64" : "w-20"
					} bg-white border-r border-gray-100 fixed h-full transition-all duration-300 z-30`}
				>
					<div className="p-4 border-b border-gray-100 min-h-16 h-20 max-h-20 flex items-center">
						<div className="flex items-center gap-3">
							<div className="!w-10 !h-10 !aspect-square bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden relative">
								{InstitutionLogo ? (
									<Image
										alt="Institution Logo"
										className="object-cover object-center !w-full !h-full"
										fill
										src={`${process.env.NEXT_PUBLIC_BASE_URL || ""}${InstitutionLogo}`}
									/>
								) : (
									<Icon icon="hugeicons:building-05" width="24" height="24" />
								)}
							</div>
							{isSideBarOpen && (
								<span className="font-bold text-[var(--sidebar-foreground)] line-clamp-1">
									{InstitutionName}
								</span>
							)}
						</div>
					</div>
					<div className="p-2 overflow-y-auto h-[90svh] pt-4 pb-16">
						{filteredNavItems.map((item, index) => (
							<NavItemComponent
								key={`${item.title}-${index}`}
								item={item}
								isMobileView={false}
								index={index}
								expandedItems={expandedItems}
								onExpand={toggleExpand}
								onToggle={onToggle}
							/>
						))}
					</div>
				</div>
			)}

			{/* Mobile Navigation Drawer */}
			{isMobile && (
				<>
					{/* Overlay */}
					{mobileMenuOpen && (
						<div
							className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
							// onClick={onCloseSidebar}
						/>
					)}

					{/* Drawer */}
					<div
						className={`mobile-nav-drawer fixed left-0 top-0 h-screen w-80 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out z-[100] flex flex-col ${
							mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
						}`}
					>
						{/* Drawer Header */}
						<div className="p-4 border-b border-gray-100 min-h-16 h-20 max-h-20 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="!w-10 !h-10 !aspect-square bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden relative">
									{InstitutionLogo ? (
										<Image
											alt="Institution Logo"
											className="object-cover rounded-xl"
											fill
											src={`${process.env.NEXT_PUBLIC_BASE_URL || ""}${InstitutionLogo}`}
										/>
									) : (
										<Icon icon="hugeicons:building-05" width="24" height="24" />
									)}
								</div>
								<span className="font-bold text-gray-900">{InstitutionName}</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={onToggle}
								className="p-2 hover:bg-gray-100"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						{/* Branch Selector */}
						<div className="p-4 border-b border-gray-100">
							<InstitutionBranchSelector />
						</div>

						{/* Navigation Items */}
						<div className="flex-1 overflow-y-auto p-2 pb-20 min-h-[600px]" id="mobile-nav-scroll">
							{filteredNavItems.map((item, idx) => (
								<NavItemComponent
									key={`${item.title}-${idx}`}
									item={item}
									isMobileView={true}
									index={idx}
									expandedItems={expandedItems}
									onExpand={toggleExpand}
									onToggle={onToggle}
								/>
							))}
						</div>

						{/* Add this after the Navigation Items div */}
						<div className="absolute right-1 top-32 bottom-8 w-1 bg-gray-200 rounded-full">
							<div
								className="w-full bg-gray-500 rounded-full transition-all duration-150"
								style={{
									height: "50%",
									transform: `translateY(${scrollPercentage * 0.7}%)`,
								}}
							/>
						</div>
					</div>
				</>
			)}
		</>
	);
}
