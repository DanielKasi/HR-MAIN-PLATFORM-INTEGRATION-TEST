
"use client";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { PERMISSION_CODES } from "@/types/types.utils";

export default function OffBoardingLayout({ children }: { children: React.ReactNode }) {
  useDocumentTitle("ONBOARDING")
 
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ONBOARDING_RECORDS}>{children}</ProtectedPage>
  );
}