"use client";
import { PERMISSION_CODES } from "@/app/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function JobApplicationsLayout({ children }: { children: React.ReactNode }) {

  const title = useDocumentTitle("JOB APPLICATIONS")
  return (
    <>
      {title}
      <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_APPLICATIONS}>{children}</ProtectedPage>
    </>
  );
}