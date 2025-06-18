"use client";

import React from "react";
import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {usePathname} from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package2,
  FileBarChart,
  ChevronDown,
  ChevronLeft,
  Settings,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import Image from "next/image";
import {useSelector} from "react-redux";
import {useDispatch} from "react-redux";
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
import {selectSidebarOpened} from "@/store/miscellaneous/selectors";
import {toggleSideBarAction} from "@/store/miscellaneous/actions";
import {hasPermission} from "@/lib/helpers";
import ProtectedComponent from "@/components/ProtectedComponent";
import apiRequest from "@/lib/apiRequest";

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
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userInitials, setUserInitials] = useState("U");
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [canViewSettings, setCanViewSettings] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sidebarExpanded = useSelector(selectSidebarOpened);
  const [canViewThisGuide, setCanViewThisGuide] = useState(false);

  const [InstitutionId, setInstitutionId] = useState<string | null>(null);
  const InstitutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const {getCompletionPercentage, isSetupComplete, getNextStep} = useSetupProgress(
    InstitutionId || undefined,
  );

  const completionPercentage = getCompletionPercentage();
  const nextStep = getNextStep();

  // State for Institution data
  const [InstitutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [InstitutionName, setInstitutionName] = useState("SUPERMARKET NAME");

  // State for filtered nav items
  const [filteredNavItems, setFilteredNavItems] = useState<NavItem[]>([]);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const userData = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);
  // const [isLoading, setIsLoading] = useState(false)
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

    // Get the first Institution ID from attached Institutions
    else if (InstitutionsAttached && InstitutionsAttached.length > 0) {
      // Convert the numeric ID to a string
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

      // Check if user is the Institution owner
      if (selectedInstitution.institution_owner_id === userData.id) {
        role = "Owner";
      } else if (Array.isArray(userData.roles) && userData.roles.length > 0) {
        // Get the first matched role name, formatted
        const matchingRole = userData.roles.find((r: {name: string}) => !!r.name);

        if (matchingRole) {
          // Format role to "Title Case"
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
  // Define all navigation items with permissions for submenu items
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "GPS Tracking",
      href: "#1",
      icon: <Package2 className="h-5 w-5" />,
      // requiredPermission: "can_access_valuation",
      submenu: [
        {
          title: "Monitor",
          href: "/monitor",
          // requiredPermission: "can_access_gps_monitioning",
        },
        {
          title: "Device Management",
          href: "/device-management",
          // requiredPermission: "can_access_gps_device_management",
        },
        {
          title: "Reports",
          href: "/tracking-reports",
          // requiredPermission: "can_access_gps_reports",
        },
      ],
    },
    {
      title: "Asset Valuation",
      href: "#1",
      icon: <Package2 className="h-5 w-5" />,
      // requiredPermission: "can_access_valuation",
      submenu: [
        {
          title: "Valuation Requests",
          href: "/valuation-requests",
          // requiredPermission: "can_access_valuation_requests",
        },
        {
          title: "Valuation Instructions",
          href: "/valuation-instructions",
          // requiredPermission: "can_access_valuation_instructions",
        },
        {
          title: "Reviews And Approvals",
          href: "/reviews-and-approvals",
          // requiredPermission: "can_access_valuation_reviews_and_approvals",
        },
        {
          title: "Completed Valuations",
          href: "/completed-valuations",
          // requiredPermission: "can_access_completed_valuations",
        },
        {
          title: "Asset Register",
          href: "/asset-register",
          // requiredPermission: "can_access_asset_register",
        },
        {
          title: "Inspections",
          href: "/inspections",
          // requiredPermission: "can_access_inspections",
        },
      ],
    },

    // {
    //   title: "Recovery",
    //   href: "/recovery",
    //   icon: <Icon height="24" icon="hugeicons:inbox-download" width="24" />,
    //   // requiredPermission: "can_view_orders",
    // },

    // {
    //   title: "Parking",
    //   href: "/parking",
    //   icon: <Icon height="24" icon="hugeicons:inbox-download" width="24" />,
    //   // requiredPermission: "can_view_orders",
    // },
  ];

  const toggleSideBar = () => {
    dispatch(toggleSideBarAction());
  };

  const updateThemeColors = (hexColor: string) => {
    if (!hexColor) return;

    try {
      const hslValue = hexToHSL(hexColor);

      if (!hslValue) return;

      // Parse HSL components for calculations
      const [h, s, l] = hslValue.split(" ");
      const hue = h;
      const saturation = s.replace("%", "");
      const lightness = l.replace("%", "");

      // Update primary theme colors
      document.documentElement.style.setProperty("--primary", hslValue);
      document.documentElement.style.setProperty("--ring", hslValue);

      // Create a darker version for primary-hover (for buttons)
      const darkerL = Math.max(parseInt(lightness) - 10, 0);

      document.documentElement.style.setProperty(
        "--primary-hover",
        `${hue} ${saturation}% ${darkerL}%`,
      );

      // Set sidebar selected to match primary
      document.documentElement.style.setProperty("--sidebar-selected", hslValue);

      // Create a much lighter version for sidebar hover
      // Increase lightness by 40%, but cap it at 90%
      const lighterL = Math.min(parseInt(lightness) + 40, 90);
      // You might also want to reduce saturation for a more pastel look
      const lighterS = Math.max(parseInt(saturation) - 15, 20);

      document.documentElement.style.setProperty(
        "--sidebar-hover",
        `${hue} ${lighterS}% ${lighterL}%`,
      );

      // Configure light/dark mode specific adjustments
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.style.setProperty("--sidebar-background", "217.2 32.6% 17.5%");

        // For dark mode, we might want a different hover adjustment
        // Slightly lighter but not too light to maintain contrast in dark mode
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
    // Check if user is logged in
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
      setInstitutionLogo(selectedInstitution.Institution_logo);
      setInstitutionName(selectedInstitution.Institution_name);
    }

    const filtered = navItems
      .map((item) => {
        // For items with submenus, first filter the submenu items
        if (item.submenu && item.submenu.length > 0) {
          const filteredSubmenu = item.submenu.filter(
            (subItem) => !subItem.requiredPermission || hasPermission(subItem.requiredPermission),
          );

          return {...item, submenu: filteredSubmenu};
        }

        return item;
      })
      .filter((item) => {
        // For items with submenus, keep if at least one submenu item remains
        if (item.submenu && item.submenu.length > 0) {
          return item.submenu.length > 0; // Keep if has accessible submenu items
        }

        // For items without submenus, check their own permission
        return !item.requiredPermission || hasPermission(item.requiredPermission);
      });

    setFilteredNavItems(filtered);
  }, [router, userData, selectedInstitution, accessToken]); // The 'hasPermission' function called in this effect relies on the user data and the selected Institution as dependencies

  const toggleSubmenu = (title: string) => {
    setOpenSubmenu(openSubmenu === title ? null : title);
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogout = () => {
    // localStorage.clear();
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

  // Function to handle menu item clicks
  const handleMenuItemClick = (item: NavItem) => {
    if (item.submenu && item.submenu.length > 0) {
      // When sidebar is collapsed and item has submenu, expand the sidebar first
      if (!sidebarExpanded) {
        toggleSideBar();
        // Set a small timeout to allow the sidebar to expand before opening the submenu
        setTimeout(() => {
          toggleSubmenu(item.title);
        }, 300);
      } else {
        toggleSubmenu(item.title);
      }
    } else {
      // If it's a regular menu item with no submenu, navigate to its href
      router.push(item.href);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarExpanded ? "w-[250px]" : "w-16"
        } bg-white border-r transition-all duration-300 flex flex-col justify-between`}
      >
        <div>
          <div className="p-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-selected rounded-md flex items-center justify-center">
              {InstitutionLogo ? (
                <Image
                  alt="Institution Logo"
                  className="object-cover"
                  height={32}
                  src={`${process.env.NEXT_PUBLIC_BASE_URL || ""}${InstitutionLogo}`}
                  width={32}
                />
              ) : (
                <ShoppingCart className="text-white h-5 w-5" />
              )}
            </div>
            {sidebarExpanded && <span className="font-bold text-gray-800">{InstitutionName}</span>}
          </div>

          <div className="mt-4">
            <div className="px-2">
              {filteredNavItems.map((item, idx) => (
                <div key={idx}>
                  <div
                    className={`
          ${
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "bg-sidebar-selected text-white"
              : "text-gray-600 hover:bg-sidebar-hover hover:bg-opacity-20"
          }
          rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors mb-1`}
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {item.icon}
                      {sidebarExpanded && <span>{item.title}</span>}
                    </div>
                    {item.submenu && item.submenu.length > 0 && (
                      <div className={`${sidebarExpanded ? "block" : "hidden"}`}>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-300 ${
                            openSubmenu === item.title ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {item.submenu && openSubmenu === item.title && sidebarExpanded && (
                    <div className="pl-6 text-gray-600 py-2 space-y-1">
                      {item.submenu.map((subitem) => (
                        <div
                          key={subitem.href}
                          className={`
                  px-4 py-2 rounded-lg cursor-pointer transition-colors
                  ${
                    pathname === subitem.href
                      ? "bg-sidebar-hover bg-opacity-30 text-sidebar-selected font-medium"
                      : "hover:bg-sidebar-hover hover:bg-opacity-20"
                  }
                `}
                          onClick={() => router.push(subitem.href)}
                        >
                          {subitem.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-white p-2 flex justify-between items-center border-b">
          <div
            className="w-8 h-8 bg-sidebar-selected rounded-lg flex items-center justify-center cursor-pointer hover:bg-sidebar-selected/80 active:bg-sidebar-selected/80 transition-all duration-200"
            onClick={() => {
              // When collapsing, make sure to close any open submenu
              if (sidebarExpanded && openSubmenu !== null) {
                setOpenSubmenu(null);
              }
              toggleSideBar();
            }}
          >
            <ChevronLeft
              className={`h-5 w-5 text-white transition-transform duration-300 ${
                sidebarExpanded ? "" : "rotate-180"
              }`}
            />
          </div>

          <h1 className="text-xl font-semibold text-gray-600 ml-8">APPLICATION NAME</h1>

          <div className="flex-1 flex justify-center">
            {/* Assuming InstitutionBranchSelector is a custom component, we'll wrap it to add hover effects */}
            <div className="rounded-lg  transition-all duration-200">
              <InstitutionBranchSelector />
            </div>
          </div>

          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_MODULES}>
            <div className="rounded-lg hover:bg-opacity-20 active:bg-opacity-30 transition-all duration-200 p-2">
              <Modules />
            </div>
          </ProtectedComponent>

          <div className="flex items-center gap-4">
            {isMounted && canViewAdmin && (
              <button
                className={`flex items-center rounded-lg bg-transparent active:bg-gray-200 relative px-2 py-2 hover`}
                id="admin"
                onClick={() => router.push("/admin")}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <Shield className="h-5 w-5 text-gray-600 hover:text-blue-500 transition-colors duration-200" />
                {isHovered && (
                  <span
                    className={`text-gray-100 px-3 py-1 rounded-sm z-10 bg-gray-600 text-sm font-medium overflow-hidden transition-all duration-300 ease-in-out absolute -top-2 -right-1`}
                  >
                    Admin
                  </span>
                )}
              </button>
            )}

            {/* Assuming TaskNotification is a custom component, we'll add a className prop */}
            <div className="rounded-lg  hover:bg-opacity-20  active:bg-opacity-30 transition-all duration-200 p-2">
              <TaskNotification />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 bg-gray-200 rounded-lg px-3 py-1 cursor-pointer hover:bg-sidebar-hover hover:bg-opacity-30 active:bg-sidebar-hover active:bg-opacity-40 transition-all duration-200">
                  <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center">
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
                <DropdownMenuItem className="rounded-lg hover:bg-sidebar-hover hover:bg-opacity-20 active:bg-sidebar-hover active:bg-opacity-30 transition-all duration-200 focus:bg-sidebar-hover focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                {isMounted && canViewSettings && (
                  <DropdownMenuItem
                    className="rounded-lg hover:bg-sidebar-hover hover:bg-opacity-20 active:bg-sidebar-hover active:bg-opacity-30 transition-all duration-200 focus:bg-sidebar-hover focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2"
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  className="rounded-lg hover:bg-sidebar-hover hover:bg-opacity-20 active:bg-sidebar-hover active:bg-opacity-30 transition-all duration-200 focus:bg-sidebar-hover focus:bg-opacity-20 focus:outline-none my-1 px-3 py-2"
                  onClick={handleLogoutClick}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

        {/* Dashboard Content */}
        <div className="p-6 h-mainContentHeight overflow-y-auto">
          {isMounted && canViewThisGuide && InstitutionId && (
            <>
              {!isSetupComplete() && (
                <div className="mb-8 p-6 bg-white rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Setup Progress</h2>
                    {nextStep && (
                      <div>
                        <Button
                          className="px-4"
                          onClick={() => router.push(nextStep.to_complete_step_page_link)}
                        >
                          Continue Setup
                        </Button>

                        <Button className="ml-2 px-4" onClick={() => setShowSkipDialog(true)}>
                          Skip
                        </Button>

                        <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Skip Setup?</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to skip the Institution setup guide? You can
                                always complete it later.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex space-x-2 sm:justify-end">
                              <Button
                                disabled={isSubmitting}
                                type="button"
                                variant="outline"
                                onClick={() => setShowSkipDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                disabled={isSubmitting}
                                type="button"
                                variant="default"
                                onClick={handleSkipSetup}
                              >
                                {isSubmitting ? "Skipping..." : "Skip Setup"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full"
                      style={{width: `${completionPercentage}%`}}
                    />
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    {`${completionPercentage}% complete. ${
                      nextStep ? `Next step: ${nextStep.title}` : ""
                    }`}
                  </div>
                </div>
              )}
            </>
          )}

          {children}
        </div>
      </div>
      {userIsLoading && <FixedLoader />}
    </div>
  );
}
