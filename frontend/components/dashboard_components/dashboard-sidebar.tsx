"use client";

import type React from "react";

import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";

import { InstitutionBranchSelector } from "../institution-branch-selector";
import { Button } from "../ui/button";

import { NavItemComponent } from "./navigation/nav-item";

import { PERMISSION_CODES } from "@/constants";
import { EMPLOYEE_API, showErrorToast } from "@/lib/utils";
import {
	selectAccessToken,
	selectRelatedEmployee,
	selectSelectedInstitution,
	selectUser,
	selectUserLoading,
} from "@/store/auth/selectors";
import { hasPermission } from "@/lib/helpers";
import { selectSideBarOpened } from "@/store/miscellaneous/selectors";
import { IEmployee } from "@/types/types.utils";
import { NavItem } from "@/types/other";
import { useMobile } from "@/hooks/use-mobile";
import { closeSideBar, openSideBar } from "@/store/miscellaneous/actions";

export default function DashboardSideBar() {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const isMobile = useMobile();
	const currentUser = useSelector(selectUser);
	const isSideBarOpen = useSelector(selectSideBarOpened);
	const dispatch = useDispatch();
	const router = useRouter();
	const [filteredNavItems, setFilteredNavItems] = useState<NavItem[]>([]);
	const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
	const [InstitutionLogo, setInstitutionLogo] = useState<string | null>(null);
	const [InstitutionName, setInstitutionName] = useState("PERACOSOFT");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrollPercentage, setScrollPercentage] = useState(0);
	const relatedEmployee = useSelector(selectRelatedEmployee);

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
		setMobileMenuOpen(isSideBarOpen);
	}, [isSideBarOpen]);

	useEffect(() => {
		setMobileMenuOpen(isSideBarOpen);
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
		let filtered: NavItem[] = [];
		if (selectedInstitution) {
			setInstitutionLogo(selectedInstitution.institution_logo);
			setInstitutionName(selectedInstitution.institution_name);
			filtered = navItems
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
		} else {
			filtered = [
				{
					title: "Create Organization",
					href: "/dashboard",
					icon: <Icon icon="hugeicons:building-05" className="!w-6 !h-6" />,
				},
			];
		}

		setFilteredNavItems(filtered);
	}, [router, currentUser, selectedInstitution, relatedEmployee]);

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
			title: "Recruitment",
			href: "#1",
			icon: <Icon icon="hugeicons:user-add-02" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/recruitment" },
				{ title: "Recruitment Pipeline", href: "/job-interviews/interview-pipeline" },
				// { title: "Recruitment Survey", href: "#" },
				{ title: "Candidates", href: "/applications" },
				{ title: "Interviews", href: "/job-interviews" },
				// { title: "Recruitment", href: "#" },
				{ title: "Job opening", href: "/job-adverts" },
				{ title: "Interview Stages", href: "/interview-stages" },
				{ title: "Skill Zone", href: "/skill-zones" },
				{ title: "Onboarding", href: "/on-boarding" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_JOB_POSITIONS,
		},
		{
			title: "Employees",
			href: "#1",
			icon: <Icon icon="hugeicons:user-multiple-02" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{
					title: "Analytics",
					href: "/analytics/employees",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				},
				...(relatedEmployee
					? [{ title: "My Profile", href: `/employees/profile/${relatedEmployee.id}` }]
					: []),

				{
					title: "Employee Information",
					href: "/employees/employee-list",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				},
				{
					title: "Document Requests",
					href: "/employees/document-requests",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_DOCUMENT_REQUESTS,
				},
				{
					title: "Shifts",
					href: "/employees/shift-requests",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				},
				{
					title: "Employee Types",
					href: "/employees/employee-types",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				},
				{
					title: "Work Types",
					href: "/employees/work-types",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				},
				// {
				// 	title: "Rotating Shift Assign",
				// 	href: "#",
				// 	requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				// },
				// {
				// 	title: "Rotating Work Type Assign",
				// 	href: "#",
				// 	requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				// },
				{
					title: "Disciplinary Actions",
					href: "/employees/discipline",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				},
				// {
				// 	title: "Policies",
				// 	href: "#",
				// 	requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				// },
				{
					title: "Organization Chart",
					href: "/organization-chart",
					requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
				},
			],
		},
		{
			title: "Attendance",
			href: "#",
			icon: <Icon icon="hugeicons:inbox-upload" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/attendance" },
				// { title: "Biometric Devices", href: "#" },
				{ title: "Attendance", href: "/employees/attendance" },
				// { title: "Attendance Requests", href: "#" },
				{ title: "Hour Account", href: "/employees/hour-count" },
				{ title: "Work Records", href: "/employees/attendance/work-records" },
				// { title: "Attendance Activities", href: "#" },
				{ title: "Late Come Early Out", href: "/employees/late-in-early-out" },
				{ title: "My Attendances", href: "#" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_ATTENDANCE_REPORTS,
		},
		{
			title: "Leave",
			href: "#1",
			icon: <Icon icon="hugeicons:calendar-03" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/leave" },
				{ title: "Leave Types", href: "/leave/leave-types" },
				{ title: "Assigned Leave", href: "/leave/leave-assignment" },
				// { title: "Leave Allocation Request", href: "#" },
				// { title: "Compensatory Leave Requests", href: "#" },
				{ title: "Leave Policy", href: "/leave/leave-policy" },
				{ title: "Leave Balances", href: "/leave/leave-balances" },
				{ title: "Leave Application", href: "/leave/leave-application" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_LEAVE_REPORTS,
		},
		{
			title: "Payroll",
			href: "#1",
			icon: <Icon icon="hugeicons:payment-01" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/payroll" },
				{ title: "Contracts", href: "/employees/contracts" },
				{ title: "Allowance Types", href: "/payroll/allowance-types" },
				{ title: "Deduction Types", href: "/payroll/deduction-types" },
				{ title: "Employee Allowance", href: "/payroll/employee-allowance" },
				{ title: "Employee Deductions", href: "/payroll/employee-deductions" },
				{ title: "Employee Tax", href: "/payroll/employee-tax" },
				{ title: "Payroll Period", href: "/payroll/payroll-period" },
				// { title: "Payslips", href: "#" },
				// { title: "Loan / Advanced Salary", href: "#" },
				// { title: "Encashments & Reimbursements", href: "#" },
				// { title: "Federal Tax", href: "#" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_PAYROLL_REPORTS,
		},
		{
			title: "Performance",
			href: "#",
			icon: <Icon icon="hugeicons:chart-histogram" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/performance" },
				{ title: "Objectives", href: "/performance/objectives" },
				{ title: "360 Feedback", href: "/performance/feedback" },
				{ title: "Meetings", href: "/performance/meetings" },
				{ title: "Key Results", href: "/performance/key-results" },
				{ title: "Employee Objectives", href: "/performance/employee-objectives" },
				{ title: "Period", href: "/performance/periods" },
				{ title: "Question Template", href: "/performance/question-templates" },
				{ title: "Concern Types", href: "/performance/concern-types" },
				{ title: "Concerns", href: "/performance/concerns" },
				{ title: "Support Resource Types", href: "/performance/pip/support-resource-types" },
				{ title: "Support Resources", href: "/performance/pip/support-resources" },
				{ title: "Performance Improvement Plan", href: "/performance/pip/" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_PERFORMANCE_REPORTS,
		},

		{
			title: "Offboarding",
			href: "/off-boarding",
			icon: <Icon icon="hugeicons:inbox-upload" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/offboarding" },
				{ title: "Exit Process", href: "/off-boarding/exit-process" },
				{ title: "Resignation Letters", href: "#" },
				{ title: "Offboarding Stages", href: "/off-boarding/stages" },
				{ title: "Separation Types", href: "/off-boarding/separation-types" },
				{ title: "Separation Policy", href: "/off-boarding/separation-policy" },
				// { title: "Terminations", href: "/off-boarding/terminations" },
			],
			requiredPermission: PERMISSION_CODES.CAN_VIEW_OFFBOARDING_STAGES,
		},

		{
			title: "Assets",
			href: "#1",
			icon: <Icon icon="hugeicons:laptop" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [
				{ title: "Analytics", href: "/analytics/assets" },
				{ title: "Asset Categories", href: "/assets/asset-categories" },
				{ title: "Asset View", href: "/assets/assets" },
				{ title: "Asset Requests", href: "/assets/asset-requests" },
				{ title: "Asset Allocations", href: "/assets/asset-allocations" },
				{ title: "Asset Returns", href: "/assets/asset-returns" },
				{ title: "Asset History", href: "/assets/asset-histories" },
			],
			requiredPermission: PERMISSION_CODES.CAN_MANAGE_COMPANY_ASSETS,
		},
		{
			title: "Help Desk",
			href: "#1",
			icon: (
				<Icon icon="hugeicons:customer-service-01" className="!w-6 !h-6" width="28" height="28" />
			),
			submenu: [
				{ title: "FAQs", href: "/help-desk/faqs" },
				{ title: "Tickets", href: "/help-desk/tickets" },
			],
			// requiredPermission: PERMISSION_CODES.CAN_MANAGE_COMPANY_ASSETS,
		},
		// {
		// 	title: "Project",
		// 	href: "#1",
		// 	icon: <Icon icon="hugeicons:task-done-01" className="!w-6 !h-6" width="28" height="28" />,
		// 	submenu: [
		// 		{ title: "Analytics", href: "/analytics/project" },
		// 		{ title: "Projects", href: "/projects" },
		// 		// { title: "Tasks", href: "#" },
		// 		// { title: "Timesheet", href: "#" },
		// 	],
		// 	requiredPermission: PERMISSION_CODES.CAN_VIEW_PROJECTS,
		// },
		// {
		// 	title: "Configuration",
		// 	href: "#1",
		// 	icon: <Icon icon="hugeicons:configuration-01" className="!w-6 !h-6" width="28" height="28" />,
		// 	submenu: [
		// 		// { title: "Multiple Approvals", href: "#" },
		// 		// { title: "Mail Templates", href: "#" },
		// 		// { title: "Mail Automation", href: "#" },
		// 		{ title: "Calendar", href: "/events-holidays" },
		// 		// { title: "Company Leaves", href: "#" },
		// 		// { title: "Restrict Leaves", href: "#" },
		// 	],
		// 	requiredPermission: PERMISSION_CODES.CAN_MANAGE_APPROVAL_WORKFLOWS,
		// },
		{
			title: "Events & Holidays",
			href: "#1",
			icon: <Icon icon="hugeicons:calendar-01" className="!w-6 !h-6" width="28" height="28" />,
			submenu: [{ title: "Calendar", href: "/events-holidays" }],
		},
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
								{selectedInstitution ? (
									<>
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
									</>
								) : (
									<>
										<Image
											alt="Peracosoft Logo"
											className="object-cover !bg-transparent object-center !w-full !h-full"
											fill
											src={`/images/logo.PNG`}
										/>
									</>
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
