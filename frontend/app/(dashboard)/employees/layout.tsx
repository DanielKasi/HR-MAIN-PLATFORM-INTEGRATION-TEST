"use client";

import { PERMISSION_CODES } from "@/app/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  useDocumentTitle("EMPLOYEES")
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_EMPLOYEES}>{children}</ProtectedPage>
  );
}