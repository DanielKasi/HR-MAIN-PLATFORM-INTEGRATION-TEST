"use client";

import type React from "react";
import { IUserInstitution } from "@/types/other";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, Settings, User, LogOut, Menu } from "lucide-react";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { Icon } from "@iconify/react";
import Link from "next/link";

import CreateOrganisationWizard from "./create-organisation/page";
import QuickActionsWidget from "@/components/quick-actions-widget";

import { PERMISSION_CODES } from "@/constants";
import { selectAttachedInstitutions } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useMobile } from "@/hooks/use-mobile";
import { InstitutionBranchSelector } from "@/components/institution-branch-selector";
// import {TaskNotification} from "@/components/task-notification";
import {
	selectAccessToken,
	selectSelectedInstitution,
	selectUser,
	selectUserLoading,
} from "@/store/auth/selectors";
import {
	clearTemporaryPermissions,
	fetchRemoteUserStart,
	fetchUpToDateInstitution,
	logoutStart,
	userActivityDetected,
} from "@/store/auth/actions";
import FixedLoader from "@/components/fixed-loader";
import { hasPermission } from "@/lib/helpers";
import ProtectedComponent from "@/components/ProtectedComponent";
import apiRequest from "@/lib/apiRequest";
import {
	selectRequiredAnnouncementAcknowledgment,
	selectSideBarOpened,
} from "@/store/miscellaneous/selectors";
import { closeSideBar, openSideBar } from "@/store/miscellaneous/actions";
import RedirectsWatcher from "@/components/common/redirects-watcher";
import AIAssistantWidget from "@/components/ai-assistant-widget";
import DashboardSideBar from "@/components/dashboard_components/dashboard-sidebar";
import Modules from "@/components/modules";

export function hexToHSL(hex: string) {
	hex = hex.replace("#", "");
	const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
	const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
	const b = Number.parseInt(hex.substring(4, 6), 16) / 255;

	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h = 0,
		s,
		l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;

		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	} else {
		s = 0;
	}

	h = Math.round(h * 360);
	s = Math.round(s * 100);
	l = Math.round(l * 100);

	return `${h} ${s}% ${l}%`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isMobile = useMobile();
	const [userRole, setUserRole] = useState<string | undefined>(undefined);
	const [isMounted, setIsMounted] = useState(false);
	const [canViewAdmin, setCanViewAdmin] = useState(false);
	const [canViewSettings, setCanViewSettings] = useState(false);
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	const [isAdminHovered, setIsAdminHovered] = useState(false);

	const handleMouseEnter = () => {
		setIsAdminHovered(true);
	};

	const handleMouseLeave = () => {
		setIsAdminHovered(false);
	};

	const [InstitutionId, setInstitutionId] = useState<string | null>(null);
	// const [isPathLoading, setIsPathLoading] = useState(false);

	const InstitutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

	const selectedInstitution = useSelector(selectSelectedInstitution);
	const currentUser = useSelector(selectUser);
	const accessToken = useSelector(selectAccessToken);
	const userIsLoading = useSelector(selectUserLoading);
	const isSideBarOpen = useSelector(selectSideBarOpened);
	const announcementForAcknowledgment = useSelector(selectRequiredAnnouncementAcknowledgment);
	const dispatch = useDispatch();
	const router = useRouter();
	const appLayoutRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handleActivity = (e: MouseEvent) => {
			if (announcementForAcknowledgment) {
				e.stopPropagation();
				e.preventDefault();
				return;
			}
			if (currentUser && appLayoutRef.current) {
				dispatch(userActivityDetected());
			}
		};

		appLayoutRef.current?.addEventListener("mousedown", handleActivity);

		return () => {
			appLayoutRef.current?.removeEventListener("mousedown", handleActivity);
		};
	}, [dispatch, currentUser, appLayoutRef, announcementForAcknowledgment]);

	useEffect(() => {
		dispatch(fetchRemoteUserStart());
		dispatch(fetchUpToDateInstitution());
	}, []);

	useEffect(() => {
		if (selectedInstitution) setInstitutionId(selectedInstitution.id.toString());
		else if (InstitutionsAttached && InstitutionsAttached.length > 0)
			setInstitutionId(String(InstitutionsAttached[0].id));
	}, [InstitutionsAttached, selectedInstitution]);

	useEffect(() => {
		setIsMounted(true);
		if (currentUser) {
			setCanViewAdmin(hasPermission(PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD));
			setCanViewSettings(hasPermission(PERMISSION_CODES.CAN_VIEW_SETTINGS));
		}
		if (
			currentUser &&
			currentUser.id &&
			selectedInstitution &&
			selectedInstitution.institution_owner_id
		) {
			let role = selectedInstitution.institution_owner_id === currentUser.id ? "Super User" : "";

			if (!role && Array.isArray(currentUser.roles) && currentUser.roles.length > 0) {
				const matchingRole = currentUser.roles.find((r: { name: string }) => !!r.name);

				if (matchingRole)
					role =
						matchingRole.name.charAt(0).toUpperCase() + matchingRole.name.slice(1).toLowerCase();
			}
			if (role.trim()) setUserRole(role);
		}
	}, [currentUser, selectedInstitution]);

	useEffect(() => {
		return () => {
			dispatch(clearTemporaryPermissions());
		};
	}, []);

	useEffect(() => {
		if (isMobile) {
			onCloseSidebar();
		}
	}, [pathname]);

	const updateThemeColors = (hexColor: string) => {
		if (!hexColor) return;
		try {
			const hslValue = hexToHSL(hexColor);

			if (!hslValue) return;
			const [h, s, l] = hslValue.split(" ");
			const hue = h;
			const saturation = s.replace("%", "");
			const lightness = l.replace("%", "");

			document.documentElement.style.setProperty("--primary", hslValue);
			document.documentElement.style.setProperty("--ring", hslValue);
			const darkerL = Math.max(Number.parseInt(lightness) - 10, 0);

			document.documentElement.style.setProperty(
				"--primary-hover",
				`${hue} ${saturation}% ${darkerL}%`,
			);
			document.documentElement.style.setProperty("--sidebar-selected", hslValue);
			const lighterL = Math.min(Number.parseInt(lightness) + 40, 90);
			const lighterS = Math.max(Number.parseInt(saturation) - 15, 20);

			document.documentElement.style.setProperty(
				"--sidebar-hover",
				`${hue} ${lighterS}% ${lighterL}%`,
			);
			if (document.documentElement.classList.contains("dark")) {
				document.documentElement.style.setProperty("--sidebar-background", "240 5.9% 10%");
				const darkModeHoverL = Math.min(Number.parseInt(lightness) + 20, 60);

				document.documentElement.style.setProperty(
					"--sidebar-hover",
					`${hue} ${saturation}% ${darkModeHoverL}%`,
				);
			} else {
				document.documentElement.style.setProperty("--sidebar-background", "0 0% 98%");
			}
		} catch (error) {
			console.error("Error updating theme colors:", error);
		}
	};

	useEffect(() => {
		const fallbackColor = "#078c24";
		const themeColorToUse = selectedInstitution?.theme_color || fallbackColor;

		updateThemeColors(themeColorToUse);
	}, [selectedInstitution]);

	useEffect(() => {
		const token = accessToken;

		if (!token) {
			router.push("/login");

			return;
		}
	}, [router, accessToken]);

	const handleLogoutClick = () => setShowLogoutDialog(true);
	const handleLogout = () => dispatch(logoutStart());
	const handleCancelLogout = () => setShowLogoutDialog(false);

	const onToggle = () => {
		if (isMobile) {
			// setMobileMenuOpen(!mobileMenuOpen);
			dispatch(!isSideBarOpen ? openSideBar() : closeSideBar());
		} else {
			if (isSideBarOpen) {
				dispatch(closeSideBar());
			} else {
				dispatch(openSideBar());
			}
		}
	};

	const onOpenSidebar = () => {
		dispatch(openSideBar());
	};

	const onCloseSidebar = () => {
		dispatch(closeSideBar());
	};

	const markSetupAsComplete = async () => {
		if (!InstitutionId) return;
		try {
			const formData = new FormData();

			formData.append("Institution_setup", "true");
			await apiRequest.patch(`institution/${InstitutionId}/`, formData);

			return true;
		} catch (error) {
			return false;
		}
	};

	return (
		<>
			<RedirectsWatcher />
			<div
				ref={appLayoutRef}
				className="flex h-screen bg-gray-100 overflow-hidden dashboard-layout"
			>
				<DashboardSideBar />

				{/* Main Content Area */}
				<div
					className={`flex-1 flex flex-col min-w-0 ${
						!isMobile ? (isSideBarOpen ? "ml-64" : "ml-20") : ""
					} transition-all duration-300`}
				>
					{/* Header */}
					<div className="bg-white p-4 flex justify-between items-center border-b min-h-16 h-20 max-h-20">
						<div className="flex items-center gap-2 min-w-0">
							<button
								onClick={onToggle}
								className={`mobile-menu-button w-8 h-8 z-[50] bg-transparent rounded-full flex items-center justify-center transition-colors text-gray-600 ${
									isMobile ? "" : ""
								}`}
							>
								{isMobile ? (
									<Menu className="w-4 h-4" />
								) : (
									<Icon icon={"hugeicons:menu-05"} className="w-5 h-5" />
								)}
							</button>
							{selectedInstitution && <h1 className="text-xl font-bold truncate">PERACOSOFT</h1>}
						</div>

						<div className="flex-1 flex justify-center min-w-0">
							{!isMobile && selectedInstitution && <InstitutionBranchSelector />}
						</div>

						<div className="flex items-center gap-4 min-w-0">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_MODULES}>
								<Modules />
							</ProtectedComponent>
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD}>
								<Link
									href={"/admin"}
									className="text-gray-900 rounded-full bg-white hover:bg-gray-100 p-3 border-none outline-none relative"
									onMouseEnter={handleMouseEnter}
									onMouseLeave={handleMouseLeave}
								>
									<Icon icon="hugeicons:shield-01" width="24" height="24" />
									<span
										className={`text-gray-100 px-2 py-1 rounded-sm z-10 bg-gray-600 text-xs font-medium absolute top-full left-1/2 transform -translate-x-1/2 mt-1 pointer-events-none whitespace-nowrap transition-all duration-200 ease-in-out ${isAdminHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
									>
										Admin
									</span>
									<span className="sr-only">Admin</span>
								</Link>
							</ProtectedComponent>
							{/* <TaskNotification /> */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<div className="flex items-center gap-2 rounded-full px-2 py-2 cursor-pointer hover:bg-gray-200 hover:bg-opacity-30 active:bg-gray-400 active:bg-opacity-40 transition-all duration-200">
										<div className="!w-9 !h-9 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center relative">
											<Image
												src={"/images/profile-placeholder.jpg"}
												fill
												alt={"Profile"}
												className="!w-full !h-full object-cover object-center"
											/>
										</div>
										{!isMobile && (
											<>
												<ChevronDown className="h-4 w-4 hidden md:block flex-shrink-0" />
											</>
										)}
									</div>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="rounded-xl p-1 shadow-lg border border-gray-200"
								>
									<DropdownMenuItem className="rounded-lg hover:bg-gray-200 cursor-pointer  hover:bg-opacity-20 active:bg-gray-200 active:bg-opacity-30 transition-all duration-200 focus:bg-gray-200 focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2">
										<User className="mr-2 h-4 w-4" />
										<div>
											<span className="text-sm inline-block font-medium truncate">
												{currentUser?.fullname || "User"}
											</span>
											<div className="text-xs text-gray-500 truncate">{userRole || "Staff"}</div>
										</div>
									</DropdownMenuItem>

									{/* TODO : Provide these settings even when the user has no institution cause they already have an account */}
									{isMounted && canViewSettings && (
										<DropdownMenuItem
											className="rounded-lg hover:bg-gray-200 cursor-pointer  hover:bg-opacity-20 active:bg-gray-200 active:bg-opacity-30 transition-all duration-200 focus:bg-gray-200 focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2"
											onClick={() => router.push("/user-settings")}
										>
											<Settings className="mr-2 h-4 w-4" />
											<span>Settings</span>
										</DropdownMenuItem>
									)}

									{currentUser && currentUser.id === selectedInstitution?.institution_owner_id && (
										<DropdownMenuItem
											className="rounded-lg hover:bg-gray-200 cursor-pointer  hover:bg-opacity-20 active:bg-gray-200 active:bg-opacity-30 transition-all duration-200 focus:bg-gray-200 focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2"
											onClick={() => router.push("/admin/settings?tab=ownership_transfer")}
										>
											<Icon icon="hugeicons:folder-transfer" className="!w-4 !h-4" />
											<span>Ownership Transfer</span>
										</DropdownMenuItem>
									)}

									<DropdownMenuSeparator className="my-1" />
									<DropdownMenuItem
										className="rounded-lg hover:bg-gray-200 cursor-pointer  hover:bg-opacity-20 active:bg-gray-200 active:bg-opacity-30 transition-all duration-200 focus:bg-gray-200 focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2"
										onClick={handleLogoutClick}
									>
										<LogOut className="mr-2 h-4 w-4" />
										<span>Logout</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{/* Content */}
					<div className="w-full p-2 relative min-w-0">
						{selectedInstitution ? (
							<>
								<div className="overflow-y-auto max-h-[calc(100svh-4rem)] relative min-w-full">
									{children}
								</div>
							</>
						) : (
							<CreateOrganisationWizard />
						)}
						{/* {isPathLoading ? <FixedLoader fixed={false} className="!bg-white/90 z-[100]" /> : <></>} */}
					</div>

					<QuickActionsWidget />

					<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_AI_ASSISTANT}>
						<div className="mb-4 sm:mb-0">
							<AIAssistantWidget />
						</div>
					</ProtectedComponent>
				</div>

				{/* Logout Dialog */}
				<Dialog
					open={showLogoutDialog}
					onOpenChange={(open) => {
						if (!open) {
							handleCancelLogout();
						} else {
							setShowLogoutDialog(true);
						}
					}}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="w-full text-center">Confirm Logout</DialogTitle>
							<DialogDescription className="w-full text-center">
								Are you sure you want to log out of your account?
							</DialogDescription>
						</DialogHeader>
						<DialogFooter className="flex space-x-2 justify-between gap-6">
							<Button
								type="button"
								className="w-full rounded-full"
								variant="outline"
								onClick={handleCancelLogout}
							>
								Cancel
							</Button>
							<Button
								type="button"
								className="w-full rounded-full"
								variant="default"
								onClick={handleLogout}
							>
								Logout
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{userIsLoading && <FixedLoader />}
			</div>
		</>
	);
}
