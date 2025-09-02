import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";

export default function JobPositionsLayout({children}: {children: React.ReactNode}) {
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_POSITIONS}>{children}</ProtectedPage>
  );
}