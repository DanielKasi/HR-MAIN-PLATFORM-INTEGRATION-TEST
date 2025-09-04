
"use client";
import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  useDocumentTitle("PAYROLL")
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_PAYROLL_DATA}>{children}</ProtectedPage>
  );
}