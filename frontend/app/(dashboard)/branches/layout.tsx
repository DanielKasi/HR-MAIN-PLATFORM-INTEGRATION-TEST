"use client";
import { PERMISSION_CODES } from "@/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function BranchesLayout({ children }: { children: React.ReactNode }) {

  const title = useDocumentTitle("BRANCH MANAGEMENT")
  return (
    <>
      {title}
      <ProtectedPage permissionCode={[
        PERMISSION_CODES.CAN_VIEW_BRANCHES
      ]}>{children}</ProtectedPage>
    </>
  );
}