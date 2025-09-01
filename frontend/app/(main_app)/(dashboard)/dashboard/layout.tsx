import { PERMISSION_CODES } from "@/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";

export default function DashboardLayout({children}: {children: React.ReactNode}) {
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_HR_DASHBOARD}>{children}</ProtectedPage>
  );
} 