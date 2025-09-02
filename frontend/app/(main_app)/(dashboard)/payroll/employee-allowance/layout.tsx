import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";

export default function JobPositionsLayout({children}: {children: React.ReactNode}) {
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_MANAGE_ALLOWANCES}>{children}</ProtectedPage>
  );
}