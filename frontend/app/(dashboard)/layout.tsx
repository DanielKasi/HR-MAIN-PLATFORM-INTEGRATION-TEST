"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Settings,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { Icon } from "@iconify/react";

import { IUserInstitution } from "../types";
import { PERMISSION_CODES } from "../types/types.utils";

import { useSetupProgress } from "@/components/guide";
import { selectAttachedInstitutions, selectTemporaryPermissions } from "@/store/auth/selectors";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMobile } from "@/hooks/use-mobile";
import { InstitutionBranchSelector } from "@/components/institution-branch-selector";
import { TaskNotification } from "@/components/task-notification";
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
import { hasPermission } from "@/lib/helpers";
import ProtectedComponent from "@/components/ProtectedComponent";
import apiRequest from "@/lib/apiRequest";
import CreateOrganisationWizard from "./create-organisation/page";

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [userName, setUserName] = useState("");
  const [userInitials, setUserInitials] = useState("U");
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [canViewSettings, setCanViewSettings] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isAdminHovered, setIsAdminHovered] = useState(false);
  const [canViewThisGuide, setCanViewThisGuide] = useState(false);

  const [InstitutionId, setInstitutionId] = useState<string | null>(null);
  const InstitutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const { getCompletionPercentage, isSetupComplete, getNextStep } = useSetupProgress(
    InstitutionId || undefined,
  );

  const completionPercentage = getCompletionPercentage();
  const nextStep = getNextStep();

  // State for Institution data
  const [InstitutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [InstitutionName, setInstitutionName] = useState("BAIFAM HR");

  // State for filtered nav items
  const [filteredNavItems, setFilteredNavItems] = useState<NavItem[]>([]);
  const [filteredAdminItem, setFilteredAdminItem] = useState<NavItem | null>(null);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const userData = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);
  const userIsLoading = useSelector(selectUserLoading);
  const dispatch = useDispatch();
  const router = useRouter();
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const temporaryPermissions = useSelector(selectTemporaryPermissions);

  useEffect(() => {
    dispatch(fetchRemoteUserStart());
    dispatch(fetchUpToDateInstitution());
  }, [dispatch]);

  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id.toString());
    }
    else if (InstitutionsAttached && InstitutionsAttached.length > 0) {
      const id = String(InstitutionsAttached[0].id);
      setInstitutionId(id);
    }
  }, [InstitutionsAttached, selectedInstitution]);

  useEffect(() => {
    setIsMounted(true);

    if (userData) {
      setCanViewAdmin(hasPermission(PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD));
      setCanViewSettings(hasPermission(PERMISSION_CODES.CAN_VIEW_SETTINGS));
      setCanViewThisGuide(hasPermission(PERMISSION_CODES.CAN_VIEW_GUIDE));
    }

    if (
      userData &&
      userData.id &&
      selectedInstitution &&
      selectedInstitution.institution_owner_id
    ) {
      let role = "";

      if (selectedInstitution.institution_owner_id === userData.id) {
        role = "Owner";
      } else if (Array.isArray(userData.roles) && userData.roles.length > 0) {
        const matchingRole = userData.roles.find((r: { name: string }) => !!r.name);

        if (matchingRole) {
          const formattedRole =
            matchingRole.name.charAt(0).toUpperCase() + matchingRole.name.slice(1).toLowerCase();
          role = formattedRole;
        }
      }

      if (role.trim()) {
        setUserRole(role);
      }
    }
  }, [userData, selectedInstitution, temporaryPermissions]);

  useEffect(() => {
    return () => {
      dispatch(clearTemporaryPermissions());
    };
  }, []);

  // Define all navigation items with permissions for submenu items - keeping original structure
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <Icon icon="hugeicons:dashboard-browsing" width="20" height="20" />,
    },
    {
      title: "Recruitment",
      href: "#1",
      icon: <Icon icon="hugeicons:user-add-02" width="20" height="20" />,
      submenu: [
        {
          title: "Job Adverts",
          href: "/job-adverts",
        },
        {
          title: "Applications",
          href: "/applications",
        },
        {
          title: "Interviews",
          href: "/job-interviews",
        },
      ],
    },
    {
      title: "Onboarding",
      href: "/on-boarding",
      icon: <Icon height="20" icon="hugeicons:inbox-download" width="20" />,
    },
    {
      title: "Employees",
      href: "#1",
      icon: <Icon icon="hugeicons:user-multiple-02" width="20" height="20" />,
      submenu: [
        {
          title: "All Employees",
          href: "/employees/employee-list",
        },
        {
          title: "Attendance",
          href: "/employees/attendance",
        },
        {
          title: "Discipline",
          href: "/employees/discipline",
        }
      ],
    },
    {
      title: "Leave",
      href: "#1",
      icon: <Icon icon="hugeicons:calendar-03" width="20" height="20" />,
      submenu: [
        {
          title: "Leave Types",
          href: "/leave/leave-types",
        },
        {
          title: "Leave Policy",
          href: "/leave/leave-policy",
        },
        {
          title: "Leave Application",
          href: "/leave/leave-application",
        }
      ],
    },
    {
      title: "Payroll",
      href: "#1",
      icon: <Icon icon="hugeicons:dollar-01" width="20" height="20" />,
      submenu: [
        {
          title: "Allowance Types",
          href: "/payroll/allowance-types",
        },
        {
          title: "Deduction Types",
          href: "/payroll/deduction-types",
        },
        {
          title: "Employee Allowance",
          href: "/payroll/employee-allowance",
        },
        {
          title: "Employee Deductions",
          href: "/payroll/employee-deductions",
        },
        {
          title: "Payroll Period",
          href: "/payroll/payroll-period",
        },
        {
          title: "Payslip",
          href: "/payroll/payslip",
        },
      ],
    },
    // Additional comprehensive modules
    {
      title: "Assets",
      href: "/assets",
      icon: <Icon icon="hugeicons:package" width="20" height="20" />,
    },
    {
      title: "Help Desk",
      href: "#1",
      icon: <Icon icon="hugeicons:help-circle" width="20" height="20" />,
      submenu: [
        {
          title: "Support Tickets",
          href: "/help-desk/tickets",
        },
        {
          title: "Knowledge Base",
          href: "/help-desk/knowledge-base",
        },
        {
          title: "FAQs",
          href: "/help-desk/faqs",
        },
        {
          title: "Contact Support",
          href: "/help-desk/contact",
        },
        {
          title: "Feedback & Suggestions",
          href: "/help-desk/feedback",
        },
        {
          title: "Help Desk Reports",
          href: "/help-desk/reports",
        },
      ],
    },
    {
      title: "Reports",
      href: "#1",
      icon: <Icon icon="hugeicons:analytics-01" width="20" height="20" />,
      submenu: [
        {
          title: "Employee Reports",
          href: "/reports/employees",
        },
        {
          title: "Attendance Reports",
          href: "/reports/attendance",
        },
        {
          title: "Leave Reports",
          href: "/reports/leave",
        },
        {
          title: "Payroll Reports",
          href: "/reports/payroll",
        },
        {
          title: "Recruitment Reports",
          href: "/reports/recruitment",
        },
        {
          title: "Asset Management Reports",
          href: "/reports/assets",
        },
      ],
    },
    {
      title: "Projects",
      href: "#1",
      icon: <Icon icon="hugeicons:folder-01" width="20" height="20" />,
      submenu: [
        {
          title: "Project Dashboard",
          href: "/projects/dashboard",
        },
        {
          title: "Create Project",
          href: "/projects/create",
        },
        {
          title: "Project Timeline",
          href: "/projects/timeline",
        },
        {
          title: "Task Management",
          href: "/projects/tasks",
        },
        {
          title: "Project Reports",
          href: "/projects/reports",
        },
      ],
    },
    {
      title: "Performance",
      href: "#1",
      icon: <Icon icon="hugeicons:chart-line-data-01" width="25" height="25" />,
      submenu: [
        {
          title: "Performance Reviews",
          href: "/performance/reviews",
        },
        {
          title: "Goal Setting",
          href: "/performance/goals",
        },
        {
          title: "Feedback & Recognition",
          href: "/performance/feedback",
        },
        {
          title: "Training & Development",
          href: "/performance/training",
        },
        {
          title: "Competency Management",
          href: "/performance/competency",
        },
        {
          title: "Performance Reports",
          href: "/performance/reports",
        },
      ],
    },
  ];

  // Admin item - will be static and always visible if user has permission
  const adminItem: NavItem = {
    title: "Admin",
    href: "/admin",
    icon: <Shield className="w-5 h-5" />,
    requiredPermission: PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD,
  };

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
        document.documentElement.style.setProperty("--sidebar-background", "217.2 32.6% 17.5%");
        const darkModeHoverL = Math.min(parseInt(lightness) + 20, 60);
        document.documentElement.style.setProperty(
          "--sidebar-hover",
          `${hue} ${saturation}% ${darkModeHoverL}%`,
        );
      } else {
        document.documentElement.style.setProperty("--sidebar-background", "220 14.3% 95.9%");
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
      router.push("/");
      return;
    }

    if (userData) {
      try {
        const user = userData;
        setUserName(user.fullname || "");

        if (user.fullname) {
          const nameParts = user.fullname.split(" ");
          if (nameParts.length > 1) {
            setUserInitials(`${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase());
          } else if (nameParts.length === 1) {
            setUserInitials(nameParts[0][0].toUpperCase());
          }
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
          return { ...item, submenu: filteredSubmenu };
        }
        return item;
      })
      .filter((item) => {
        if (item.submenu && item.submenu.length > 0) {
          return item.submenu.length > 0;
        }
        return !item.requiredPermission || hasPermission(item.requiredPermission);
      });

    // Filter admin item separately
    const processedAdminItem = (() => {
      if (!adminItem.requiredPermission || hasPermission(adminItem.requiredPermission)) {
        return adminItem;
      }
      return null;
    })();

    setFilteredNavItems(filtered);
    setFilteredAdminItem(processedAdminItem);
  }, [router, userData, selectedInstitution, accessToken]);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogout = () => {
    dispatch(logoutStart());
  };

  const handleCancelLogout = () => {
    setShowLogoutDialog(false);
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

  const handleSkipSetup = async () => {
    setIsSubmitting(true);
    const success = await markSetupAsComplete();
    setIsSubmitting(false);
    setShowSkipDialog(false);

    if (success) {
      window.location.reload();
    } else {
      console.error("Failed to mark setup as complete");
    }
  };

  const renderNavigationItem = (item: NavItem) => {
    const isActive = pathname === item.href || (item.submenu && item.submenu.some(sub => pathname === sub.href));
    
    // Special handling for admin item
    if (item.title === "Admin") {
      return (
        <div 
          key={item.title}
          className="relative"
          onMouseEnter={() => setIsAdminHovered(true)}
          onMouseLeave={() => setIsAdminHovered(false)}
        >
          <Button 
            variant={isActive ? "default" : "ghost"} 
            className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              isActive
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            onClick={() => router.push(item.href)}
          >
            {item.icon}
          </Button>
          {isAdminHovered && (
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-50">
              Admin
            </span>
          )}
        </div>
      );
    }
    
    const buttonClasses = `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
      isActive
        ? "bg-green-100 text-green-700 hover:bg-green-200"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    }`;

    if (item.submenu && item.submenu.length > 0) {
      return (
        <DropdownMenu key={item.title}>
          <DropdownMenuTrigger asChild>
            <Button variant={isActive ? "default" : "ghost"} className={buttonClasses}>
              {item.icon}
              <span>{item.title}</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {item.submenu.map((option, index) => (
              <div key={option.href}>
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => router.push(option.href)}
                >
                  {option.title}
                </DropdownMenuItem>
                {index === 2 && <DropdownMenuSeparator />}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button 
        key={item.title} 
        variant={isActive ? "default" : "ghost"} 
        className={buttonClasses}
        onClick={() => router.push(item.href)}
      >
        {item.icon}
        <span>{item.title}</span>
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header with Logo and User Menu */}
      <div className="bg-white p-4 flex justify-between items-center border-b">
        <div className="flex items-center gap-3">
          <div className="size-11 bg-sidebar-selected text-white rounded-xl flex items-center justify-center">
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
          <span className="font-bold text-gray-800">{InstitutionName}</span>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="rounded-lg transition-all duration-200">
            <InstitutionBranchSelector />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_MODULES}>
            <div className="">
              <Modules />
            </div>
          </ProtectedComponent>
          
          <div className="">
            <TaskNotification />
          </div>

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
            <DropdownMenuContent align="end" className="rounded-xl p-1 shadow-lg border border-gray-200">
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

      {/* Horizontal Navigation */}
      <div className="w-full border-b bg-white sticky top-0 z-40">
        <div className="flex items-center">
          {/* Scrollable Navigation Items */}
          <div className="flex-1">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex items-center space-x-1 p-4">
                {filteredNavItems.map(renderNavigationItem)}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          
          {/* Static Admin - Always Visible if user has permission */}
          <div className="flex-shrink-0 px-4 border-l border-gray-200">
            {isMounted && canViewAdmin && filteredAdminItem && renderNavigationItem(filteredAdminItem)}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="px-4 pt-4 h-full overflow-y-auto">
          {selectedInstitution ? (
            <>
              {children}
            </>
          ) : (
            <CreateOrganisationWizard />
          )}
        </div>
      </div>
      
      {userIsLoading && <FixedLoader />}
    </div>
  );
}