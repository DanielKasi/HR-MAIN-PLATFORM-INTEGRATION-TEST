"use client";
import {usePathname, useRouter} from "next/navigation";
import {Building, ChevronDown, DollarSign, FileText, Shield, Settings, Users} from "lucide-react";
import {useEffect, useState} from "react";
import {useSelector} from "react-redux";

import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {hasPermission} from "@/lib/helpers";
import {PERMISSION_CODES} from "@/app/types/types.utils";
import {selectTemporaryPermissions, selectUser} from "@/store/auth/selectors";

export function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [canViewSettings, setCanViewSettings] = useState(false);
  const temporaryPermissions = useSelector(selectTemporaryPermissions);
  const currentUser = useSelector(selectUser);

  useEffect(() => {
    const admin_perm = hasPermission(PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD);
    const settings_perm = hasPermission(PERMISSION_CODES.CAN_VIEW_SETTINGS);

    setCanViewAdmin(admin_perm);
    setCanViewSettings(settings_perm);
  }, [currentUser, temporaryPermissions]);

  return (
    <div className="flex items-center gap-2">
      {canViewAdmin && (
        <Button
          className="rounded-md px-3"
          variant={pathname === "/admin" || pathname.startsWith("/admin/") ? "default" : "ghost"}
          onClick={() => router.push("/admin")}
        >
          <Shield className="mr-2 h-4 w-4" />
          Admin
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="rounded-md px-3" variant="ghost">
            <Building className="mr-2 h-4 w-4" />
            Modules
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuItem className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            HR
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            Accounting
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <DollarSign className="mr-2 h-4 w-4" />
            Finance
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {canViewSettings && (
        <Button
          className="rounded-md px-3"
          variant={
            pathname === "/settings" || pathname.startsWith("/settings/") ? "default" : "ghost"
          }
          onClick={() => router.push("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      )}
    </div>
  );
}
