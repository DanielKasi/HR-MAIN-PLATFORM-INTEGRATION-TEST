"use client";

import {PERMISSION_CODES} from "@/app/types/types.utils";
import {hasPermission} from "@/lib/helpers";

interface ProtectedComponentProps {
  permissionCode: PERMISSION_CODES;
  children: React.ReactNode;
}

export default function ProtectedComponent({permissionCode, children}: ProtectedComponentProps) {
  const isAllowed = hasPermission(permissionCode);

  if (!isAllowed) return null;

  return <>{children}</>;
}
