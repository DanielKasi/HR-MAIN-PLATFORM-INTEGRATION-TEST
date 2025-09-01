"use client";

// import { PERMISSION_CODES } from "@/types/types.utils";
// import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  useDocumentTitle("EMPLOYEES")
  return (
    <>{children}</>
  );
}