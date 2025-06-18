"use client";

import type React from "react";
import type {PERMISSION_CODES} from "@/app/types/types.utils";

import {useState, useEffect} from "react";
import {useSelector} from "react-redux";
import {useDispatch} from "react-redux";

import PermissionDenied from "@/components/PermissionDenied";
import {selectTemporaryPermissions} from "@/store/auth/selectors";
import {hasPermission} from "@/lib/helpers";
import {clearTemporaryPermissions} from "@/store/auth/actions";

interface ProtectedPageProps {
  permissionCode: PERMISSION_CODES | PERMISSION_CODES[]; // Support single or multiple codes
  children: React.ReactNode;
}

export default function ProtectedPage({permissionCode, children}: ProtectedPageProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const temporaryPermissions = useSelector(selectTemporaryPermissions);
  const dispatch = useDispatch();

  // Convert single permission code to array for consistent handling
  const requiredPermissionCodes = Array.isArray(permissionCode) ? permissionCode : [permissionCode];

  useEffect(() => {
    const checkPermissions = () => {
      // Check if user has ALL required permissions
      const allowed = requiredPermissionCodes.every((code) => hasPermission(code));

      setIsAllowed(allowed);
    };

    checkPermissions();
  }, [requiredPermissionCodes, temporaryPermissions]);

  useEffect(() => {
    return () => {
      dispatch(clearTemporaryPermissions());
    };
  }, []);

  if (isAllowed === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAllowed) {
    return <PermissionDenied requiredPermissionCodes={requiredPermissionCodes} />;
  }

  return <>{children}</>;
}
