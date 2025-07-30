"use client";

import React, {useState, useEffect} from "react";
import {useRouter, usePathname} from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Settings,
  User,
  LogOut,
  Shield,
  ChevronLeft,
  ArrowLeft,
  CircleArrowLeft,
} from "lucide-react";
import Image from "next/image";
import {useSelector, useDispatch} from "react-redux";
import {Icon} from "@iconify/react";

import {IUserInstitution} from "../types";
import {PERMISSION_CODES} from "../types/types.utils";

import {useSetupProgress} from "@/components/guide";
import {selectAttachedInstitutions, selectTemporaryPermissions} from "@/store/auth/selectors";
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
} from "@/store/auth/actions";
import FixedLoader from "@/components/fixed-loader";
import {hasPermission} from "@/lib/helpers";
import ProtectedComponent from "@/components/ProtectedComponent";
import apiRequest from "@/lib/apiRequest";
import CreateOrganisationWizard from "./create-organisation/page";
import {selectSidebarOpened} from "@/store/miscellaneous/selectors";
import {closeSideBar, openSideBar} from "@/store/miscellaneous/actions";
import Link from "next/link";

export function hexToHSL(hex: string) {
  hex = hex.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

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
  const [userName, setUserName] = useState("");
  const [userInitials, setUserInitials] = useState("U");
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [canViewSettings, setCanViewSettings] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});

  const [InstitutionId, setInstitutionId] = useState<string | null>(null);

  const [isPathLoading, setIsPathLoading] = useState(false);

  const InstitutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];
  // const {getCompletionPercentage, isSetupComplete, getNextStep} = useSetupProgress(
  //   InstitutionId || undefined,
  // );
  // const completionPercentage = getCompletionPercentage();
  // const nextStep = getNextStep();

  const [InstitutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [InstitutionName, setInstitutionName] = useState("BAIFAM HR");
  const [filteredNavItems, setFilteredNavItems] = useState<NavItem[]>([]);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const userData = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);
  const userIsLoading = useSelector(selectUserLoading);
  const isSideBarOpen = useSelector(selectSidebarOpened);
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    setIsPathLoading(true);
    const timer = setTimeout(() => {
      setIsPathLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    dispatch(fetchRemoteUserStart());
    dispatch(fetchUpToDateInstitution());
  }, [dispatch]);

  useEffect(() => {
    if (selectedInstitution) setInstitutionId(selectedInstitution.id.toString());
    else if (InstitutionsAttached && InstitutionsAttached.length > 0)
      setInstitutionId(String(InstitutionsAttached[0].id));
  }, [InstitutionsAttached, selectedInstitution]);

  useEffect(() => {
    setIsMounted(true);
    if (userData) {
      setCanViewAdmin(hasPermission(PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD));
      setCanViewSettings(hasPermission(PERMISSION_CODES.CAN_VIEW_SETTINGS));
    }
    if (
      userData &&
      userData.id &&
      selectedInstitution &&
      selectedInstitution.institution_owner_id
    ) {
      let role = selectedInstitution.institution_owner_id === userData.id ? "Owner" : "";
      if (!role && Array.isArray(userData.roles) && userData.roles.length > 0) {
        const matchingRole = userData.roles.find((r: {name: string}) => !!r.name);
        if (matchingRole)
          role =
            matchingRole.name.charAt(0).toUpperCase() + matchingRole.name.slice(1).toLowerCase();
      }
      if (role.trim()) setUserRole(role);
    }
  }, [userData, selectedInstitution]);

  useEffect(() => {
    return () => {
      dispatch(clearTemporaryPermissions());
    };
  }, []);

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <Icon icon="hugeicons:dashboard-browsing" className="!w-6 !h-6" width="28" height="28" />,
    },
    {
      title: "Recruitment",
      href: "#1",
      icon: <Icon icon="hugeicons:user-add-02" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Job Openings", href: "/job-adverts"},
        {title: "Applications", href: "/applications"},
        {title: "Interviews", href: "/job-interviews"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_VIEW_JOB_POSITIONS,
    },
    {
      title: "Onboarding",
      href: "/on-boarding",
      icon: <Icon height="20" icon="hugeicons:inbox-download" className="!w-6 !h-6" width="20" />,
    },
    {
      title: "Employees",
      href: "#1",
      icon: <Icon icon="hugeicons:user-multiple-02" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Employees", href: "/employees/employee-list"},
        {title: "Contracts", href: "/employees/contracts"},
        {title: "Attendance", href: "/employees/attendance"},
        {title: "Discipline", href: "/employees/discipline"},
      ],
      requiredPermission: PERMISSION_CODES.CAN_VIEW_EMPLOYEES,
    },
    {
      title: "Leave",
      href: "#1",
      icon: <Icon icon="hugeicons:calendar-03" className="!w-6 !h-6" width="28" height="28" />,
      submenu: [
        {title: "Leave Types", href: "/leave/leave-types"},
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
        {title: "Allowance Types", href: "/payroll/allowance-types"},
        {title: "Deduction Types", href: "/payroll/deduction-types"},
        {title: "Employee Allowance", href: "/payroll/employee-allowance"},
        {title: "Employee Deductions", href: "/payroll/employee-deductions"},
        {title: "Payroll Period", href: "/payroll/payroll-period"},
        {title: "Payslip", href: "/payroll/payslip"},
      ],
    }
    // ,
    // {
    //   title: "Assets",
    //   href: "/assets",
    //   icon: <Icon icon="hugeicons:package" className="!w-6 !h-6" width="28" height="28" />,
    // },
    // {
    //   title: "Projects",
    //   href: "/projects",
    //   icon: <Icon icon="hugeicons:folder-01" className="!w-6 !h-6" width="28" height="28" />,
    // },
    // {
    //   title: "Help Desk",
    //   href: "#1",
    //   icon: <Icon icon="hugeicons:help-circle" className="!w-6 !h-6" width="28" height="28" />,
    //   submenu: [
    //     {title: "Support Tickets", href: "/help-desk/tickets"},
    //     {title: "Knowledge Base", href: "/help-desk/knowledge-base"},
    //     {title: "FAQs", href: "/help-desk/faqs"},
    //     {title: "Contact Support", href: "/help-desk/contact"},
    //     {title: "Feedback & Suggestions", href: "/help-desk/feedback"},
    //     {title: "Help Desk Reports", href: "/help-desk/reports"},
    //   ],
    // },
    // {
    //   title: "Reports",
    //   href: "#1",
    //   icon: <Icon icon="hugeicons:analytics-01" className="!w-6 !h-6" width="28" height="28" />,
    //   submenu: [
    //     {title: "Employee Reports", href: "/reports/employees"},
    //     {title: "Attendance Reports", href: "/reports/attendance"},
    //     {title: "Leave Reports", href: "/reports/leave"},
    //     {title: "Payroll Reports", href: "/reports/payroll"},
    //     {title: "Recruitment Reports", href: "/reports/recruitment"},
    //     {title: "Asset Management Reports", href: "/reports/assets"},
    //   ],
    // },
    // {
    //   title: "Performance",
    //   href: "#1",
    //   icon: <Icon icon="hugeicons:chart-line-data-01" className="!w-6 !h-6" width="25" height="25" />,
    //   submenu: [
    //     {title: "Performance Reviews", href: "/performance/reviews"},
    //     {title: "Goal Setting", href: "/performance/goals"},
    //     {title: "Feedback & Recognition", href: "/performance/feedback"},
    //     {title: "Training & Development", href: "/performance/training"},
    //     {title: "Competency Management", href: "/performance/competency"},
    //     {title: "Performance Reports", href: "/performance/reports"},
    //   ],
    // },
    // {
    //   title: "Events & Holidays",
    //   href: "/events-holidays",
    //   icon: <Icon icon="hugeicons:calendar-03" className="!w-6 !h-6" className="w-5 h-5" />,
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
      const darkerL = Math.max(parseInt(lightness) - 10, 0);
      document.documentElement.style.setProperty(
        "--primary-hover",
        `${hue} ${saturation}% ${darkerL}%`,
      );
      document.documentElement.style.setProperty("--sidebar-selected", hslValue);
      const lighterL = Math.min(parseInt(lightness) + 40, 90);
      const lighterS = Math.max(parseInt(saturation) - 15, 20);
      document.documentElement.style.setProperty(
        "--sidebar-hover",
        `${hue} ${lighterS}% ${lighterL}%`,
      );
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.style.setProperty("--sidebar-background", "240 5.9% 10%");
        const darkModeHoverL = Math.min(parseInt(lightness) + 20, 60);
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

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    const fallbackColor = "#078c24";
    const themeColorToUse = selectedInstitution?.theme_color || fallbackColor;
    updateThemeColors(themeColorToUse);
  }, [selectedInstitution]);

  useEffect(() => {
    const token = accessToken;
    if (!token) {
      router.push("/");
      return;
    }
    if (userData) {
      try {
        const user = userData;
        setUserName(user.fullname || "");
        if (user.fullname) {
          const nameParts = user.fullname.split(" ");
          setUserInitials(
            nameParts.length > 1
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : nameParts[0][0].toUpperCase(),
          );
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
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
        // if (item.submenu && item.submenu.length > 0) return item.submenu.length > 0;
        return !item.requiredPermission || hasPermission(item.requiredPermission);
      });
    setFilteredNavItems(filtered);
  }, [router, userData, selectedInstitution, accessToken]);

  const handleLogoutClick = () => setShowLogoutDialog(true);
  const handleLogout = () => dispatch(logoutStart());
  const handleCancelLogout = () => setShowLogoutDialog(false);

  const onToggle = () => {
    if (isSideBarOpen) {
      dispatch(closeSideBar());
    } else {
      dispatch(openSideBar());
    }
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

  const renderNavigationItem = (item: NavItem) => {
    const isActive = item.submenu
      ? item.submenu.some((sub) => pathname === sub.href)
      : pathname === item.href;
    const isExpanded = expandedItems[item.title];

    if (item.title === "Admin") {
      return (
        <Button
          key={item.title}
          variant="ghost"
          className={`w-full !rounded-3xl flex items-center justify-start px-4 py-8 !h-12 text-sm font-medium text-gray-600 ${isActive ? "bg-orange-500 bg-opacity-40" : "hover:bg-orange-500/60 hover:bg-opacity-60"}`}
          onClick={() => router.push(item.href)}
        >
          <div className="flex items-center space-x-2">
            {item.icon}
            {isSideBarOpen && <span>{item.title}</span>}
          </div>
        </Button>
      );
    }

    return (
      <div key={item.title} className="w-full py-1">
        <Button
          variant="ghost"
          className={`w-full !rounded-xl flex items-center justify-between px-4 !py-6 text-sm font-medium text-gray-600 ${isActive ? "bg-orange-500/60 bg-opacity-20" : "hover:bg-orange-500 hover:bg-opacity-30"}`}
          onClick={() => (item.submenu ? toggleExpand(item.title) : router.push(item.href))}
        >
          <div className="flex items-center space-x-2">
            {item.icon}
            {isSideBarOpen && <span>{item.title}</span>}
          </div>
          {item.submenu &&
            isSideBarOpen &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ))}
        </Button>
        {item.submenu && isExpanded && (
          <div className="ml-6 flex flex-col gap-2 mt-2 border-l-2 border-primary/20 bg-gray-200/20">
            {item.submenu.map((sub) => (
              isSideBarOpen &&
              <Button
                key={sub.href}
                variant="ghost"
                className={`w-full !rounded-none !text-left flex items-start px-2 !py-3 text-sm text-gray-600 ${pathname === sub.href ? "bg-orange-500/20" : "hover:bg-orange-500/30"}`}
                onClick={() => router.push(sub.href)}
              >
                <span className="!w-full !text-left !bg-transparent">
                  {sub.title}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${isSideBarOpen ? "w-64" : "w-20"} bg-white border-r border-gray-100 fixed h-full transition-all duration-300`}
      >
        <div className="p-4 border-b border-gray-100 min-h-16 h-20 max-h-20 flex items-center">
          <div className="flex items-center gap-3">
            <div className="size-11 bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] rounded-xl flex items-center justify-center">
              {InstitutionLogo ? (
                <Image
                  alt="Institution Logo"
                  className="object-cover"
                  height={32}
                  src={`${process.env.NEXT_PUBLIC_BASE_URL || ""}${InstitutionLogo}`}
                  width={32}
                />
              ) : (
                <Icon icon="hugeicons:building-05" width="24" height="24" />
              )}
            </div>
            {isSideBarOpen && (
              <span className="font-bold text-[var(--sidebar-foreground)]">{InstitutionName}</span>
            )}
          </div>
        </div>
        <div className="p-2 overflow-y-auto h-[90svh] py-4">
          {filteredNavItems.map(renderNavigationItem)}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col" style={{marginLeft: isSideBarOpen ? "16rem" : "5rem"}}>
        {/* Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b">
          <button
            onClick={onToggle}
            className="w-8 h-8 z-[50] bg-primary rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          >
            {isSideBarOpen ? (
              <ChevronLeft className="w-4 h-4 text-white" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white" />
            )}
          </button>
          <div className="flex-1 flex justify-center">
            <InstitutionBranchSelector />
          </div>
          <div className="flex items-center gap-4">
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_MODULES}>
              <Modules />
            </ProtectedComponent>
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD}>
              <Link
                href={"/admin"}
                className=" text-gray-900 rounded-full bg-white hover:bg-gray-100 p-3 border-none outline-none relative"
              >
                <Icon icon="hugeicons:shield-01" width="24" height="24" />
              </Link>
            </ProtectedComponent>
            <TaskNotification />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 rounded-full px-2 py-2 cursor-pointer hover:bg-gray-200 hover:bg-opacity-30 active:bg-gray-400 active:bg-opacity-40 transition-all duration-200">
                  <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center">
                    {userInitials}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-medium">{userName || "User"}</div>
                    <div className="text-xs text-gray-500">{userRole || "Staff"}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
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
        <div className="w-full overflow-y-auto p-4">
          {selectedInstitution ? (
            <>
        {/* <div className={`flex items-center gap-4 my-2 ${isSideBarOpen ? "pl-0" : "pl-4"}`}>
                <Button
                  variant={"outline"}
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-2 !rounded-full !border-gray-300 !text-gray-600 hover:!border-gray-400 hover:!text-gray-700 !aspect-square !w-10 !h-10"
                >
                  <Icon icon="hugeicons:arrow-left-02" className="!w-8 !h-8" />
                </Button>
              </div> */}
              {children}
            </>
          ) : (
            <CreateOrganisationWizard />
          )}
          {isPathLoading ? <FixedLoader fixed={false} className="!bg-white/90 z-[100]" /> : <></>}
        </div>
      </div>

      {/* Logout Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>Are you sure you want to log out of your account?</DialogDescription>
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
  );
}

