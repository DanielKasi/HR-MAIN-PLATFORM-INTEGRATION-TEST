import { PERMISSION_CODES } from "@/app/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";

export default function JobApplicationsLayout({children}: {children: React.ReactNode}) {
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_APPLICATIONS}>{children}</ProtectedPage>
  );
}