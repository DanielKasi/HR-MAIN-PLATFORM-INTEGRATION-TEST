"use client";

import type React from "react";
import {useState, useEffect, useRef} from "react";
import {useRouter, usePathname, useSearchParams} from "next/navigation";
import {ChevronDown, ChevronRight, Settings, User, LogOut, Menu, X} from "lucide-react";
import Image from "next/image";
import {useSelector, useDispatch} from "react-redux";
import {Icon} from "@iconify/react";

import type {IUserInstitution} from "../../../types";
import {PERMISSION_CODES} from "../../../types/types.utils";
import {selectAttachedInstitutions} from "@/store/auth/selectors";
import {Button} from "@/components/ui/button";
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
import {useMobile} from "@/hooks/use-mobile";
import {InstitutionBranchSelector} from "@/components/institution-branch-selector";
import {TaskNotification} from "@/components/task-notification";
import Modules from "@/components/modules";
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
import {hasPermission} from "@/lib/helpers";
import ProtectedComponent from "@/components/ProtectedComponent";
import apiRequest from "@/lib/apiRequest";
import CreateOrganisationWizard from "./create-organisation/page";
import {selectSideBarOpened} from "@/store/miscellaneous/selectors";
import {closeSideBar, openSideBar} from "@/store/miscellaneous/actions";
import Link from "next/link";
import RedirectsWatcher from "@/components/common/redirects-watcher";

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

interface SubMenuItem {
  title: string;
  href: string;
  requiredPermission?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  submenu?: SubMenuItem[];
  requiredPermission?: string;
}

export default function DashboardLayout({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [canViewSettings, setCanViewSettings] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [InstitutionId, setInstitutionId] = useState<string | null>(null);
  // const [isPathLoading, setIsPathLoading] = useState(false);

  const InstitutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];
  const [InstitutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [InstitutionName, setInstitutionName] = useState("PERACOSOFT");
  const [filteredNavItems, setFilteredNavItems] = useState<NavItem[]>([]);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const currentUser = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);
  const userIsLoading = useSelector(selectUserLoading);
  const isSideBarOpen = useSelector(selectSideBarOpened);
  const dispatch = useDispatch();
  const router = useRouter();
  const appLayoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleActivity = () => {
      if (currentUser && appLayoutRef.current) {
        dispatch(userActivityDetected());
      }
    };

    appLayoutRef.current?.addEventListener("mousedown", handleActivity);
    return () => {
      appLayoutRef.current?.removeEventListener("mousedown", handleActivity);
    };
  }, [dispatch, currentUser, appLayoutRef]);

  useEffect(() => {
    dispatch(fetchRemoteUserStart());
    dispatch(fetchUpToDateInstitution());
  }, [dispatch]);

  useEffect(() => {
    setMobileMenuOpen(isSideBarOpen);
  }, [isSideBarOpen]);

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
      let role = selectedInstitution.institution_owner_id === currentUser.id ? "Owner" : "";
      if (!role && Array.isArray(currentUser.roles) && currentUser.roles.length > 0) {
        const matchingRole = currentUser.roles.find((r: {name: string}) => !!r.name);
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

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: (
        <Icon icon="hugeicons:dashboard-browsing" className="!w-6 !h-6" width="28" height="28" />
      ),
    },
    {
      title: "Recruitment",
      href: "#1",
      icon: <Icon icon="hugeicons:user-add-02" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/recruitment"},
        {title: "Recruitment Pipeline", href: "/job-interviews/interview-pipeline"},
        {title: "Recruitment Survey", href: "#"},
        {title: "Candidates", href: "/applications"},
        {title: "Interviews", href: "/job-interviews"},
        {title: "Recruitment", href: "#"},
        {title: "Open Jobs", href: "/job-adverts"},
        {title: "Stages", href: "#"},
        {title: "Skill Zone", href: "#"},
        {title: "Onboarding", href: "/on-boarding"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_VIEW_JOB_POSITIONS,
    },
    {
      title: "Employees",
      href: "#1",
      icon: <Icon icon="hugeicons:user-multiple-02" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/employees"},
        {title: "Employee Information", href: "/employees/employee-list"},
        {title: "Document Requests", href: "#"},
        {title: "Shift Requests", href: "/employees/shift-requests"},
        {title: "Employee Types", href: "/employees/employee-types"},
        {title: "Work Types", href: "/employees/work-types"},
        {title: "Rotating Shift Assign", href: "#"},
        {title: "Rotating Work Type Assign", href: "#"},
        {title: "Disciplinary Actions", href: "/employees/discipline"},
        {title: "Policies", href: "#"},
        {title: "Organization Chart", href: "#"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
    },
    {
      title: "Attendance",
      href: "#",
      icon: <Icon icon="hugeicons:inbox-upload" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/attendance"},
        {title: "Biometric Devices", href: "#"},
        {title: "Attendance", href: "/employees/attendance"},
        {title: "Attendance Requests", href: "#"},
        {title: "Hour Account", href: "#"},
        {title: "Work Records", href: "#"},
        {title: "Attendance Activities", href: "#"},
        {title: "Late Come Early Out", href: "#"},
        {title: "My Attendances", href: "#"},
      ],
    },
    {
      title: "Leave",
      href: "#1",
      icon: <Icon icon="hugeicons:calendar-03" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/leave"},
        {title: "My Leave Requests", href: "#"},
        {title: "Leave Types", href: "/leave/leave-types"},
        {title: "Assigned Leave", href: "#"},
        {title: "Leave Allocation Request", href: "#"},
        {title: "Compensatory Leave Requests", href: "#"},
        {title: "Leave Policy", href: "/leave/leave-policy"},
        {title: "Leave Balances", href: "/leave/leave-balances"},
        {title: "Leave Application", href: "/leave/leave-application"},
      ],
    },
    {
      title: "Payroll",
      href: "#1",
      icon: <Icon icon="hugeicons:payment-01" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/payroll"},
        {title: "Contracts", href: "/employees/contracts"},
        {title: "Allowance Types", href: "/payroll/allowance-types"},
        {title: "Deduction Types", href: "/payroll/deduction-types"},
        {title: "Employee Allowance", href: "/payroll/employee-allowance"},
        {title: "Employee Deductions", href: "/payroll/employee-deductions"},
        {title: "Employee Tax", href: "/payroll/employee-tax"},
        {title: "Payroll Period", href: "/payroll/payroll-period"},
        {title: "Payslips", href: "#"},
        {title: "Loan / Advanced Salary", href: "#"},
        {title: "Encashments & Reimbursements", href: "#"},
        {title: "Federal Tax", href: "#"},
      ],
    },
    {
      title: "Performance",
      href: "#",
      icon: <Icon icon="hugeicons:chart-histogram" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/performance"},
        {title: "Objectives", href: "#"},
        {title: "360 Feedback", href: "#"},
        {title: "Meetings", href: "#"},
        {title: "Key Results", href: "#"},
        {title: "Employee Bonus Point", href: "#"},
        {title: "Period", href: "#"},
        {title: "Question Template", href: "#"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
    },

    {
      title: "Offboarding",
      href: "/off-boarding",
      icon: <Icon icon="hugeicons:inbox-upload" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/offboarding"},
        {title: "Exit Process", href: "#"},
        {title: "Resignation Letters", href: "#"},
        {title: "Offboarding Stages", href: "/off-boarding/stages"},
        {title: "Separation Types", href: "/off-boarding/separation-types"},
        {title: "Separation Policy", href: "/off-boarding/separation-policy"},
        {title: "Terminations", href: "/off-boarding/terminations"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
    },

    {
      title: "Assets",
      href: "#1",
      icon: <Icon icon="hugeicons:laptop" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/assets"},
        {title: "Asset Batches", href: "/assests/asset-categories"},
        {title: "Asset View", href: "/assests/assets"},
        {title: "Asset Requests", href: "/assests/asset-requests"},
        {title: "Asset Allocations", href: "/assests/asset-allocations"},
        {title: "Asset Returns", href: "/assests/asset-returns"},
        {title: "Asset History", href: "#"},
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
        {title: "FAQs", href: "#"},
        {title: "Tickets", href: "#"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_MANAGE_COMPANY_ASSETS,
    },
    {
      title: "Project",
      href: "#1",
      icon: <Icon icon="hugeicons:task-done-01" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Analytics", href: "/analytics/project"},
        {title: "Projects", href: "#"},
        {title: "Tasks", href: "#"},
        {title: "Timesheet", href: "#"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_MANAGE_COMPANY_ASSETS,
    },
    {
      title: "Configuration",
      href: "#1",
      icon: <Icon icon="hugeicons:configuration-01" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Multiple Approvals", href: "#"},
        {title: "Mail Templates", href: "#"},
        {title: "Mail Automation", href: "#"},
        {title: "Calendar", href: "/events-holidays"},
        {title: "Company Leaves", href: "#"},
        {title: "Restrict Leaves", href: "#"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_MANAGE_COMPANY_ASSETS,
    },
    // {
    //   title: "Events & Holidays",
    //   href: "#1",
    //   icon: <Icon icon="hugeicons:calendar-01" className="!w-6 !h-6" width="28" height="28" />,
    //   submenu: [{title: "Calendar", href: "/events-holidays"}],
    // },
  ];

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
          return {...item, submenu: filteredSubmenu};
        }
        return item;
      })
      .filter((item) => {
        return !item.requiredPermission || hasPermission(item.requiredPermission);
      });
    setFilteredNavItems(filtered);
  }, [router, currentUser, selectedInstitution, accessToken]);

  const handleLogoutClick = () => setShowLogoutDialog(true);
  const handleLogout = () => dispatch(logoutStart());
  const handleCancelLogout = () => setShowLogoutDialog(false);

  const onToggle = () => {
    if (isMobile) {
      // setMobileMenuOpen(!mobileMenuOpen);
      dispatch(!isSideBarOpen ? openSideBar() : closeSideBar());
      console.log("Dispatching toggle action with sidebar state:", isSideBarOpen);
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

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) => ({[title]: !prev[title]}));
  };

  const NavItemComponent = ({
    item,
    isMobileView = false,
    index,
  }: {
    item: NavItem;
    isMobileView: boolean;
    index: number;
  }) => {
    const isActive = item.submenu
      ? item.submenu.some((sub) => pathname === sub.href)
      : pathname === item.href;
    const isExpanded = expandedItems[item.title];
    const hoveredTooltipRef = useRef<HTMLSpanElement | null>(null);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    return (
      <div key={`${item.title}-${index}`} className="w-full py-1">
        <Button
          variant="ghost"
          className={`w-full !rounded-xl flex items-center justify-between px-2 !py-6 text-sm font-medium text-gray-600 hover:bg-primary/80 ${
            isActive ? "bg-primary/80 text-gray-100" : "hover:bg-opacity-30"
          }`}
          onMouseEnter={() => {
            if (!isSideBarOpen && !isMobile) setIsTooltipVisible(true);
          }}
          onMouseLeave={() => setIsTooltipVisible(false)}
          onClick={() => {
            if (item.submenu) {
              toggleExpand(item.title);
              !isSideBarOpen && onToggle();
            } else {
              router.push(item.href);
              if (isMobileView) {
                onToggle();
              }
            }
          }}
        >
          <div className="flex items-center space-x-2 relative">
            {item.icon}
            {isSideBarOpen ? <span>{item.title}</span> : <></>}

            {/* Tooltip shown only on hover when sidebar is closed and not mobile */}
            {/* {!isSideBarOpen && !isMobile && isTooltipVisible && (
              <span
                ref={hoveredTooltipRef}
                role="tooltip"
                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[9999] pointer-events-none bg-gray-800 text-white text-xs font-medium rounded-sm px-3 py-1 whitespace-nowrap shadow-lg"
              >
                {item.title}
              </span>
            )} */}
          </div>
          {isSideBarOpen ? (
            item.submenu &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ))
          ) : (
            <></>
          )}
        </Button>
        {item.submenu && isExpanded && (
          <div className="ml-6 flex flex-col mt-2 border-l-2 border-primary/20 bg-gray-200/20">
            {isSideBarOpen &&
              item.submenu.map((sub, index) => (
                <Button
                  key={`${sub.href}-${index}`}
                  variant="ghost"
                  className={`w-full !rounded-none !text-left flex items-center px-2 !py-4 text-sm text-gray-600 hover:bg-primary/80 ${
                    pathname === sub.href
                      ? "bg-primary/80  text-gray-100"
                      : "bg-gray-200/20  hover:bg-primary/60"
                  }`}
                  onClick={() => {
                    router.push(sub.href);
                    if (isMobileView) {
                      onToggle();
                    }
                  }}
                >
                  <span className="!w-full !text-left !bg-transparent">{sub.title}</span>
                </Button>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <RedirectsWatcher />
      <div
        ref={appLayoutRef}
        className="flex h-screen bg-gray-100 overflow-hidden dashboard-layout"
      >
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div
            className={`${
              isSideBarOpen ? "w-64" : "w-20"
            } bg-white border-r border-gray-100 fixed h-full transition-all duration-300 z-30`}
          >
            <div className="p-4 border-b border-gray-100 min-h-16 h-20 max-h-20 flex items-center">
              <div className="flex items-center gap-3">
                <div className="!w-12 !h-12 !aspect-square bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden relative">
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
              className={`mobile-nav-drawer fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out z-[100] ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-100 min-h-16 h-20 max-h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="!w-12 !h-12 !aspect-square bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden relative">
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
              <div className="flex-1 overflow-y-auto p-2 pb-20">
                {filteredNavItems.map((item, idx) => (
                  <NavItemComponent
                    key={`${item.title}-${idx}`}
                    item={item}
                    isMobileView={true}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          </>
        )}

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
                  <Icon
                    icon={
                      !isSideBarOpen ? "hugeicons:transition-right" : "hugeicons:transition-left"
                    }
                    className="w-5 h-5"
                  />
                )}
              </button>
              <h1 className="text-xl font-bold truncate">PERACOSOFT</h1>
            </div>

            <div className="flex-1 flex justify-center min-w-0">
              {!isMobile && <InstitutionBranchSelector />}
            </div>

            <div className="flex items-center gap-4 min-w-0">
              <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_MODULES}>
                <Modules />
              </ProtectedComponent>
              <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD}>
                <Link
                  href={"/admin"}
                  className="text-gray-900 rounded-full bg-white hover:bg-gray-100 p-3 border-none outline-none relative"
                >
                  <Icon icon="hugeicons:shield-01" width="24" height="24" />
                </Link>
              </ProtectedComponent>
              <TaskNotification />
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
                        <div className="hidden md:block min-w-0">
                          <div className="text-sm font-medium truncate">
                            {currentUser?.fullname || "User"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {userRole || "Staff"}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 hidden md:block flex-shrink-0" />
                      </>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl p-1 shadow-lg border border-gray-200"
                >
                  <DropdownMenuItem className="rounded-lg hover:bg-gray-200 hover:bg-opacity-20 active:bg-gray-200 active:bg-opacity-30 transition-all duration-200 focus:bg-gray-200 focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  {isMounted && canViewSettings && (
                    <DropdownMenuItem
                      className="rounded-lg hover:bg-gray-200 hover:bg-opacity-20 active:bg-gray-200 active:bg-opacity-30 transition-all duration-200 focus:bg-gray-200 focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2"
                      onClick={() => router.push("/settings")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="rounded-lg hover:bg-gray-200 hover:bg-opacity-20 active:bg-gray-200 active:bg-opacity-30 transition-all duration-200 focus:bg-gray-200 focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2"
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
                <div className="overflow-y-auto max-h-[88svh] relative min-w-full">{children}</div>
              </>
            ) : (
              <CreateOrganisationWizard />
            )}
            {/* {isPathLoading ? <FixedLoader fixed={false} className="!bg-white/90 z-[100]" /> : <></>} */}
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogDescription>
                Are you sure you want to log out of your account?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={handleCancelLogout}>
                Cancel
              </Button>
              <Button type="button" variant="default" onClick={handleLogout}>
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
